import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface WorkflowTriggerForm {
  trigger_type: 'event' | 'schedule' | 'manual'
  trigger_event?: string
  trigger_schedule?: string
}

interface WorkflowTriggerProps {
  form: WorkflowTriggerForm
  onChange: (updates: Partial<WorkflowTriggerForm>) => void
}

const TRIGGER_EVENTS = [
  { value: 'inventory.low_stock', label: 'Inventory Low Stock' },
  { value: 'inventory.critical_stock', label: 'Inventory Critical Stock' },
  { value: 'inventory.item_created', label: 'Item Created' },
  { value: 'laundry.batch_overdue', label: 'Laundry Batch Overdue' },
  { value: 'laundry.batch_received', label: 'Laundry Batch Received' },
  { value: 'maintenance.request_created', label: 'Maintenance Request Created' },
  { value: 'maintenance.request_overdue', label: 'Maintenance Request Overdue' },
  { value: 'purchase_order.approved', label: 'Purchase Order Approved' },
  { value: 'room.checkout', label: 'Room Checkout' },
]

export const WorkflowTrigger = ({ form, onChange }: WorkflowTriggerProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">When should this workflow run?</h3>
      </div>

      <div>
        <Label>Trigger Type *</Label>
        <RadioGroup
          value={form.trigger_type}
          onValueChange={(value: any) => onChange({ trigger_type: value })}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="event" id="trigger-event" />
            <Label htmlFor="trigger-event" className="font-normal">
              When an event occurs
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="schedule" id="trigger-schedule" />
            <Label htmlFor="trigger-schedule" className="font-normal">
              On a schedule (daily, weekly, etc.)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="trigger-manual" />
            <Label htmlFor="trigger-manual" className="font-normal">
              Manually triggered
            </Label>
          </div>
        </RadioGroup>
      </div>

      {form.trigger_type === 'event' && (
        <div>
          <Label htmlFor="event-type">Event Type *</Label>
          <Select
            value={form.trigger_event}
            onValueChange={(value) => onChange({ trigger_event: value })}
          >
            <SelectTrigger id="event-type" className="mt-1.5">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.trigger_type === 'schedule' && (
        <div>
          <Label htmlFor="schedule">Schedule (Cron Expression) *</Label>
          <Input
            id="schedule"
            value={form.trigger_schedule || ''}
            onChange={(e) => onChange({ trigger_schedule: e.target.value })}
            placeholder="0 9 * * * (Every day at 9:00 AM)"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Examples: "0 9 * * *" = Daily at 9 AM | "0 9 * * 1" = Every Monday at 9 AM
          </p>
        </div>
      )}

      {form.trigger_type === 'manual' && (
        <div className="text-sm text-muted-foreground">
          This workflow can only be triggered manually by a user.
        </div>
      )}
    </div>
  )
}
