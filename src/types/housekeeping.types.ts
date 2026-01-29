// Housekeeping Task Types

export type TaskType = 'checkout_inspection' | 'cleaning' | 'checkin_prep' | 'amenity_request' | 'delivery_confirmation' | 'other'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface HousekeepingTask {
  id: string
  tenant_id: string
  hotel_id: string
  room_id: string
  booking_id: string | null
  
  task_type: TaskType
  title: string | null
  description: string | null
  priority: TaskPriority
  
  assigned_to: string | null
  requested_by: string | null
  
  status: TaskStatus
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  due_at: string | null
  
  room_check_id: string | null
  distribution_order_room_id: string | null // Link to delivery task
  notes: string | null
  
  created_at: string
  updated_at: string
}

export interface HousekeepingTaskWithDetails extends HousekeepingTask {
  room?: {
    id: string
    room_number: string
    floor: number
    room_type: string
  }
  assigned_user?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  requested_user?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  booking?: {
    id: string
    guest_name: string
    check_out_date: string
  }
  // Add checkout inspection ID for navigation
  checkout_inspection_id?: string | null
}

export interface CreateTaskInput {
  hotel_id: string
  room_id: string
  booking_id?: string
  task_type: TaskType
  title?: string
  description?: string
  priority?: TaskPriority
  assigned_to?: string
  due_at?: string
  notes?: string
}

// Display helpers
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  checkout_inspection: 'Kiểm tra checkout',
  cleaning: 'Dọn phòng',
  checkin_prep: 'Chuẩn bị check-in',
  amenity_request: 'Bổ sung đồ dùng',
  delivery_confirmation: 'Xác nhận nhận hàng',
  other: 'Khác'
}

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  checkout_inspection: 'ClipboardCheck',
  cleaning: 'Sparkles',
  checkin_prep: 'DoorOpen',
  amenity_request: 'Package',
  delivery_confirmation: 'PackageCheck',
  other: 'MoreHorizontal'
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp'
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  urgent: 'text-red-600'
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Chờ xử lý',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
}
