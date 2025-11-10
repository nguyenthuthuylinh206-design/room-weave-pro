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
  Edit
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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
import { useQueryClient } from '@tanstack/react-query'
import { 
  PullToRefresh, 
  MobileStatCard, 
  StatScrollContainer,
  SwipeableCard,
  TouchButton
} from '@/components/mobile'
import { toast } from 'sonner'

export function MobileDashboard() {
  const navigate = useNavigate()
  const { user, tenantId } = useUser()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: recentActivities } = useRecentActivities(5)
  const { data: topItems } = useTopItems(5)
  const queryClient = useQueryClient()

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
      label: 'Add Item', 
      path: '/items/new',
      color: 'text-primary'
    },
    { 
      icon: Shirt, 
      label: 'Send Laundry', 
      path: '/laundry/create-batch',
      color: 'text-blue-600'
    },
    { 
      icon: Wrench, 
      label: 'Report Issue', 
      path: '/maintenance/new',
      color: 'text-orange-600'
    },
    { 
      icon: Scan, 
      label: 'Scan QR', 
      onClick: () => toast.info('QR Scanner coming soon!'),
      color: 'text-green-600'
    },
    { 
      icon: ShoppingCart, 
      label: 'Purchase Order', 
      path: '/purchase-orders/new',
      color: 'text-purple-600'
    },
    { 
      icon: FileText, 
      label: 'Reports', 
      path: '/reports',
      color: 'text-indigo-600'
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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-4 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 pb-6">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Hotel Asset Management System
          </p>
        </div>

        {/* Stats - Horizontal Scroll */}
        <div className="px-4">
          <StatScrollContainer>
            <MobileStatCard
              icon={Package}
              title="Total Value"
              value={`${new Intl.NumberFormat('en-US', { 
                notation: 'compact', 
                compactDisplay: 'short' 
              }).format(stats?.total_value || 0)}`}
              trend={stats?.total_value_change_percent ? `${stats.total_value_change_percent > 0 ? '+' : ''}${stats.total_value_change_percent}%` : undefined}
              onClick={() => navigate('/inventory')}
            />
            <MobileStatCard
              icon={Package}
              title="Total Items"
              value={stats?.total_items || 0}
              onClick={() => navigate('/items')}
            />
            <MobileStatCard
              icon={Wind}
              title="In Laundry"
              value={stats?.in_laundry || 0}
              onClick={() => navigate('/laundry')}
            />
            <MobileStatCard
              icon={AlertTriangle}
              title="Low Stock"
              value={stats?.low_stock_count || 0}
              variant="warning"
              onClick={() => navigate('/inventory')}
            />
          </StatScrollContainer>
        </div>

        {/* Quick Actions Grid */}
        <div className="px-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <TouchButton
                  key={action.label}
                  variant="ghost"
                  className="flex flex-col h-auto py-3 px-2 gap-2"
                  onClick={action.onClick || (() => navigate(action.path!))}
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

        {/* Alerts */}
        {stats?.low_stock_count && stats.low_stock_count > 0 && (
          <div className="px-4">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <span className="font-medium">{stats.low_stock_count} items</span> are running low on stock and need to be replenished.
                <TouchButton 
                  variant="link" 
                  size="sm" 
                  className="ml-2 h-auto p-0"
                  onClick={() => navigate('/inventory')}
                >
                  View Details →
                </TouchButton>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Recent Activity - Swipeable Cards */}
        <div className="px-4">
          <Accordion type="single" collapsible defaultValue="activity">
            <AccordionItem value="activity" className="border-none">
              <Card>
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Recent Activity</span>
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
                        No recent activity
                      </p>
                    )}
                  </div>
                  
                  {recentActivities && recentActivities.length >= 5 && (
                    <TouchButton
                      variant="ghost"
                      className="w-full mt-3"
                      onClick={() => navigate('/more')}
                    >
                      View All Activity
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
