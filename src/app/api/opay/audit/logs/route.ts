import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/opay/audit/logs — fetch audit history
export async function GET() {
  const logs = await db.auditLog.findMany({
    orderBy: { auditDate: 'desc' },
    take: 30,
  })
  return NextResponse.json({ logs })
}
