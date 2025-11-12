import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  CreditCard, 
  AlertCircle, 
  Settings,
  Tag,
} from 'lucide-react';

export function RecentActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['super-admin-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'tenant_created':
        return <UserPlus className="h-4 w-4" />;
      case 'subscription_changed':
        return <CreditCard className="h-4 w-4" />;
      case 'tenant_suspended':
        return <AlertCircle className="h-4 w-4" />;
      case 'promo_code_created':
        return <Tag className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'tenant_created':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      case 'subscription_changed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      case 'tenant_suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      case 'promo_code_created':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.action)}`}>
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                    {activity.metadata && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(activity.metadata).map(([key, value]: any) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No recent activity</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
