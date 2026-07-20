'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { KanbanSquare, Plus, Calendar, GripVertical } from 'lucide-react'
import { useCRMStore, type Deal, type Customer, STAGE_META, formatMoney, daysUntil } from '@/lib/crm-store'
import { CustomerAvatar } from './avatar'
import { toast } from 'sonner'

const STAGES: Deal['stage'][] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export function PipelineView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const selectCustomer = useCRMStore((s) => s.selectCustomer)
  const setView = useCRMStore((s) => s.setView)
  const refresh = useCRMStore((s) => s.refresh)

  const [deals, setDeals] = useState<Deal[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Deal['stage'] | null>(null)

  // new deal dialog
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', customerId: '', value: '22500000', stage: 'lead', probability: '15', expectedClose: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/deals').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json()),
    ]).then(([d, c]) => {
      setDeals(d.deals || [])
      setCustomers(c.customers || [])
      setLoading(false)
    })
  }, [refreshKey])

  async function moveStage(dealId: string, newStage: Deal['stage']) {
    setDragId(null); setDragOver(null)
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    // optimistic
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d))

    const prob: Record<Deal['stage'], number> = { lead: 15, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0 }
    const res = await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage, probability: prob[newStage] }),
    })
    if (res.ok) {
      toast.success(`Deal moved to ${STAGE_META[newStage].label}`)
      refresh()
    }
  }

  async function createDeal() {
    if (!form.title.trim() || !form.customerId) {
      toast.error('Title and customer are required')
      return
    }
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        value: Number(form.value) || 0,
        probability: Number(form.probability) || 15,
        expectedClose: form.expectedClose || null,
      }),
    })
    if (res.ok) {
      toast.success('Deal added to pipeline')
      setOpen(false)
      setForm({ title: '', customerId: '', value: '22500000', stage: 'lead', probability: '15', expectedClose: '' })
      refresh()
    } else {
      toast.error('Failed to add deal')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KanbanSquare className="h-6 w-6 text-emerald-600" /> Sales Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag deals across stages · {deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').length} open ·
            total weighted value {formatMoney(deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value * d.probability) / 100, 0))}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add new deal</DialogTitle>
              <DialogDescription>Create a new opportunity in your pipeline.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Deal title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Acme — Annual License" />
              </div>
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Value (₦)</Label>
                  <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Probability (%)</Label>
                  <Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected close</Label>
                  <Input type="date" value={form.expectedClose} onChange={(e) => setForm({ ...form, expectedClose: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createDeal}>Create Deal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map((_, i) => <Card key={i} className="animate-pulse h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage)
            const meta = STAGE_META[stage]
            const total = stageDeals.reduce((s, d) => s + d.value, 0)
            const isDragOver = dragOver === stage
            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => dragId && moveStage(dragId, stage)}
                className={`rounded-lg border bg-card transition-all ${isDragOver ? 'border-emerald-500 bg-emerald-500/5' : ''}`}
              >
                <div className="p-3 border-b" style={{ backgroundColor: `${meta.color}10` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatMoney(total)}</p>
                </div>

                <div className="p-2 space-y-2 min-h-[120px] max-h-[60vh] overflow-y-auto">
                  {stageDeals.map((d) => {
                    const customer = d.customer || customers.find((c) => c.id === d.customerId)
                    const days = d.expectedClose ? daysUntil(d.expectedClose) : null
                    return (
                      <Card
                        key={d.id}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null) }}
                        className="cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold leading-tight line-clamp-2">{d.title}</p>
                            <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ color: meta.color }}>{formatMoney(d.value)}</span>
                            <Badge variant="outline" className="text-[10px]">{d.probability}%</Badge>
                          </div>
                          {customer && (
                            <button
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground w-full text-left"
                              onClick={() => { selectCustomer(customer.id); setView('customers') }}
                            >
                              <CustomerAvatar name={customer.name} color={customer.avatarColor} size="sm" className="h-5 w-5 text-[9px]" />
                              <span className="truncate">{customer.name}</span>
                            </button>
                          )}
                          {days !== null && (
                            <p className={`text-[10px] flex items-center gap-1 ${days < 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-muted-foreground/60 italic">
                      Drop deals here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
