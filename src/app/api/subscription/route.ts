import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrCreateDemoUser } from '@/lib/demo-user'
import { getPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

// GET /api/subscription — current user's subscription
export async function GET() {
  const user = await getOrCreateDemoUser()
  return NextResponse.json({
    subscription: user.subscription
      ? { ...user.subscription, plan: getPlan(user.subscription.plan) }
      : null,
  })
}

// POST /api/subscription — change plan (subscribe / upgrade / cancel)
export async function POST(req: NextRequest) {
  const user = await getOrCreateDemoUser()
  const body = await req.json()
  const { action, plan: planKey } = body // action: 'subscribe' | 'cancel'

  if (action === 'subscribe') {
    const plan = getPlan(planKey)
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const subscription = user.subscription
      ? await db.subscription.update({
          where: { userId: user.id },
          data: {
            plan: plan.key,
            status: 'active',
            monthlyAmount: plan.monthlyAmount,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        })
      : await db.subscription.create({
          data: {
            userId: user.id,
            plan: plan.key,
            status: 'active',
            monthlyAmount: plan.monthlyAmount,
            currentPeriodEnd: periodEnd,
          },
        })

    return NextResponse.json({ ok: true, subscription })
  }

  if (action === 'cancel') {
    if (!user.subscription) return NextResponse.json({ error: 'No subscription' }, { status: 404 })

    const subscription = await db.subscription.update({
      where: { userId: user.id },
      data: { cancelAtPeriodEnd: true, status: 'active' },
    })

    return NextResponse.json({ ok: true, subscription })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
