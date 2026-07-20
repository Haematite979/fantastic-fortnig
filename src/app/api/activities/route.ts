import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/activities — list with optional customer filter
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')

  const where: any = {}
  if (customerId) where.customerId = customerId

  const activities = await db.activity.findMany({
    where,
    include: { customer: { select: { id: true, name: true, company: true, avatarColor: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ activities })
}

// POST /api/activities
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.customerId || !body.type || !body.title) {
    return NextResponse.json({ error: 'customerId, type, and title are required' }, { status: 400 })
  }

  const activity = await db.activity.create({
    data: {
      customerId: body.customerId,
      dealId: body.dealId ?? null,
      type: body.type,
      title: body.title,
      description: body.description ?? null,
      outcome: body.outcome ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      completedAt: body.completedAt ? new Date(body.completedAt) : (body.scheduleLater ? null : new Date()),
    },
    include: { customer: { select: { id: true, name: true, company: true, avatarColor: true } } },
  })

  return NextResponse.json({ activity }, { status: 201 })
}
