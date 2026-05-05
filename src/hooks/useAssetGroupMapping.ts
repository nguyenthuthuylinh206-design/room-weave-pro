import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from '@/hooks/use-toast'

export type AssetGroup =
  | 'linen'
  | 'consumable_free'
  | 'minibar'
  | 'stationery'
  | 'equipment_large'
  | 'electronic_accessory'
  | 'furniture'
  | 'glassware'
  | 'bathroom_hardware'

export const ASSET_GROUP_LABELS: Record<AssetGroup, string> = {
  linen: 'Đồ vải',
  consumable_free: 'Tiêu hao miễn phí',
  minibar: 'Minibar (tính tiền)',
  stationery: 'Văn phòng phẩm',
  equipment_large: 'Thiết bị lớn',
  electronic_accessory: 'Phụ kiện điện tử',
  furniture: 'Nội thất',
  glassware: 'Đồ thuỷ tinh',
  bathroom_hardware: 'Vật tư phòng tắm',
}

export interface PreviewRow {
  item_id: string
  item_code: string | null
  item_name: string
  item_type: string
  current_group: AssetGroup | null
  suggested_group: AssetGroup | null
  confidence: 'high' | 'medium' | 'low'
  needs_review: boolean
}

export interface ApplyResult {
  affected: number
  review_required: number
  still_unmapped: number
  tenant_id: string
  hotel_id: string | null
}

export const useAssetGroupPreview = (enabled = false) => {
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()

  return useQuery({
    queryKey: ['asset-group-preview', tenantId, selectedHotel?.id ?? null],
    enabled: enabled && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('preview_asset_group_mapping', {
        _tenant_id: tenantId!,
        _hotel_id: selectedHotel?.id ?? null,
      })
      if (error) throw error
      return (data ?? []) as PreviewRow[]
    },
    staleTime: 0,
  })
}

export const useApplyAssetGroupMapping = () => {
  const qc = useQueryClient()
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()

  return useMutation({
    mutationFn: async (overrideExisting: boolean) => {
      const { data, error } = await supabase.rpc('apply_asset_group_mapping', {
        _tenant_id: tenantId!,
        _hotel_id: selectedHotel?.id ?? null,
        _override_existing: overrideExisting,
      })
      if (error) throw error
      return data as unknown as ApplyResult
    },
    onSuccess: (res) => {
      toast({
        title: 'Đã áp dụng phân loại',
        description: `Cập nhật ${res.affected} tài sản — ${res.review_required} cần xem lại — ${res.still_unmapped} chưa phân loại được.`,
      })
      qc.invalidateQueries({ queryKey: ['asset-group-preview'] })
      qc.invalidateQueries({ queryKey: ['items'] })
    },
    onError: (err: any) => {
      const msg = err?.message ?? 'Có lỗi xảy ra'
      const friendly =
        msg.includes('forbidden_role')
          ? 'Bạn không có quyền áp dụng (cần Chủ hoặc Quản lý khách sạn).'
          : msg.includes('forbidden_tenant')
          ? 'Không thuộc tenant này.'
          : msg
      toast({ title: 'Áp dụng thất bại', description: friendly, variant: 'destructive' })
    },
  })
}
