import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePlanPricing } from '@/hooks/super-admin/usePricingManagement';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const pricingSchema = z.object({
  monthly_price: z.number().min(0),
  yearly_price: z.number().min(0),
  change_reason: z.string().min(10),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

interface PricingEditorProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingEditor({ plan, open, onOpenChange }: PricingEditorProps) {
  const { user } = useAuth();
  const updatePricing = useUpdatePlanPricing();
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      monthly_price: plan?.price_monthly || 0,
      yearly_price: plan?.price_yearly || 0,
      change_reason: '',
    },
  });

  const onSubmit = async (data: PricingFormValues) => {
    if (!plan || !user) return;

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    await updatePricing.mutateAsync({
      planId: plan.id,
      newMonthlyPrice: data.monthly_price,
      newYearlyPrice: data.yearly_price,
      changedBy: user.id,
      reason: data.change_reason,
    });

    onOpenChange(false);
    setShowConfirm(false);
    form.reset();
  };

  const monthlyChange = plan
    ? ((form.watch('monthly_price') - plan.price_monthly) / plan.price_monthly) * 100
    : 0;
  const yearlyChange = plan
    ? ((form.watch('yearly_price') - plan.price_yearly) / plan.price_yearly) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Pricing - {plan?.name}</DialogTitle>
          <DialogDescription>
            Update pricing for this subscription plan. Changes will be logged in price history.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Current Prices</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="text-lg font-bold text-foreground">${plan?.price_monthly}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yearly</p>
                  <p className="text-lg font-bold text-foreground">${plan?.price_yearly}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthly_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Monthly Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="29.99"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    {monthlyChange !== 0 && (
                      <p className={`text-xs ${monthlyChange > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}% change
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearly_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Yearly Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="299.99"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    {yearlyChange !== 0 && (
                      <p className={`text-xs ${yearlyChange > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {yearlyChange > 0 ? '+' : ''}{yearlyChange.toFixed(1)}% change
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="change_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Market adjustment, feature updates, competitor analysis..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showConfirm && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirm Price Change</AlertTitle>
                <AlertDescription>
                  This will update the pricing for all NEW subscriptions. Existing active
                  subscriptions will NOT be affected. Click Submit again to confirm.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setShowConfirm(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePricing.isPending}
                variant={showConfirm ? 'destructive' : 'default'}
              >
                {showConfirm ? 'Confirm Update' : 'Update Pricing'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
