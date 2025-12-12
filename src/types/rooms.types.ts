import type { Database } from '@/integrations/supabase/types'

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export type RoomItem = Database['public']['Tables']['room_items']['Row']
export type RoomCheck = Database['public']['Tables']['room_checks']['Row']

export type RoomType = 'standard' | 'deluxe' | 'suite' | 'vip'
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order' | 'check_in' | 'check_out'
export type CheckType = 'daily' | 'checkout' | 'checkin' | 'maintenance'

export interface RoomWithStats extends Room {
  total_items: number
  missing_items: number
  items_in_laundry: number
  last_check_at: string | null
  last_check_score: number | null
}

export interface RoomFilters {
  search?: string
  floor?: number
  roomType?: RoomType
  status?: RoomStatus
  missingItemsOnly?: boolean
}

// Detailed item tracking interfaces for room checks
export interface LaundryItem {
  item_id: string
  item_name: string
  item_code?: string
  quantity: number
  notes?: string
}

export interface ConsumedItem {
  item_id: string
  item_name: string
  item_code?: string
  quantity: number
  need_refill: boolean
}

export interface LostItem {
  item_id: string
  item_name: string
  item_code?: string
  item_type: 'linen' | 'consumable' | 'equipment' | 'furniture'
  quantity: number
  estimated_value?: number
  notes?: string
}

export interface ReplacedItem {
  item_id: string
  item_name: string
  item_code?: string
  quantity: number
  from_stock: boolean
}

export interface RoomCheckFormData {
  check_type: CheckType
  cleanliness_score?: number
  items_complete: boolean
  items_missing: any[]
  items_damaged: any[]
  items_sent_to_laundry: LaundryItem[]
  items_consumed: ConsumedItem[]
  items_lost: LostItem[]
  items_replaced: ReplacedItem[]
  notes?: string
  photos?: string[]
}

export interface FloorPlanData {
  [floor: string]: {
    id: string
    room_number: string
    room_type: RoomType
    status: RoomStatus
  }[]
}

export interface RoomDetailData {
  room: Room
  hotel: any
  items: RoomItemWithDetails[]
  recent_checks: RoomCheckWithUser[]
  missing_items?: any[]
}

export interface RoomItemWithDetails {
  item_id: string
  item_code: string
  item_name: string
  item_thumbnail?: string
  category_name?: string
  standard_quantity: number
  current_quantity: number
  missing_quantity: number
  condition: string
  is_verified: boolean
  verified_at?: string
  verified_by?: string
  room_item_id?: string | null
  has_standard: boolean
}

export interface RoomCheckWithUser {
  id: string
  check_type: CheckType
  cleanliness_score?: number
  items_complete: boolean
  items_missing: any[]
  items_damaged: any[]
  notes?: string
  photos?: string[]
  checked_at: string
  checked_by_name: string
  checked_by_avatar?: string
}
