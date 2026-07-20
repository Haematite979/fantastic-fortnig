import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/deals — list, optionally filter by stage
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')

  const where: any = {}
  if (stage && stage !== 'all') where.stage = stage

  const deals = await db.deal.findMany({
    where,
    include: { customer: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ deals })
}

// POST /api/deals
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title || !body.customerId || body.value === undefined) {
    return NextResponse.json({ error: 'title, customerId, and value are required' }, { status: 400 })
  }

  const deal = await db.deal.create({
    data: {
      title: body.title,
      customerId: body.customerId,
      value: Number(body.value),
      stage: body.stage ?? 'lead',
      probability: body.probability ? Number(body.probability) : 15,
      expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
      source: body.source ?? null,
    },
    include: { customer: true },
  })

  return NextResponse.json({ deal }, { status: 201 })
}
