import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DoorOpen, 
  Package, 
  Wrench, 
  ClipboardCheck,
  Bell,
  Zap
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'housekeeping' | 'inventory' | 'maintenance' | 'laundry'
  trigger: {
    type: string
    conditions: Record<string, any>
  }
  actions: Array<{
    type: string
    config: Record<string, any>
  }>
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'checkout-notify-housekeeping',
    name: 'Checkout → Thông báo Housekeeping',
    description: 'Tự động gửi thông báo Telegram đến bộ phận buồng phòng khi khách checkout',
    icon: <DoorOpen className="h-5 w-5" />,
    category: 'housekeeping',
    trigger: {
      type: 'room_status_change',
      conditions: { new_status: 'check_out' }
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'telegram',
          telegram_config: {
            routing_mode: 'department',
            department: 'housekeeping',
            hotel_filter: 'dynamic',
            title: '🚪 Checkout - Phòng {{room_number}}',
            message: 'Khách đã trả phòng {{room_number}} tầng {{floor}}.\nVui lòng dọn phòng và kiểm tra đồ dùng.'
          }
        }
      }
    ]
  },
  {
    id: 'low-stock-notify-inventory',
    name: 'Tồn kho thấp → Cảnh báo Kho',
    description: 'Tự động cảnh báo nhóm Telegram kho khi sản phẩm dưới mức tối thiểu',
    icon: <Package className="h-5 w-5" />,
    category: 'inventory',
    trigger: {
      type: 'inventory_low_stock',
      conditions: {}
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'telegram',
          telegram_config: {
            routing_mode: 'department',
            department: 'inventory',
            hotel_filter: 'dynamic',
            notification_type_filter: 'inventory_low',
            title: '📦 Tồn kho thấp - {{item_name}}',
            message: '{{item_name}} chỉ còn {{current_stock}}/{{minimum_stock}}.\nVui lòng đặt hàng bổ sung.'
          }
        }
      }
    ]
  },
  {
    id: 'urgent-maintenance-notify-all',
    name: 'Bảo trì khẩn → Thông báo Quản lý',
    description: 'Thông báo ngay cho quản lý khi có yêu cầu bảo trì khẩn cấp',
    icon: <Wrench className="h-5 w-5" />,
    category: 'maintenance',
    trigger: {
      type: 'maintenance_request_created',
      conditions: { priority: 'urgent' }
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'all',
          telegram_config: {
            routing_mode: 'level',
            group_levels: ['owner', 'management'],
            hotel_filter: 'dynamic',
            notification_type_filter: 'maintenance_urgent',
            title: '🚨 Bảo trì khẩn cấp',
            message: '{{issue_type}} tại phòng {{room_number}}.\nMô tả: {{description}}'
          },
          recipient_mode: 'roles',
          role_ids: ['manager', 'owner'],
          mark_urgent: true
        }
      }
    ]
  },
  {
    id: 'laundry-received-notify-staff',
    name: 'Hàng giặt về → Thông báo Staff',
    description: 'Thông báo cho nhân viên khi hàng giặt được nhận về',
    icon: <ClipboardCheck className="h-5 w-5" />,
    category: 'laundry',
    trigger: {
      type: 'laundry_batch_status_change',
      conditions: { new_status: 'received' }
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'telegram',
          telegram_config: {
            routing_mode: 'department',
            department: 'laundry',
            hotel_filter: 'dynamic',
            notification_type_filter: 'laundry_received',
            title: '🧺 Hàng giặt đã về',
            message: 'Lô {{batch_code}} đã nhận từ {{vendor_name}}.\nTổng: {{total_items}} sản phẩm.'
          }
        }
      }
    ]
  },
  {
    id: 'daily-inventory-report',
    name: 'Báo cáo tồn kho hàng ngày',
    description: 'Gửi báo cáo tổng hợp tồn kho cho quản lý mỗi sáng',
    icon: <Bell className="h-5 w-5" />,
    category: 'inventory',
    trigger: {
      type: 'schedule',
      conditions: { cron: '0 8 * * *', timezone: 'Asia/Ho_Chi_Minh' }
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'telegram',
          telegram_config: {
            routing_mode: 'level',
            group_levels: ['management'],
            hotel_filter: 'all',
            title: '📊 Báo cáo tồn kho ngày {{date}}',
            message: 'Tổng sản phẩm: {{total_items}}\nDưới mức tối thiểu: {{low_stock_count}}\nHết hàng: {{out_of_stock_count}}'
          }
        }
      }
    ]
  },
  {
    id: 'room-check-completed-notify',
    name: 'Kiểm tra phòng xong → Thông báo Manager',
    description: 'Thông báo cho quản lý khi nhân viên hoàn thành kiểm tra phòng có vấn đề',
    icon: <ClipboardCheck className="h-5 w-5" />,
    category: 'housekeeping',
    trigger: {
      type: 'room_check_completed',
      conditions: { has_issues: true }
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'telegram',
          telegram_config: {
            routing_mode: 'level',
            group_levels: ['management'],
            hotel_filter: 'dynamic',
            title: '🔍 Kiểm tra phòng {{room_number}}',
            message: 'Nhân viên {{staff_name}} đã kiểm tra.\n{{check_type_label}}\n\n⚠️ Vấn đề phát hiện:\n{{issue_summary}}'
          }
        }
      }
    ]
  },
  {
    id: 'room-setup-completed',
    name: 'Setup phòng hoàn tất → Log tài sản',
    description: 'Ghi log khi setup phòng mới/reset phòng hoàn tất',
    icon: <Package className="h-5 w-5" />,
    category: 'housekeeping',
    trigger: {
      type: 'room_standards_applied',
      conditions: {}
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          notification_type: 'in_app',
          in_app_config: {
            recipient_mode: 'roles',
            role_ids: ['manager'],
            title: '✅ Setup phòng {{room_number}}',
            body: 'Đã thiết lập {{items_count}} items theo tiêu chuẩn {{room_type}}'
          }
        }
      }
    ]
  }
]

const CATEGORY_COLORS: Record<string, string> = {
  housekeeping: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  inventory: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  maintenance: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  laundry: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

const CATEGORY_LABELS: Record<string, string> = {
  housekeeping: 'Buồng phòng',
  inventory: 'Kho',
  maintenance: 'Bảo trì',
  laundry: 'Giặt là',
}

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: WorkflowTemplate) => void
}

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Workflow Templates</h3>
        <span className="text-sm text-muted-foreground">
          Bắt đầu nhanh với các workflow phổ biến
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORKFLOW_TEMPLATES.map(template => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-muted">
                    {template.icon}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${CATEGORY_COLORS[template.category]}`}
                  >
                    {CATEGORY_LABELS[template.category]}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onSelectTemplate(template)}
              >
                Sử dụng template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { WORKFLOW_TEMPLATES }
export type { WorkflowTemplate }
