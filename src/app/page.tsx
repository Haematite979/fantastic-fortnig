'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { CRMSidebar } from '@/components/crm/sidebar'
import { DashboardView } from '@/components/crm/dashboard-view'
import { CustomersView } from '@/components/crm/customers-view'
import { PipelineView } from '@/components/crm/pipeline-view'
import { ActivitiesView } from '@/components/crm/activities-view'
import { InsightsView } from '@/components/crm/insights-view'
import { AnalyticsView } from '@/components/crm/analytics-view'
import { OpayView } from '@/components/crm/opay-view'
import { CustomerDetailDrawer } from '@/components/crm/customer-detail-drawer'
import { ProfileDialog } from '@/components/crm/profile-dialog'
import { ProfileButton } from '@/components/crm/profile-button'
import { useCRMStore } from '@/lib/crm-store'
import { Separator } from '@/components/ui/separator'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  const view = useCRMStore((s) => s.view)
  const refresh = useCRMStore((s) => s.refresh)
  const [seeding, setSeeding] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function reseed() {
    setSeeding(true)
    toast.info('Re-seeding database with sample CRM data...')
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        toast.success('Database re-seeded with 12 sample customers')
        refresh()
      } else {
        throw new Error('Seed failed')
      }
    } catch {
      toast.error('Failed to re-seed database')
    } finally {
      setSeeding(false)
    }
  }

  const VIEW_TITLES: Record<string, string> = {
    dashboard: 'Dashboard',
    customers: 'Customers',
    pipeline: 'Pipeline',
    activities: 'Activities',
    insights: 'AI Insights',
    analytics: 'Analytics',
    opay: 'OPay Integration',
  }

  return (
    <SidebarProvider>
      {/* Background images — light mode shows bg-light, dark mode shows bg-dark */}
      <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-[0.04] dark:opacity-0 pointer-events-none transition-opacity duration-500" style={{ backgroundImage: 'url(/bg-light.png)' }} aria-hidden />
      <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-0 dark:opacity-[0.06] pointer-events-none transition-opacity duration-500" style={{ backgroundImage: 'url(/bg-dark.png)' }} aria-hidden />

      <CRMSidebar />
      <SidebarInset>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-1.5 flex-1">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold">{VIEW_TITLES[view]}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={reseed} disabled={seeding} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Seeding...' : 'Reset demo data'}
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ThemeToggle />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ProfileButton onClick={() => setProfileOpen(true)} />
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
          {view === 'dashboard' && <DashboardView />}
          {view === 'customers' && <CustomersView />}
          {view === 'pipeline' && <PipelineView />}
          {view === 'activities' && <ActivitiesView />}
          {view === 'insights' && <InsightsView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'opay' && <OpayView />}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t py-3 px-6 text-xs text-muted-foreground">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-2">
            <span>Lead Fix · AI-powered customer relationship management</span>
            <span>Next.js · Prisma · Z.ai LLM · OPay · shadcn/ui</span>
          </div>
        </footer>
      </SidebarInset>

      <CustomerDetailDrawer />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
