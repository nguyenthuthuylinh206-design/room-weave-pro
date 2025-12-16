import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useSuperAdminStats, useRevenueByPlan, useTenantGrowth, useChurnRate } from '@/hooks/useSuperAdminStats';
import { RevenueChart } from '../analytics/RevenueChart';
import { MRRChart } from '../analytics/MRRChart';
import { TenantGrowthChart } from '../analytics/TenantGrowthChart';
import { PlanDistributionChart } from '../analytics/PlanDistributionChart';
import { ChurnRateCard } from '../analytics/ChurnRateCard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { QuickActions } from './QuickActions';
import { HealthIndicators } from './HealthIndicators';

export function AdvancedDashboard() {
  const { t } = useTranslation('superAdmin');
  const { data: stats, isLoading, refetch } = useSuperAdminStats();
  const { data: revenueByPlan } = useRevenueByPlan();
  const { data: growth } = useTenantGrowth(30);
  const { data: churn } = useChurnRate(30);

  const totalRevenue = Number(stats?.revenue_this_month || 0);
  const arpu = stats?.active_tenants 
    ? (Number(stats.mrr) / Number(stats.active_tenants)).toFixed(2) 
    : '0';
  const growthRate = growth && growth.length > 1
    ? (((Number(growth[growth.length - 1]?.newTenants) || 0) / (Number(growth[0]?.newTenants) || 1) - 1) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('dashboard.refresh')}
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard.exportReport')}
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('dashboard.totalRevenue')}
          value={`${totalRevenue.toLocaleString('vi-VN')}đ`}
          change="+12.5%"
          trend="up"
          icon={DollarSign}
          color="green"
          vsLastMonth={t('dashboard.vsLastMonth')}
        />
        <MetricCard
          title={t('dashboard.activeCustomers')}
          value={stats?.active_tenants || 0}
          subtitle={`${stats?.trial_tenants || 0} ${t('dashboard.onTrial')}`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title={t('dashboard.recurringRevenue')}
          value={`${(stats?.mrr || 0).toLocaleString('vi-VN')}đ`}
          change={`+${growthRate}%`}
          trend={Number(growthRate) > 0 ? 'up' : 'down'}
          icon={TrendingUp}
          color="purple"
          vsLastMonth={t('dashboard.vsLastMonth')}
        />
        <MetricCard
          title={t('dashboard.arpu')}
          value={`${Number(arpu).toLocaleString('vi-VN')}đ`}
          subtitle={t('dashboard.arpuDesc')}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Health Indicators */}
      <HealthIndicators stats={stats} churn={churn} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('dashboard.tabs.revenue')}</TabsTrigger>
          <TabsTrigger value="tenants">{t('dashboard.tabs.tenants')}</TabsTrigger>
          <TabsTrigger value="activity">{t('dashboard.tabs.activity')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.revenueTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.mrrGrowth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <MRRChart />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.tenantGrowth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <TenantGrowthChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.planDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PlanDistributionChart data={revenueByPlan} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('dashboard.revenue.thisMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.revenue_this_month || 0).toLocaleString('vi-VN')}đ
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.revenue.fromMonthlySubscriptions')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('dashboard.revenue.lastMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.revenue_last_month || 0).toLocaleString('vi-VN')}đ
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.revenue.lastMonthRevenue')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('dashboard.revenue.arr')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((stats?.mrr || 0) * 12).toLocaleString('vi-VN')}đ
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.revenue.annualRecurringRevenue')}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.revenue.byPlan')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByPlanTable data={revenueByPlan} noDataText={t('dashboard.noData')} customersText={t('dashboard.revenue.customers')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatusCard
              title={t('dashboard.tenants.active')}
              count={stats?.active_tenants || 0}
              color="green"
              icon={CheckCircle2}
            />
            <StatusCard
              title={t('dashboard.tenants.trial')}
              count={stats?.trial_tenants || 0}
              color="blue"
              icon={Users}
            />
            <StatusCard
              title={t('dashboard.tenants.expiringSoon')}
              count={stats?.expiring_7_days || 0}
              color="yellow"
              icon={AlertTriangle}
            />
            <StatusCard
              title={t('dashboard.tenants.gracePeriod')}
              count={stats?.in_grace_period || 0}
              color="red"
              icon={AlertTriangle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.tenants.growthLast30Days')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TenantGrowthChart />
            </CardContent>
          </Card>

          <ChurnRateCard churn={churn} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentActivityFeed />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  subtitle?: string;
  icon: any;
  color: 'green' | 'blue' | 'purple' | 'orange';
  vsLastMonth?: string;
}

function MetricCard({ title, value, change, trend, subtitle, icon: Icon, color, vsLastMonth }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`${colorClasses[color]} p-2 rounded-lg`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
            {vsLastMonth && <span className="text-xs text-muted-foreground ml-1">{vsLastMonth}</span>}
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, count, color, icon: Icon }: any) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
    red: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  };

  return (
    <Card className={`${colorClasses[color]} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-2">{count}</p>
          </div>
          <Icon className="h-8 w-8 opacity-60" />
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueByPlanTable({ data, noDataText, customersText }: { data: any; noDataText: string; customersText: string }) {
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground">{noDataText}</p>;

  return (
    <div className="space-y-3">
      {data.map((plan: any, index: number) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex-1">
            <div className="font-medium">{plan.planName}</div>
            <div className="text-sm text-muted-foreground">{plan.tenantCount} {customersText}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-green-600">
              {plan.totalRevenue.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-xs text-muted-foreground">
              {(plan.totalRevenue / plan.tenantCount).toLocaleString('vi-VN')}đ ARPU
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
