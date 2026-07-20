import { db } from '@/lib/db'

/**
 * Daily OPay Transaction Audit Engine.
 *
 * For each audit run:
 * 1. Pulls all transactions fetched since the last audit (or last 24h).
 * 2. Flags anomalies:
 *    - Transactions stuck in "pending" for >6 hours
 *    - Failed transactions (recorded for review)
 *    - Unusually large transactions (>2× the median successful amount)
 *    - Fee mismatches (fee > 3% of amount — OPay's standard is 1.5%)
 *    - Reversed transactions
 * 3. Persists an AuditLog row and updates each transaction's auditStatus.
 */

export interface AuditResult {
  auditDate: Date
  totalTransactions: number
  totalAmount: number
  successCount: number
  failedCount: number
  pendingCount: number
  flaggedCount: number
  summary: string
  discrepancies: AuditDiscrepancy[]
}

interface AuditDiscrepancy {
  type: 'stuck_pending' | 'high_value' | 'fee_mismatch' | 'reversed' | 'unexplained_failure'
  opayTxnId: string
  detail: string
  amount: number
}

const FEE_THRESHOLD_PCT = 3.0
const STUCK_PENDING_HOURS = 6
const HIGH_VALUE_MULTIPLE = 2

export async function runAudit(triggeredBy: 'manual' | 'daily' | 'webhook' = 'manual'): Promise<AuditResult> {
  const lastAudit = await db.auditLog.findFirst({ orderBy: { auditDate: 'desc' } })
  const since = lastAudit?.auditDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000)

  const transactions = await db.opayTransaction.findMany({
    where: { opayCreatedAt: { gte: since } },
    orderBy: { opayCreatedAt: 'desc' },
  })

  const auditDate = new Date()
  const discrepancies: AuditDiscrepancy[] = []

  const successAmounts = transactions.filter((t) => t.status === 'success').map((t) => t.amount).sort((a, b) => a - b)
  const median = successAmounts.length > 0 ? successAmounts[Math.floor(successAmounts.length / 2)] : 0

  for (const t of transactions) {
    let status: 'verified' | 'flagged' = 'verified'
    let note: string | null = null

    if (t.status === 'pending') {
      const hoursOld = (auditDate.getTime() - t.opayCreatedAt.getTime()) / (1000 * 60 * 60)
      if (hoursOld > STUCK_PENDING_HOURS) {
        status = 'flagged'
        note = `Pending for ${hoursOld.toFixed(1)}h — exceeds ${STUCK_PENDING_HOURS}h threshold`
        discrepancies.push({ type: 'stuck_pending', opayTxnId: t.opayTxnId, detail: note, amount: t.amount })
      }
    }

    if (t.status === 'success' && median > 0 && t.amount > median * HIGH_VALUE_MULTIPLE) {
      status = 'flagged'
      note = `High-value: \u20A6${t.amount.toLocaleString()} exceeds 2\u00D7 median (\u20A6${median.toLocaleString()})`
      discrepancies.push({ type: 'high_value', opayTxnId: t.opayTxnId, detail: note, amount: t.amount })
    }

    if (t.amount > 0 && t.fee > 0) {
      const feePct = (t.fee / t.amount) * 100
      if (feePct > FEE_THRESHOLD_PCT) {
        status = 'flagged'
        note = `Fee ${feePct.toFixed(1)}% exceeds ${FEE_THRESHOLD_PCT}% threshold`
        discrepancies.push({ type: 'fee_mismatch', opayTxnId: t.opayTxnId, detail: note, amount: t.amount })
      }
    }

    if (t.status === 'reversed') {
      status = 'flagged'
      note = `Reversed transaction — verify with customer and OPay dashboard`
      discrepancies.push({ type: 'reversed', opayTxnId: t.opayTxnId, detail: note, amount: t.amount })
    }

    if (t.status === 'failed' && !t.auditNote) {
      discrepancies.push({ type: 'unexplained_failure', opayTxnId: t.opayTxnId, detail: `Failed transaction (\u20A6${t.amount.toLocaleString()})`, amount: t.amount })
    }

    await db.opayTransaction.update({
      where: { id: t.id },
      data: { auditStatus: status, auditNote: note },
    })
  }

  const successCount = transactions.filter((t) => t.status === 'success').length
  const failedCount = transactions.filter((t) => t.status === 'failed').length
  const pendingCount = transactions.filter((t) => t.status === 'pending').length
  const flaggedCount = discrepancies.length
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0)

  const successRate = transactions.length > 0 ? Math.round((successCount / transactions.length) * 100) : 0
  const summary = transactions.length === 0
    ? `No transactions in the audit window (${since.toLocaleDateString()} \u2192 ${auditDate.toLocaleDateString()}).`
    : `Audited ${transactions.length} transactions totaling \u20A6${totalAmount.toLocaleString()}. ${successCount} succeeded (${successRate}%), ${failedCount} failed, ${pendingCount} pending. ${flaggedCount} flagged for review.`

  await db.auditLog.create({
    data: {
      auditDate,
      totalTransactions: transactions.length,
      totalAmount,
      successCount,
      failedCount,
      pendingCount,
      flaggedCount,
      discrepancies: JSON.stringify(discrepancies),
      summary,
      triggeredBy,
    },
  })

  await db.opaySetting.updateMany({
    where: { isActive: true },
    data: { lastAuditAt: auditDate },
  })

  return {
    auditDate,
    totalTransactions: transactions.length,
    totalAmount,
    successCount,
    failedCount,
    pendingCount,
    flaggedCount,
    summary,
    discrepancies,
  }
}
