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
import { Checkbox } from '@/components/ui/checkbox';

const ruleSchema = z.object({
  name: z.string().min(5),
  triggerType: z.enum(['days_before_expiry', 'subscription_status']),
  triggerValue: z.string(),
  actionType: z.enum(['send_email', 'send_sms', 'create_task']),
  emailTemplate: z.string(),
  plans: z.array(z.string()),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface AutomationRuleDialogProps {
  rule: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutomationRuleDialog({ rule, open, onOpenChange }: AutomationRuleDialogProps) {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: rule ? {
      name: rule.name,
      triggerType: rule.trigger.type,
      triggerValue: String(rule.trigger.value),
      actionType: rule.action.type,
      emailTemplate: rule.action.template,
      plans: rule.conditions.plans || [],
    } : {
      name: '',
      triggerType: 'days_before_expiry',
      triggerValue: '7',
      actionType: 'send_email',
      emailTemplate: '',
      plans: [],
    },
  });

  const onSubmit = (data: RuleFormValues) => {
    console.log('Save rule:', data);
    // TODO: Implement save logic
    onOpenChange(false);
  };

  const availablePlans = [
    { id: 'basic', label: 'Basic Plan' },
    { id: 'premium', label: 'Premium Plan' },
    { id: 'enterprise', label: 'Enterprise Plan' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? 'Edit Automation Rule' : 'Create New Automation Rule'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rule Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 7 Days Before Expiry Reminder" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this automation rule
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trigger Configuration */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Trigger Configuration</h3>
              
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="days_before_expiry">Days Before Expiry</SelectItem>
                        <SelectItem value="subscription_status">Subscription Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('triggerType') === 'days_before_expiry' ? (
                <FormField
                  control={form.control}
                  name="triggerValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Before Expiry</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="7" {...field} />
                      </FormControl>
                      <FormDescription>
                        Send reminder this many days before subscription expires
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="triggerValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="grace_period">Grace Period</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Action Configuration */}
            <div className="space-y-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Action Configuration</h3>
              
              <FormField
                control={form.control}
                name="actionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="send_email">Send Email</SelectItem>
                        <SelectItem value="send_sms">Send SMS</SelectItem>
                        <SelectItem value="create_task">Create Task</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('actionType') === 'send_email' && (
                <FormField
                  control={form.control}
                  name="emailTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="renewal_7_days">7 Days Notice</SelectItem>
                          <SelectItem value="renewal_3_days_urgent">3 Days Urgent</SelectItem>
                          <SelectItem value="renewal_1_day_final">1 Day Final Notice</SelectItem>
                          <SelectItem value="grace_period_payment_failed">Payment Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900">Conditions (Optional)</h3>
              
              <FormField
                control={form.control}
                name="plans"
                render={() => (
                  <FormItem>
                    <FormLabel>Apply to Plans</FormLabel>
                    <div className="space-y-2">
                      {availablePlans.map((plan) => (
                        <FormField
                          key={plan.id}
                          control={form.control}
                          name="plans"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={plan.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(plan.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, plan.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== plan.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {plan.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormDescription>
                      Leave empty to apply to all plans
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {rule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
