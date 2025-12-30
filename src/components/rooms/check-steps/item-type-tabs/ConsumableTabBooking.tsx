import { useState, useMemo, useEffect } from 'react'
import { Droplets, Check, Minus, Plus, Package, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
import type { RoomItemWithDetails, ConsumedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'
import { useBookingConsumables, BookingConsumableWithItem } from '@/hooks/useBookingConsumables'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface ConsumableTabBookingProps {
  items: ExtendedRoomItem[]
  bookingId: string | null
  consumedItems: ConsumedItem[]
  onMarkConsumed: (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => void
  onRemoveConsumed: (itemId: string) => void
}

interface ItemState {
  remaining: number
  isChecked: boolean
  isSufficient: boolean
}

export function ConsumableTabBooking({
  items,
  bookingId,
  consumedItems,
  onMarkConsumed,
  onRemoveConsumed,
}: ConsumableTabBookingProps) {
  const { t } = useTranslation(['rooms'])
  
  // Fetch booking consumables data
  const { data: bookingConsumables, isLoading } = useBookingConsumables(bookingId || undefined)
  
  // Track state for each item: remaining quantity and whether it's been checked
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})

  // Map booking consumables by item_id for easy lookup
  const consumablesMap = useMemo(() => {
    const map = new Map<string, BookingConsumableWithItem>()
    bookingConsumables?.forEach(bc => {
      map.set(bc.item_id, bc)
    })
    return map
  }, [bookingConsumables])

  // Initialize item states from booking consumables
  useEffect(() => {
    if (bookingConsumables && bookingConsumables.length > 0) {
      const states: Record<string, ItemState> = {}
      bookingConsumables.forEach(bc => {
        // If already has remaining_quantity set, use it
        if (bc.remaining_quantity !== null) {
          states[bc.item_id] = {
            remaining: bc.remaining_quantity,
            isChecked: true,
            isSufficient: bc.remaining_quantity >= bc.total_available,
          }
        }
      })
      setItemStates(prev => ({ ...prev, ...states }))
    }
  }, [bookingConsumables])

  // Sync with consumedItems prop (for form integration)
  useEffect(() => {
    const newStates: Record<string, ItemState> = {}
    consumedItems.forEach(ci => {
      const bc = consumablesMap.get(ci.item_id)
      if (bc) {
        const remaining = bc.total_available - ci.quantity
        newStates[ci.item_id] = {
          remaining: Math.max(0, remaining),
          isChecked: true,
          isSufficient: false,
        }
      }
    })
    if (Object.keys(newStates).length > 0) {
      setItemStates(prev => ({ ...prev, ...newStates }))
    }
  }, [consumedItems, consumablesMap])

  // Group items by category
  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => itemStates[item.item_id]?.isChecked).length
  }

  // Handle marking all items in category as sufficient
  const handleMarkAllSufficient = (categoryItems: ExtendedRoomItem[]) => {
    const newStates: Record<string, ItemState> = {}
    categoryItems.forEach(item => {
      const bc = consumablesMap.get(item.item_id)
      if (bc) {
        newStates[item.item_id] = {
          remaining: bc.total_available,
          isChecked: true,
          isSufficient: true,
        }
        // Remove from consumed
        onRemoveConsumed(item.item_id)
      }
    })
    setItemStates(prev => ({ ...prev, ...newStates }))
  }

  // Handle marking single item as sufficient
  const handleMarkSufficient = (item: ExtendedRoomItem) => {
    const bc = consumablesMap.get(item.item_id)
    if (!bc) return

    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: bc.total_available,
        isChecked: true,
        isSufficient: true,
      },
    }))
    onRemoveConsumed(item.item_id)
  }

  // Handle remaining quantity change
  const handleRemainingChange = (item: ExtendedRoomItem, newRemaining: number) => {
    const bc = consumablesMap.get(item.item_id)
    if (!bc) return

    const totalAvailable = bc.total_available
    const clampedRemaining = Math.max(0, Math.min(newRemaining, totalAvailable + 10)) // Allow some extra
    const consumed = Math.max(0, totalAvailable - clampedRemaining)

    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: clampedRemaining,
        isChecked: true,
        isSufficient: clampedRemaining >= totalAvailable,
      },
    }))

    // Update consumed items
    if (consumed > 0) {
      onMarkConsumed(item, consumed, true)
    } else {
      onRemoveConsumed(item.item_id)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Đang tải dữ liệu...</p>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không có đồ tiêu hao nào trong phòng này</p>
        </CardContent>
      </Card>
    )
  }

  // No booking - show warning
  if (!bookingId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Không có booking hiện tại. Sử dụng chế độ kiểm tra thông thường.</p>
        </CardContent>
      </Card>
    )
  }

  const renderItemCard = (item: ExtendedRoomItem) => {
    const bc = consumablesMap.get(item.item_id)
    const state = itemStates[item.item_id]
    
    // Fallback values if no booking consumable found
    const initialQty = bc?.initial_quantity ?? item.standard_quantity
    const supplementedQty = bc?.supplemented_quantity ?? 0
    const totalAvailable = bc?.total_available ?? item.standard_quantity
    const remaining = state?.remaining ?? totalAvailable
    const consumed = Math.max(0, totalAvailable - remaining)
    const isSufficient = state?.isSufficient ?? false
    const isChecked = state?.isChecked ?? false
    const unitPrice = bc?.unit_price ?? 0
    const consumedValue = consumed * unitPrice

    return (
      <Card 
        key={item.item_id} 
        className={`transition-all ${
          isChecked 
            ? isSufficient 
              ? 'border-green-500/50 bg-green-500/5' 
              : 'border-primary bg-primary/5'
            : ''
        }`}
      >
        <CardContent className="p-3 space-y-3">
          {/* Row 1: Item info */}
          <div className="flex items-center gap-3">
            {item.item_thumbnail ? (
              <img
                src={item.item_thumbnail}
                alt={item.item_name}
                className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Droplets className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{item.item_name}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Check-in: {initialQty}</span>
                {supplementedQty > 0 && (
                  <Badge variant="secondary" className="text-xs h-5">
                    +{supplementedQty} bổ sung
                  </Badge>
                )}
              </div>
            </div>
            {isChecked && (
              isSufficient ? (
                <Badge className="bg-green-500/10 text-green-600 text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  Đủ
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Package className="mr-1 h-3 w-3" />
                  Dùng {consumed}
                </Badge>
              )
            )}
          </div>

          {/* Row 2: Quantity info bar */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <div className="text-xs space-y-0.5">
              <div className="text-muted-foreground">
                Tổng có: <span className="font-medium text-foreground">{totalAvailable}</span>
              </div>
              {consumed > 0 && unitPrice > 0 && (
                <div className="text-primary">
                  Giá trị: {consumedValue.toLocaleString()}đ
                </div>
              )}
            </div>
            
            {/* Remaining quantity input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Còn:</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemainingChange(item, remaining - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  value={remaining}
                  onChange={(e) => handleRemainingChange(item, parseInt(e.target.value) || 0)}
                  className="w-14 h-8 text-center text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemainingChange(item, remaining + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Row 3: Quick action */}
          {!isChecked && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 border-green-500 text-green-600 hover:bg-green-500/10"
              onClick={() => handleMarkSufficient(item)}
            >
              <Check className="h-4 w-4 mr-1" />
              Đủ (còn {totalAvailable})
            </Button>
          )}

          {/* Show consumed info if checked and not sufficient */}
          {isChecked && !isSufficient && consumed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Khách đã dùng: <span className="font-medium text-foreground">{consumed}</span>
              </span>
              <span className="text-primary">
                Bổ sung: {item.standard_quantity} (về chuẩn)
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Droplets className="inline-block h-4 w-4 mr-2" />
        Kiểm đếm số lượng thực tế còn lại trong phòng. Hệ thống sẽ tự tính số khách đã dùng.
      </div>

      {/* Summary if has booking data */}
      {bookingConsumables && bookingConsumables.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Booking hiện tại:</span>
                <span className="ml-2 font-medium">{bookingConsumables.length} mặt hàng tiêu hao</span>
              </div>
              <Badge variant="secondary">
                {Object.values(itemStates).filter(s => s.isChecked).length}/{bookingConsumables.length} đã kiểm
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Items by Category */}
      {Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => (
        <CategoryGroup
          key={categoryName}
          categoryName={categoryName}
          itemCount={categoryItems.length}
          checkedCount={getCategoryCheckedCount(categoryItems)}
          defaultOpen={true}
          actions={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-green-500 text-green-600 hover:bg-green-500/10"
              onClick={() => handleMarkAllSufficient(categoryItems)}
            >
              <Check className="h-3 w-3 mr-1" />
              Tất cả Đủ
            </Button>
          }
        >
          {categoryItems.map(renderItemCard)}
        </CategoryGroup>
      ))}
    </div>
  )
}
