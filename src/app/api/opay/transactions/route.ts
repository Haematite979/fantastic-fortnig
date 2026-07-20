import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/opay/transactions — list fetched OPay transactions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const auditStatus = searchParams.get('auditStatus')
  const q = searchParams.get('q')

  const where: any = {}
  if (status && status !== 'all') where.status = status
  if (auditStatus && auditStatus !== 'all') where.auditStatus = auditStatus
  if (q) {
    where.OR = [
      { opayTxnId: { contains: q } },
      { reference: { contains: q } },
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
    ]
  }

  const transactions = await db.opayTransaction.findMany({
    where,
    orderBy: { opayCreatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ transactions })
}
