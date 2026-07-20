/**
 * Subscription plans for Pulse CRM.
 * All prices in Naira (₦), billed monthly.
 */

export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise'

export interface Plan {
  key: PlanKey
  name: string
  monthlyAmount: number // Naira
  tagline: string
  highlight?: boolean
  features: string[]
  limits: {
    customers: number // -1 = unlimited
    deals: number
    aiInsightsPerMonth: number
    users: number
  }
}

export const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    monthlyAmount: 0,
    tagline: 'For solo founders just getting started',
    features: [
      'Up to 50 customers',
      'Up to 25 deals in pipeline',
      '10 AI insights per month',
      '1 user',
      'Community support',
    ],
    limits: { customers: 50, deals: 25, aiInsightsPerMonth: 10, users: 1 },
  },
  {
    key: 'starter',
    name: 'Starter',
    monthlyAmount: 15000, // ₦15,000/mo
    tagline: 'For small teams closing their first 100 deals',
    highlight: true,
    features: [
      'Up to 500 customers',
      'Unlimited deals',
      '100 AI insights per month',
      '3 users',
      'Email support',
    ],
    limits: { customers: 500, deals: -1, aiInsightsPerMonth: 100, users: 3 },
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyAmount: 45000, // ₦45,000/mo
    tagline: 'For scaling sales teams that need automation',
    features: [
      'Unlimited customers',
      'Unlimited deals',
      'Unlimited AI insights',
      '10 users',
      'Priority support',
      'Custom AI insight rules',
    ],
    limits: { customers: -1, deals: -1, aiInsightsPerMonth: -1, users: 10 },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyAmount: 150000, // ₦150,000/mo
    tagline: 'For large teams with advanced needs',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Dedicated success manager',
      '99.9% uptime SLA',
      'Custom integrations',
      'On-site training',
    ],
    limits: { customers: -1, deals: -1, aiInsightsPerMonth: -1, users: -1 },
  },
]

export function getPlan(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key)
}

export function formatMonthly(amount: number): string {
  return `₦${amount.toLocaleString()}/mo`
}
