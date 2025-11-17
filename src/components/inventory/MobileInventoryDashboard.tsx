import { useNavigate } from 'react-router-dom'
import { PackagePlus, PackageMinus, ClipboardList, TrendingUp, AlertTriangle, Package } from 'lucide-react'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { StatScrollContainer, MobileStatCard } from '@/components/mobile/MobileDashboardStats'
import { SwipeableCard } from '@/components/mobile/TouchOptimized'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useInventoryDashboard, useLowStockItems } from '@/hooks/useInventoryDashboard'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function MobileInventoryDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: dashboardData, isLoading } = useInventoryDashboard()
  const { data: lowStockItems = [] } = useLowStockItems(5)

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
    await queryClient.invalidateQueries({ queryKey: ['low-stock-items'] })
  }

  const quickActions = [
    {
      icon: PackagePlus,
      label: 'Nhập kho',
      onClick: () => navigate('/inventory/inbound'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: PackageMinus,
      label: 'Xuất kho',
      onClick: () => navigate('/inventory/outbound'),
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      icon: ClipboardList,
      label: 'Kiểm kê',
      onClick: () => navigate('/inventory/adjustments/new'),
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Package,
      label: 'Quản lý Items',
      onClick: () => navigate('/inventory'),
      color: 'text-green-600 dark:text-green-400',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  const stats = dashboardData

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-20">
        {/* Stats Overview */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold px-4">Tổng quan</h2>
          <StatScrollContainer>
          <MobileStatCard
            icon={TrendingUp}
            title="Tổng giá trị"
            value={formatCurrency(stats?.total_stock_value || 0)}
            trend={stats?.stock_value_change_percent ? `${stats.stock_value_change_percent > 0 ? '+' : ''}${stats.stock_value_change_percent.toFixed(1)}%` : undefined}
            variant="default"
          />
          <MobileStatCard
            icon={Package}
            title="Tổng items"
            value={formatNumber(stats?.total_items_count || 0)}
            variant="default"
          />
          <MobileStatCard
            icon={AlertTriangle}
            title="Sắp hết"
            value={formatNumber(stats?.low_stock_count || 0)}
            variant={stats?.low_stock_count && stats.low_stock_count > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/inventory?filter=low_stock')}
          />
          <MobileStatCard
            icon={Package}
            title="Cần đặt hàng"
            value={formatNumber(stats?.reorder_needed_count || 0)}
            variant={stats?.reorder_needed_count && stats.reorder_needed_count > 0 ? 'destructive' : 'default'}
          />
          </StatScrollContainer>
        </div>

        {/* Quick Actions */}
        <div className="px-4 space-y-3">
          <h2 className="text-lg font-semibold">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Card
                key={action.label}
                className="cursor-pointer active:scale-95 transition-transform"
                onClick={action.onClick}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                  <action.icon className={`h-8 w-8 ${action.color}`} />
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="px-4 space-y-3">
            <h2 className="text-lg font-semibold">Cảnh báo tồn kho thấp</h2>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {lowStockItems.length} items sắp hết hàng. Cần đặt hàng ngay!
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item) => (
                <SwipeableCard
                  key={item.id}
                  onSwipeLeft={() => navigate(`/inventory/${item.id}`)}
                  onSwipeRight={() => navigate('/purchase-orders/new')}
                >
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.code}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              Còn {item.quantity_in_stock}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Tối thiểu: {item.minimum_stock}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableCard>
              ))}
              {lowStockItems.length > 3 && (
                <button
                  onClick={() => navigate('/inventory?filter=low_stock')}
                  className="w-full text-sm text-primary hover:underline py-2"
                >
                  Xem thêm {lowStockItems.length - 3} items
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Giao dịch gần đây</h2>
            <button
              onClick={() => navigate('/inventory/transactions')}
              className="text-sm text-primary hover:underline"
            >
              Xem tất cả
            </button>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="today" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Hôm nay</span>
                  <Badge variant="secondary">{stats?.today_transactions?.total || 0}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">
                  Nhấn "Xem tất cả" để xem chi tiết các giao dịch
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Tips */}
        <div className="px-4 pb-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Mẹo:</strong> Vuốt sang trái trên các thẻ để xem chi tiết, vuốt sang phải để thao tác nhanh
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  )
}
