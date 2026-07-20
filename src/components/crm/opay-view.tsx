'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  CreditCard, Shield, ShieldCheck, Plug, RefreshCw, AlertTriangle, CheckCircle2,
  Lock, Eye, EyeOff, Zap, FileWarning, Trash2, ExternalLink, Calendar, Activity, TrendingUp,
} from 'lucide-react'
import { useCRMStore, type OpaySettingView, type OpayTransactionView, type AuditLogView, type AuditResultView, OPAY_STATUS_META, AUDIT_STATUS_META, formatMoney, timeAgo } from '@/lib/crm-store'
import { toast } from 'sonner'

type Tab = 'setup' | 'transactions' | 'audit'

export function OpayView() {
  const refreshKey = useCRMStore((s) => s.refreshKey)
  const refresh = useCRMStore((s) => s.refresh)

  const [tab, setTab] = useState<Tab>('setup')
  const [setting, setSetting] = useState<OpaySettingView | null>(null)
  const [transactions, setTransactions] = useState<OpayTransactionView[]>([])
  const [logs, setLogs] = useState<AuditLogView[]>([])
  const [loading, setLoading] = useState(true)

  const [showKeys, setShowKeys] = useState(false)
  const [form, setForm] = useState({ merchantId: '', apiKey: '', secretKey: '', environment: 'sandbox' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [lastAuditResult, setLastAuditResult] = useState<AuditResultView | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/opay/settings').then((r) => r.json()),
      fetch('/api/opay/transactions').then((r) => r.json()),
      fetch('/api/opay/audit/logs').then((r) => r.json()),
    ]).then(([s, t, l]) => {
      setSetting(s.setting ?? null)
      setTransactions(t.transactions ?? [])
      setLogs(l.logs ?? [])
      setLoading(false)
    })
  }, [refreshKey])

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/opay/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save')
      toast.success('OPay credentials saved securely (encrypted at rest)')
      setForm({ merchantId: '', apiKey: '', secretKey: '', environment: 'sandbox' })
      refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    try {
      const res = await fetch('/api/opay/test', { method: 'POST' })
      const d = await res.json()
      if (d.ok) toast.success(d.message)
      else toast.error(d.message)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setTesting(false)
    }
  }

  async function sync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/opay/sync', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        toast.success(d.message || `Synced ${d.fetched} transactions`)
        refresh()
      } else {
        throw new Error(d.error || 'Sync failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function runAuditNow() {
    setAuditing(true)
    try {
      const res = await fetch('/api/opay/audit', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        setLastAuditResult(d)
        toast.success(`Audit complete: ${d.flaggedCount} flagged, ${d.totalTransactions} total`)
        refresh()
      } else {
        throw new Error(d.error || 'Audit failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAuditing(false)
    }
  }

  async function disconnect() {
    await fetch('/api/opay/settings', { method: 'DELETE' })
    toast.success('OPay credentials removed')
    setConfirmDisconnect(false)
    refresh()
  }

  const connected = !!setting

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-emerald-600" /> OPay Integration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fetch transactions from OPay and audit them daily — secure, encrypted, easy to set up.
        </p>
      </div>

      {/* Status banner */}
      {connected ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Connected to OPay {setting.environment === 'sandbox' ? 'Sandbox' : 'Production'}
              </p>
              <p className="text-xs text-muted-foreground">
                Merchant ID: <span className="font-mono">{setting.merchantId}</span>
                {' · '}API key: <span className="font-mono">{setting.apiKeyMasked}</span>
                {' · '}Secret: <span className="font-mono">{setting.secretKeyMasked}</span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={testConnection} disabled={testing} variant="outline">
                {testing ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                Test
              </Button>
              <Button size="sm" onClick={sync} disabled={syncing}>
                {syncing ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Sync Now
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDisconnect(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Not connected. Add your OPay credentials below to start fetching transactions. Use <strong>Sandbox</strong> mode to try it with sample data first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 border-b pb-px">
        {([
          { key: 'setup', label: 'Setup & Security', icon: Plug },
          { key: 'transactions', label: 'Transactions', icon: CreditCard },
          { key: 'audit', label: 'Daily Audit', icon: ShieldCheck },
        ] as { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Setup tab */}
      {tab === 'setup' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plug className="h-4 w-4 text-emerald-600" /> Connect your OPay account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (try with sample data)</SelectItem>
                      <SelectItem value="production">Production (live OPay account)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {form.environment === 'sandbox'
                      ? 'Sandbox mode generates realistic sample transactions so you can test the full flow without real credentials. Any values you enter will be validated.'
                      : 'Production mode makes real HTTPS calls to OPay. Make sure your credentials are correct.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Merchant ID</Label>
                  <Input value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} placeholder={form.environment === 'sandbox' ? 'OPAYTEST0001 (any 6+ chars works)' : 'Your OPay Merchant ID'} className="font-mono" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>API Key (Public)</Label>
                    <button type="button" onClick={() => setShowKeys(!showKeys)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      {showKeys ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showKeys ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <Input type={showKeys ? 'text' : 'password'} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={form.environment === 'sandbox' ? 'OPAY-PUB-TEST-xxxx (any 8+ chars)' : 'Your OPay API key'} className="font-mono" />
                </div>

                <div className="space-y-1.5">
                  <Label>Secret Key (Private)</Label>
                  <Input type={showKeys ? 'text' : 'password'} value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })} placeholder={form.environment === 'sandbox' ? 'OPAY-SEC-TEST-xxxx (any 8+ chars)' : 'Your OPay secret key'} className="font-mono" />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveSettings} disabled={saving || !form.merchantId || !form.apiKey || !form.secretKey}>
                    <Lock className="h-4 w-4 mr-1.5" />
                    {saving ? 'Saving...' : 'Save & Encrypt Credentials'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" /> How your keys are protected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><strong>AES-256-GCM encryption</strong> at rest. Keys are encrypted before they ever hit the database and only decrypted in memory when making an OPay call.</p>
                </div>
                <div className="flex gap-2">
                  <EyeOff className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><strong>Never returned to the browser.</strong> The UI only sees a masked preview like <span className="font-mono">OPAY••••7890</span>.</p>
                </div>
                <div className="flex gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><strong>Server-side only.</strong> All OPay API calls happen on the backend — your secret key never appears in client-side code or network requests from the browser.</p>
                </div>
                <div className="flex gap-2">
                  <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><strong>HMAC-SHA512 signed requests</strong> to OPay. Each request is signed with your secret key so OPay can verify authenticity.</p>
                </div>
                <div className="flex gap-2">
                  <Trash2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><strong>One-click disconnect.</strong> Revoking instantly deactivates your credentials. Re-add them anytime.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-xs space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Where to find your OPay credentials</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Log in to the <a href="https://merchant.opayweb.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">OPay Merchant Dashboard</a></li>
                  <li>Go to <strong>Settings → API</strong></li>
                  <li>Copy your <strong>Merchant ID</strong>, <strong>API Key</strong>, and <strong>Secret Key</strong></li>
                  <li>Paste them above and click Save</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <TransactionsTab transactions={transactions} loading={loading} connected={connected} onSync={sync} syncing={syncing} />
      )}

      {/* Audit tab */}
      {tab === 'audit' && (
        <AuditTab logs={logs} lastAuditResult={lastAuditResult} loading={loading} connected={connected} onRunAudit={runAuditNow} auditing={auditing} lastAuditAt={setting?.lastAuditAt ?? null} />
      )}

      {/* Disconnect confirm */}
      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect OPay?</DialogTitle>
            <DialogDescription>
              This will deactivate your stored credentials. You can re-add them anytime. Already-synced transactions and audit logs will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
            <Button variant="destructive" onClick={disconnect}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Transactions Tab ────────────────────────────────────────────────

function TransactionsTab({ transactions, loading, connected, onSync, syncing }: {
  transactions: OpayTransactionView[]; loading: boolean; connected: boolean; onSync: () => void; syncing: boolean
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')

  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (q) {
      const hay = `${t.opayTxnId} ${t.reference ?? ''} ${t.customerName ?? ''} ${t.customerEmail ?? ''}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0)
  const successCount = filtered.filter((t) => t.status === 'success').length
  const flaggedCount = filtered.filter((t) => t.auditStatus === 'flagged').length

  if (!connected) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Plug className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">Connect OPay first</p>
      <p className="text-xs mt-1">Add your credentials in the Setup tab to start fetching transactions.</p>
    </CardContent></Card>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Txns</p><p className="text-xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Volume</p><p className="text-xl font-bold">{formatMoney(totalAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Success</p><p className="text-xl font-bold text-emerald-600">{successCount}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Flagged</p><p className="text-xl font-bold text-red-500">{flaggedCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search by txn id, reference, customer..." value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onSync} disabled={syncing} variant="outline">
          {syncing ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-1">Click Sync to fetch transactions from OPay.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-[11px] uppercase text-muted-foreground tracking-wider">
                    <th className="p-3">Transaction</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Audit</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((t) => {
                    const sMeta = OPAY_STATUS_META[t.status]
                    const aMeta = AUDIT_STATUS_META[t.auditStatus]
                    return (
                      <tr key={t.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-mono text-xs font-medium">{t.opayTxnId}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{t.reference ?? '—'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{t.customerName ?? 'Unknown'}</p>
                          <p className="text-[11px] text-muted-foreground">{t.customerEmail ?? t.customerPhone ?? '—'}</p>
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-semibold">{formatMoney(t.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">fee {formatMoney(t.fee)}</p>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-normal capitalize" style={{ color: sMeta.color, borderColor: `${sMeta.color}40` }}>{sMeta.label}</Badge>
                          {t.channel && <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{t.channel}</p>}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-normal" style={{ color: aMeta.color, borderColor: `${aMeta.color}40` }}>{aMeta.label}</Badge>
                          {t.auditNote && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[180px]" title={t.auditNote}>{t.auditNote}</p>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.opayCreatedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Audit Tab ───────────────────────────────────────────────────────

function AuditTab({ logs, lastAuditResult, loading, connected, onRunAudit, auditing, lastAuditAt }: {
  logs: AuditLogView[]; lastAuditResult: AuditResultView | null; loading: boolean; connected: boolean; onRunAudit: () => void; auditing: boolean; lastAuditAt: string | null
}) {
  if (!connected) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">Connect OPay to enable daily audits</p>
      <p className="text-xs mt-1">The audit engine reconciles your transactions automatically.</p>
    </CardContent></Card>
  }

  const hoursSinceAudit = lastAuditAt ? (Date.now() - new Date(lastAuditAt).getTime()) / (1000 * 60 * 60) : null
  const auditOverdue = hoursSinceAudit !== null && hoursSinceAudit > 24

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Daily Transaction Audit</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastAuditAt
                  ? auditOverdue
                    ? <span className="text-amber-600 font-medium">Last audit was {timeAgo(lastAuditAt)} — daily audit overdue. Run it now.</span>
                    : <>Last audit ran {timeAgo(lastAuditAt)}. The next daily audit will check new transactions since then.</>
                  : 'No audits yet. Run your first audit to check all synced transactions.'}
              </p>
            </div>
            <Button onClick={onRunAudit} disabled={auditing} size="lg">
              {auditing ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
              {auditing ? 'Auditing...' : 'Run Audit Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">What the daily audit checks</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="flex gap-2"><Activity className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /><div><p className="font-semibold">Stuck pending transactions</p><p className="text-muted-foreground">Flags transactions stuck in &quot;pending&quot; for more than 6 hours.</p></div></div>
            <div className="flex gap-2"><TrendingUp className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" /><div><p className="font-semibold">High-value outliers</p><p className="text-muted-foreground">Flags transactions exceeding 2× the median successful amount.</p></div></div>
            <div className="flex gap-2"><FileWarning className="h-4 w-4 text-red-500 shrink-0 mt-0.5" /><div><p className="font-semibold">Fee mismatches</p><p className="text-muted-foreground">Flags fees above 3% (OPay&apos;s standard is 1.5%) — possible misconfiguration.</p></div></div>
            <div className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /><div><p className="font-semibold">Reversed transactions</p><p className="text-muted-foreground">Flags all reversals so you can reconcile with the customer.</p></div></div>
          </div>
        </CardContent>
      </Card>

      {lastAuditResult && (
        <Card className="border-emerald-500/30">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Audit Result — {new Date(lastAuditResult.auditDate).toLocaleString()}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{lastAuditResult.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total</p><p className="text-lg font-bold">{lastAuditResult.totalTransactions}</p></div>
              <div className="rounded-md border p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Success</p><p className="text-lg font-bold text-emerald-600">{lastAuditResult.successCount}</p></div>
              <div className="rounded-md border p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Failed</p><p className="text-lg font-bold text-red-500">{lastAuditResult.failedCount}</p></div>
              <div className="rounded-md border p-3"><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Flagged</p><p className="text-lg font-bold text-amber-600">{lastAuditResult.flaggedCount}</p></div>
            </div>
            {lastAuditResult.discrepancies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Discrepancies ({lastAuditResult.discrepancies.length})</p>
                {lastAuditResult.discrepancies.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium">{d.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-muted-foreground">{d.detail}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{d.opayTxnId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-600" /> Audit History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No audits run yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${log.flaggedCount > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'}`}>
                    {log.flaggedCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{new Date(log.auditDate).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <Badge variant="outline" className="text-[10px] font-normal capitalize">{log.triggeredBy}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.summary}</p>
                    <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{log.totalTransactions} total</span>
                      <span className="text-emerald-600">{log.successCount} success</span>
                      <span className="text-red-500">{log.failedCount} failed</span>
                      <span className="text-amber-600">{log.flaggedCount} flagged</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
