'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User as UserIcon, Building2, CreditCard, Crown, LogOut, Save, ExternalLink, Loader2,
} from 'lucide-react'
import { useCRMStore } from '@/lib/crm-store'
import { getPlan, type Plan } from '@/lib/plans'
import { toast } from 'sonner'
import Link from 'next/link'

interface ProfileData {
  id: string
  email: string
  name: string | null
  companyName: string | null
  role: string | null
  avatarColor: string
  createdAt: string
}

interface SubscriptionData {
  plan: string
  status: string
  monthlyAmount: number
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const AVATAR_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#84cc16', '#f97316']

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const refresh = useCRMStore((s) => s.refresh)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // editable form
  const [form, setForm] = useState({ name: '', companyName: '', role: '' })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/profile/init', { method: 'POST' })
      .then(() => Promise.all([
        fetch('/api/me').then((r) => r.json()),
        fetch('/api/subscription').then((r) => r.json()),
      ]))
      .then(([u, s]) => {
        setProfile(u.user ?? null)
        // The subscription API returns plan as a nested Plan object; extract the key
        const sub = s.subscription
        if (sub) {
          setSubscription({
            plan: typeof sub.plan === 'string' ? sub.plan : sub.plan?.key ?? 'free',
            status: sub.status,
            monthlyAmount: sub.monthlyAmount,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          })
        }
        setForm({
          name: u.user?.name ?? '',
          companyName: u.user?.companyName ?? '',
          role: u.user?.role ?? '',
        })
        setLoading(false)
      })
  }, [open])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save')
      setProfile(d.user)
      toast.success('Profile updated')
      refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const plan: Plan | undefined = subscription ? getPlan(subscription.plan) : undefined
  const initials = (profile?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const daysToRenewal = subscription?.currentPeriodEnd
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Your profile</DialogTitle>
        {/* Header band — minimalist avatar + name, instantly recognizable */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold ring-2 ring-white/30 shrink-0"
              style={{ backgroundColor: profile?.avatarColor || '#10b981' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{profile?.name || 'Your profile'}</h2>
              <p className="text-sm text-white/80 truncate">{profile?.email}</p>
              {profile?.companyName && <p className="text-xs text-white/70 truncate">{profile.companyName}</p>}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Current plan card */}
              {plan && subscription && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-emerald-600" /> Current plan
                    </span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{subscription.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.monthlyAmount === 0 ? 'No charge' : `₦${plan.monthlyAmount.toLocaleString()}/mo`}
                      </p>
                    </div>
                    {daysToRenewal !== null && daysToRenewal > 0 && (
                      <p className="text-[11px] text-muted-foreground text-right">
                        {subscription.cancelAtPeriodEnd ? 'Cancels in' : 'Renews in'}<br />
                        <span className="font-medium text-foreground">{daysToRenewal}d</span>
                      </p>
                    )}
                  </div>
                  <Link href="/pricing" onClick={() => onOpenChange(false)}>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-8">
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      {plan.key === 'free' ? 'Upgrade plan' : 'Change plan'}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Edit profile */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="p-name" className="text-xs flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Full name</Label>
                  <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-company" className="text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Company</Label>
                  <Input id="p-company" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="h-9" placeholder="Your company" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-role" className="text-xs">Role / title</Label>
                  <Input id="p-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9" placeholder="Founder, Sales Lead..." />
                </div>

                {/* Avatar color picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Avatar color</Label>
                  <div className="flex gap-1.5">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, role: form.role })}
                        className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all hover:scale-110"
                        style={{ backgroundColor: c, '--tw-ring-color': profile?.avatarColor === c ? c : 'transparent' } as React.CSSProperties}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={saveProfile} disabled={saving} size="sm" className="w-full h-9">
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save changes
                </Button>
              </div>

              <Separator />

              {/* Member since */}
              <p className="text-center text-[10px] text-muted-foreground">
                Member since {profile ? new Date(profile.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
