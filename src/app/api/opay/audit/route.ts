import { NextResponse } from 'next/server'
import { runAudit } from '@/lib/audit-engine'

export const dynamic = 'force-dynamic'

// POST /api/opay/audit — run the daily audit
export async function POST() {
  try {
    const result = await runAudit('manual')
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: `Audit failed: ${e.message}` }, { status: 500 })
  }
}
