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
  // Room events
  { value: 'room_status_change', label: 'Thay đổi trạng thái phòng' },
  { value: 'room_check_completed', label: 'Kiểm tra phòng hoàn thành' },
  { value: 'room_standards_applied', label: 'Setup phòng hoàn thành' },
  { value: 'room.checkout', label: 'Checkout phòng' },
  
  // Stock Adjustment events
  { value: 'adjustment_created', label: 'Phiếu kiểm kê được tạo' },
  { value: 'adjustment_started', label: 'Bắt đầu kiểm kê' },
  { value: 'adjustment_completed', label: 'Hoàn thành kiểm kê (Chờ duyệt)' },
  { value: 'adjustment_approved', label: 'Phiếu kiểm kê được duyệt' },
  { value: 'adjustment_rejected', label: 'Phiếu kiểm kê bị từ chối' },
  
  // Inventory events
  { value: 'inventory_low_stock', label: 'Tồn kho thấp' },
  { value: 'inventory_transaction', label: 'Giao dịch kho' },
  
  // Laundry events
  { value: 'laundry_batch_status_change', label: 'Thay đổi trạng thái giặt' },
  
  // Maintenance events
  { value: 'maintenance_request_created', label: 'Yêu cầu bảo trì mới' },
  { value: 'maintenance_status_change', label: 'Thay đổi trạng thái bảo trì' },
]

// Template variables for each trigger type
const TRIGGER_VARIABLES: Record<string, string[]> = {
  room_status_change: ['room_id', 'room_number', 'floor', 'old_status', 'new_status'],
  room_check_completed: ['room_id', 'room_number', 'check_type', 'staff_name', 'issue_summary'],
  room_standards_applied: ['room_id', 'room_number', 'room_type', 'items_count'],
  adjustment_created: ['adjustment_id', 'adjustment_code', 'scheduled_date', 'total_items', 'created_by_name'],
  adjustment_started: ['adjustment_id', 'adjustment_code', 'started_by_name'],
  adjustment_completed: ['adjustment_id', 'adjustment_code', 'total_items', 'completed_by_name'],
  adjustment_approved: ['adjustment_id', 'adjustment_code', 'total_items', 'discrepancy_count', 'approved_by_name'],
  adjustment_rejected: ['adjustment_id', 'adjustment_code', 'rejection_reason', 'rejected_by_name'],
  inventory_low_stock: ['item_id', 'item_name', 'item_code', 'current_stock', 'minimum_stock'],
  inventory_transaction: ['item_id', 'item_name', 'transaction_type', 'quantity'],
  laundry_batch_status_change: ['batch_id', 'batch_code', 'old_status', 'new_status', 'vendor_name', 'total_items'],
  maintenance_request_created: ['request_id', 'room_number', 'issue_type', 'priority', 'description'],
  maintenance_status_change: ['request_id', 'room_number', 'old_status', 'new_status'],
}

export const WorkflowTrigger = ({ form, onChange }: WorkflowTriggerProps) => {
  const selectedEvent = form.trigger_event
  const availableVariables = selectedEvent ? TRIGGER_VARIABLES[selectedEvent] || [] : []
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Workflow này chạy khi nào?</h3>
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-type">Loại sự kiện *</Label>
            <Select
              value={form.trigger_event}
              onValueChange={(value) => onChange({ trigger_event: value })}
            >
              <SelectTrigger id="event-type" className="mt-1.5">
                <SelectValue placeholder="Chọn sự kiện" />
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
          
          {availableVariables.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs text-muted-foreground">Biến có thể dùng trong Actions:</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availableVariables.map(variable => (
                  <code 
                    key={variable} 
                    className="text-xs px-1.5 py-0.5 bg-background rounded border font-mono"
                  >
                    {`{{${variable}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {form.trigger_type === 'schedule' && (
        <div>
          <Label htmlFor="schedule">Lịch chạy (Cron Expression) *</Label>
          <Input
            id="schedule"
            value={form.trigger_schedule || ''}
            onChange={(e) => onChange({ trigger_schedule: e.target.value })}
            placeholder="0 9 * * * (Mỗi ngày lúc 9:00 sáng)"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Ví dụ: "0 9 * * *" = Mỗi ngày lúc 9h | "0 9 * * 1" = Thứ 2 hàng tuần lúc 9h
          </p>
        </div>
      )}

      {form.trigger_type === 'manual' && (
        <div className="text-sm text-muted-foreground">
          Workflow này chỉ có thể kích hoạt thủ công bởi người dùng.
        </div>
      )}
    </div>
  )
}
