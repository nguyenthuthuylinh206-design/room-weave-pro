import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  GitCompare,
  ClipboardCheck,
  Plus,
  Menu as MenuIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollableTabsList } from '@/components/shared/ScrollableTabsList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/lib/breakpoints'
import { useUser } from '@/hooks/useUser'
import type { AppRole } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { InventoryOverviewSection } from '@/components/inventory/InventoryOverviewSection'
import { MobileInventoryDashboard } from '@/components/inventory/MobileInventoryDashboard'
import { InventoryQuickSearch } from '@/components/inventory/hub/InventoryQuickSearch'
import { InventoryHubBreadcrumb } from '@/components/inventory/hub/InventoryHubBreadcrumb'
import { useInventoryHubBadges } from '@/hooks/useInventoryHubBadges'
import { useInventoryHubShortcuts } from '@/hooks/useInventoryHubShortcuts'

const TransactionListPage = lazy(() => import('./TransactionListPage').then(m => ({ default: m.TransactionListPage })))
const AdjustmentListPage = lazy(() => import('./AdjustmentListPage').then(m => ({ default: m.AdjustmentListPage })))
const DistributionOrdersPage = lazy(() => import('./DistributionOrdersPage'))
const ReorderSuggestionsPage = lazy(() => import('./ReorderSuggestionsPage'))
const DeadStockPage = lazy(() => import('./DeadStockPage'))
const InventoryAnalyticsPage = lazy(() => import('./InventoryAnalyticsPage'))
const ItemsPage = lazy(() => import('../items/ItemsPage').then(m => ({ default: m.ItemsPage })))
const CategoriesPage = lazy(() => import('../items/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const SupplementsPage = lazy(() => import('../supplements/SupplementsPage').then(m => ({ default: m.SupplementsPage })))
const WarehouseListPage = lazy(() => import('../settings/WarehouseListPage'))
const InboundPage = lazy(() => import('./InboundPage').then(m => ({ default: m.InboundPage })))
const OutboundPage = lazy(() => import('./OutboundPage').then(m => ({ default: m.OutboundPage })))
const TransferPage = lazy(() => import('./TransferPage'))
const ItemFormPage = lazy(() => import('../items/ItemFormPage').then(m => ({ default: m.ItemFormPage })))
const CreateFromSupplementsPage = lazy(() => import('./CreateFromSupplementsPage'))

const TabFallback = () => (
  <div className="space-y-3 py-6">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-64 w-full" />
  </div>
)

type MainTab = 'overview' | 'assets' | 'operations' | 'analytics' | 'settings'
type OpSub = 'transactions' | 'inbound' | 'outbound' | 'transfer' | 'adjustments' | 'distributions' | 'reorder'
type AssetsSub = 'items' | 'categories' | 'new'
type AnalyticsSub = 'consumption' | 'dead-stock'
type SettingsSub = 'supplements' | 'warehouses'

type InventoryMenuItem = {
  label: string
  tab: MainTab
  sub?: OpSub | AssetsSub | AnalyticsSub | SettingsSub
  requiresManager?: boolean
  badgeKey?: 'reorderPending' | 'distributionsPending' | 'lowStock' | 'adjustmentsPending'
}

const inventoryMenuGroups: Array<{ title: string; items: InventoryMenuItem[] }> = [
  {
    title: 'Tổng quan',
    items: [
      { label: 'Bảng điều khiển', tab: 'overview' },
      { label: 'Giao dịch kho', tab: 'operations', sub: 'transactions' },
    ],
  },
  {
    title: 'Sản phẩm',
    items: [
      { label: 'Danh sách tài sản', tab: 'assets', sub: 'items' },
      { label: 'Danh mục', tab: 'assets', sub: 'categories' },
      { label: 'Thêm tài sản mới', tab: 'assets', sub: 'new' },
    ],
  },
  {
    title: 'Xuất nhập kho',
    items: [
      { label: 'Nhập kho', tab: 'operations', sub: 'inbound' },
      { label: 'Xuất kho', tab: 'operations', sub: 'outbound', badgeKey: 'distributionsPending' },
      { label: 'Chuyển kho', tab: 'operations', sub: 'transfer' },
      { label: 'Kiểm kê', tab: 'operations', sub: 'adjustments', badgeKey: 'adjustmentsPending' },
      { label: 'Đề xuất nhập hàng', tab: 'operations', sub: 'reorder', badgeKey: 'reorderPending' },
    ],
  },
  {
    title: 'Phân tích',
    items: [
      { label: 'Tồn kho ứ đọng', tab: 'analytics', sub: 'dead-stock' },
      { label: 'Phân tích tiêu thụ', tab: 'analytics', sub: 'consumption' },
    ],
  },
  {
    title: 'Thiết lập',
    items: [
      { label: 'Bổ sung đồ', tab: 'settings', sub: 'supplements' },
      { label: 'Quản lý kho', tab: 'settings', sub: 'warehouses', requiresManager: true },
    ],
  },
]

const defaultSubByTab: Partial<Record<MainTab, OpSub | AssetsSub | AnalyticsSub | SettingsSub>> = {
  assets: 'items',
  operations: 'transactions',
  analytics: 'consumption',
  settings: 'supplements',
}

export function InventoryDashboardPage() {
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasAnyRole } = useUser()
  const tab = (searchParams.get('tab') as MainTab) || 'overview'
  const sub = searchParams.get('sub') || ''
  const searchRef = useRef<HTMLInputElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const canManageSettings = useMemo(
    () => hasAnyRole(['super_admin', 'owner', 'hotel_manager', 'department_manager'] as AppRole[]),
    [hasAnyRole]
  )

  const { data: badges } = useInventoryHubBadges()

  // Legacy redirect: ?sub=distributions → ?sub=outbound&view=list
  useEffect(() => {
    if (tab === 'operations' && sub === 'distributions') {
      const next = new URLSearchParams(searchParams)
      next.set('sub', 'outbound')
      if (!next.get('view')) next.set('view', 'list')
      setSearchParams(next, { replace: true })
    }
  }, [tab, sub, searchParams, setSearchParams])

  const outboundView = (searchParams.get('view') as 'list' | 'manual' | 'from-requests') || 'list'
  const setOutboundView = (next: 'list' | 'manual' | 'from-requests') => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'operations')
    params.set('sub', 'outbound')
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  const setTab = useCallback((next: MainTab, nextSub?: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    if (nextSub) params.set('sub', nextSub)
    else if (defaultSubByTab[next]) params.set('sub', defaultSubByTab[next]!)
    else params.delete('sub')
    setSearchParams(params, { replace: true })
    setMobileMenuOpen(false)
  }, [searchParams, setSearchParams])

  useInventoryHubShortcuts(useCallback((key) => {
    if (key === 'search') {
      searchRef.current?.focus()
    } else if (key === 'overview') setTab('overview')
    else if (key === 'inbound') setTab('operations', 'inbound')
    else if (key === 'outbound') setTab('operations', 'outbound')
    else if (key === 'adjustments') setTab('operations', 'adjustments')
  }, [setTab]))

  const settingsSubValue: SettingsSub = canManageSettings && sub === 'warehouses' ? 'warehouses' : 'supplements'
  const activeSub = tab === 'settings' ? settingsSubValue : (sub || defaultSubByTab[tab] || '')

  const isMenuItemActive = (item: InventoryMenuItem) => {
    if (item.tab !== tab) return false
    if (!item.sub) return !sub
    return activeSub === item.sub
  }

  const visibleMenuGroups = useMemo(
    () => inventoryMenuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.requiresManager || canManageSettings),
      }))
      .filter(group => group.items.length > 0),
    [canManageSettings]
  )

  // Compute breadcrumb
  const breadcrumb = useMemo(() => {
    for (const g of visibleMenuGroups) {
      for (const it of g.items) {
        if (isMenuItemActive(it)) return { group: g.title, item: it.label }
      }
    }
    return { group: 'Tổng quan', item: 'Bảng điều khiển' }
  }, [visibleMenuGroups, tab, sub, settingsSubValue])

  const setSub = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sub', next)
    setSearchParams(params, { replace: true })
  }

  const renderMenuButton = (item: InventoryMenuItem) => {
    const isActive = isMenuItemActive(item)
    const badgeCount = item.badgeKey ? badges?.[item.badgeKey] ?? 0 : 0
    return (
      <button
        key={`${item.tab}-${item.sub || 'root'}`}
        type="button"
        onClick={() => setTab(item.tab, item.sub)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive
            ? 'bg-primary text-primary-foreground font-medium hover:bg-primary'
            : 'text-foreground'
        )}
      >
        <span className="truncate">{item.label}</span>
        {badgeCount > 0 && (
          <Badge
            variant={isActive ? 'secondary' : 'outline'}
            className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold tabular-nums"
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </Badge>
        )}
      </button>
    )
  }

  const navContent = (
    <div className="py-1">
      {visibleMenuGroups.map((group, idx) => (
        <div
          key={group.title}
          className={cn(
            'px-2 py-3',
            idx > 0 && 'border-t border-border/60',
          )}
        >
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map(renderMenuButton)}
          </div>
        </div>
      ))}
    </div>
  )


  return (
    <div className="space-y-4">
      <PageHeader
        title="Kho & Tài sản"
        description="Trung tâm điều hành kho — tồn kho, xuất nhập, phân tích và thiết lập"
      >
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <InventoryQuickSearch ref={searchRef} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Thao tác
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/inventory/inbound/new')}>
                <ArrowDownToLine className="h-4 w-4 mr-2" /> Nhập kho
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory/outbound/new')}>
                <ArrowUpFromLine className="h-4 w-4 mr-2" /> Xuất kho
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory/transfer/new')}>
                <GitCompare className="h-4 w-4 mr-2" /> Chuyển kho
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory/adjustments/new')}>
                <ClipboardCheck className="h-4 w-4 mr-2" /> Kiểm kê
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/items/new')}>
                <Plus className="h-4 w-4 mr-2" /> Thêm tài sản
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* Mobile: search + menu trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <MenuIcon className="h-4 w-4 mr-1.5" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin]">
            <SheetTitle className="px-4 pt-4 text-sm font-semibold">Menu Kho</SheetTitle>
            {navContent}
          </SheetContent>
        </Sheet>
        <div className="flex-1">
          <InventoryQuickSearch ref={searchRef} />
        </div>
      </div>

      {/* Breadcrumb */}
      <InventoryHubBreadcrumb groupTitle={breadcrumb.group} itemLabel={breadcrumb.item} />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="hidden lg:block lg:sticky lg:top-4 lg:self-start border rounded-lg bg-background overflow-hidden">
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
            {navContent}
          </div>
        </nav>

        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)} className="min-w-0">
          <div className="sticky top-0 z-10 bg-background pb-2 -mt-2 pt-2 -mx-1 px-1">
            <ScrollableTabsList>
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="assets">Tài sản</TabsTrigger>
                <TabsTrigger value="operations">Xuất nhập</TabsTrigger>
                <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                <TabsTrigger value="settings">Thiết lập</TabsTrigger>
              </TabsList>
            </ScrollableTabsList>
          </div>


          <TabsContent value="overview" className="mt-4">
            {isMobile ? <MobileInventoryDashboard /> : <InventoryOverviewSection onNavigate={setTab as (t: string, s?: string) => void} />}
          </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Tabs
            value={(sub as AssetsSub) || 'items'}
            onValueChange={setSub}
          >
            <ScrollableTabsList className="-mx-1 px-1">
              <TabsList>
                <TabsTrigger value="items">Danh sách tài sản</TabsTrigger>
                <TabsTrigger value="categories">Danh mục</TabsTrigger>
                <TabsTrigger value="new">+ Thêm tài sản</TabsTrigger>
              </TabsList>
            </ScrollableTabsList>
            <TabsContent value="items" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <ItemsPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="categories" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <CategoriesPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="new" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <ItemFormPage />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <Tabs
            value={(sub as OpSub) || 'transactions'}
            onValueChange={setSub}
          >
            <ScrollableTabsList className="-mx-1 px-1">
              <TabsList>
                <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
                <TabsTrigger value="inbound">+ Nhập kho</TabsTrigger>
                <TabsTrigger value="outbound">
                  Xuất kho
                  {(badges?.distributionsPending ?? 0) > 0 && (
                    <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                      {badges?.distributionsPending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="transfer">+ Chuyển kho</TabsTrigger>
                <TabsTrigger value="adjustments">
                  Kiểm kê
                  {(badges?.adjustmentsPending ?? 0) > 0 && (
                    <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                      {badges?.adjustmentsPending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reorder">
                  Đề xuất nhập hàng
                  {(badges?.reorderPending ?? 0) > 0 && (
                    <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                      {badges?.reorderPending}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </ScrollableTabsList>
            <TabsContent value="transactions" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <TransactionListPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="inbound" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <InboundPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="outbound" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <OutboundPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="transfer" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <TransferPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="adjustments" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <AdjustmentListPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="distributions" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <DistributionOrdersPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="reorder" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <ReorderSuggestionsPage />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Tabs
            value={(sub as AnalyticsSub) || 'consumption'}
            onValueChange={setSub}
          >
            <ScrollableTabsList className="-mx-1 px-1">
              <TabsList>
                <TabsTrigger value="dead-stock">Tồn kho ứ đọng</TabsTrigger>
                <TabsTrigger value="consumption">Phân tích tiêu thụ</TabsTrigger>
              </TabsList>
            </ScrollableTabsList>
            <TabsContent value="consumption" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <InventoryAnalyticsPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="dead-stock" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <DeadStockPage />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Tabs
              value={settingsSubValue}
              onValueChange={setSub}
            >
              <ScrollableTabsList className="-mx-1 px-1">
                <TabsList>
                  <TabsTrigger value="supplements">Bổ sung đồ</TabsTrigger>
                  {canManageSettings && <TabsTrigger value="warehouses">Quản lý kho</TabsTrigger>}
                </TabsList>
              </ScrollableTabsList>
              <TabsContent value="supplements" className="mt-4">
                <Suspense fallback={<TabFallback />}>
                  <SupplementsPage />
                </Suspense>
              </TabsContent>
              {canManageSettings && (
                <TabsContent value="warehouses" className="mt-4">
                  <Suspense fallback={<TabFallback />}>
                    <WarehouseListPage />
                  </Suspense>
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
