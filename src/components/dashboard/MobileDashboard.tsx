import { useNavigate } from 'react-router-dom'
import { 
  Package, 
  Wind, 
  AlertTriangle, 
  Plus,
  Scan,
  FileText,
  Shirt,
  Wrench,
  ShoppingCart,
  TrendingUp,
  Activity,
  ChevronRight,
  Trash2,
  Edit,
  DoorOpen,
  DoorClosed,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useUser } from '@/hooks/useUser'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useRecentActivities } from '@/hooks/useRecentActivities'
import { useTopItems } from '@/hooks/useTopItems'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { 
  PullToRefresh, 
  MobileStatCard, 
  StatScrollContainer,
  SwipeableCard,
  TouchButton
} from '@/components/mobile'
import { toast } from 'sonner'
import { MobileHotelSwitcher, MobileAlertsBanner } from '@/components/mobile'
import { useHotelContext } from '@/contexts/HotelContext'
import { supabase } from '@/integrations/supabase/client'
import { isStaff } from '@/lib/userAccess'
import { ShiftCheckInCard } from '@/components/staff/ShiftCheckInCard'

export function MobileDashboard() {
  const navigate = useNavigate()
  const { user, tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: recentActivities } = useRecentActivities(5)
  const { data: topItems } = useTopItems(5)
  const queryClient = useQueryClient()
  
  // Check if user is staff for shift check-in card
  const isStaffUser = isStaff(user)

  // Get room stats - separate queries to avoid mutation bug
  const { data: roomStats } = useQuery({
    queryKey: ['room-stats', tenantId, selectedHotel?.id, isAllHotelsMode],
    queryFn: async () => {
      const buildQuery = (status?: string) => {
        let query = supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)

        if (!isAllHotelsMode && selectedHotel?.id) {
          query = query.eq('hotel_id', selectedHotel.id)
        }

        if (status) {
          query = query.eq('status', status)
        }

        return query
      }

      const [totalResult, availableResult, occupiedResult, maintenanceResult] = await Promise.all([
        buildQuery(),
        buildQuery('available'),
        buildQuery('occupied'),
        buildQuery('maintenance')
      ])

      return {
        total: totalResult.count || 0,
        available: availableResult.count || 0,
        occupied: occupiedResult.count || 0,
        maintenance: maintenanceResult.count || 0
      }
    },
    enabled: !!tenantId
  })

  // Get pending maintenance
  const { data: maintenanceStats } = useQuery({
    queryKey: ['maintenance-stats', tenantId, selectedHotel?.id],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_requests')
        .select('status', { count: 'exact' })
        .eq('tenant_id', tenantId!)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const [pending, inProgress] = await Promise.all([
        query.eq('status', 'pending'),
        query.eq('status', 'in_progress')
      ])

      return {
        pending: pending.count || 0,
        inProgress: inProgress.count || 0,
        total: (pending.count || 0) + (inProgress.count || 0)
      }
    },
    enabled: !!tenantId
  })

  // Get active laundry batches
  const { data: laundryStats } = useQuery({
    queryKey: ['laundry-stats', tenantId, selectedHotel?.id],
    queryFn: async () => {
      let query = supabase
        .from('laundry_batches')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('status', 'in_progress')

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const result = await query
      return result.count || 0
    },
    enabled: !!tenantId
  })

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['recent-activities', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['top-items', tenantId] })
    ])
    toast.success('Dashboard refreshed')
  }

  const quickActions = [
    { 
      icon: Plus, 
      label: 'Thêm tài sản', 
      path: '/items/new',
      color: 'text-primary',
      category: 'Items'
    },
    { 
      icon: DoorOpen, 
      label: 'Kiểm phòng', 
      path: '/rooms',
      color: 'text-green-600',
      category: 'Operations'
    },
    { 
      icon: Shirt, 
      label: 'Gửi giặt', 
      path: '/laundry/create-batch',
      color: 'text-blue-600',
      category: 'Operations'
    },
    { 
      icon: Wrench, 
      label: 'Báo hỏng hóc', 
      path: '/maintenance/new',
      color: 'text-orange-600',
      category: 'Operations'
    },
    { 
      icon: ShoppingCart, 
      label: 'Tạo đơn hàng', 
      path: '/purchase-orders/new',
      color: 'text-purple-600',
      category: 'Items'
    },
    { 
      icon: FileText, 
      label: 'Báo cáo', 
      path: '/reports',
      color: 'text-indigo-600',
      category: 'Reports'
    },
  ]

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
        <StatScrollContainer>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="min-w-[140px] h-24 animate-pulse bg-muted" />
          ))}
        </StatScrollContainer>
      </div>
    )
  }

  // Prepare alerts for MobileAlertsBanner
  const alerts = []
  
  if (stats && stats.low_stock_count > 0) {
    alerts.push({
      id: 'low-stock',
      type: 'low_stock' as const,
      title: 'Hàng tồn kho thấp',
      description: `${stats.low_stock_count} mặt hàng cần nhập thêm`,
      count: stats.low_stock_count,
      path: '/inventory?filter=low_stock',
      priority: 'high' as const
    })
  }
  
  if (maintenanceStats && maintenanceStats.pending > 0) {
    alerts.push({
      id: 'pending-maintenance',
      type: 'pending_maintenance' as const,
      title: 'Yêu cầu bảo trì chờ xử lý',
      description: `${maintenanceStats.pending} yêu cầu cần được xử lý`,
      count: maintenanceStats.pending,
      path: '/maintenance?status=pending',
      priority: 'high' as const
    })
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-4 space-y-4">
        {/* Header with Hotel Switcher */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 pb-6 space-y-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Chào {user?.full_name?.split(' ')[0] || 'bạn'}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Hệ thống quản lý tài sản khách sạn
            </p>
          </div>
          <MobileHotelSwitcher />
        </div>

        {/* Shift Check-in Card - Only for staff */}
        {isStaffUser && (
          <div className="px-4">
            <ShiftCheckInCard />
          </div>
        )}

        {/* Stats - Horizontal Scroll */}
        <div className="px-4">
          <StatScrollContainer>
            <MobileStatCard
              icon={Package}
              title="Tổng giá trị"
              value={`${new Intl.NumberFormat('vi-VN', { 
                notation: 'compact', 
                compactDisplay: 'short' 
              }).format(stats?.total_value || 0)}`}
              trend={stats?.total_value_change_percent ? `${stats.total_value_change_percent > 0 ? '+' : ''}${stats.total_value_change_percent}%` : undefined}
              onClick={() => navigate('/inventory')}
            />
            <MobileStatCard
              icon={Package}
              title="Tổng tài sản"
              value={stats?.total_items || 0}
              onClick={() => navigate('/items')}
            />
            <MobileStatCard
              icon={DoorOpen}
              title="Tổng phòng"
              value={roomStats?.total || 0}
              onClick={() => navigate('/rooms')}
            />
            <MobileStatCard
              icon={DoorClosed}
              title="Phòng đang dùng"
              value={roomStats?.occupied || 0}
              variant={roomStats && roomStats.occupied > 0 ? "default" : "default"}
              onClick={() => navigate('/rooms?status=occupied')}
            />
            <MobileStatCard
              icon={Wind}
              title="Đang giặt"
              value={stats?.in_laundry || 0}
              onClick={() => navigate('/laundry')}
            />
            <MobileStatCard
              icon={Shirt}
              title="Lô giặt đang xử lý"
              value={laundryStats || 0}
              onClick={() => navigate('/laundry?status=in_progress')}
            />
            <MobileStatCard
              icon={Wrench}
              title="Yêu cầu bảo trì"
              value={maintenanceStats?.pending || 0}
              variant={maintenanceStats && maintenanceStats.pending > 0 ? "warning" : "default"}
              onClick={() => navigate('/maintenance?status=pending')}
            />
            <MobileStatCard
              icon={AlertTriangle}
              title="Hàng sắp hết"
              value={stats?.low_stock_count || 0}
              variant="warning"
              onClick={() => navigate('/inventory?filter=low_stock')}
            />
          </StatScrollContainer>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="px-4">
            <MobileAlertsBanner alerts={alerts} />
          </div>
        )}

        {/* Room Status Section */}
        {roomStats && (
          <div className="px-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Tình trạng phòng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950">
                  <span className="text-sm font-medium">Còn trống</span>
                  <Badge variant="outline" className="bg-white dark:bg-background">
                    {roomStats.available}/{roomStats.total}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <span className="text-sm font-medium">Đang sử dụng</span>
                  <Badge variant="outline" className="bg-white dark:bg-background">
                    {roomStats.occupied}/{roomStats.total}
                  </Badge>
                </div>
                {roomStats.maintenance > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <span className="text-sm font-medium">Đang bảo trì</span>
                    <Badge variant="outline" className="bg-white dark:bg-background">
                      {roomStats.maintenance}
                    </Badge>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate('/rooms')}
                >
                  Xem chi tiết phòng
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="px-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Thao tác nhanh
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <TouchButton
                  key={action.label}
                  variant="ghost"
                  className="flex flex-col h-auto py-3 px-2 gap-2"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary">
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </TouchButton>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity - Swipeable Cards */}
        <div className="px-4">
          <Accordion type="single" collapsible defaultValue="activity">
            <AccordionItem value="activity" className="border-none">
              <Card>
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Hoạt động gần đây</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {recentActivities && recentActivities.length > 0 ? (
                      recentActivities.map((activity, index: number) => (
                        <SwipeableCard
                          key={activity.id || index}
                          onSwipeLeft={() => toast.info('Swipe actions coming soon!')}
                          threshold={100}
                        >
                          <Card className="p-3 border-l-4 border-l-primary">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.user_name} • {activity.metadata?.entity_type || 'Activity'}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </Card>
                        </SwipeableCard>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Chưa có hoạt động nào
                      </p>
                    )}
                  </div>
                  
                  {recentActivities && recentActivities.length >= 5 && (
                    <TouchButton
                      variant="ghost"
                      className="w-full mt-3"
                      onClick={() => navigate('/more')}
                    >
                      Xem tất cả hoạt động
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </TouchButton>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Top Items - Swipeable Cards */}
        <div className="px-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Most Used Items
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/items')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {topItems && topItems.length > 0 ? (
                topItems.map((item, index: number) => (
                  <SwipeableCard
                    key={item.id || index}
                    onSwipeLeft={() => navigate(`/items/${item.id}/edit`)}
                    onSwipeRight={() => navigate(`/items/${item.id}`)}
                    threshold={80}
                  >
                    <Card className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.code}
                          </p>
                        </div>
                        <Badge variant={item.stock_status === 'low_stock' || item.stock_status === 'out_of_stock' ? 'destructive' : 'default'}>
                          {item.quantity_total}
                        </Badge>
                      </div>
                    </Card>
                  </SwipeableCard>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items data available
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Swipe Hint */}
        <div className="px-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Swipe left on items to edit, swipe right to view details
          </p>
        </div>
      </div>
    </PullToRefresh>
  )
}
