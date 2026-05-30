import { lazy, Suspense, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  GitCompare,
  ClipboardCheck,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/lib/breakpoints'
import { useUser } from '@/hooks/useUser'
import type { AppRole } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { InventoryOverviewSection } from '@/components/inventory/InventoryOverviewSection'
import { MobileInventoryDashboard } from '@/components/inventory/MobileInventoryDashboard'

// Lazy-load each tab's heavy content so only the active tab fetches data
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
  requiresSettings?: boolean
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
      { label: 'Xuất kho', tab: 'operations', sub: 'outbound' },
      { label: 'Chuyển kho', tab: 'operations', sub: 'transfer' },
      { label: 'Kiểm kê', tab: 'operations', sub: 'adjustments' },
      { label: 'Phiếu giao hàng', tab: 'operations', sub: 'distributions' },
      { label: 'Đề xuất nhập hàng', tab: 'operations', sub: 'reorder' },
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
      { label: 'Bổ sung đồ', tab: 'settings', sub: 'supplements', requiresSettings: true },
      { label: 'Quản lý kho', tab: 'settings', sub: 'warehouses', requiresSettings: true },
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

  const canManageSettings = useMemo(
    () => hasAnyRole(['super_admin', 'owner', 'hotel_manager', 'department_manager'] as AppRole[]),
    [hasAnyRole]
  )

  const setTab = (next: MainTab, nextSub?: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    if (nextSub) params.set('sub', nextSub)
    else if (defaultSubByTab[next]) params.set('sub', defaultSubByTab[next]!)
    else params.delete('sub')
    setSearchParams(params, { replace: true })
  }

  const activeSub = sub || defaultSubByTab[tab] || ''

  const isMenuItemActive = (item: InventoryMenuItem) => {
    if (item.tab !== tab) return false
    if (!item.sub) return !sub
    return activeSub === item.sub
  }

  const visibleMenuGroups = useMemo(
    () => inventoryMenuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.requiresSettings || canManageSettings),
      }))
      .filter(group => group.items.length > 0),
    [canManageSettings]
  )

  const setSub = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sub', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kho & Tài sản"
        description="Trung tâm điều hành kho — tồn kho, xuất nhập, phân tích và thiết lập"
      >
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
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-4 lg:self-start border rounded-lg bg-background overflow-hidden">
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-2">
            {visibleMenuGroups.map((group) => (
              <div key={group.title} className="mb-3 last:mb-0">
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isMenuItemActive(item)
                    return (
                      <button
                        key={`${item.tab}-${item.sub || 'root'}`}
                        type="button"
                        onClick={() => setTab(item.tab, item.sub)}
                        className={cn(
                          'w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground'
                        )}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)} className="min-w-0">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="assets">Tài sản</TabsTrigger>
              <TabsTrigger value="operations">Xuất nhập</TabsTrigger>
              <TabsTrigger value="analytics">Phân tích</TabsTrigger>
              {canManageSettings && <TabsTrigger value="settings">Thiết lập</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4">
            {isMobile ? <MobileInventoryDashboard /> : <InventoryOverviewSection />}
          </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Tabs
            value={(sub as AssetsSub) || 'items'}
            onValueChange={setSub}
          >
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList>
                <TabsTrigger value="items">Danh sách tài sản</TabsTrigger>
                <TabsTrigger value="categories">Danh mục</TabsTrigger>
                <TabsTrigger value="new">+ Thêm tài sản</TabsTrigger>
              </TabsList>
            </div>
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
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList>
                <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
                <TabsTrigger value="inbound">+ Nhập kho</TabsTrigger>
                <TabsTrigger value="outbound">+ Xuất kho</TabsTrigger>
                <TabsTrigger value="transfer">+ Chuyển kho</TabsTrigger>
                <TabsTrigger value="adjustments">Kiểm kê</TabsTrigger>
                <TabsTrigger value="distributions">Phiếu giao hàng</TabsTrigger>
                <TabsTrigger value="reorder">Đề xuất nhập hàng</TabsTrigger>
              </TabsList>
            </div>
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
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList>
                <TabsTrigger value="dead-stock">Tồn kho ứ đọng</TabsTrigger>
                <TabsTrigger value="consumption">Phân tích tiêu thụ</TabsTrigger>
              </TabsList>
            </div>
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

        {canManageSettings && (
          <TabsContent value="settings" className="mt-4">
            <Tabs
              value={(sub as SettingsSub) || 'supplements'}
              onValueChange={setSub}
            >
              <div className="overflow-x-auto -mx-1 px-1">
                <TabsList>
                  <TabsTrigger value="supplements">Bổ sung đồ</TabsTrigger>
                  <TabsTrigger value="warehouses">Quản lý kho</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="supplements" className="mt-4">
                <Suspense fallback={<TabFallback />}>
                  <SupplementsPage />
                </Suspense>
              </TabsContent>
              <TabsContent value="warehouses" className="mt-4">
                <Suspense fallback={<TabFallback />}>
                  <WarehouseListPage />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
        </Tabs>
      </div>
    </div>
  )
}
