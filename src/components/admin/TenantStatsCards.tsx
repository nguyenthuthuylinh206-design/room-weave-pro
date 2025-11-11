import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Clock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { SuperAdminStats } from '@/hooks/useSuperAdminStats'
import { formatCurrency } from '@/lib/utils'

interface TenantStatsCardsProps {
  stats: SuperAdminStats | undefined
}

export function TenantStatsCards({ stats }: TenantStatsCardsProps) {
  if (!stats) {
    return null
  }

  const cards = [
    {
      title: 'Tổng số Tenant',
      value: stats.total_tenants,
      icon: Building2,
      description: `${stats.active_tenants} đang hoạt động`,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Tenant dùng thử',
      value: stats.trial_tenants,
      icon: Clock,
      description: 'Đang trong giai đoạn thử nghiệm',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      title: 'Sắp hết hạn',
      value: stats.expiring_soon_count,
      icon: AlertTriangle,
      description: 'Cần gia hạn trong 7 ngày',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Tenant bị tạm ngưng',
      value: stats.suspended_tenants,
      icon: AlertTriangle,
      description: 'Chưa thanh toán',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Doanh thu tháng này',
      value: formatCurrency(stats.monthly_revenue),
      icon: DollarSign,
      description: `${stats.new_signups_this_month} đăng ký mới`,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Người dùng toàn hệ thống',
      value: stats.total_users,
      icon: Users,
      description: `${stats.total_hotels} khách sạn`,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-md ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
