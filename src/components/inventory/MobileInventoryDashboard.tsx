import { useNavigate } from 'react-router-dom'
import { PackagePlus, PackageMinus, ClipboardList, TrendingUp, AlertTriangle, Package, ArrowRightLeft, FileText, DollarSign, ChevronRight, Sparkles, BarChart3 } from 'lucide-react'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { StatScrollContainer, MobileStatCard } from '@/components/mobile/MobileDashboardStats'
import { SwipeableCard } from '@/components/mobile/TouchOptimized'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useInventoryDashboard, useLowStockItems } from '@/hooks/useInventoryDashboard'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'

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
      description: 'Thêm hàng mới',
      onClick: () => navigate('/inventory/inbound'),
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      icon: PackageMinus,
      label: 'Xuất kho',
      description: 'Xuất hàng đi',
      onClick: () => navigate('/inventory/outbound'),
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      icon: ClipboardList,
      label: 'Kiểm kê',
      description: 'Kiểm tra tồn kho',
      onClick: () => navigate('/inventory/adjustments/new'),
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      icon: FileText,
      label: 'Giao dịch',
      description: 'Xem lịch sử',
      onClick: () => navigate('/inventory/transactions'),
      gradient: 'from-cyan-500 to-cyan-600',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-500',
    },
    {
      icon: Package,
      label: 'Tài sản',
      description: 'Quản lý items',
      onClick: () => navigate('/items'),
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      icon: BarChart3,
      label: 'Báo cáo',
      description: 'Thống kê kho',
      onClick: () => navigate('/reports/inventory'),
      gradient: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse rounded-2xl" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-32 flex-shrink-0 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const stats = dashboardData
  const stockHealthPercent = stats?.total_items_count 
    ? Math.round(((stats.total_items_count - (stats.low_stock_count || 0)) / stats.total_items_count) * 100)
    : 100

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-5 pb-24">
        {/* Hero Card */}
        <div className="px-4 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium opacity-90">Tổng giá trị kho</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(stats?.total_stock_value || 0)}
              </p>
              {stats?.stock_value_change_percent !== undefined && stats.stock_value_change_percent !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">
                    {stats.stock_value_change_percent > 0 ? '+' : ''}
                    {stats.stock_value_change_percent.toFixed(1)}% so với tháng trước
                  </span>
                </div>
              )}
              
              {/* Stock Health */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm opacity-90">Sức khỏe kho hàng</span>
                  <span className="text-sm font-medium">{stockHealthPercent}%</span>
                </div>
                <Progress value={stockHealthPercent} className="h-2 bg-white/20" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold px-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Thống kê nhanh
          </h2>
          <StatScrollContainer>
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
            <MobileStatCard
              icon={ArrowRightLeft}
              title="GD hôm nay"
              value={formatNumber(stats?.today_transactions?.total || 0)}
              variant="default"
              onClick={() => navigate('/inventory/transactions')}
            />
            <MobileStatCard
              icon={DollarSign}
              title="Nhập tháng này"
              value={formatCurrency(stats?.value_in_this_month || 0)}
              trend={stats?.inbound_change_percent ? `${stats.inbound_change_percent > 0 ? '+' : ''}${stats.inbound_change_percent.toFixed(1)}%` : undefined}
              variant="default"
            />
          </StatScrollContainer>
        </div>

        {/* Quick Actions */}
        <div className="px-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Thao tác nhanh
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer border-0 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 overflow-hidden"
                  onClick={action.onClick}
                >
                  <CardContent className="flex flex-col items-center justify-center p-3 min-h-[90px]">
                    <div className={`p-2.5 rounded-xl ${action.iconBg} mb-2`}>
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Cảnh báo tồn kho
              </h2>
              <Badge variant="destructive" className="rounded-full">
                {lowStockItems.length}
              </Badge>
            </div>
            
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                {lowStockItems.length} sản phẩm sắp hết hàng cần được bổ sung!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <SwipeableCard
                    onSwipeLeft={() => navigate(`/items/${item.id}`)}
                    onSwipeRight={() => navigate('/purchase-orders/new')}
                  >
                    <Card className="border-orange-200/50 dark:border-orange-800/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-3">
                            <Badge variant="destructive" className="text-xs rounded-full">
                              Còn {item.quantity_in_stock}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Min: {item.minimum_stock}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(((item.quantity_in_stock || 0) / (item.minimum_stock || 1)) * 100, 100)} 
                          className="h-1.5 mt-3"
                        />
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                </motion.div>
              ))}
              
              {lowStockItems.length > 3 && (
                <button
                  onClick={() => navigate('/inventory?filter=low_stock')}
                  className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 py-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  Xem thêm {lowStockItems.length - 3} sản phẩm
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Today Transactions Summary */}
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              Giao dịch hôm nay
            </h2>
            <button
              onClick={() => navigate('/inventory/transactions')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Xem tất cả
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
              <CardContent className="p-3 text-center">
                <PackagePlus className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.today_transactions?.in || 0}
                </p>
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Nhập kho</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900">
              <CardContent className="p-3 text-center">
                <PackageMinus className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {stats?.today_transactions?.out || 0}
                </p>
                <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70">Xuất kho</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tips */}
        <div className="px-4 pb-4">
          <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-0">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Mẹo sử dụng</p>
                <p className="text-xs text-muted-foreground">
                  Vuốt sang trái để xem chi tiết, vuốt sang phải để đặt hàng nhanh
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  )
}
