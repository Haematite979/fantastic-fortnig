import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/insights/[id] — dismiss or update priority
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.dismissed !== undefined) data.dismissed = !!body.dismissed
  if (body.priority !== undefined) data.priority = body.priority

  const insight = await db.insight.update({ where: { id }, data })
  return NextResponse.json({ insight })
}
