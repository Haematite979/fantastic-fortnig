import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInsights } from '@/lib/insight-engine'

export const dynamic = 'force-dynamic'

// GET /api/insights — list insights
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const includeDismissed = searchParams.get('includeDismissed') === 'true'
  const customerId = searchParams.get('customerId')

  const where: any = {}
  if (!includeDismissed) where.dismissed = false
  if (customerId) where.customerId = customerId

  const insights = await db.insight.findMany({
    where,
    include: { customer: { select: { id: true, name: true, company: true, avatarColor: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ insights })
}

// POST /api/insights — regenerate insights via AI engine
export async function POST() {
  const result = await generateInsights()
  return NextResponse.json(result)
}
