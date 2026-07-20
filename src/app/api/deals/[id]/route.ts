import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/deals/[id] — update stage, value, probability, etc.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['title', 'stage', 'source']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.value !== undefined) data.value = Number(body.value)
  if (body.probability !== undefined) data.probability = Number(body.probability)
  if (body.expectedClose !== undefined) data.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null

  // If a deal is moved to won/lost, bump customer LTV on win
  const deal = await db.deal.update({ where: { id }, data, include: { customer: true } })

  if (body.stage === 'won' && deal.customer) {
    await db.customer.update({
      where: { id: deal.customerId },
      data: { lifetimeValue: { increment: deal.value }, status: 'active' },
    })
  }

  return NextResponse.json({ deal })
}

// DELETE /api/deals/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.deal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
