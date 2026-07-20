import { db } from '@/lib/db'

/**
 * Returns the workspace user. Since this CRM runs without authentication,
 * we use a single demo user to represent the signed-in owner. The user is
 * created on first access and reused thereafter.
 */
export async function getOrCreateDemoUser() {
  const existing = await db.user.findFirst({ include: { subscription: true } })
  if (existing) return existing

  // Create a default demo user with a Free subscription
  const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444']
  return db.user.create({
    data: {
      email: 'owner@pulse.demo',
      name: 'Workspace Owner',
      companyName: 'My Company',
      avatarColor: colors[0],
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
          monthlyAmount: 0,
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { subscription: true },
  })
}
