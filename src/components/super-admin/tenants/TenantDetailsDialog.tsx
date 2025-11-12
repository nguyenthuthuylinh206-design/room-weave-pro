import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Tenant } from '@/hooks/super-admin/useTenants';

interface TenantDetailsDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantDetailsDialog({
  tenant,
  open,
  onOpenChange,
}: TenantDetailsDialogProps) {
  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subscription Status */}
          <div>
            <h4 className="text-sm font-medium mb-2">Subscription</h4>
            <div className="flex items-center gap-2">
              <Badge>{tenant.subscription_status}</Badge>
              <span className="text-sm text-muted-foreground">
                Plan: Premium • Interval: Monthly
              </span>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-medium mb-2">Contact Information</h4>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Email:</dt>
                <dd className="text-sm font-medium">{tenant.primary_contact_email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Phone:</dt>
                <dd className="text-sm font-medium">{tenant.phone || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <Separator />

          {/* Subscription Details */}
          <div>
            <h4 className="text-sm font-medium mb-2">Subscription Details</h4>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Started:</dt>
                <dd className="text-sm font-medium">
                  {new Date(tenant.subscription_start_date).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Expires:</dt>
                <dd className="text-sm font-medium">
                  {new Date(tenant.subscription_end_date).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
