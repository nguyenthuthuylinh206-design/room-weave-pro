import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSubscriptionPlans } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface ChangePlanDialogProps {
  tenant: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePlanDialog({
  tenant,
  open,
  onOpenChange,
}: ChangePlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: plans = [] } = useSubscriptionPlans();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleChangePlan = async () => {
    if (!tenant || !selectedPlanId) return;

    setIsUpdating(true);
    try {
      const now = new Date();
      const periodEnd = billingCycle === 'monthly'
        ? new Date(now.setMonth(now.getMonth() + 1))
        : new Date(now.setFullYear(now.getFullYear() + 1));

      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_plan_id: selectedPlanId,
          billing_cycle: billingCycle,
          subscription_current_period_start: new Date().toISOString(),
          subscription_current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast({
        title: 'Plan Updated',
        description: `${tenant.name} has been switched to ${selectedPlan?.name}`,
      });

      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            Change the subscription plan for <strong>{tenant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Plan */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-sm text-muted-foreground">Current Plan</div>
            <div className="font-medium text-foreground">
              {tenant.subscription_plan?.name || 'No Plan'} • {tenant.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
            </div>
          </div>

          {/* Select New Plan */}
          <div className="space-y-2">
            <Label>New Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.filter(p => p.is_active).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle */}
          {selectedPlanId && (
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="font-normal cursor-pointer">
                    Monthly - {formatCurrency(selectedPlan?.price_monthly || 0)}/month
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="font-normal cursor-pointer">
                    Yearly - {formatCurrency(selectedPlan?.price_yearly || 0)}/year
                    <Badge variant="secondary" className="ml-2">
                      Save {Math.round(((selectedPlan?.price_monthly || 0) * 12 - (selectedPlan?.price_yearly || 0)) / ((selectedPlan?.price_monthly || 0) * 12) * 100)}%
                    </Badge>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Plan Details */}
          {selectedPlan && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium">Plan Limits</div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>• Hotels: {selectedPlan.max_hotels || 'Unlimited'}</div>
                <div>• Users: {selectedPlan.max_users || 'Unlimited'}</div>
                <div>• Storage: {selectedPlan.max_storage_gb || 'Unlimited'} GB</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePlan}
            disabled={!selectedPlanId || isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Change Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
