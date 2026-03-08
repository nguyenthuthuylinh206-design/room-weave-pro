import { useNavigate } from 'react-router-dom'
import {
  Package, DollarSign, ArrowRightLeft, Shirt, Home, Wrench, LogOut,
} from 'lucide-react'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { Card, CardContent } from '@/components/ui/card'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export function MobileReportsDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('reports')

  const reportCategories = [
    {
      id: 'inventory',
      title: t('types.inventory.title'),
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      description: t('types.inventory.description'),
      path: '/reports/inventory',
    },
    {
      id: 'financial',
      title: t('types.expenses.title'),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
      description: t('types.expenses.description'),
      path: '/reports/financial',
    },
    {
      id: 'operations',
      title: t('types.summary.title'),
      icon: ArrowRightLeft,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      description: t('types.summary.description'),
      path: '/reports/operations',
    },
    {
      id: 'laundry',
      title: t('types.laundry.title'),
      icon: Shirt,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
      description: t('types.laundry.description'),
      path: '/reports/laundry',
    },
    {
      id: 'rooms',
      title: t('types.rooms.title'),
      icon: Home,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      description: t('types.rooms.description'),
      path: '/reports/rooms',
    },
    {
      id: 'maintenance',
      title: t('types.performance.title'),
      icon: Wrench,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      description: t('types.performance.description'),
      path: '/reports/maintenance',
    },
  ]

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['quick-report'] })
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="px-4 pt-2">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>

        {/* Report Categories */}
        <div className="px-4 space-y-3">
          <h2 className="text-lg font-semibold">{t('custom.title')}</h2>
          <div className="grid gap-3">
            {reportCategories.map((category) => {
              const Icon = category.icon

              return (
                <Card
                  key={category.id}
                  className="cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(category.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-3 ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{category.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="px-4 pb-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>{t('tip')}:</strong> {t('custom.description')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  )
}
