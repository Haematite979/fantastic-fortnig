import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrCreateDemoUser } from '@/lib/demo-user'

export const dynamic = 'force-dynamic'

// GET /api/me — current user's profile + subscription
export async function GET() {
  const user = await getOrCreateDemoUser()
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    },
    subscription: user.subscription,
  })
}

// PATCH /api/me — update profile
export async function PATCH(req: NextRequest) {
  const user = await getOrCreateDemoUser()
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'companyName', 'role', 'avatarColor']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 2)) {
    return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, companyName: true, role: true, avatarColor: true, createdAt: true },
  })

  return NextResponse.json({ user: updated })
}
