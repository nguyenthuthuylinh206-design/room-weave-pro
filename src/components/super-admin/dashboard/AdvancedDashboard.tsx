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
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your SaaS platform performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change="+12.5%"
          trend="up"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Active Tenants"
          value={stats?.active_tenants || 0}
          subtitle={`${stats?.trial_tenants || 0} on trial`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="MRR"
          value={`$${(stats?.mrr || 0).toLocaleString()}`}
          change={`+${growthRate}%`}
          trend={Number(growthRate) > 0 ? 'up' : 'down'}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="ARPU"
          value={`$${arpu}`}
          subtitle="Average Revenue Per User"
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Health Indicators */}
      <HealthIndicators stats={stats} churn={churn} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MRR Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <MRRChart />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <TenantGrowthChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
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
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(stats?.revenue_this_month || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From monthly subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Last Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(stats?.revenue_last_month || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Previous month revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">ARR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((stats?.mrr || 0) * 12).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Annual Recurring Revenue
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByPlanTable data={revenueByPlan} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatusCard
              title="Active"
              count={stats?.active_tenants || 0}
              color="green"
              icon={CheckCircle2}
            />
            <StatusCard
              title="Trial"
              count={stats?.trial_tenants || 0}
              color="blue"
              icon={Users}
            />
            <StatusCard
              title="Expiring Soon"
              count={stats?.expiring_7_days || 0}
              color="yellow"
              icon={AlertTriangle}
            />
            <StatusCard
              title="Grace Period"
              count={stats?.in_grace_period || 0}
              color="red"
              icon={AlertTriangle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Growth (Last 30 Days)</CardTitle>
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
}

function MetricCard({ title, value, change, trend, subtitle, icon: Icon, color }: MetricCardProps) {
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
            <span className="text-xs text-muted-foreground ml-1">vs last month</span>
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

function RevenueByPlanTable({ data }: any) {
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground">No data</p>;

  return (
    <div className="space-y-3">
      {data.map((plan: any, index: number) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex-1">
            <div className="font-medium">{plan.planName}</div>
            <div className="text-sm text-muted-foreground">{plan.tenantCount} tenants</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-green-600">
              ${plan.totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              ${(plan.totalRevenue / plan.tenantCount).toFixed(2)} ARPU
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
