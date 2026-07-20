'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Users, Mail, Building2, DollarSign } from 'lucide-react'
import { useCRMStore, type Customer, STATUS_META, formatMoney, timeAgo } from '@/lib/crm-store'
import { CustomerAvatar } from './avatar'
import { CustomerFormDialog } from './customer-form-dialog'
import { useDebounce } from '@/hooks/use-debounce'

export function CustomersView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const selectCustomer = useCRMStore((s) => s.selectCustomer)

  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 250)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (debouncedQ) params.set('q', debouncedQ)
      try {
        const r = await fetch(`/api/customers?${params}`)
        const d = await r.json()
        if (cancelled) return
        setCustomers(d.customers || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [status, debouncedQ, refreshKey])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" /> Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every customer record in one place. {customers.length} total · never lose track.
          </p>
        </div>
        <CustomerFormDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, industry..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No customers found</p>
          <p className="text-sm mt-1">Add your first customer to start tracking.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => {
            const statusMeta = STATUS_META[c.status]
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md hover:border-emerald-500/40 transition-all group"
                onClick={() => selectCustomer(c.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CustomerAvatar name={c.name} color={c.avatarColor} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate group-hover:text-emerald-700">{c.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.jobTitle || '—'} · {c.company || '—'}</p>
                    </div>
                    <span
                      className="h-2 w-2 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: statusMeta.color }}
                      title={statusMeta.label}
                    />
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {c.email}</p>
                    {c.company && <p className="flex items-center gap-1.5 truncate"><Building2 className="h-3 w-3 shrink-0" /> {c.industry} · {c.location}</p>}
                    <p className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {formatMoney(c.lifetimeValue)} LTV · {c._count?.activities ?? 0} activities</p>
                  </div>

                  {c.tags && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.tags.split(',').filter(Boolean).slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t.trim()}</span>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/70 pt-1">Updated {timeAgo(c.updatedAt)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
