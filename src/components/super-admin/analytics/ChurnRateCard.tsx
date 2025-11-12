import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface ChurnRateCardProps {
  churn: any;
}

export function ChurnRateCard({ churn }: ChurnRateCardProps) {
  const churnRate = parseFloat(churn?.churnRate || '0');
  const isHealthy = churnRate < 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold">{churnRate}%</span>
                {isHealthy ? (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isHealthy 
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
            }`}>
              {isHealthy ? 'Healthy' : 'At Risk'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">Churned Tenants</p>
              <p className="text-2xl font-bold mt-1">{churn?.churnedTenants || 0}</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-2xl font-bold mt-1">30 days</p>
            </div>
          </div>

          {!isHealthy && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                Churn rate is above the healthy threshold. Consider implementing retention strategies.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
