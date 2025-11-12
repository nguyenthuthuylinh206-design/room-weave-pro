import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import { AutomationRuleDialog } from './AutomationRuleDialog';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'days_before_expiry' | 'subscription_status';
    value: number | string;
  };
  action: {
    type: 'send_email' | 'send_sms' | 'create_task';
    template: string;
  };
  conditions: {
    plans?: string[];
    minValue?: number;
  };
}

const defaultRules: AutomationRule[] = [
  {
    id: '1',
    name: '7 Days Before Expiry - First Warning',
    enabled: true,
    trigger: {
      type: 'days_before_expiry',
      value: 7,
    },
    action: {
      type: 'send_email',
      template: 'renewal_7_days',
    },
    conditions: {
      plans: ['premium', 'enterprise'],
    },
  },
  {
    id: '2',
    name: '3 Days Before Expiry - Urgent Reminder',
    enabled: true,
    trigger: {
      type: 'days_before_expiry',
      value: 3,
    },
    action: {
      type: 'send_email',
      template: 'renewal_3_days_urgent',
    },
    conditions: {
      plans: ['premium', 'enterprise'],
    },
  },
  {
    id: '3',
    name: '1 Day Before Expiry - Final Notice',
    enabled: true,
    trigger: {
      type: 'days_before_expiry',
      value: 1,
    },
    action: {
      type: 'send_email',
      template: 'renewal_1_day_final',
    },
    conditions: {},
  },
  {
    id: '4',
    name: 'Grace Period - Payment Failed',
    enabled: true,
    trigger: {
      type: 'subscription_status',
      value: 'grace_period',
    },
    action: {
      type: 'send_email',
      template: 'grace_period_payment_failed',
    },
    conditions: {},
  },
];

export function ReminderAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Rules</h2>
          <p className="text-muted-foreground">Configure automatic reminder triggers and actions</p>
        </div>
        <Button onClick={() => {
          setEditingRule(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={rule.enabled ? '' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    {rule.enabled ? (
                      <Badge className="bg-green-600">
                        <Zap className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Rule Configuration */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">TRIGGER</p>
                    <p className="text-sm font-semibold">
                      {rule.trigger.type === 'days_before_expiry'
                        ? `${rule.trigger.value} days before expiry`
                        : `Status: ${rule.trigger.value}`}
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">ACTION</p>
                    <p className="text-sm font-semibold capitalize">
                      {rule.action.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Template: {rule.action.template}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium mb-1">CONDITIONS</p>
                    <p className="text-sm font-semibold">
                      {rule.conditions.plans
                        ? `Plans: ${rule.conditions.plans.join(', ')}`
                        : 'All tenants'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How Automation Works</p>
              <p className="text-sm text-blue-700 mt-1">
                Rules are evaluated daily at 2:00 AM UTC. When a trigger condition is met, 
                the specified action is automatically executed. You can create multiple rules 
                with different conditions to handle various scenarios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AutomationRuleDialog
        rule={editingRule}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
