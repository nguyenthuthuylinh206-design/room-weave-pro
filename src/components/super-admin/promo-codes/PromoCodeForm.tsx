import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreatePromoCode, useUpdatePromoCode } from '@/hooks/super-admin/usePromoCodes';

interface PromotionalCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_trial_extension' | 'free_months';
  discount_value: number;
  applicable_plans: string[];
  applicable_billing_cycles: string[];
  max_uses?: number | null;
  max_uses_per_tenant: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  description?: string;
}

const promoCodeSchema = z.object({
  code: z.string().min(3).max(20),
  discount_type: z.enum(['percentage', 'fixed_amount', 'free_trial_extension', 'free_months']),
  discount_value: z.number().min(0),
  applicable_plans: z.array(z.string()).default([]),
  applicable_billing_cycles: z.array(z.string()).default([]),
  max_uses: z.number().min(1).nullable(),
  max_uses_per_tenant: z.number().min(1).default(1),
  valid_from: z.string(),
  valid_until: z.string().optional(),
  is_active: z.boolean(),
  description: z.string().optional(),
});

type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;

interface PromoCodeFormProps {
  promoCode?: PromotionalCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoCodeForm({ promoCode, open, onOpenChange }: PromoCodeFormProps) {
  const createPromoCode = useCreatePromoCode();
  const updatePromoCode = useUpdatePromoCode();

  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: promoCode || {
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      applicable_plans: [],
      applicable_billing_cycles: [],
      max_uses: null,
      max_uses_per_tenant: 1,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
      description: '',
    },
  });

  const onSubmit = async (data: PromoCodeFormValues) => {
    const payload = {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      applicable_plans: data.applicable_plans,
      applicable_billing_cycles: data.applicable_billing_cycles,
      max_uses: data.max_uses,
      max_uses_per_tenant: data.max_uses_per_tenant,
      valid_from: data.valid_from,
      valid_until: data.valid_until,
      is_active: data.is_active,
      description: data.description,
    };
    
    if (promoCode) {
      await updatePromoCode.mutateAsync({
        id: promoCode.id,
        updates: payload,
      });
    } else {
      await createPromoCode.mutateAsync(payload);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {promoCode ? 'Edit Promo Code' : 'Create New Promo Code'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SAVE20"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Unique promotional code (3-20 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                        <SelectItem value="free_trial_extension">Free Trial Extension</SelectItem>
                        <SelectItem value="free_months">Free Months</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Max Uses */}
            <FormField
              control={form.control}
              name="max_uses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Uses</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for unlimited uses
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="20% off for new customers"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Make this promo code available for use
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPromoCode.isPending || updatePromoCode.isPending}
              >
                {promoCode ? 'Update' : 'Create'} Promo Code
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
