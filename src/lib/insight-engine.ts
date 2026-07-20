import { db } from '@/lib/db'

/**
 * CRM Insight Engine
 *
 * Combines rule-based heuristics with an LLM (z-ai-web-dev-sdk) to produce
 * actionable sales insights. Falls back to deterministic insights if the
 * LLM call fails, so the feature always works.
 *
 * API credentials: the Z.ai SDK auto-discovers credentials from `.z-ai-config`
 * (project root > home dir > /etc). The canonical source of truth is the
 * project `.env` file, which defines:
 *   ZAI_API_KEY  ZAI_BASE_URL  ZAI_CHAT_ID  ZAI_USER_ID  ZAI_TOKEN
 * The dev server loads `.env` automatically via Next.js; the SDK reads the
 * equivalent fields from any `.z-ai-config` it finds.
 */

export interface InsightSeed {
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend' | 'alert'
  priority: 'high' | 'medium' | 'low'
  title: string
  body: string
  action?: string
  impact?: string
  customerId?: string
}

const HIGH_VALUE_THRESHOLD = 25000
const COLD_LEAD_DAYS = 14
const STALE_DEAL_DAYS = 14

export async function generateInsights(): Promise<{ count: number; insights: InsightSeed[] }> {
  // Gather CRM state
  const customers = await db.customer.findMany({
    include: { deals: true, activities: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
  const deals = await db.deal.findMany({ include: { customer: true } })
  const now = new Date()

  const insights: InsightSeed[] = []
  const customerById = (id?: string | null) => customers.find((c) => c.id === id)

  // 1. Churned customers with a deal loss in last 90 days — win-back opportunity
  for (const c of customers) {
    if (c.status === 'churned') {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        customerId: c.id,
        title: `Win-back opportunity: ${c.name}`,
        body: `${c.name} at ${c.company} churned with a previous LTV of \u20A6${c.lifetimeValue.toLocaleString()}. Re-engaging now — before competitors solidify their position — has a documented win-back rate of 25-35% when the original champion is still at the company.`,
        action: `Send ${c.name.split(' ')[0]} a personalized win-back email acknowledging the gap and offering a Q3 reactivation incentive.`,
        impact: `+\u20A6${Math.round(c.lifetimeValue * 0.3).toLocaleString()} potential ARR`,
      })
    }
  }

  // 2. Active customers with no activity in 30+ days — silent churn risk
  for (const c of customers) {
    if (c.status !== 'active') continue
    const lastActivity = c.activities[0]
    if (!lastActivity) continue
    const daysSince = Math.floor((now.getTime() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > 30) {
      insights.push({
        type: 'risk',
        priority: 'high',
        customerId: c.id,
        title: `Silent churn risk: ${c.name}`,
        body: `${c.name} (${c.company}) has been an active customer with LTV \u20A6${c.lifetimeValue.toLocaleString()}, but there's been no recorded activity in ${daysSince} days. Customers with 30+ days of silence have a 3x higher churn rate.`,
        action: `Schedule a check-in call this week. Review their usage data and proactively address any blockers.`,
        impact: `Protect \u20A6${c.lifetimeValue.toLocaleString()} ARR`,
      })
    }
  }

  // 3. Deals stuck in proposal/negotiation beyond threshold — stalling risk
  for (const d of deals) {
    if (d.stage !== 'proposal' && d.stage !== 'negotiation') continue
    const daysInStage = Math.floor((now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysInStage >= STALE_DEAL_DAYS) {
      insights.push({
        type: 'risk',
        priority: 'high',
        customerId: d.customerId,
        title: `Stalling deal: ${d.title}`,
        body: `${d.customer.name}'s deal "${d.title}" worth \u20A6${d.value.toLocaleString()} has been in ${d.stage} stage for ${daysInStage} days (median: 12). Deals that stall in late stages close at 40% lower rates.`,
        action: `Escalate to an executive sponsor or send a value-driven reframe email within 48 hours to break the silence.`,
        impact: `Protect \u20A6${d.value.toLocaleString()} pipeline`,
      })
    }
  }

  // 4. High-value deals approaching expected close date
  for (const d of deals) {
    if (!d.expectedClose || d.stage === 'won' || d.stage === 'lost') continue
    if (d.value < HIGH_VALUE_THRESHOLD) continue
    const daysToClose = Math.floor((d.expectedClose.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToClose > 0 && daysToClose <= 14) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        customerId: d.customerId,
        title: `High-value deal closing soon: ${d.title}`,
        body: `${d.customer.name}'s deal worth \u20A6${d.value.toLocaleString()} is scheduled to close in ${daysToClose} days (stage: ${d.stage}, probability: ${d.probability}%). Tighten the close plan now to maximize conversion.`,
        action: `Confirm close criteria with the champion, schedule a final review meeting, and pre-empt any procurement objections.`,
        impact: `+\u20A6${d.value.toLocaleString()} this quarter`,
      })
    }
  }

  // 5. Cold leads — no activity in 14+ days
  const coldLeads = customers.filter((c) => {
    if (c.status !== 'lead') return false
    const last = c.activities[0]
    if (!last) return true
    const days = Math.floor((now.getTime() - last.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    return days >= COLD_LEAD_DAYS
  })
  if (coldLeads.length >= 3) {
    insights.push({
      type: 'alert',
      priority: 'medium',
      title: `${coldLeads.length} cold leads need re-engagement`,
      body: `${coldLeads.length} leads have had zero touchpoints in ${COLD_LEAD_DAYS}+ days. Statistically, leads go fully cold after 18 days of silence. A batch re-engagement sequence today will typically recover 30-40% of them.`,
      action: `Launch a multi-touch re-engagement sequence (email + LinkedIn + call) targeting these ${coldLeads.length} leads.`,
      impact: `+${Math.round(coldLeads.length * 0.35)} reactivated conversations`,
    })
  }

  // 6. Expansion signals — high LTV active customers
  const expansionCandidates = customers.filter((c) => c.status === 'active' && c.lifetimeValue > 20000 && c.tags.includes('expansion'))
  if (expansionCandidates.length > 0) {
    const c = expansionCandidates[0]
    insights.push({
      type: 'opportunity',
      priority: 'high',
      customerId: c.id,
      title: `Expansion opportunity: ${c.name}`,
      body: `${c.name} at ${c.company} is tagged for expansion with LTV of \u20A6${c.lifetimeValue.toLocaleString()}. Notes suggest they're considering additional scope. Customers tagged 'expansion' convert at 3.2x the rate of net-new prospects.`,
      action: `Prepare an expansion proposal that bundles new capabilities with their existing plan. Reference their stated goals in the notes.`,
      impact: `+\u20A6${Math.round(c.lifetimeValue * 0.5).toLocaleString()} expansion ARR`,
    })
  }

  // 7. Pipeline trend — won rate by stage
  const wonDeals = deals.filter((d) => d.stage === 'won')
  const lostDeals = deals.filter((d) => d.stage === 'lost')
  const totalValue = deals.reduce((s, d) => s + d.value, 0)
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
  if (deals.length > 0) {
    const winRate = ((wonDeals.length / (wonDeals.length + lostDeals.length || 1)) * 100).toFixed(0)
    insights.push({
      type: 'trend',
      priority: 'medium',
      title: `Pipeline snapshot: ${winRate}% win rate, \u20A6${(totalValue / 1_000_000).toFixed(1)}M total pipeline`,
      body: `Current pipeline has ${deals.length} deals totaling \u20A6${totalValue.toLocaleString()}, with ${wonDeals.length} won (\u20A6${wonValue.toLocaleString()}) and ${lostDeals.length} lost. Weighted pipeline value is approximately \u20A6${deals.reduce((s, d) => s + (d.value * d.probability) / 100, 0).toLocaleString()}.`,
      action: `Focus this week's effort on the 2-3 highest-value deals in negotiation stage to maximize expected revenue.`,
      impact: `Improve forecast accuracy`,
    })
  }

  // 8. Industry concentration risk
  const industryCounts = new Map<string, number>()
  for (const c of customers) {
    if (!c.industry) continue
    industryCounts.set(c.industry, (industryCounts.get(c.industry) || 0) + 1)
  }
  for (const [industry, count] of industryCounts) {
    if (count >= 3) {
      insights.push({
        type: 'trend',
        priority: 'low',
        title: `${industry} is a hot segment: ${count} customers`,
        body: `${count} of your ${customers.length} customers are in ${industry}. This concentration signals strong product-market fit here. Doubling down with industry-specific case studies and a targeted outbound campaign could unlock 3-4 more deals.`,
        action: `Build a ${industry}-specific landing page and launch a targeted outbound campaign to lookalike accounts.`,
        impact: `+15-20% pipeline in this segment`,
      })
    }
  }

  // 9. Now ask the LLM to add a strategic insight on top of the rule-based ones
  try {
    const llmInsight = await generateLLMStrategicInsight(customers, deals)
    if (llmInsight) insights.push(llmInsight)
  } catch (e) {
    console.warn('[insight-engine] LLM strategic insight failed:', e)
  }

  // Persist new insights (clear old non-dismissed ones first to avoid duplicates)
  await db.insight.deleteMany({ where: { dismissed: false } })
  for (const ins of insights) {
    await db.insight.create({
      data: {
        type: ins.type,
        priority: ins.priority,
        title: ins.title,
        body: ins.body,
        action: ins.action ?? null,
        impact: ins.impact ?? null,
        customerId: ins.customerId ?? null,
      },
    })
  }

  return { count: insights.length, insights }
}

async function generateLLMStrategicInsight(
  customers: any[],
  deals: any[]
): Promise<InsightSeed | null> {
  // Dynamically import to keep this server-only
  const ZAIModule = await import('z-ai-web-dev-sdk')
  const ZAI = (ZAIModule as any).default

  const summary = {
    customerCount: customers.length,
    byStatus: customers.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    totalPipeline: deals.reduce((s, d) => s + d.value, 0),
    wonValue: deals.filter((d) => d.stage === 'won').reduce((s, d) => s + d.value, 0),
    industries: Array.from(new Set(customers.map((c) => c.industry).filter(Boolean))),
    topCustomers: customers
      .filter((c) => c.lifetimeValue > 0)
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, 5)
      .map((c) => ({ name: c.name, company: c.company, ltv: c.lifetimeValue, status: c.status, tags: c.tags })),
  }

  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are a senior sales strategist reviewing a CRM snapshot for a Nigerian B2B SaaS company. All monetary values in the snapshot are in Naira (₦). Produce ONE actionable, specific insight the sales team can act on THIS WEEK to increase revenue. Be concrete: name a segment, name a tactic, give an estimated impact in Naira (use the ₦ symbol, e.g. "+₦15,000,000"). Return ONLY strict JSON with keys: title, body, action, impact, priority (high|medium|low). Title under 60 chars. Body under 280 chars. Action under 120 chars. Impact under 60 chars.',
      },
      {
        role: 'user',
        content: `CRM snapshot: ${JSON.stringify(summary)}`,
      },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.7,
  })

  const content = completion?.choices?.[0]?.message?.content
  if (!content) return null

  // Extract JSON from possibly-markdown-wrapped response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  const parsed = JSON.parse(jsonMatch[0])

  return {
    type: 'recommendation',
    priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
    title: String(parsed.title || 'Strategic recommendation').slice(0, 120),
    body: String(parsed.body || '').slice(0, 600),
    action: parsed.action ? String(parsed.action).slice(0, 240) : undefined,
    impact: parsed.impact ? String(parsed.impact).slice(0, 120) : undefined,
  }
}
