'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import { BarChart3, TrendingUp, DollarSign, Target, Trophy, Calendar } from 'lucide-react'
import { useCRMStore, type Analytics, STAGE_META, formatMoney } from '@/lib/crm-store'
import { CustomerAvatar } from './avatar'
import { StatCard } from './stat-card'

export function AnalyticsView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const selectCustomer = useCRMStore((s) => s.selectCustomer)
  const setView = useCRMStore((s) => s.setView)
  const [data, setData] = useState<Analytics | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : '#eee'
  const tickColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'

  useEffect(() => {
    fetch('/api/analytics').then((r) => r.json()).then(setData)
  }, [refreshKey])

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="animate-pulse h-32" />)}
      </div>
    )
  }

  const s = data.summary
  const stageChartData = data.stageBreakdown.map((d) => ({
    name: STAGE_META[d.stage as keyof typeof STAGE_META]?.label ?? d.stage,
    value: d.value,
    count: d.count,
    color: STAGE_META[d.stage as keyof typeof STAGE_META]?.color ?? '#888',
  }))

  const activityChartData = data.activityByDay.map((d) => ({
    date: d.date.slice(5),
    count: d.count,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-600" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sales performance, pipeline health, and trends at a glance.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total LTV" value={formatMoney(s.totalLTV)} delta={`${s.activeCustomers} active customers`} deltaDirection="neutral" icon={DollarSign} accent="#10b981" />
        <StatCard label="Open Pipeline" value={formatMoney(s.totalPipeline)} delta={`${formatMoney(s.weightedPipeline)} weighted`} deltaDirection="up" icon={TrendingUp} accent="#06b6d4" />
        <StatCard label="Won This Period" value={formatMoney(s.wonValue)} delta={`${s.wonCount} deals won`} deltaDirection="up" icon={Trophy} accent="#8b5cf6" />
        <StatCard label="Win Rate" value={`${s.winRate}%`} delta={`${s.wonCount}W / ${s.lostCount}L`} deltaDirection={s.winRate >= 50 ? 'up' : 'down'} icon={Target} accent="#f59e0b" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline by stage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Pipeline value by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stageChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `\u20A6${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                  formatter={(v: number) => [`\u20A6${v.toLocaleString()}`, 'Value']}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${gridStroke}`, fontSize: 12, background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stageChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customers by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                  style={{ fontSize: 11, fill: tickColor }}
                >
                  {data.statusBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${gridStroke}`, fontSize: 12, background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Activity — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activityChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${gridStroke}`, fontSize: 12, background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#actGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top industries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">LTV by industry</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byIndustry.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `\u20A6${(v / 1_000_000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="industry" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} formatter={(v: number) => [`\u20A6${v.toLocaleString()}`, 'LTV']} contentStyle={{ borderRadius: 8, border: `1px solid ${gridStroke}`, fontSize: 12, background: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' }} />
                <Bar dataKey="ltv" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming activities */}
      {data.upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-600" /> Upcoming scheduled activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcoming.map((a) => {
                const days = Math.ceil((new Date(a.scheduledAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <button
                    key={a.id}
                    onClick={() => { selectCustomer(a.customerId); setView('customers') }}
                    className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-muted/50"
                  >
                    {a.customer && <CustomerAvatar name={a.customer.name} color={a.customer.avatarColor} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.customer?.name} · {a.customer?.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.scheduledAt!).toLocaleDateString()}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
