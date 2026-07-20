import { NextResponse } from 'next/server'
import { getOrCreateDemoUser } from '@/lib/demo-user'

export const dynamic = 'force-dynamic'

// POST /api/profile/init — ensure the demo user exists (called on app load)
export async function POST() {
  const user = await getOrCreateDemoUser()
  return NextResponse.json({ ok: true, userId: user.id })
}
