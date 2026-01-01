import { useMemo } from 'react'
import { DollarSign, TrendingDown, ShoppingCart, Wrench, Wind } from 'lucide-react'
import { useMonthlyExpenses } from '@/hooks/useMonthlyExpenses'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface FinancialOverviewProps {
  dateRange: { start: Date; end: Date }
}

export function FinancialOverview({ dateRange }: FinancialOverviewProps) {
  const monthsDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30)))
  const { data: expenses, isLoading: expensesLoading } = useMonthlyExpenses(monthsDiff)
  const { data: stats, isLoading: statsLoading } = useDashboardStats()

  const totals = useMemo(() => {
    if (!expenses) return { purchase: 0, laundry: 0, maintenance: 0, total: 0 }
    return expenses.reduce(
      (acc, exp) => ({
        purchase: acc.purchase + exp.purchase,
        laundry: acc.laundry + exp.laundry,
        maintenance: acc.maintenance + exp.maintenance,
        total: acc.total + exp.purchase + exp.laundry + exp.maintenance,
      }),
      { purchase: 0, laundry: 0, maintenance: 0, total: 0 }
    )
  }, [expenses])

  const isLoading = expensesLoading || statsLoading

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Tổng giá trị tồn kho',
      value: stats?.total_value || 0,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Tổng chi phí vận hành',
      value: totals.total,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Chi phí mua sắm',
      value: totals.purchase,
      icon: ShoppingCart,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      label: 'Chi phí giặt là',
      value: totals.laundry,
      icon: Wind,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      label: 'Chi phí bảo trì',
      value: totals.maintenance,
      icon: Wrench,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
  ]

  return (
    <div className="border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-4">Tổng quan tài chính</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className={`p-2 rounded-md ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatCurrency(metric.value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
