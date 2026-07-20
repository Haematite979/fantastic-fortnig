import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOpayConfig, fetchTransactions } from '@/lib/opay'

export const dynamic = 'force-dynamic'

// POST /api/opay/sync — fetch transactions from OPay and persist them
export async function POST() {
  const config = await getOpayConfig()
  if (!config) {
    return NextResponse.json({ error: 'No OPay credentials configured. Add them in Settings first.' }, { status: 400 })
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const fetched = await fetchTransactions(config, since, 50)

    let newCount = 0
    let updatedCount = 0

    for (const t of fetched) {
      const existing = await db.opayTransaction.findUnique({
        where: { opayTxnId: t.opayTxnId },
        select: { id: true },
      })
      if (existing) {
        await db.opayTransaction.update({
          where: { id: existing.id },
          data: { amount: t.amount, status: t.status, fee: t.fee ?? 0, settledAmount: t.settledAmount ?? 0 },
        })
        updatedCount++
      } else {
        await db.opayTransaction.create({
          data: {
            opayTxnId: t.opayTxnId,
            reference: t.reference ?? null,
            amount: t.amount,
            currency: t.currency,
            status: t.status,
            channel: t.channel ?? null,
            customerName: t.customerName ?? null,
            customerEmail: t.customerEmail ?? null,
            customerPhone: t.customerPhone ?? null,
            fee: t.fee ?? 0,
            settledAmount: t.settledAmount ?? 0,
            opayCreatedAt: t.opayCreatedAt,
          },
        })
        newCount++
      }
    }

    await db.opaySetting.updateMany({
      where: { isActive: true },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      ok: true,
      fetched: fetched.length,
      new: newCount,
      updated: updatedCount,
      message: `Synced ${fetched.length} transactions (${newCount} new, ${updatedCount} updated).`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Sync failed: ${e.message}` }, { status: 500 })
  }
}
