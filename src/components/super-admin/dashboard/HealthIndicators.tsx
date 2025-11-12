import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
} from 'lucide-react';

interface HealthIndicatorsProps {
  stats: any;
  churn: any;
}

export function HealthIndicators({ stats, churn }: HealthIndicatorsProps) {
  const indicators = [
    {
      name: 'Expiring Soon',
      value: stats?.expiring_7_days || 0,
      threshold: 10,
      status: (stats?.expiring_7_days || 0) < 10 ? 'good' : 'warning',
      message: `${stats?.expiring_7_days || 0} tenants expire in next 7 days`,
    },
    {
      name: 'Grace Period',
      value: stats?.in_grace_period || 0,
      threshold: 5,
      status: (stats?.in_grace_period || 0) === 0 ? 'good' : 'critical',
      message: `${stats?.in_grace_period || 0} tenants in grace period`,
    },
    {
      name: 'Churn Rate',
      value: parseFloat(churn?.churnRate || '0'),
      threshold: 5,
      status: parseFloat(churn?.churnRate || '0') < 5 ? 'good' : 'warning',
      message: `${churn?.churnRate || 0}% churn in last 30 days`,
    },
    {
      name: 'New Signups',
      value: stats?.new_signups_this_month || 0,
      threshold: 10,
      status: 'good',
      message: `${stats?.new_signups_this_month || 0} new signups this month`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {indicators.map((indicator) => (
            <div
              key={indicator.name}
              className={`p-4 rounded-lg border-2 ${
                indicator.status === 'good'
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : indicator.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {indicator.status === 'good' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : indicator.status === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {indicator.name}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {indicator.value}
                {indicator.name === 'Churn Rate' && '%'}
              </div>
              <p className="text-xs text-muted-foreground">{indicator.message}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {(stats?.expiring_7_days || 0) >= 10 && (
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{stats.expiring_7_days}</strong> tenants will expire in the next 7 days. 
              Consider sending targeted renewal campaigns.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
