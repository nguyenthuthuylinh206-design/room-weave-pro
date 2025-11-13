import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Crown, UserCog, UserCheck } from 'lucide-react'
import { UserWithRelations } from '@/types/database.types'

interface UserStatsCardsProps {
  users: UserWithRelations[]
}

export function UserStatsCards({ users }: UserStatsCardsProps) {
  const totalUsers = users.length
  const ownerCount = users.filter(u => u.user_level_code === 'tenant_owner').length
  const managerCount = users.filter(u => u.user_level_code === 'manager').length
  const staffCount = users.filter(u => u.user_level_code === 'staff').length
  const activeCount = users.filter(u => u.status === 'active').length

  const stats = [
    {
      title: 'Tổng số người dùng',
      value: totalUsers,
      icon: Users,
      description: `${activeCount} đang hoạt động`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Chủ sở hữu',
      value: ownerCount,
      icon: Crown,
      description: 'Quyền cao nhất',
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Quản lý',
      value: managerCount,
      icon: UserCog,
      description: 'Quản lý khách sạn',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Nhân viên',
      value: staffCount,
      icon: UserCheck,
      description: 'Nhân viên thực hiện',
      color: 'text-gray-600 dark:text-gray-400'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}