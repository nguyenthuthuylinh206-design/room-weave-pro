import { UseFormReturn } from 'react-hook-form'
import { CheckCircle2, AlertCircle, Package, Search, RotateCcw, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import type { RoomCheckFormData } from '@/types/rooms.types'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface ItemsCheckStepProps {
  form: UseFormReturn<RoomCheckFormData>
  items: RoomItemWithDetails[]
  roomId: string
  hotelId: string
  onQuantitiesChange?: (quantities: Record<string, number>) => void
}

interface ItemQuantity {
  actual: number
  replenished?: number
}

export function ItemsCheckStep({ form, items, roomId, hotelId, onQuantitiesChange }: ItemsCheckStepProps) {
  const [search, setSearch] = useState('')
  const [itemQuantities, setItemQuantities] = useState<Record<string, ItemQuantity>>({})
  const [replenishingItems, setReplenishingItems] = useState<Record<string, boolean>>({})
  const { toast } = useToast()
  const { user } = useUser()
  
  // Initialize with current quantities
  useEffect(() => {
    const initial: Record<string, ItemQuantity> = {}
    items.forEach(item => {
      initial[item.item_id] = { actual: item.current_quantity || 0 }
    })
    setItemQuantities(initial)
  }, [items])
  
  // Real-time sync for room items quantities
  useEffect(() => {
    const channel = supabase
      .channel(`room-check-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_items',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Real-time update:', payload)
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any
            setItemQuantities(prev => ({
              ...prev,
              [newData.item_id]: {
                actual: newData.quantity,
                replenished: prev[newData.item_id]?.replenished
              }
            }))
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])
  
  // Notify parent of quantity changes
  useEffect(() => {
    if (onQuantitiesChange) {
      const quantities: Record<string, number> = {}
      Object.entries(itemQuantities).forEach(([id, qty]) => {
        quantities[id] = qty.actual
      })
      onQuantitiesChange(quantities)
    }
  }, [itemQuantities, onQuantitiesChange])
  
  const filteredItems = items.filter((item: RoomItemWithDetails) =>
    item.item_name.toLowerCase().includes(search.toLowerCase()) ||
    item.item_code.toLowerCase().includes(search.toLowerCase())
  )
  
  const getActualQuantity = (itemId: string) => {
    return itemQuantities[itemId]?.actual ?? 0
  }
  
  const getShortage = (item: RoomItemWithDetails) => {
    const actual = getActualQuantity(item.item_id)
    return Math.max(0, item.standard_quantity - actual)
  }
  
  const handleQuantityChange = async (itemId: string, value: string) => {
    const actual = parseInt(value) || 0
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], actual }
    }))
    
    // Update database immediately for real-time sync
    try {
      await supabase
        .from('room_items')
        .upsert({
          room_id: roomId,
          item_id: itemId,
          quantity: actual,
        })
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }
  
  const handleReplenishFromStock = async (item: RoomItemWithDetails) => {
    const shortage = getShortage(item)
    if (shortage <= 0) return
    
    setReplenishingItems(prev => ({ ...prev, [item.item_id]: true }))
    
    try {
      // Check stock availability
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('quantity_in_stock, quantity_in_use, tenant_id')
        .eq('id', item.item_id)
        .single()
      
      if (itemError) throw itemError
      
      if (!itemData || itemData.quantity_in_stock < shortage) {
        toast({
          title: 'Không đủ hàng trong kho',
          description: `Kho chỉ còn ${itemData?.quantity_in_stock || 0}, cần ${shortage}`,
          variant: 'destructive',
        })
        return
      }
      
      // Update stock quantities
      await supabase
        .from('items')
        .update({
          quantity_in_stock: itemData.quantity_in_stock - shortage,
          quantity_in_use: itemData.quantity_in_use + shortage
        })
        .eq('id', item.item_id)
      
      // Create transaction record
      await supabase
        .from('inventory_transactions')
        .insert({
          hotel_id: hotelId,
          item_id: item.item_id,
          quantity: shortage,
          quantity_before: itemData.quantity_in_stock,
          quantity_after: itemData.quantity_in_stock - shortage,
          transaction_type: 'outbound',
          transaction_category: 'room_usage',
          transaction_code: `OUT-${Date.now()}`,
          to_location: `Phòng ${roomId}`,
          notes: `Bổ sung thiếu hụt khi kiểm tra phòng`,
          created_by: user?.id,
          tenant_id: itemData.tenant_id,
        })
      
      // Update room_items
      const newQuantity = getActualQuantity(item.item_id) + shortage
      await supabase
        .from('room_items')
        .upsert({
          room_id: roomId,
          item_id: item.item_id,
          quantity: newQuantity,
        })
      
      // Update local state
      setItemQuantities(prev => ({
        ...prev,
        [item.item_id]: {
          actual: newQuantity,
          replenished: (prev[item.item_id]?.replenished || 0) + shortage
        }
      }))
      
      toast({
        title: 'Đã bổ sung từ kho',
        description: `+${shortage} ${item.item_name}`,
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setReplenishingItems(prev => ({ ...prev, [item.item_id]: false }))
    }
  }
  
  const totalChecked = Object.keys(itemQuantities).length
  const totalItems = items.length
  const progressPercentage = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0
  
  const markAllStandard = () => {
    const allStandard: Record<string, ItemQuantity> = {}
    items.forEach((item: RoomItemWithDetails) => {
      allStandard[item.item_id] = { actual: item.standard_quantity }
    })
    setItemQuantities(allStandard)
  }
  
  const resetAll = () => {
    const initial: Record<string, ItemQuantity> = {}
    items.forEach(item => {
      initial[item.item_id] = { actual: item.current_quantity || 0 }
    })
    setItemQuantities(initial)
  }
  
  // Calculate summary
  const getMissingSummary = () => {
    return items
      .map(item => ({
        ...item,
        shortage: getShortage(item)
      }))
      .filter(item => item.shortage > 0)
  }
  
  // Update form with quantities data
  useEffect(() => {
    const missing = getMissingSummary().map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      shortage: item.shortage
    }))
    
    form.setValue('items_missing', missing as any)
    form.setValue('items_complete', missing.length === 0)
  }, [itemQuantities, items, form])
  
  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Đã kiểm tra {totalChecked}/{totalItems} items
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      {/* Warning if items missing */}
      {getMissingSummary().length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Phát hiện {getMissingSummary().length} mặt hàng thiếu hụt. Cần bổ sung tổng cộng{' '}
            {getMissingSummary().reduce((sum, item) => sum + item.shortage, 0)} items từ kho.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm đồ dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Quick Actions */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAllStandard}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Đủ chuẩn
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetAll}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Đặt lại
        </Button>
      </div>
      
      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? 'Không tìm thấy đồ dùng phù hợp' : 'Chưa có đồ dùng nào'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item: RoomItemWithDetails) => {
            const actualQty = getActualQuantity(item.item_id)
            const shortage = getShortage(item)
            const isReplenishing = replenishingItems[item.item_id]
            const wasReplenished = (itemQuantities[item.item_id]?.replenished || 0) > 0
            
            return (
              <Card key={item.item_id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Item thumbnail */}
                    {item.item_thumbnail && (
                      <img 
                        src={item.item_thumbnail} 
                        alt={item.item_name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    
                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-medium truncate">{item.item_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.item_code}
                          </p>
                        </div>
                        {item.category_name && (
                          <Badge variant="outline" className="shrink-0">
                            {item.category_name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-sm text-muted-foreground">
                          Chuẩn: {item.standard_quantity}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Thực tế:</span>
                          <Input
                            type="number"
                            min="0"
                            value={actualQty}
                            onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                            className="w-20 h-8 text-center"
                          />
                        </div>
                        {shortage > 0 ? (
                          <Badge variant="destructive" className="shrink-0">
                            Thiếu {shortage}
                          </Badge>
                        ) : actualQty >= item.standard_quantity ? (
                          <Badge variant="default" className="shrink-0 bg-success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Đủ
                          </Badge>
                        ) : null}
                        {wasReplenished && (
                          <Badge variant="secondary" className="shrink-0">
                            Đã bổ sung
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {shortage > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReplenishFromStock(item)}
                        disabled={isReplenishing}
                        className="shrink-0"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {isReplenishing ? 'Đang bổ sung...' : 'Bổ sung'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
