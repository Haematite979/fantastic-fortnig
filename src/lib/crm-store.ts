import { create } from 'zustand'

export type ViewKey = 'dashboard' | 'customers' | 'pipeline' | 'activities' | 'insights' | 'analytics' | 'opay'

interface CRMState {
  view: ViewKey
  selectedCustomerId: string | null
  refreshKey: number // bump to refetch data
  setView: (v: ViewKey) => void
  selectCustomer: (id: string | null) => void
  refresh: () => void
}

export const useCRMStore = create<CRMState>((set) => ({
  view: 'dashboard',
  selectedCustomerId: null,
  refreshKey: 0,
  setView: (v) => set({ view: v }),
  selectCustomer: (id) => set({ selectedCustomerId: id }),
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))

// Shared types — mirror the Prisma schema
export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  location: string | null
  status: 'lead' | 'active' | 'churned' | 'prospect'
  tags: string
  lifetimeValue: number
  notes: string
  avatarColor: string
  createdAt: string
  updatedAt: string
  deals?: Deal[]
  _count?: { activities: number }
}

export interface Deal {
  id: string
  title: string
  customerId: string
  customer?: Customer
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability: number
  expectedClose: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  customerId: string
  customer?: { id: string; name: string; company: string | null; avatarColor: string }
  dealId: string | null
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo'
  title: string
  description: string | null
  outcome: string | null
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface Insight {
  id: string
  customerId: string | null
  customer?: { id: string; name: string; company: string | null; avatarColor: string } | null
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend' | 'alert'
  priority: 'high' | 'medium' | 'low'
  title: string
  body: string
  action: string | null
  impact: string | null
  dismissed: boolean
  createdAt: string
}

export interface Analytics {
  summary: {
    totalCustomers: number
    activeCustomers: number
    leads: number
    prospects: number
    churned: number
    totalLTV: number
    totalPipeline: number
    weightedPipeline: number
    wonValue: number
    lostValue: number
    winRate: number
    wonCount: number
    lostCount: number
    openInsights: number
    highPriorityInsights: number
  }
  statusBreakdown: { name: string; value: number; color: string }[]
  stageBreakdown: { stage: string; count: number; value: number }[]
  byIndustry: { industry: string; count: number; ltv: number }[]
  activityByDay: { date: string; count: number }[]
  upcoming: Activity[]
}

// ---- helpers -----

export const STAGE_META: Record<Deal['stage'], { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#06b6d4' },
  qualified: { label: 'Qualified', color: '#8b5cf6' },
  proposal: { label: 'Proposal', color: '#f59e0b' },
  negotiation: { label: 'Negotiation', color: '#f97316' },
  won: { label: 'Won', color: '#10b981' },
  lost: { label: 'Lost', color: '#ef4444' },
}

export const STATUS_META: Record<Customer['status'], { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#06b6d4' },
  prospect: { label: 'Prospect', color: '#f59e0b' },
  active: { label: 'Active', color: '#10b981' },
  churned: { label: 'Churned', color: '#ef4444' },
}

export const INSIGHT_META: Record<Insight['type'], { label: string; color: string; icon: string }> = {
  opportunity: { label: 'Opportunity', color: '#10b981', icon: 'TrendingUp' },
  risk: { label: 'Risk', color: '#ef4444', icon: 'AlertTriangle' },
  recommendation: { label: 'Recommendation', color: '#8b5cf6', icon: 'Lightbulb' },
  trend: { label: 'Trend', color: '#06b6d4', icon: 'BarChart3' },
  alert: { label: 'Alert', color: '#f59e0b', icon: 'Bell' },
}

export const PRIORITY_META: Record<Insight['priority'], { label: string; color: string }> = {
  high: { label: 'High', color: '#ef4444' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#06b6d4' },
}

export function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

// Currency is stored in Naira (₦) throughout the CRM.
// Use the Unicode naira sign U+20A6 for display.
export const NAIRA = '\u20A6' // ₦

export function formatMoney(n: number) {
  if (n >= 1_000_000) return `${NAIRA}${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${NAIRA}${(n / 1_000).toFixed(1)}K`
  return `${NAIRA}${n.toLocaleString()}`
}

export function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString()
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── OPay types ────────────────────────────────────────────────────────

export interface OpaySettingView {
  id: string
  merchantId: string
  apiKeyMasked: string
  secretKeyMasked: string
  environment: 'sandbox' | 'production'
  isActive: boolean
  lastSyncAt: string | null
  lastAuditAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OpayTransactionView {
  id: string
  opayTxnId: string
  reference: string | null
  amount: number
  currency: string
  status: 'success' | 'failed' | 'pending' | 'reversed'
  channel: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  fee: number
  settledAmount: number
  opayCreatedAt: string
  fetchedAt: string
  auditStatus: 'pending' | 'verified' | 'flagged' | 'reconciled'
  auditNote: string | null
}

export interface AuditLogView {
  id: string
  auditDate: string
  totalTransactions: number
  totalAmount: number
  successCount: number
  failedCount: number
  pendingCount: number
  flaggedCount: number
  discrepancies: string | null
  summary: string
  triggeredBy: string
  createdAt: string
}

export interface AuditResultView {
  auditDate: string
  totalTransactions: number
  totalAmount: number
  successCount: number
  failedCount: number
  pendingCount: number
  flaggedCount: number
  summary: string
  discrepancies: { type: string; opayTxnId: string; detail: string; amount: number }[]
}

export const OPAY_STATUS_META: Record<OpayTransactionView['status'], { label: string; color: string }> = {
  success: { label: 'Success', color: '#10b981' },
  failed: { label: 'Failed', color: '#ef4444' },
  pending: { label: 'Pending', color: '#f59e0b' },
  reversed: { label: 'Reversed', color: '#8b5cf6' },
}

export const AUDIT_STATUS_META: Record<OpayTransactionView['auditStatus'], { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  verified: { label: 'Verified', color: '#10b981' },
  flagged: { label: 'Flagged', color: '#ef4444' },
  reconciled: { label: 'Reconciled', color: '#06b6d4' },
}
