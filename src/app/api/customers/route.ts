import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/customers — list with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  const where: any = {}
  if (status && status !== 'all') where.status = status
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { company: { contains: q } },
      { industry: { contains: q } },
    ]
  }

  const customers = await db.customer.findMany({
    where,
    include: {
      deals: { select: { id: true, title: true, value: true, stage: true, probability: true } },
      _count: { select: { activities: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ customers })
}

// POST /api/customers — create
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
  }

  const customer = await db.customer.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      company: body.company ?? null,
      jobTitle: body.jobTitle ?? null,
      industry: body.industry ?? null,
      location: body.location ?? null,
      status: body.status ?? 'lead',
      tags: Array.isArray(body.tags) ? body.tags.join(',') : (body.tags ?? ''),
      lifetimeValue: body.lifetimeValue ? Number(body.lifetimeValue) : 0,
      notes: body.notes ?? '',
      avatarColor: body.avatarColor ?? '#10b981',
    },
  })

  return NextResponse.json({ customer }, { status: 201 })
}
