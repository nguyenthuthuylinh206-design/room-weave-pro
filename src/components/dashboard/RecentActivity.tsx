import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Minus, 
  Send, 
  CheckCircle, 
  Home, 
  Wrench, 
  AlertTriangle,
  Activity as ActivityIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivities } from '@/hooks/useRecentActivities'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { ActivityType, DashboardActivity } from '@/types/dashboard.types'

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivities(10)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ActivityIcon}
            title="Chưa có hoạt động"
            description="Các hoạt động gần đây sẽ hiển thị ở đây"
          />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <AnimatePresence mode="popLayout">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <ActivityItem activity={activity} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ activity }: { activity: DashboardActivity }) {
  const Icon = getActivityIcon(activity.type)
  const color = getActivityColor(activity.type)
  
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        color
      )}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-sm leading-snug">{activity.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-4 w-4">
            <AvatarImage src={activity.user_avatar || undefined} />
            <AvatarFallback className="text-[8px]">
              {activity.user_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{activity.user_name}</span>
          <span>•</span>
          <span className="whitespace-nowrap">{formatRelativeTime(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

function getActivityIcon(type: ActivityType) {
  const icons = {
    inventory_add: Plus,
    inventory_remove: Minus,
    laundry_sent: Send,
    laundry_received: CheckCircle,
    room_check: Home,
    maintenance: Wrench,
    low_stock: AlertTriangle,
    other: ActivityIcon,
  }
  return icons[type] || icons.other
}

function getActivityColor(type: ActivityType) {
  const colors = {
    inventory_add: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    inventory_remove: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    laundry_sent: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    laundry_received: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    room_check: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    maintenance: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    low_stock: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
    other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[type] || colors.other
}
