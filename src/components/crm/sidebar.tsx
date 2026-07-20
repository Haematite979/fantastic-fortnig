'use client'

import { useCRMStore, type ViewKey } from '@/lib/crm-store'
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Activity as ActivityIcon,
  Sparkles,
  BarChart3,
  TrendingUp,
  CreditCard,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'

const NAV: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & AI insights' },
  { key: 'customers', label: 'Customers', icon: Users, desc: 'Never lose a record' },
  { key: 'pipeline', label: 'Pipeline', icon: KanbanSquare, desc: 'Track every deal' },
  { key: 'activities', label: 'Activities', icon: ActivityIcon, desc: 'Calls, emails, meetings' },
  { key: 'insights', label: 'AI Insights', icon: Sparkles, desc: 'Sell smarter' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Sales trends' },
  { key: 'opay', label: 'OPay Integration', icon: CreditCard, desc: 'Transactions & daily audit' },
]

export function CRMSidebar() {
  const view = useCRMStore((s) => s.view)
  const setView = useCRMStore((s) => s.setView)
  const refreshKey = useCRMStore((s) => s.refreshKey)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Lead Fix</div>
            <div className="text-[11px] text-muted-foreground">AI Sales Co-pilot</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={view === item.key}
                    onClick={() => setView(item.key)}
                    tooltip={item.label}
                    className="data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-700 data-[active=true]:font-semibold"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>About</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 text-xs text-muted-foreground space-y-2">
              <p>AI-powered CRM that turns every customer touchpoint into a sales opportunity. Tracks sales, audits OPay transactions daily.</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Live
                </Badge>
                <span className="text-[10px]">Sync v{refreshKey + 1}</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 py-2 text-[10px] text-muted-foreground border-t">
          Built with Next.js · Prisma · Z.ai LLM
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
