import crypto from 'crypto'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

/**
 * OPay API client.
 *
 * Supports two modes:
 * 1. `sandbox` — returns realistic mock transactions so users can try the
 *    integration end-to-end without real OPay credentials. No network calls.
 * 2. `production` — makes real HTTPS calls to the OPay Merchant API using the
 *    stored credentials, with HMAC-SHA512 signed requests.
 *
 * OPay API docs: https://documentation.opayweb.com/
 */

export interface OpayConfig {
  merchantId: string
  apiKey: string
  secretKey: string
  environment: 'sandbox' | 'production'
}

export interface OpayTransactionDTO {
  opayTxnId: string
  reference?: string | null
  amount: number
  currency: string
  status: 'success' | 'failed' | 'pending' | 'reversed'
  channel?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  fee?: number
  settledAmount?: number
  opayCreatedAt: Date
}

const PROD_BASE = 'https://cashierapi.opayweb.com'

/** Load the active OPay settings from the database and decrypt credentials. */
export async function getOpayConfig(): Promise<OpayConfig | null> {
  const setting = await db.opaySetting.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!setting) return null
  return {
    merchantId: setting.merchantId,
    apiKey: decrypt(setting.apiKeyEnc),
    secretKey: decrypt(setting.secretKeyEnc),
    environment: setting.environment as 'sandbox' | 'production',
  }
}

/** Sign a request body with HMAC-SHA512 (OPay's merchant signature scheme). */
function sign(body: string, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(body).digest('hex')
}

/** Test that the configured credentials are valid. */
export async function testOpayConnection(config: OpayConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.merchantId || !config.apiKey || !config.secretKey) {
    return { ok: false, message: 'Missing merchant ID, API key, or secret key.' }
  }
  if (config.environment === 'sandbox') {
    if (config.merchantId.length < 6) return { ok: false, message: 'Merchant ID looks too short.' }
    if (config.apiKey.length < 8) return { ok: false, message: 'API key looks too short.' }
    if (config.secretKey.length < 8) return { ok: false, message: 'Secret key looks too short.' }
    return { ok: true, message: 'Sandbox connection validated. You can now sync sample transactions.' }
  }
  try {
    const body = JSON.stringify({ merchantId: config.merchantId, pageNo: 1, pageSize: 1 })
    const res = await fetch(`${PROD_BASE}/api/v1/transactions/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'OPAY-SIGN': sign(body, config.secretKey),
      },
      body,
    })
    if (!res.ok) return { ok: false, message: `OPay returned HTTP ${res.status}.` }
    return { ok: true, message: 'Production connection successful. Credentials verified.' }
  } catch (e: any) {
    return { ok: false, message: `Network error: ${e.message}` }
  }
}

/** Fetch transactions from OPay (or generate mock data in sandbox). */
export async function fetchTransactions(
  config: OpayConfig,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
  limit: number = 50
): Promise<OpayTransactionDTO[]> {
  if (config.environment === 'sandbox') {
    return generateMockTransactions(since, limit)
  }
  const all: OpayTransactionDTO[] = []
  let pageNo = 1
  const pageSize = 50
  while (all.length < limit) {
    const body = JSON.stringify({ merchantId: config.merchantId, pageNo, pageSize })
    const res = await fetch(`${PROD_BASE}/api/v1/transactions/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'OPAY-SIGN': sign(body, config.secretKey),
      },
      body,
    })
    if (!res.ok) throw new Error(`OPay list returned HTTP ${res.status}`)
    const json = await res.json()
    const records: any[] = json?.data?.records ?? []
    if (records.length === 0) break
    for (const r of records) {
      const ts = new Date(r.createdAt || r.createdTime || Date.now())
      if (ts < since) continue
      all.push({
        opayTxnId: String(r.orderId || r.transactionId || r.id),
        reference: r.reference ?? null,
        amount: Number(r.amount ?? 0),
        currency: r.currency ?? 'NGN',
        status: (r.status || 'pending').toLowerCase(),
        channel: r.paymentMethod ?? r.channel ?? null,
        customerName: r.customerName ?? r.userName ?? null,
        customerEmail: r.customerEmail ?? null,
        customerPhone: r.customerPhone ?? r.userPhone ?? null,
        fee: Number(r.fee ?? 0),
        settledAmount: Number(r.settledAmount ?? r.amount ?? 0),
        opayCreatedAt: ts,
      })
    }
    if (records.length < pageSize) break
    pageNo++
  }
  return all.slice(0, limit)
}

// ─── Mock data generator for sandbox mode ──────────────────────────────

const MOCK_NAMES = ['Chidi Okafor', 'Ngozi Adeyemi', 'Bisi Adewale', 'Emeka Nwosu', 'Ada Eze', 'Tunde Bakare', 'Grace Okonkwo', 'Yakubu Mohammed', 'Aisha Bello', 'Funke Ibrahim']
const MOCK_CHANNELS = ['card', 'bank', 'wallet', 'ussd', 'qr']
const MOCK_STATUSES: OpayTransactionDTO['status'][] = ['success', 'success', 'success', 'success', 'success', 'success', 'failed', 'pending', 'reversed']

function generateMockTransactions(since: Date, limit: number): OpayTransactionDTO[] {
  const out: OpayTransactionDTO[] = []
  const count = Math.min(limit, 15 + Math.floor(Math.random() * 25))
  for (let i = 0; i < count; i++) {
    const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)]
    const status = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)]
    const amount = [5000, 12000, 25000, 47500, 100000, 250000, 750000, 1_500_000][Math.floor(Math.random() * 8)]
    const fee = Math.round(amount * 0.015)
    const settled = status === 'success' ? amount - fee : 0
    const ts = new Date(since.getTime() + Math.random() * (Date.now() - since.getTime()))
    out.push({
      opayTxnId: `OPAY${ts.getTime()}${i}`,
      reference: `LEADFIX-${ts.getTime().toString(36).toUpperCase()}-${i}`,
      amount,
      currency: 'NGN',
      status,
      channel: MOCK_CHANNELS[Math.floor(Math.random() * MOCK_CHANNELS.length)],
      customerName: name,
      customerEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
      customerPhone: `+234 80${Math.floor(10000000 + Math.random() * 89999999)}`,
      fee,
      settledAmount: settled,
      opayCreatedAt: ts,
    })
  }
  return out.sort((a, b) => b.opayCreatedAt.getTime() - a.opayCreatedAt.getTime())
}
