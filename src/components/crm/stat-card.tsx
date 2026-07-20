'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
  accent?: string // hex
}

export function StatCard({ label, value, delta, deltaDirection, icon: Icon, accent = '#10b981' }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          {Icon && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {delta && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {deltaDirection === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />}
            {deltaDirection === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
            <span
              className={cn(
                'font-medium',
                deltaDirection === 'up' && 'text-emerald-600',
                deltaDirection === 'down' && 'text-red-500',
                deltaDirection === 'neutral' && 'text-muted-foreground'
              )}
            >
              {delta}
            </span>
          </div>
        )}
      </CardContent>
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accent }}
      />
    </Card>
  )
}
