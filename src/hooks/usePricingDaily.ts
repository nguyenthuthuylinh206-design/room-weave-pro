// Hooks cho lịch giá theo ngày (rate plans + daily prices + room_type availability)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import { toDateKey, type DailyPrice, type RatePlanLite } from '@/lib/pricing/rate-plan-constants'

// ID quy ước cho gói chuẩn ảo (chưa materialize vào DB)
export const VIRTUAL_DEFAULT_PLAN_ID = '__default__'

// ===== Rate plans =====
export interface RatePlanRow extends RatePlanLite {
  tenant_id: string
  hotel_id: string | null
  room_type_id: string
  is_default?: boolean
  isVirtual?: boolean
}

const ROOM_TYPE_CODE_TO_ROOM_KEYS: Record<string, string[]> = {
  STD: ['standard'],
  SUP: ['superior'],
  DLX: ['deluxe'],
  SUI: ['suite'],
  VIP: ['vip'],
}

const normalizeRoomTypeKey = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .replace(/^phòng\s+/i, '')
    .trim()
    .replace(/\s+/g, '_')

const roomKeysFromRoomType = (roomType: { code?: string | null; name?: string | null } | null) => {
  const keys = ROOM_TYPE_CODE_TO_ROOM_KEYS[(roomType?.code ?? '').toUpperCase()] ?? []
  const fromName = normalizeRoomTypeKey(roomType?.name)
  return Array.from(new Set([...keys, ...(fromName ? [fromName] : [])]))
}

// ===== Default rate (từ room_type_rates) =====
export const useRoomTypeRate = (roomTypeId: string | null) => {
  const { tenantId } = useUser()
  return useQuery({
    queryKey: ['room-type-rate', tenantId, roomTypeId],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return null
      const { data, error } = await supabase
        .from('room_type_rates')
        .select('daily_rate, hotel_id')
        .eq('tenant_id', tenantId)
        .eq('room_type_id', roomTypeId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!tenantId && !!roomTypeId,
  })
}

export const useRatePlans = (roomTypeId: string | null) => {
  const { tenantId } = useUser()
  const { data: defaultRate } = useRoomTypeRate(roomTypeId)
  return useQuery({
    queryKey: ['rate-plans', tenantId, roomTypeId, defaultRate?.daily_rate ?? null],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return [] as RatePlanRow[]
      const { data, error } = await supabase
        .from('rate_plans' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('room_type_id', roomTypeId)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      const real = ((data ?? []) as unknown) as RatePlanRow[]
      if (real.length > 0) return real
      const price = Number(defaultRate?.daily_rate ?? 0)
      const virtual: RatePlanRow = {
        id: VIRTUAL_DEFAULT_PLAN_ID,
        tenant_id: tenantId,
        hotel_id: defaultRate?.hotel_id ?? null,
        room_type_id: roomTypeId,
        name: 'Giá tiêu chuẩn',
        price,
        sale_price: null,
        sale_start_date: null,
        sale_end_date: null,
        inclusions: [],
        policies: [],
        is_active: true,
        sort_order: 0,
        is_default: true,
        isVirtual: true,
      } as unknown as RatePlanRow
      return [virtual]
    },
    enabled: !!tenantId && !!roomTypeId,
  })
}

// Materialize gói chuẩn ảo thành row thực
export const ensureDefaultRatePlan = async (roomTypeId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('ensure_default_rate_plan' as any, {
    p_room_type_id: roomTypeId,
  })
  if (error) throw error
  return data as unknown as string
}

export const useSaveRatePlans = () => {
  const qc = useQueryClient()
  const { tenantId } = useUser()
  return useMutation({
    mutationFn: async (args: {
      roomTypeId: string
      hotelId: string | null
      plans: Array<Partial<RatePlanRow> & { name: string; price: number }>
    }) => {
      if (!tenantId) throw new Error('Thiếu tenant')
      // Xoá toàn bộ rồi insert lại (như Deal Hotel Hub) — đơn giản và idempotent
      await supabase
        .from('rate_plans' as any)
        .delete()
        .eq('tenant_id', tenantId)
        .eq('room_type_id', args.roomTypeId)

      if (args.plans.length > 0) {
        const rows = args.plans.map((p, i) => ({
          tenant_id: tenantId,
          hotel_id: args.hotelId,
          room_type_id: args.roomTypeId,
          name: p.name,
          price: p.price,
          sale_price: p.sale_price ?? null,
          sale_start_date: p.sale_start_date ?? null,
          sale_end_date: p.sale_end_date ?? null,
          inclusions: p.inclusions ?? [],
          policies: p.policies ?? [],
          is_active: p.is_active ?? true,
          sort_order: i,
        }))
        const { error } = await supabase.from('rate_plans' as any).insert(rows as any)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rate-plans'] })
      toast.success('Đã lưu gói giá')
    },
    onError: (e: any) => toast.error(e.message || 'Lưu thất bại'),
  })
}

// ===== Daily prices =====
export const useDailyPrices = (
  roomTypeId: string | null,
  planIds: string[],
  fromDate: Date,
  toDate: Date,
) => {
  const { tenantId } = useUser()
  const realPlanIds = planIds.filter(id => id !== VIRTUAL_DEFAULT_PLAN_ID)
  return useQuery({
    queryKey: ['daily-prices', tenantId, roomTypeId, realPlanIds.join(','), toDateKey(fromDate), toDateKey(toDate)],
    queryFn: async () => {
      if (!tenantId || realPlanIds.length === 0) return new Map<string, DailyPrice>()
      const { data, error } = await supabase
        .from('rate_plan_daily_prices' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .in('rate_plan_id', realPlanIds)
        .gte('date', toDateKey(fromDate))
        .lte('date', toDateKey(toDate))
      if (error) throw error
      const map = new Map<string, DailyPrice>()
      ;(data ?? []).forEach((d: any) => {
        map.set(`${d.rate_plan_id}|${d.date}`, {
          rate_plan_id: d.rate_plan_id,
          date: d.date,
          price: d.price,
          sale_price: d.sale_price,
          is_closed: d.is_closed,
        })
      })
      return map
    },
    enabled: !!tenantId,
  })
}

// ===== Room type availability =====
export const useRoomTypeAvailability = (
  roomTypeId: string | null,
  fromDate: Date,
  toDate: Date,
) => {
  const { tenantId } = useUser()
  return useQuery({
    queryKey: ['rt-availability', tenantId, roomTypeId, toDateKey(fromDate), toDateKey(toDate)],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return new Map<string, { qty: number; isClosed: boolean }>()
      const { data, error } = await supabase
        .from('room_type_availability' as any)
        .select('date, available_qty, is_closed')
        .eq('tenant_id', tenantId)
        .eq('room_type_id', roomTypeId)
        .gte('date', toDateKey(fromDate))
        .lte('date', toDateKey(toDate))
      if (error) throw error
      const map = new Map<string, { qty: number; isClosed: boolean }>()
      ;(data ?? []).forEach((a: any) => map.set(a.date, { qty: a.available_qty, isClosed: !!a.is_closed }))
      return map
    },
    enabled: !!tenantId && !!roomTypeId,
  })
}

// ===== Default qty cho hạng phòng (đếm số phòng vật lý đang active) =====
export const useRoomTypeDefaultQty = (roomTypeId: string | null) => {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  return useQuery({
    queryKey: ['rt-default-qty', tenantId, isAllHotelsMode ? null : selectedHotel?.id ?? null, roomTypeId],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return 0
      const { data: roomType, error: roomTypeError } = await supabase
        .from('room_types')
        .select('code, name')
        .eq('tenant_id', tenantId)
        .eq('id', roomTypeId)
        .maybeSingle()
      if (roomTypeError) throw roomTypeError

      const roomKeys = roomKeysFromRoomType(roomType as { code?: string | null; name?: string | null } | null)
      if (roomKeys.length === 0) return 0

      let query = supabase
        .from('rooms' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('room_type', roomKeys)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
    enabled: !!tenantId && !!roomTypeId,
  })
}
