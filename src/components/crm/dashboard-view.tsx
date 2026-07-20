'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, DollarSign, TrendingUp, Trophy, Sparkles, Wand2, RefreshCw,
  ArrowRight, Calendar, Phone as PhoneIcon, Mail as MailIcon, Users as UsersIcon,
  StickyNote, ListTodo, Presentation, AlertCircle,
} from 'lucide-react'
import { useCRMStore, type Analytics, type Insight, type Activity, formatMoney, timeAgo, INSIGHT_META, PRIORITY_META } from '@/lib/crm-store'
import { StatCard } from './stat-card'
import { InsightCard } from './insight-card'
import { CustomerAvatar } from './avatar'
import { toast } from 'sonner'

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: PhoneIcon, email: MailIcon, meeting: UsersIcon, note: StickyNote, task: ListTodo, demo: Presentation,
}

export function DashboardView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const setView = useCRMStore((s) => s.setView)
  const selectCustomer = useCRMStore((s) => s.selectCustomer)
  const refresh = useCRMStore((s) => s.refresh)

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then((r) => r.json()),
      fetch('/api/insights').then((r) => r.json()),
      fetch('/api/activities').then((r) => r.json()),
    ]).then(([a, i, act]) => {
      setAnalytics(a)
      setInsights(i.insights || [])
      setActivities(act.activities?.slice(0, 8) || [])
    })
  }, [refreshKey])

  async function generate() {
    setGenerating(true)
    toast.info('AI is analyzing your CRM...', { duration: 1500 })
    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      const d = await res.json()
      if (d.count !== undefined) {
        toast.success(`Generated ${d.count} fresh insights`)
        refresh()
      }
    } catch {
      toast.error('Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }

  const topInsights = insights.slice(0, 4)
  const s = analytics?.summary

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider opacity-90">AI Sales Co-pilot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-2xl">
            Welcome back. Your AI found {insights.length} ways to grow revenue this week.
          </h1>
          <p className="text-sm opacity-90 max-w-xl">
            {s?.highPriorityInsights || 0} high-priority opportunities need your attention. Tap generate to refresh
            recommendations based on the latest customer activity.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={generate}
              disabled={generating}
              className="bg-white text-emerald-700 hover:bg-white/90"
            >
              {generating ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
              {generating ? 'Analyzing...' : 'Generate AI Insights'}
            </Button>
            <Button
              onClick={() => setView('insights')}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              View all insights <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      {s && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Customers" value={String(s.totalCustomers)} delta={`${s.activeCustomers} active · ${s.leads} leads`} deltaDirection="up" icon={Users} accent="#10b981" />
          <StatCard label="Open Pipeline" value={formatMoney(s.totalPipeline)} delta={`${formatMoney(s.weightedPipeline)} weighted`} deltaDirection="up" icon={DollarSign} accent="#06b6d4" />
          <StatCard label="Total LTV" value={formatMoney(s.totalLTV)} delta={`${s.wonCount} deals won`} deltaDirection="up" icon={TrendingUp} accent="#8b5cf6" />
          <StatCard label="Win Rate" value={`${s.winRate}%`} delta={`${s.openInsights} open insights`} deltaDirection={s.winRate >= 50 ? 'up' : 'down'} icon={Trophy} accent="#f59e0b" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* AI insights */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Top AI insights for you
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setView('insights')}>
              See all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          {topInsights.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />
                <p className="text-sm font-medium">No insights yet</p>
                <p className="text-xs text-muted-foreground mt-1">Generate AI insights to see recommendations here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {topInsights.map((i) => <InsightCard key={i.id} insight={i} compact />)}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <Button variant="ghost" size="sm" onClick={() => setView('activities')}>
              See all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-3">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No recent activity.</p>
              ) : (
                <div className="space-y-1">
                  {activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] || StickyNote
                    return (
                      <button
                        key={a.id}
                        onClick={() => { selectCustomer(a.customerId); setView('customers') }}
                        className="flex items-start gap-2.5 w-full text-left p-2 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {a.customer?.name} · {a.customer?.company}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">{timeAgo(a.createdAt)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health check */}
          {analytics && s && s.churned > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 flex gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Win-back opportunity</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {s.churned} churned customer{s.churned > 1 ? 's' : ''} in your database. Generate AI insights to surface win-back plays.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Customer status summary */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customer book at a glance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {analytics.statusBreakdown.map((b) => (
                <div key={b.name} className="rounded-lg p-3 border" style={{ backgroundColor: `${b.color}0a`, borderColor: `${b.color}30` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-xs font-medium">{b.name}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1" style={{ color: b.color }}>{b.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
