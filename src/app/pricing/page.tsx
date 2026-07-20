'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Check, Sparkles, ArrowLeft, Loader2, CreditCard, CheckCircle2 } from 'lucide-react'
import { PLANS, type Plan, formatMonthly } from '@/lib/plans'
import { toast } from 'sonner'
import Link from 'next/link'

export default function PricingPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    // Initialize the demo user (creates if doesn't exist) then fetch subscription
    fetch('/api/profile/init', { method: 'POST' }).then(() =>
      fetch('/api/subscription').then((r) => r.json()).then((d) => {
        setCurrentPlan(d.subscription?.plan ?? 'free')
        setLoading(false)
      })
    )
  }, [])

  async function subscribe(plan: Plan) {
    setSubscribing(plan.key)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', plan: plan.key }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to subscribe')

      setCurrentPlan(plan.key)
      if (plan.key === 'free') {
        toast.success(`You're on the ${plan.name} plan`)
      } else {
        toast.success(`Subscribed to ${plan.name}! ₦${plan.monthlyAmount.toLocaleString()}/mo`)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubscribing(null)
    }
  }

  async function cancelSubscription() {
    setSubscribing('cancel')
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      toast.success("Subscription will cancel at the end of the current period. You'll move to Free then.")
      setCurrentPlan('free')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center opacity-10 dark:opacity-0 pointer-events-none" style={{ backgroundImage: 'url(/bg-light.png)' }} aria-hidden />
      <div className="fixed inset-0 bg-cover bg-center opacity-0 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'url(/bg-dark.png)' }} aria-hidden />

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="font-bold">Pulse CRM</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-3 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            <Sparkles className="h-3 w-3 mr-1" /> Monthly subscription · Naira pricing
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choose your plan</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Start free, upgrade when you grow. All plans include the AI sales co-pilot, pipeline tracking, and analytics.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key
            return (
              <Card
                key={plan.key}
                className={`relative flex flex-col ${plan.highlight ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : ''} ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white">Most popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.monthlyAmount === 0 ? 'Free' : formatMonthly(plan.monthlyAmount)}</span>
                    {plan.monthlyAmount > 0 && <span className="text-xs text-muted-foreground"> · billed monthly</span>}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => subscribe(plan)}
                    disabled={isCurrent || !!subscribing}
                    variant={isCurrent ? 'outline' : plan.highlight ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {subscribing === plan.key ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1.5" />
                    )}
                    {isCurrent ? 'Current plan' : subscribing === plan.key ? 'Processing...' : plan.monthlyAmount === 0 ? 'Switch to Free' : `Subscribe · ${formatMonthly(plan.monthlyAmount)}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Cancel + footer */}
        {currentPlan !== 'free' && (
          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={cancelSubscription} disabled={subscribing === 'cancel'} className="text-red-600 hover:text-red-700">
              {subscribing === 'cancel' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Cancel subscription
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1">Cancels at the end of the current billing period. No refunds.</p>
          </div>
        )}

        <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border p-4">
            <p className="text-2xl font-bold text-emerald-600">No lock-in</p>
            <p className="text-xs text-muted-foreground mt-1">Cancel anytime. Keep your data — export customers and deals as CSV.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-2xl font-bold text-emerald-600">₦ pricing</p>
            <p className="text-xs text-muted-foreground mt-1">Transparent monthly billing in Naira. No hidden fees or FX surprises.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-2xl font-bold text-emerald-600">Instant</p>
            <p className="text-xs text-muted-foreground mt-1">Plans activate immediately. Upgrade, downgrade, or cancel in one click.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
