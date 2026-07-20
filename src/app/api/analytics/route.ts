import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/analytics — aggregate stats for the dashboard
export async function GET() {
  const [customers, deals, activities, insights] = await Promise.all([
    db.customer.findMany({ include: { deals: true } }),
    db.deal.findMany(),
    db.activity.findMany({ take: 500, orderBy: { createdAt: 'desc' } }),
    db.insight.findMany({ where: { dismissed: false } }),
  ])

  const now = new Date()
  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.status === 'active').length
  const leads = customers.filter((c) => c.status === 'lead').length
  const churned = customers.filter((c) => c.status === 'churned').length
  const prospects = customers.filter((c) => c.status === 'prospect').length

  const totalLTV = customers.reduce((s, c) => s + c.lifetimeValue, 0)

  // Pipeline stats
  const pipelineByStage: Record<string, { count: number; value: number }> = {}
  for (const d of deals) {
    if (!pipelineByStage[d.stage]) pipelineByStage[d.stage] = { count: 0, value: 0 }
    pipelineByStage[d.stage].count++
    pipelineByStage[d.stage].value += d.value
  }
  const totalPipeline = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + d.value, 0)
  const weightedPipeline = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value * d.probability) / 100, 0)
  const wonValue = deals.filter((d) => d.stage === 'won').reduce((s, d) => s + d.value, 0)
  const lostValue = deals.filter((d) => d.stage === 'lost').reduce((s, d) => s + d.value, 0)
  const wonCount = deals.filter((d) => d.stage === 'won').length
  const lostCount = deals.filter((d) => d.stage === 'lost').length
  const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0

  // Industry breakdown
  const industryMap = new Map<string, { count: number; ltv: number }>()
  for (const c of customers) {
    if (!c.industry) continue
    const cur = industryMap.get(c.industry) || { count: 0, ltv: 0 }
    cur.count++
    cur.ltv += c.lifetimeValue
    industryMap.set(c.industry, cur)
  }
  const byIndustry = Array.from(industryMap.entries())
    .map(([industry, v]) => ({ industry, ...v }))
    .sort((a, b) => b.ltv - a.ltv)

  // Status breakdown for chart
  const statusBreakdown = [
    { name: 'Active', value: activeCustomers, color: '#10b981' },
    { name: 'Prospects', value: prospects, color: '#f59e0b' },
    { name: 'Leads', value: leads, color: '#06b6d4' },
    { name: 'Churned', value: churned, color: '#ef4444' },
  ]

  // Stage breakdown for chart
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const stageBreakdown = stageOrder.map((stage) => ({
    stage,
    count: pipelineByStage[stage]?.count || 0,
    value: pipelineByStage[stage]?.value || 0,
  }))

  // Activity over last 14 days
  const activityByDay: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    const count = activities.filter((a) => a.createdAt.toISOString().slice(0, 10) === dayStr).length
    activityByDay.push({ date: dayStr, count })
  }

  // Upcoming activities (scheduled in future)
  const upcoming = activities
    .filter((a) => a.scheduledAt && a.scheduledAt > now)
    .sort((a, b) => (a.scheduledAt!.getTime() - b.scheduledAt!.getTime()))
    .slice(0, 10)

  return NextResponse.json({
    summary: {
      totalCustomers,
      activeCustomers,
      leads,
      prospects,
      churned,
      totalLTV,
      totalPipeline,
      weightedPipeline,
      wonValue,
      lostValue,
      winRate: Math.round(winRate),
      wonCount,
      lostCount,
      openInsights: insights.length,
      highPriorityInsights: insights.filter((i) => i.priority === 'high').length,
    },
    statusBreakdown,
    stageBreakdown,
    byIndustry,
    activityByDay,
    upcoming,
  })
}
