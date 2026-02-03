import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { RefreshCw, AlertTriangle, CheckCircle2, Wrench, Package } from 'lucide-react'
import { ITEM_TYPE_LABELS, type ItemType } from '@/types/items.types'

interface MisclassifiedItem {
  id: string
  name: string
  code: string
  current_item_type: ItemType
  expected_item_type: ItemType
  category_name: string
  category_id: string
}

export function ItemClassificationTool() {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const queryClient = useQueryClient()
  const [isFixing, setIsFixing] = useState(false)

  // Query to find misclassified items
  const { data: misclassifiedItems, isLoading, refetch } = useQuery({
    queryKey: ['misclassified-items', tenantId, selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return []

      // Get items with their categories
      let query = supabase
        .from('items')
        .select(`
          id,
          name,
          code,
          item_type,
          category_id,
          item_categories!inner(id, name, default_item_type)
        `)
        .eq('tenant_id', tenantId)
        .not('category_id', 'is', null)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter items where item_type doesn't match category's default_item_type
      const misclassified: MisclassifiedItem[] = []
      
      for (const item of data || []) {
        const category = item.item_categories as any
        if (category?.default_item_type && item.item_type !== category.default_item_type) {
          misclassified.push({
            id: item.id,
            name: item.name,
            code: item.code || '',
            current_item_type: item.item_type as ItemType,
            expected_item_type: category.default_item_type as ItemType,
            category_name: category.name,
            category_id: category.id,
          })
        }
      }

      return misclassified
    },
    enabled: !!tenantId,
  })

  // Query for stats
  const { data: stats } = useQuery({
    queryKey: ['item-classification-stats', tenantId, selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return null

      let query = supabase
        .from('items')
        .select('item_type', { count: 'exact' })
        .eq('tenant_id', tenantId)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const { count: total } = await query

      // Get count per type
      const typeCounts: Record<ItemType, number> = {
        linen: 0,
        consumable: 0,
        equipment: 0,
        furniture: 0,
      }

      for (const type of Object.keys(typeCounts) as ItemType[]) {
        let typeQuery = supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('item_type', type)

        if (!isAllHotelsMode && selectedHotel?.id) {
          typeQuery = typeQuery.eq('hotel_id', selectedHotel.id)
        }

        const { count } = await typeQuery
        typeCounts[type] = count || 0
      }

      return {
        total: total || 0,
        typeCounts,
        misclassifiedCount: misclassifiedItems?.length || 0,
      }
    },
    enabled: !!tenantId && misclassifiedItems !== undefined,
  })

  // Mutation to fix all misclassified items
  const fixAllMutation = useMutation({
    mutationFn: async () => {
      if (!misclassifiedItems || misclassifiedItems.length === 0) return

      setIsFixing(true)
      
      // Update each item to match its category's default_item_type
      for (const item of misclassifiedItems) {
        await supabase
          .from('items')
          .update({ 
            item_type: item.expected_item_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }
    },
    onSuccess: () => {
      toast.success(`Đã sửa ${misclassifiedItems?.length || 0} items thành công!`)
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['misclassified-items'] })
      queryClient.invalidateQueries({ queryKey: ['item-classification-stats'] })
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi khi sửa items')
    },
    onSettled: () => {
      setIsFixing(false)
    },
  })

  // Mutation to fix single item
  const fixSingleMutation = useMutation({
    mutationFn: async (item: MisclassifiedItem) => {
      const { error } = await supabase
        .from('items')
        .update({ 
          item_type: item.expected_item_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error
    },
    onSuccess: (_, item) => {
      toast.success(`Đã sửa "${item.name}" thành ${ITEM_TYPE_LABELS[item.expected_item_type]}`)
      queryClient.invalidateQueries({ queryKey: ['items'] })
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi khi sửa item')
    },
  })

  const getItemTypeBadgeVariant = (type: ItemType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'linen': return 'default'
      case 'consumable': return 'secondary'
      case 'equipment': return 'outline'
      case 'furniture': return 'destructive'
      default: return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const misclassifiedCount = misclassifiedItems?.length || 0

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
          <p className="text-xs text-muted-foreground">Tổng Items</p>
        </div>
        {Object.entries(ITEM_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{stats?.typeCounts?.[type as ItemType] || 0}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Misclassified Items Alert */}
      {misclassifiedCount > 0 ? (
        <div className="border rounded-lg p-4 bg-destructive/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium">
                Phát hiện {misclassifiedCount} items phân loại sai
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Quét lại
              </Button>
              <Button
                size="sm"
                onClick={() => fixAllMutation.mutate()}
                disabled={isFixing || fixAllMutation.isPending}
              >
                <Wrench className="h-4 w-4 mr-1" />
                {isFixing ? 'Đang sửa...' : 'Sửa tất cả'}
              </Button>
            </div>
          </div>

          {/* List of misclassified items */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {misclassifiedItems?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white border rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{item.name}</span>
                    <code className="text-xs bg-muted px-1 rounded">{item.code}</code>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Danh mục: {item.category_name}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={getItemTypeBadgeVariant(item.current_item_type)}>
                        {ITEM_TYPE_LABELS[item.current_item_type]}
                      </Badge>
                      <span>→</span>
                      <Badge variant={getItemTypeBadgeVariant(item.expected_item_type)}>
                        {ITEM_TYPE_LABELS[item.expected_item_type]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fixSingleMutation.mutate(item)}
                  disabled={fixSingleMutation.isPending}
                >
                  Sửa
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center bg-muted/30">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
          <p className="font-medium">Tất cả items đã được phân loại đúng!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Không có items nào cần sửa
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Quét lại
          </Button>
        </div>
      )}

      {/* Help text */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-start gap-2">
          <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Cách hoạt động</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tool so sánh <code className="bg-background px-1 rounded">item_type</code> của mỗi item với <code className="bg-background px-1 rounded">default_item_type</code> của danh mục</li>
              <li>• Nếu không khớp, item sẽ được liệt kê để sửa</li>
              <li>• Bạn có thể sửa từng item hoặc sửa tất cả cùng lúc</li>
              <li>• Từ bây giờ, khi tạo item mới và chọn danh mục, loại đồ dùng sẽ tự động được gán</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
