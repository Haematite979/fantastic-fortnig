// Seed script for the AI-powered CRM
// Run with: bun run /home/z/my-project/scripts/seed.ts
import { db } from '../src/lib/db'

const AVATAR_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316']

// All monetary values are in Naira (₦). ₦1,500 ≈ $1 at time of writing.
const CUSTOMERS = [
  { name: 'Chidi Okafor', email: 'chidi.okafor@dangote-logistics.com', phone: '+234 803 555 0142', company: 'Dangote Logistics', jobTitle: 'VP of Operations', industry: 'Logistics', location: 'Lagos, Nigeria', status: 'active', tags: 'enterprise,high-value,renewal-q3', lifetimeValue: 126750000, notes: 'Strong advocate. Renewed 2x. Mentioned expanding to East Africa next quarter.' },
  { name: 'Ngozi Adeyemi', email: 'ngozi@brightpath.ng', phone: '+234 805 555 0187', company: 'BrightPath Education', jobTitle: 'CTO', industry: 'EdTech', location: 'Abuja, Nigeria', status: 'active', tags: 'mid-market,champion,expansion', lifetimeValue: 48000000, notes: 'Pilot went well. Wants to roll out to 5 more states.' },
  { name: 'Aisha Bello', email: 'aisha.bello@helixbio.com', phone: '+234 807 555 0193', company: 'Helix Bioscience', jobTitle: 'Head of Procurement', industry: 'Biotech', location: 'Ibadan, Nigeria', status: 'prospect', tags: 'enterprise,evaluation,pilot-ready', lifetimeValue: 0, notes: 'In active evaluation. Security review ongoing.' },
  { name: 'Emeka Nwosu', email: 'emeka@summitforge.dev', phone: '+234 802 555 0156', company: 'Summit Forge', jobTitle: 'Founder & CEO', industry: 'SaaS', location: 'Lagos, Nigeria', status: 'active', tags: 'startup,growth,referral', lifetimeValue: 21750000, notes: 'Referred by Ngozi. Growing fast, needs to scale.' },
  { name: 'Funke Ibrahim', email: 'funke.ibrahim@meridian-fs.com', phone: '+234 809 555 0321', company: 'Meridian Financial Services', jobTitle: 'Director of IT', industry: 'Finance', location: 'Lagos, Nigeria', status: 'lead', tags: 'enterprise,compliance-heavy', lifetimeValue: 0, notes: 'Came from webinar. Long sales cycle expected. CBN compliance requirements.' },
  { name: 'Tunde Bakare', email: 'tunde.bakare@cobalt-mining.com', phone: '+234 806 555 0188', company: 'Cobalt Mining Group', jobTitle: 'COO', industry: 'Mining', location: 'Jos, Nigeria', status: 'churned', tags: 'enterprise,churned-q2', lifetimeValue: 93000000, notes: 'Churned in Q2 due to budget cuts. Champion still at company.' },
  { name: 'Bisi Adewale', email: 'bisi.adewale@lumenretail.com', phone: '+234 805 555 0199', company: 'Lumen Retail', jobTitle: 'CMO', industry: 'Retail', location: 'Lagos, Nigeria', status: 'active', tags: 'mid-market,upsell,holiday-campaign', lifetimeValue: 41700000, notes: 'Heavy user during festive season. Open to upsell.' },
  { name: 'Yakubu Mohammed', email: 'yakubu@apex-mfg.com', phone: '+234 803 555 0177', company: 'Apex Manufacturing', jobTitle: 'Plant Manager', industry: 'Manufacturing', location: 'Kano, Nigeria', status: 'prospect', tags: 'mid-market,poc,slow-decision', lifetimeValue: 0, notes: 'POC scheduled next week. Multiple stakeholders.' },
  { name: 'Ada Eze', email: 'ada.eze@koreacommerce.ng', phone: '+234 802 555 0123', company: 'Koree Commerce', jobTitle: 'VP Sales', industry: 'E-commerce', location: 'Lagos, Nigeria', status: 'active', tags: 'enterprise,expansion,fintech', lifetimeValue: 76500000, notes: 'Strong growth. Wants to integrate with Paystack and Flutterwave.' },
  { name: 'Lukas Eriksen', email: 'lukas@nordicecho.se', phone: '+46 8 555 0144', company: 'Nordic Echo', jobTitle: 'Head of Customer Success', industry: 'Media', location: 'Stockholm, SE', status: 'lead', tags: 'mid-market,inbound', lifetimeValue: 0, notes: 'Inbound from content marketing. EU GDPR requirements.' },
  { name: 'Zainab Yusuf', email: 'zainab.yusuf@gulf-logistics.ae', phone: '+971 4 555 0166', company: 'Gulf Logistics', jobTitle: 'Procurement Director', industry: 'Logistics', location: 'Dubai, AE', status: 'prospect', tags: 'enterprise,rfp,mid-east', lifetimeValue: 0, notes: 'RFP submitted. Awaiting response. Looking for West Africa partner.' },
  { name: 'Grace Okonkwo', email: 'grace@greenmed.io', phone: '+234 807 555 0111', company: 'GreenMed', jobTitle: 'Founder', industry: 'HealthTech', location: 'Lagos, Nigeria', status: 'active', tags: 'startup,early-adopter,nps-promoter', lifetimeValue: 14700000, notes: 'Loves the product. NPS 9. Reference customer.' },
]

function randomColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

async function main() {
  console.log('🌱 Seeding CRM database...')

  // Clean slate
  await db.insight.deleteMany()
  await db.activity.deleteMany()
  await db.deal.deleteMany()
  await db.customer.deleteMany()

  const now = new Date()

  for (const c of CUSTOMERS) {
    const customer = await db.customer.create({
      data: {
        ...c,
        avatarColor: randomColor(c.email),
      },
    })

    // Create 1-3 deals per customer
    const dealCount = c.status === 'churned' ? 1 : c.status === 'lead' ? 1 : Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < dealCount; i++) {
      const stage = c.status === 'churned'
        ? 'lost'
        : c.status === 'lead'
        ? 'lead'
        : c.status === 'prospect'
        ? ['qualified', 'proposal'][Math.floor(Math.random() * 2)]
        : ['proposal', 'negotiation', 'won'][Math.floor(Math.random() * 3)]
      const value = c.status === 'lead' ? Math.floor(Math.random() * 30000000) + 15000000 : Math.floor(Math.random() * 75000000) + 7500000
      const expectedClose = new Date(now)
      expectedClose.setDate(expectedClose.getDate() + Math.floor(Math.random() * 90) + 7)
      await db.deal.create({
        data: {
          title: `${c.company.split(' ')[0]} — ${['Annual License', 'Platform Subscription', 'Enterprise Plan', 'Pilot Program', 'Expansion'][Math.floor(Math.random() * 5)]}`,
          customerId: customer.id,
          value,
          stage,
          probability: stage === 'won' ? 100 : stage === 'negotiation' ? 75 : stage === 'proposal' ? 50 : stage === 'qualified' ? 30 : 15,
          expectedClose,
          source: ['website', 'referral', 'cold-outreach', 'event'][Math.floor(Math.random() * 4)],
        },
      })
    }

    // Create activities
    const activityTypes = ['call', 'email', 'meeting', 'note', 'task', 'demo'] as const
    const actCount = c.status === 'lead' ? 2 : Math.floor(Math.random() * 4) + 2
    for (let i = 0; i < actCount; i++) {
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      const createdAt = new Date(now)
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30))
      const isFuture = Math.random() > 0.7
      await db.activity.create({
        data: {
          customerId: customer.id,
          type,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} with ${c.name.split(' ')[0]}`,
          description: ['Discussed roadmap and pricing', 'Sent follow-up materials', 'Product demo completed', 'Checked in on onboarding', 'Negotiated contract terms', 'Shared ROI calculator'][Math.floor(Math.random() * 6)],
          outcome: ['successful', 'no-answer', 'follow-up', 'negative'][Math.floor(Math.random() * 4)],
          scheduledAt: isFuture ? new Date(now.getTime() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) : null,
          completedAt: !isFuture ? createdAt : null,
          createdAt,
        },
      })
    }
  }

  // Seed a few AI insights to show in the UI before user runs insight generation
  const cust1 = await db.customer.findUnique({ where: { email: 'tunde.bakare@cobalt-mining.com' } })
  const cust2 = await db.customer.findUnique({ where: { email: 'chidi.okafor@dangote-logistics.com' } })
  const cust3 = await db.customer.findUnique({ where: { email: 'ngozi@brightpath.ng' } })
  const cust4 = await db.customer.findUnique({ where: { email: 'aisha.bello@helixbio.com' } })

  if (cust1) await db.insight.create({ data: { customerId: cust1.id, type: 'opportunity', priority: 'high', title: 'Win-back opportunity identified', body: 'Tunde Bakare churned in Q2 but their champion is still at the company. Budget season starts in 4 weeks — a timely win-back email now could reopen the door before competitors fill the gap.', action: 'Send personalized win-back email with Q3 pricing incentive', impact: '+₦93,000,000 potential ARR' } })
  if (cust2) await db.insight.create({ data: { customerId: cust2.id, type: 'opportunity', priority: 'high', title: 'Expansion signal detected', body: 'Chidi mentioned expanding to East Africa next quarter. His current contract renews in Q3 — bundling the expansion into the renewal could lock in a multi-year deal.', action: 'Schedule executive QBR and prepare East Africa expansion proposal', impact: '+₦67,500,000 expansion ARR' } })
  if (cust3) await db.insight.create({ data: { customerId: cust3.id, type: 'risk', priority: 'high', title: 'Deal velocity slowing', body: 'BrightPath deal has been in proposal stage for 18 days, longer than the 12-day median. Two email follow-ups went unanswered. Risk of deal stalling.', action: 'Escalate to executive sponsor or break the silence with a value-driven reframe', impact: 'Protect ₦48,000,000 pipeline' } })
  if (cust4) await db.insight.create({ data: { customerId: cust4.id, type: 'recommendation', priority: 'medium', title: 'Security review is the bottleneck', body: 'Helix Bioscience is in active evaluation but security review has dragged 22 days. Proactively providing SOC 2 docs and a security questionnaire walkthrough could cut 2 weeks from the cycle.', action: 'Send SOC 2 report and offer a live security walkthrough', impact: '-14 days to close' } })

  await db.insight.create({ data: { type: 'trend', priority: 'medium', title: 'Mid-market deals closing 23% faster this quarter', body: 'Mid-market deals in logistics and edtech are closing 23% faster than last quarter. Double down on these segments — reallocate 2 SDRs from enterprise prospecting to mid-market outreach.', action: 'Reallocate SDR capacity toward mid-market', impact: '+15% pipeline coverage' } })
  await db.insight.create({ data: { type: 'alert', priority: 'low', title: 'No activity on 4 leads in 14+ days', body: 'Four leads have had zero touchpoints in the last 14 days. Statistically, leads go cold after 12 days of silence. A batch re-engagement campaign today will recover 30-40% of them.', action: 'Launch re-engagement sequence for cold leads', impact: '+4-5 reactivated conversations' } })

  console.log(`✅ Seeded ${CUSTOMERS.length} customers with deals, activities, and insights`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
