'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Lightbulb,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import { type Insight, INSIGHT_META, PRIORITY_META, useCRMStore } from '@/lib/crm-store'
import { cn } from '@/lib/utils'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Bell,
}

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const meta = INSIGHT_META[insight.type]
  const pri = PRIORITY_META[insight.priority]
  const Icon = ICONS[meta.icon] || Sparkles
  const selectCustomer = useCRMStore((s) => s.selectCustomer)
  const setView = useCRMStore((s) => s.setView)
  const refresh = useCRMStore((s) => s.refresh)

  async function dismiss() {
    await fetch(`/api/insights/${insight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: true }),
    })
    refresh()
  }

  function openCustomer() {
    if (!insight.customerId) return
    selectCustomer(insight.customerId)
    setView('customers')
  }

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-md"
      style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className="text-[10px] uppercase tracking-wide"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}30` }}
              >
                {meta.label}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide"
                style={{ color: pri.color, borderColor: `${pri.color}40` }}
              >
                {pri.label} priority
              </Badge>
              {insight.customer && (
                <button
                  onClick={openCustomer}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline truncate max-w-[160px]"
                >
                  {insight.customer.name} · {insight.customer.company}
                </button>
              )}
            </div>
            <h4 className="text-sm font-semibold leading-tight">{insight.title}</h4>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss insight"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className={cn('text-sm text-muted-foreground leading-relaxed', compact && 'line-clamp-2')}>
          {insight.body}
        </p>

        {insight.action && (
          <div className="flex items-start gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 p-2.5">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{insight.action}</p>
          </div>
        )}

        {insight.impact && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {insight.impact}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
