// Hooks cho lịch giá theo ngày (rate plans + daily prices + room_type availability)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from 'sonner'
import { toDateKey, type DailyPrice, type RatePlanLite } from '@/lib/pricing/rate-plan-constants'

// ===== Rate plans =====
export interface RatePlanRow extends RatePlanLite {
  tenant_id: string
  hotel_id: string | null
  room_type_id: string
}

export const useRatePlans = (roomTypeId: string | null) => {
  const { tenantId } = useUser()
  return useQuery({
    queryKey: ['rate-plans', tenantId, roomTypeId],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return []
      const { data, error } = await supabase
        .from('rate_plans' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('room_type_id', roomTypeId)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as unknown as RatePlanRow[]
    },
    enabled: !!tenantId && !!roomTypeId,
  })
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
  return useQuery({
    queryKey: ['daily-prices', tenantId, roomTypeId, planIds.join(','), toDateKey(fromDate), toDateKey(toDate)],
    queryFn: async () => {
      if (!tenantId || planIds.length === 0) return new Map<string, DailyPrice>()
      const { data, error } = await supabase
        .from('rate_plan_daily_prices' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .in('rate_plan_id', planIds)
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
  return useQuery({
    queryKey: ['rt-default-qty', tenantId, roomTypeId],
    queryFn: async () => {
      if (!tenantId || !roomTypeId) return 0
      const { count, error } = await supabase
        .from('rooms' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('room_type_id', roomTypeId)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!tenantId && !!roomTypeId,
  })
}
