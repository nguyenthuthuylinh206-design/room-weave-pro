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
type OpSub = 'transactions' | 'adjustments' | 'distributions' | 'reorder'
type AssetsSub = 'items' | 'categories'
type AnalyticsSub = 'consumption' | 'dead-stock'
type SettingsSub = 'supplements' | 'warehouses'

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
    else params.delete('sub')
    setSearchParams(params, { replace: true })
  }

  const setSub = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sub', next)
    setSearchParams(params, { replace: true })
  }

  // Mobile: keep dedicated mobile dashboard for overview tab; allow tab switching too
  if (isMobile && tab === 'overview') {
    return <MobileInventoryDashboard />
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
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
          <InventoryOverviewSection />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Tabs
            value={(sub as AssetsSub) || 'items'}
            onValueChange={setSub}
          >
            <TabsList>
              <TabsTrigger value="items">Danh sách tài sản</TabsTrigger>
              <TabsTrigger value="categories">Danh mục</TabsTrigger>
            </TabsList>
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
          </Tabs>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <Tabs
            value={(sub as OpSub) || 'transactions'}
            onValueChange={setSub}
          >
            <TabsList>
              <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
              <TabsTrigger value="adjustments">Kiểm kê</TabsTrigger>
              <TabsTrigger value="distributions">Phiếu giao</TabsTrigger>
              <TabsTrigger value="reorder">Đề xuất nhập</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-4">
              <Suspense fallback={<TabFallback />}>
                <TransactionListPage />
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
            <TabsList>
              <TabsTrigger value="consumption">Phân tích tiêu thụ</TabsTrigger>
              <TabsTrigger value="dead-stock">Tồn ứ đọng</TabsTrigger>
            </TabsList>
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
              <TabsList>
                <TabsTrigger value="supplements">Bổ sung đồ</TabsTrigger>
                <TabsTrigger value="warehouses">Quản lý kho</TabsTrigger>
              </TabsList>
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
  )
}
