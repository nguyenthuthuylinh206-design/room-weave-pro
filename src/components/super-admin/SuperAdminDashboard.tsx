import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { RevenueChart } from './analytics/RevenueChart';
import { MRRChart } from './analytics/MRRChart';
import { TenantGrowthChart } from './analytics/TenantGrowthChart';

export function SuperAdminDashboard() {
  const { data: stats, isLoading } = useSuperAdminStats();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const metrics = [
    {
      title: 'Total Tenants',
      value: stats?.total_tenants || 0,
      icon: Users,
      iconClass: 'text-blue-500',
      bgClass: 'bg-blue-500/10',
      trend: `${stats?.new_signups_this_month || 0} new this month`,
    },
    {
      title: 'Active Subscriptions',
      value: stats?.active_tenants || 0,
      icon: CheckCircle,
      iconClass: 'text-green-500',
      bgClass: 'bg-green-500/10',
      trend: `${stats?.trial_tenants || 0} on trial`,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats?.revenue_this_month || 0),
      icon: DollarSign,
      iconClass: 'text-purple-500',
      bgClass: 'bg-purple-500/10',
      trend: `Last month: ${formatCurrency(stats?.revenue_last_month || 0)}`,
    },
    {
      title: 'MRR',
      value: formatCurrency(stats?.mrr || 0),
      icon: TrendingUp,
      iconClass: 'text-orange-500',
      bgClass: 'bg-orange-500/10',
      trend: `ARR: ${formatCurrency((stats?.mrr || 0) * 12)}`,
    },
    {
      title: 'Expiring Soon',
      value: stats?.expiring_7_days || 0,
      icon: Clock,
      iconClass: 'text-yellow-500',
      bgClass: 'bg-yellow-500/10',
      trend: `Today: ${stats?.expiring_today || 0}`,
    },
    {
      title: 'Grace Period',
      value: stats?.in_grace_period || 0,
      icon: AlertCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-500/10',
      trend: 'Action required',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`${metric.bgClass} p-2 rounded-lg`}>
                <metric.icon className={`h-4 w-4 ${metric.iconClass}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{metric.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>

      {/* MRR & Tenant Growth */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Recurring Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <MRRChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantGrowthChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
