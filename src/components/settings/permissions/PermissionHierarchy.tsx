import { Shield, Users, UserCog, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRolesManagement } from '@/hooks/useRolesManagement'
import { cn } from '@/lib/utils'

const HIERARCHY_ICONS: Record<number, any> = {
  1: Shield,
  2: Users,
  3: UserCog,
  4: User,
}

export function PermissionHierarchy() {
  const { roles, isLoading } = useRolesManagement()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const sortedRoles = [...(roles || [])].sort((a, b) => a.hierarchy_level - b.hierarchy_level)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân cấp Vai trò</CardTitle>
        <CardDescription>
          Hệ thống phân cấp vai trò từ quyền cao nhất đến thấp nhất
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRoles.map((role, index) => {
            const Icon = HIERARCHY_ICONS[role.hierarchy_level] || User
            const isFirst = index === 0
            const isLast = index === sortedRoles.length - 1

            return (
              <div key={role.id} className="relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border -z-10" />
                )}

                <div
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                    isFirst && 'bg-primary/5 border-primary/20',
                    role.is_system && 'border-l-4 border-l-primary'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-full',
                    isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{role.name}</h3>
                      <Badge variant={role.is_system ? 'default' : 'secondary'}>
                        Cấp {role.hierarchy_level}
                      </Badge>
                      {role.is_system && (
                        <Badge variant="outline">Hệ thống</Badge>
                      )}
                    </div>

                    {role.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {role.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Mã: {role.code}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {index + 1}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Lưu ý:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Vai trò cấp cao hơn có thể quản lý vai trò cấp thấp hơn</li>
            <li>• Vai trò hệ thống không thể xóa hoặc chỉnh sửa</li>
            <li>• Quyền hạn được kế thừa theo cấp bậc</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
