import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, Database, HardDrive } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TenantDetailsDialogProps {
  tenant: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantDetailsDialog({
  tenant,
  open,
  onOpenChange,
}: TenantDetailsDialogProps) {
  if (!tenant) return null;

  const plan = tenant.subscription_plan;
  const usage = tenant.tenant_usage?.[0];

  const calculatePercentage = (current: number, max: number | null) => {
    if (!max) return 0;
    return Math.min(Math.round((current / max) * 100), 100);
  };

  const formatStorageSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      past_due: 'destructive',
      suspended: 'destructive',
      cancelled: 'outline',
    };
    return variants[status] || 'outline';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{tenant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Status */}
          <div>
            <h4 className="text-sm font-medium mb-3">Subscription</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(tenant.subscription_status)}>
                {tenant.subscription_status?.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Plan: <strong className="text-foreground">{plan?.name || 'No Plan'}</strong>
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {tenant.billing_cycle === 'monthly' 
                  ? `${formatCurrency(plan?.price_monthly || 0)}/month`
                  : `${formatCurrency(plan?.price_yearly || 0)}/year`
                }
              </span>
              {tenant.auto_renew && (
                <Badge variant="outline">Auto-renew</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-medium mb-3">Contact Information</h4>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="text-sm font-medium text-foreground">{tenant.primary_contact_email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="text-sm font-medium text-foreground">{tenant.phone || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <Separator />

          {/* Subscription Dates */}
          <div>
            <h4 className="text-sm font-medium mb-3">Subscription Dates</h4>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">Started</dt>
                <dd className="text-sm font-medium text-foreground">
                  {new Date(tenant.subscription_started_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Current Period</dt>
                <dd className="text-sm font-medium text-foreground">
                  {new Date(tenant.subscription_current_period_start).toLocaleDateString()} -{' '}
                  {new Date(tenant.subscription_current_period_end).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Next Billing</dt>
                <dd className="text-sm font-medium text-foreground">
                  {tenant.next_billing_date 
                    ? new Date(tenant.next_billing_date).toLocaleDateString()
                    : 'N/A'
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Created</dt>
                <dd className="text-sm font-medium text-foreground">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {usage && (
            <>
              <Separator />

              {/* Resource Usage */}
              <div>
                <h4 className="text-sm font-medium mb-4">Resource Usage</h4>
                <div className="space-y-4">
                  {/* Hotels */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Hotels</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {usage.current_hotels_count} / {plan?.max_hotels || '∞'}
                      </span>
                    </div>
                    {plan?.max_hotels && (
                      <Progress 
                        value={calculatePercentage(usage.current_hotels_count, plan.max_hotels)} 
                        className="h-2"
                      />
                    )}
                  </div>

                  {/* Users */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Users</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {usage.current_users_count} / {plan?.max_users || '∞'}
                      </span>
                    </div>
                    {plan?.max_users && (
                      <Progress 
                        value={calculatePercentage(usage.current_users_count, plan.max_users)} 
                        className="h-2"
                      />
                    )}
                  </div>

                  {/* Storage */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Storage</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatStorageSize(usage.current_storage_bytes)} / {plan?.max_storage_gb || '∞'} GB
                      </span>
                    </div>
                    {plan?.max_storage_gb && (
                      <Progress 
                        value={calculatePercentage(
                          usage.current_storage_bytes / (1024 ** 3), 
                          plan.max_storage_gb
                        )} 
                        className="h-2"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Peak Usage */}
              <div className="rounded-lg border p-3 bg-muted/30">
                <h4 className="text-sm font-medium mb-2 text-foreground">Peak Usage</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{usage.peak_hotels_count}</div>
                    <div className="text-xs text-muted-foreground">Hotels</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{usage.peak_users_count}</div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{formatStorageSize(usage.peak_storage_bytes)}</div>
                    <div className="text-xs text-muted-foreground">Storage</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
