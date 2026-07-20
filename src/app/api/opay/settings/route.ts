import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encrypt, decrypt, maskSecret } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

// GET /api/opay/settings — returns the active OPay config (masked, never plaintext)
export async function GET() {
  const setting = await db.opaySetting.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!setting) return NextResponse.json({ setting: null })

  return NextResponse.json({
    setting: {
      id: setting.id,
      merchantId: setting.merchantId,
      apiKeyMasked: maskSecret(decrypt(setting.apiKeyEnc)),
      secretKeyMasked: maskSecret(decrypt(setting.secretKeyEnc)),
      environment: setting.environment,
      isActive: setting.isActive,
      lastSyncAt: setting.lastSyncAt,
      lastAuditAt: setting.lastAuditAt,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    },
  })
}

// POST /api/opay/settings — create or update the OPay credentials
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { merchantId, apiKey, secretKey, environment } = body

  // Server-side validation — defense in depth
  if (!merchantId || typeof merchantId !== 'string' || merchantId.length < 4) {
    return NextResponse.json({ error: 'Merchant ID must be at least 4 characters.' }, { status: 400 })
  }
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
    return NextResponse.json({ error: 'API key must be at least 8 characters.' }, { status: 400 })
  }
  if (!secretKey || typeof secretKey !== 'string' || secretKey.length < 8) {
    return NextResponse.json({ error: 'Secret key must be at least 8 characters.' }, { status: 400 })
  }
  if (!['sandbox', 'production'].includes(environment)) {
    return NextResponse.json({ error: 'Environment must be "sandbox" or "production".' }, { status: 400 })
  }

  const apiKeyEnc = encrypt(apiKey)
  const secretKeyEnc = encrypt(secretKey)

  // Deactivate any existing settings (only one active at a time)
  await db.opaySetting.updateMany({ where: { isActive: true }, data: { isActive: false } })

  const setting = await db.opaySetting.create({
    data: { merchantId, apiKeyEnc, secretKeyEnc, environment, isActive: true },
  })

  return NextResponse.json({
    setting: {
      id: setting.id,
      merchantId: setting.merchantId,
      apiKeyMasked: maskSecret(apiKey),
      secretKeyMasked: maskSecret(secretKey),
      environment: setting.environment,
      isActive: setting.isActive,
      lastSyncAt: setting.lastSyncAt,
      lastAuditAt: setting.lastAuditAt,
    },
  }, { status: 201 })
}

// DELETE /api/opay/settings — remove the active OPay credentials
export async function DELETE() {
  await db.opaySetting.updateMany({ where: { isActive: true }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
