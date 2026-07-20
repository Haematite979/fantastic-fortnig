'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Phone as PhoneIcon, Mail as MailIcon, Users as UsersIcon,
  StickyNote, ListTodo, Presentation, Plus, Activity as ActivityIcon, Calendar, CheckCircle2,
} from 'lucide-react'
import { useCRMStore, type Activity, type Customer, timeAgo } from '@/lib/crm-store'
import { CustomerAvatar } from './avatar'
import { toast } from 'sonner'

const ACTIVITY_ICONS: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  call: PhoneIcon,
  email: MailIcon,
  meeting: UsersIcon,
  note: StickyNote,
  task: ListTodo,
  demo: Presentation,
}
const ACTIVITY_COLORS: Record<Activity['type'], string> = {
  call: '#06b6d4',
  email: '#8b5cf6',
  meeting: '#f59e0b',
  note: '#6b7280',
  task: '#10b981',
  demo: '#ec4899',
}
const OUTCOME_META: Record<string, { color: string; label: string }> = {
  successful: { color: '#10b981', label: 'Successful' },
  'no-answer': { color: '#f59e0b', label: 'No answer' },
  'follow-up': { color: '#06b6d4', label: 'Follow-up needed' },
  negative: { color: '#ef4444', label: 'Negative' },
}

export function ActivitiesView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const selectCustomer = useCRMStore((s) => s.selectCustomer)
  const setView = useCRMStore((s) => s.setView)
  const refresh = useCRMStore((s) => s.refresh)

  const [activities, setActivities] = useState<Activity[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // quick-log form
  const [form, setForm] = useState({ type: 'note' as Activity['type'], customerId: '', title: '', description: '', outcome: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/activities').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json()),
    ]).then(([a, c]) => {
      setActivities(a.activities || [])
      setCustomers(c.customers || [])
      setLoading(false)
    })
  }, [refreshKey])

  async function log() {
    if (!form.customerId || !form.title.trim()) {
      toast.error('Customer and title are required')
      return
    }
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: form.customerId,
        type: form.type,
        title: form.title,
        description: form.description || null,
        outcome: form.outcome || null,
        completedAt: new Date().toISOString(),
      }),
    })
    if (res.ok) {
      toast.success('Activity logged')
      setForm({ type: 'note', customerId: '', title: '', description: '', outcome: '' })
      refresh()
    }
  }

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter)
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = activities.filter((a) => a.completedAt && a.completedAt.slice(0, 10) === today).length
  const upcoming = activities.filter((a) => a.scheduledAt && new Date(a.scheduledAt) > new Date())

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ActivityIcon className="h-6 w-6 text-emerald-600" /> Activities
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activities.length} total · {todayCount} today · {upcoming.length} scheduled
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Quick log form */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" /> Quick log
            </h3>

            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Activity['type'] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_ICONS) as Activity['type'][]).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input className="h-9" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Discovery call with Sarah" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes & outcome..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <Select value={form.outcome || 'none'} onValueChange={(v) => setForm({ ...form, outcome: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(OUTCOME_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={log} className="w-full" disabled={!form.customerId || !form.title.trim()}>
              <Plus className="h-4 w-4 mr-1.5" /> Log activity
            </Button>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
            {(Object.keys(ACTIVITY_ICONS) as Activity['type'][]).map((t) => {
              const Icon = ACTIVITY_ICONS[t]
              const count = activities.filter((a) => a.type === t).length
              return (
                <Button key={t} size="sm" variant={filter === t ? 'default' : 'outline'} onClick={() => setFilter(t)} className="capitalize">
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {t} <span className="text-xs opacity-60 ml-1">{count}</span>
                </Button>
              )
            })}
          </div>

          {loading ? (
            <Card><CardContent className="h-64 animate-pulse" /></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ActivityIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activities yet.</p>
              <p className="text-xs mt-1">Log your first interaction on the left.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] || StickyNote
                const color = ACTIVITY_COLORS[a.type]
                const customer = a.customer
                const isScheduled = a.scheduledAt && new Date(a.scheduledAt) > new Date() && !a.completedAt
                return (
                  <Card key={a.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex gap-3 items-start">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
                        style={{ backgroundColor: `${color}1a`, color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{a.title}</p>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {isScheduled ? (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Calendar className="h-3 w-3" />
                                {new Date(a.scheduledAt!).toLocaleDateString()}
                              </span>
                            ) : a.completedAt ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {timeAgo(a.completedAt)}
                              </span>
                            ) : timeAgo(a.createdAt)}
                          </span>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          {customer && (
                            <button
                              onClick={() => { selectCustomer(customer.id); setView('customers') }}
                              className="flex items-center gap-1.5 text-[11px] hover:underline"
                            >
                              <CustomerAvatar name={customer.name} color={customer.avatarColor} size="sm" className="h-5 w-5 text-[9px]" />
                              <span className="text-muted-foreground">{customer.name} · {customer.company}</span>
                            </button>
                          )}
                          {a.outcome && OUTCOME_META[a.outcome] && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal"
                              style={{ color: OUTCOME_META[a.outcome].color, borderColor: `${OUTCOME_META[a.outcome].color}40` }}
                            >
                              {OUTCOME_META[a.outcome].label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
