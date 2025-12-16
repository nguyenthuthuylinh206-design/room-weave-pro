import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('superAdmin');

  const indicators = [
    {
      name: t('health.expiringSoon'),
      value: stats?.expiring_7_days || 0,
      threshold: 10,
      status: (stats?.expiring_7_days || 0) < 10 ? 'good' : 'warning',
      message: t('health.tenantsExpire7Days', { count: stats?.expiring_7_days || 0 }),
    },
    {
      name: t('health.gracePeriod'),
      value: stats?.in_grace_period || 0,
      threshold: 5,
      status: (stats?.in_grace_period || 0) === 0 ? 'good' : 'critical',
      message: t('health.tenantsInGracePeriod', { count: stats?.in_grace_period || 0 }),
    },
    {
      name: t('health.churnRate'),
      value: parseFloat(churn?.churnRate || '0'),
      threshold: 5,
      status: parseFloat(churn?.churnRate || '0') < 5 ? 'good' : 'warning',
      message: t('health.churnLast30Days', { rate: churn?.churnRate || 0 }),
    },
    {
      name: t('health.newSignups'),
      value: stats?.new_signups_this_month || 0,
      threshold: 10,
      status: 'good',
      message: t('health.newSignupsThisMonth', { count: stats?.new_signups_this_month || 0 }),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('health.title')}</CardTitle>
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
                {indicator.name === t('health.churnRate') && '%'}
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
              {t('health.expiringAlert', { count: stats.expiring_7_days })}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
