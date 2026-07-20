'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail, Phone, MapPin, Building2, Briefcase, Tag, DollarSign, Plus, Trash2,
  Calendar, Clock, Phone as PhoneIcon, Mail as MailIcon, Users as UsersIcon,
  StickyNote, ListTodo, Presentation,
} from 'lucide-react'
import { useCRMStore, type Customer, type Deal, type Activity, type Insight, STAGE_META, STATUS_META, formatMoney, timeAgo } from '@/lib/crm-store'
import { CustomerAvatar } from './avatar'
import { CustomerFormDialog } from './customer-form-dialog'
import { InsightCard } from './insight-card'
import { toast } from 'sonner'

const ACTIVITY_ICONS: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  call: PhoneIcon,
  email: MailIcon,
  meeting: UsersIcon,
  note: StickyNote,
  task: ListTodo,
  demo: Presentation,
}

const ACTIVITY_TYPES: Activity['type'][] = ['call', 'email', 'meeting', 'note', 'task', 'demo']

export function CustomerDetailDrawer() {
  const selectedId = useCRMStore((s) => s.selectedCustomerId)
  const clearSelection = useCRMStore((s) => s.selectCustomer)
  const refresh = useCRMStore((s) => s.refresh)
  const refreshKey = useCRMStore((s) => s.refreshKey)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [insights, setInsights] = useState<Insight[]>([])

  // new activity form
  const [newAct, setNewAct] = useState({ type: 'note' as Activity['type'], title: '', description: '' })

  useEffect(() => {
    if (!selectedId) return
    fetch(`/api/customers/${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d.customer)
        setDeals(d.customer.deals ?? [])
        setActivities(d.customer.activities ?? [])
        setInsights(d.customer.insights ?? [])
      })
  }, [selectedId, refreshKey])

  async function addActivity() {
    if (!newAct.title.trim() || !selectedId) return
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: selectedId,
        type: newAct.type,
        title: newAct.title,
        description: newAct.description,
        completedAt: new Date().toISOString(),
      }),
    })
    if (res.ok) {
      toast.success('Activity logged')
      setNewAct({ type: 'note', title: '', description: '' })
      refresh()
    }
  }

  async function deleteCustomer() {
    if (!customer || !confirm(`Delete ${customer.name}? This permanently removes the record and all related deals and activities.`)) return
    await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
    toast.success('Customer deleted')
    clearSelection(null)
    refresh()
  }

  async function moveDealStage(dealId: string, stage: Deal['stage']) {
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    refresh()
  }

  return (
    <Sheet open={!!selectedId} onOpenChange={(o) => !o && clearSelection(null)}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {customer && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-4">
                <CustomerAvatar name={customer.name} color={customer.avatarColor} size="lg" />
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">{customer.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {customer.jobTitle ? `${customer.jobTitle} · ` : ''}
                    {customer.company}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                      style={{ backgroundColor: `${STATUS_META[customer.status].color}1a`, color: STATUS_META[customer.status].color }}
                    >
                      {STATUS_META[customer.status].label}
                    </Badge>
                    {customer.tags.split(',').filter(Boolean).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] font-normal">#{t.trim()}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <CustomerFormDialog customer={customer} trigger={<Button size="sm" variant="outline">Edit</Button>} />
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={deleteCustomer}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </SheetHeader>

            <div className="px-4 pb-8 space-y-6">
              {/* Contact info */}
              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> <span className="truncate">{customer.email}</span></div>
                  {customer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {customer.phone}</div>}
                  {customer.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {customer.location}</div>}
                  {customer.company && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {customer.company}</div>}
                  {customer.industry && <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> {customer.industry}</div>}
                  <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> LTV: <span className="font-semibold">{formatMoney(customer.lifetimeValue)}</span></div>
                </div>
              </section>

              {/* Notes */}
              {customer.notes && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                  <p className="text-sm bg-muted/40 rounded-md p-3 leading-relaxed">{customer.notes}</p>
                </section>
              )}

              <Separator />

              {/* Deals */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" /> Deals ({deals.length})
                </h4>
                <div className="space-y-2">
                  {deals.length === 0 && <p className="text-xs text-muted-foreground italic">No deals yet.</p>}
                  {deals.map((d) => (
                    <div key={d.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{d.title}</p>
                          <p className="text-xs text-muted-foreground">{formatMoney(d.value)} · {d.probability}% probability</p>
                        </div>
                        <Select value={d.stage} onValueChange={(v) => moveDealStage(d.id, v as Deal['stage'])}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STAGE_META).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                                  {v.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {d.expectedClose && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Expected close: {new Date(d.expectedClose).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              {/* AI Insights for this customer */}
              {insights.length > 0 && (
                <>
                  <section className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      AI Insights for this customer
                    </h4>
                    <div className="space-y-2">
                      {insights.map((i) => <InsightCard key={i.id} insight={i} compact />)}
                    </div>
                  </section>
                  <Separator />
                </>
              )}

              {/* Log activity */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log activity</h4>
                <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                  <div className="flex gap-2">
                    <Select value={newAct.type} onValueChange={(v) => setNewAct({ ...newAct, type: v as Activity['type'] })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8"
                      placeholder="Title — e.g. Discovery call"
                      value={newAct.title}
                      onChange={(e) => setNewAct({ ...newAct, title: e.target.value })}
                    />
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Outcome / notes..."
                    value={newAct.description}
                    onChange={(e) => setNewAct({ ...newAct, description: e.target.value })}
                  />
                  <Button size="sm" onClick={addActivity} disabled={!newAct.title.trim()}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Log activity
                  </Button>
                </div>
              </section>

              {/* Activity timeline */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity timeline ({activities.length})</h4>
                <div className="space-y-3">
                  {activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] || StickyNote
                    return (
                      <div key={a.id} className="flex gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0 pb-3 border-b last:border-b-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{a.title}</p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(a.createdAt)}</span>
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                          {a.outcome && (
                            <Badge variant="outline" className="mt-1 text-[10px] font-normal capitalize">{a.outcome}</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
