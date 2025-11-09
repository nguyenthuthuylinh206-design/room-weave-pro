import type { Database } from '@/integrations/supabase/types'

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export type RoomItem = Database['public']['Tables']['room_items']['Row']
export type RoomCheck = Database['public']['Tables']['room_checks']['Row']

export type RoomType = 'standard' | 'deluxe' | 'suite' | 'vip'
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order'

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
