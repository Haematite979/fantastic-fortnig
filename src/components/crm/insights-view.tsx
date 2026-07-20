'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, RefreshCw, Wand2, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Bell } from 'lucide-react'
import { useCRMStore, type Insight, INSIGHT_META, PRIORITY_META } from '@/lib/crm-store'
import { InsightCard } from './insight-card'
import { toast } from 'sonner'

export function InsightsView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const refresh = useCRMStore((s) => s.refresh)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => { setInsights(d.insights || []); setLoading(false) })
  }, [refreshKey])

  async function generate() {
    setGenerating(true)
    toast.info('AI is analyzing your CRM data...', { duration: 1500 })
    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      const d = await res.json()
      if (d.count !== undefined) {
        toast.success(`Generated ${d.count} fresh insights`)
        refresh()
      } else {
        throw new Error(d.error || 'Failed to generate insights')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // Group by type
  const grouped = (['opportunity', 'risk', 'recommendation', 'trend', 'alert'] as Insight['type'][])
    .map((type) => ({ type, items: insights.filter((i) => i.type === type) }))
    .filter((g) => g.items.length > 0)

  const TYPE_ICONS: Record<Insight['type'], React.ComponentType<{ className?: string }>> = {
    opportunity: TrendingUp,
    risk: AlertTriangle,
    recommendation: Lightbulb,
    trend: BarChart3,
    alert: Bell,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600" /> AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {insights.length} actionable insights · {insights.filter((i) => i.priority === 'high').length} high priority
          </p>
        </div>
        <Button onClick={generate} disabled={generating} size="lg" className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600">
          {generating ? (
            <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing...</>
          ) : (
            <><Wand2 className="h-4 w-4 mr-1.5" /> Generate Fresh Insights</>
          )}
        </Button>
      </div>

      {/* How it works strip */}
      <Card className="bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-transparent border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">How the AI co-pilot works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The engine scans every customer, deal, and activity in your CRM, then combines rule-based heuristics
                (stalling deals, win-back signals, cold leads, expansion opportunities) with a Z.ai LLM-generated
                strategic insight. Every suggestion comes with a concrete action and an estimated revenue impact.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-emerald-500/40" />
            <p className="font-medium">No active insights</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Generate Fresh Insights" to let the AI analyze your CRM.</p>
            <Button onClick={generate} disabled={generating} className="mt-4">
              <Wand2 className="h-4 w-4 mr-1.5" /> Generate now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => {
            const Icon = TYPE_ICONS[g.type]
            const meta = INSIGHT_META[g.type]
            return (
              <section key={g.type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: meta.color }}>
                    {g.type === 'opportunity' ? 'Opportunities' : `${meta.label}s`} <span className="text-muted-foreground font-normal">({g.items.length})</span>
                  </h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((i) => <InsightCard key={i.id} insight={i} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
