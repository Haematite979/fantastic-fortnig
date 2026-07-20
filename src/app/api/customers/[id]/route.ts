import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/customers/[id] — full detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { updatedAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' } },
      insights: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}

// PATCH /api/customers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'email', 'phone', 'company', 'jobTitle', 'industry', 'location', 'status', 'notes', 'avatarColor']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags) ? body.tags.join(',') : body.tags
  }
  if (body.lifetimeValue !== undefined) data.lifetimeValue = Number(body.lifetimeValue)

  const customer = await db.customer.update({ where: { id }, data })
  return NextResponse.json({ customer })
}

// DELETE /api/customers/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.customer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
