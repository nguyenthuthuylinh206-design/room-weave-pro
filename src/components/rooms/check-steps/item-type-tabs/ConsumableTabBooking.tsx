import { useState, useMemo, useEffect } from 'react'
import { Droplets, Check, Minus, Plus, Package, Loader2, Undo2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { RoomItemWithDetails, ConsumedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'
import { useBookingConsumables, useInitializeBookingConsumables, BookingConsumableWithItem } from '@/hooks/useBookingConsumables'
import { cn } from '@/lib/utils'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface ConsumableTabBookingProps {
  items: ExtendedRoomItem[]
  bookingId: string | null
  roomId: string
  tenantId: string
  consumedItems: ConsumedItem[]
  onMarkConsumed: (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => void
  onRemoveConsumed: (itemId: string) => void
}

type ItemStatus = 'unchecked' | 'sufficient' | 'insufficient'

interface ItemState {
  remaining: number
  status: ItemStatus
}

export function ConsumableTabBooking({
  items,
  bookingId,
  roomId,
  tenantId,
  consumedItems,
  onMarkConsumed,
  onRemoveConsumed,
}: ConsumableTabBookingProps) {
  
  // Fetch booking consumables data
  const { data: bookingConsumables, isLoading, refetch } = useBookingConsumables(bookingId || undefined)
  const initializeConsumables = useInitializeBookingConsumables()
  
  // Track state for each item
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})

  // Map booking consumables by item_id for easy lookup
  const consumablesMap = useMemo(() => {
    const map = new Map<string, BookingConsumableWithItem>()
    bookingConsumables?.forEach(bc => {
      map.set(bc.item_id, bc)
    })
    return map
  }, [bookingConsumables])

  // Get total available for an item
  const getTotalAvailable = (item: ExtendedRoomItem) => {
    const bc = consumablesMap.get(item.item_id)
    return bc?.total_available ?? item.standard_quantity
  }

  // Auto-initialize booking_consumables when bookingId exists but data is empty
  useEffect(() => {
    const shouldInit = bookingId && 
      roomId && 
      tenantId && 
      !isLoading && 
      (!bookingConsumables || bookingConsumables.length === 0) && 
      items.length > 0 &&
      !initializeConsumables.isPending

    if (shouldInit) {
      initializeConsumables.mutate(
        { bookingId, roomId, tenantId },
        {
          onSuccess: () => {
            refetch()
          },
        }
      )
    }
  }, [bookingId, roomId, tenantId, isLoading, bookingConsumables, items, initializeConsumables.isPending])

  // Initialize item states from booking consumables
  useEffect(() => {
    if (bookingConsumables && bookingConsumables.length > 0) {
      const states: Record<string, ItemState> = {}
      bookingConsumables.forEach(bc => {
        if (bc.remaining_quantity !== null) {
          const isSufficient = bc.remaining_quantity >= bc.total_available
          states[bc.item_id] = {
            remaining: bc.remaining_quantity,
            status: isSufficient ? 'sufficient' : 'insufficient',
          }
        }
      })
      setItemStates(prev => ({ ...prev, ...states }))
    }
  }, [bookingConsumables])

  // Sync with consumedItems prop
  useEffect(() => {
    const newStates: Record<string, ItemState> = {}
    consumedItems.forEach(ci => {
      const bc = consumablesMap.get(ci.item_id)
      if (bc) {
        const remaining = bc.total_available - ci.quantity
        newStates[ci.item_id] = {
          remaining: Math.max(0, remaining),
          status: 'insufficient',
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
    return categoryItems.filter(item => 
      itemStates[item.item_id]?.status && itemStates[item.item_id].status !== 'unchecked'
    ).length
  }

  // Handle marking all items in category as sufficient
  const handleMarkAllSufficient = (categoryItems: ExtendedRoomItem[]) => {
    const newStates: Record<string, ItemState> = {}
    categoryItems.forEach(item => {
      const totalAvailable = getTotalAvailable(item)
      newStates[item.item_id] = {
        remaining: totalAvailable,
        status: 'sufficient',
      }
      onRemoveConsumed(item.item_id)
    })
    setItemStates(prev => ({ ...prev, ...newStates }))
  }

  // Handle marking single item as sufficient
  const handleMarkSufficient = (item: ExtendedRoomItem) => {
    const totalAvailable = getTotalAvailable(item)
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: totalAvailable,
        status: 'sufficient',
      },
    }))
    onRemoveConsumed(item.item_id)
  }

  // Start insufficient mode (expand input)
  const handleStartInsufficient = (item: ExtendedRoomItem) => {
    const totalAvailable = getTotalAvailable(item)
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: Math.max(0, totalAvailable - 1), // Default: thiếu 1
        status: 'insufficient',
      },
    }))
  }

  // Reset to unchecked
  const handleReset = (item: ExtendedRoomItem) => {
    const totalAvailable = getTotalAvailable(item)
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: totalAvailable,
        status: 'unchecked',
      },
    }))
    onRemoveConsumed(item.item_id)
  }

  // Handle remaining quantity change
  const handleRemainingChange = (item: ExtendedRoomItem, newRemaining: number) => {
    const totalAvailable = getTotalAvailable(item)
    const clampedRemaining = Math.max(0, Math.min(newRemaining, totalAvailable + 10))
    
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: {
        remaining: clampedRemaining,
        status: 'insufficient',
      },
    }))
  }

  // Confirm insufficient (save consumed)
  const handleConfirmInsufficient = (item: ExtendedRoomItem) => {
    const state = itemStates[item.item_id]
    if (!state) return
    
    const totalAvailable = getTotalAvailable(item)
    const consumed = Math.max(0, totalAvailable - state.remaining)
    
    if (consumed > 0) {
      onMarkConsumed(item, consumed, true)
    } else {
      // If remaining >= total, mark as sufficient
      setItemStates(prev => ({
        ...prev,
        [item.item_id]: {
          remaining: totalAvailable,
          status: 'sufficient',
        },
      }))
      onRemoveConsumed(item.item_id)
    }
  }

  // Loading state - include initialization loading
  if (bookingId && (isLoading || initializeConsumables.isPending)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">
            {initializeConsumables.isPending ? 'Đang khởi tạo dữ liệu tiêu hao...' : 'Đang tải dữ liệu...'}
          </p>
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

  const hasBookingData = bookingId && bookingConsumables && bookingConsumables.length > 0

  // Get total checked count
  const totalCheckedCount = Object.values(itemStates).filter(s => s.status !== 'unchecked').length
  const allItemsChecked = totalCheckedCount === items.length

  // Calculate summary data for checkout report
  const getSummaryData = () => {
    return items.map(item => {
      const bc = consumablesMap.get(item.item_id)
      const state = itemStates[item.item_id]
      const initialQty = bc?.initial_quantity ?? item.standard_quantity
      const supplementedQty = bc?.supplemented_quantity ?? 0
      const totalAvailable = getTotalAvailable(item)
      const remaining = state?.remaining ?? totalAvailable
      const consumed = Math.max(0, totalAvailable - remaining)
      const unitPrice = bc?.unit_price ?? 0
      const value = consumed * unitPrice

      return {
        id: item.item_id,
        name: item.item_name,
        initialQty,
        supplemented: supplementedQty,
        total: totalAvailable,
        remaining,
        consumed,
        unitPrice,
        value,
        status: state?.status ?? 'unchecked',
      }
    }).filter(item => item.status !== 'unchecked')
  }

  const summaryData = getSummaryData()
  const totalValue = summaryData.reduce((sum, item) => sum + item.value, 0)

  const renderItemCard = (item: ExtendedRoomItem) => {
    const bc = consumablesMap.get(item.item_id)
    const state = itemStates[item.item_id]
    const status: ItemStatus = state?.status ?? 'unchecked'
    
    const initialQty = bc?.initial_quantity ?? item.standard_quantity
    const supplementedQty = bc?.supplemented_quantity ?? 0
    const totalAvailable = getTotalAvailable(item)
    const remaining = state?.remaining ?? totalAvailable
    const consumed = Math.max(0, totalAvailable - remaining)
    const unitPrice = bc?.unit_price ?? 0
    const consumedValue = consumed * unitPrice

    return (
      <Card 
        key={item.item_id} 
        className={cn(
          "transition-all",
          status === 'unchecked' && "border-border",
          status === 'sufficient' && "border-green-500/50 bg-green-500/5",
          status === 'insufficient' && "border-primary bg-primary/5"
        )}
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
            </div>
            
            {/* Status badge */}
            {status === 'sufficient' && (
              <Badge className="bg-green-500/10 text-green-600 text-xs">
                <Check className="mr-1 h-3 w-3" />
                Đủ
              </Badge>
            )}
            {status === 'insufficient' && consumed > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Package className="mr-1 h-3 w-3" />
                Dùng {consumed}
              </Badge>
            )}
          </div>

          {/* Row 2: 4-column data grid (when has booking data) */}
          {hasBookingData && (
            <div className="grid grid-cols-4 gap-1 text-center bg-muted/50 rounded-lg p-2">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Check-in</div>
                <div className="font-semibold text-sm">{initialQty}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Bổ sung</div>
                <div className={cn("font-semibold text-sm", supplementedQty > 0 && "text-blue-600")}>
                  {supplementedQty > 0 ? `+${supplementedQty}` : '0'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Tổng</div>
                <div className="font-semibold text-sm">{totalAvailable}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Còn lại</div>
                {status === 'unchecked' ? (
                  <div className="text-muted-foreground text-sm">—</div>
                ) : status === 'insufficient' ? (
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemainingChange(item, remaining - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={remaining}
                      onChange={(e) => handleRemainingChange(item, parseInt(e.target.value) || 0)}
                      className="w-10 h-6 text-center font-semibold text-sm p-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemainingChange(item, remaining + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="font-semibold text-sm text-green-600">{remaining}</div>
                )}
              </div>
            </div>
          )}

          {/* Non-booking: simple standard display */}
          {!hasBookingData && (
            <div className="text-xs text-muted-foreground">
              Tiêu chuẩn: {item.standard_quantity}
            </div>
          )}

          {/* Calculated consumed info (for insufficient) */}
          {status === 'insufficient' && (
            <div className="flex items-center justify-between text-sm bg-primary/5 rounded-lg p-2">
              <span className="text-muted-foreground">
                📊 Khách đã dùng: <span className="font-semibold text-foreground">{consumed}</span>
              </span>
              {consumed > 0 && unitPrice > 0 && (
                <span className="text-primary font-medium">
                  💰 {consumedValue.toLocaleString()}đ
                </span>
              )}
            </div>
          )}

          {/* Status-based action buttons */}
          {status === 'unchecked' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 border-green-500 text-green-600 hover:bg-green-500/10"
                onClick={() => handleMarkSufficient(item)}
              >
                <Check className="h-4 w-4 mr-2" />
                Đủ hàng
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={() => handleStartInsufficient(item)}
              >
                <Package className="h-4 w-4 mr-2" />
                Thiếu
              </Button>
            </div>
          )}

          {status === 'sufficient' && (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => handleReset(item)}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Hoàn tác
              </Button>
            </div>
          )}

          {status === 'insufficient' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => handleReset(item)}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Hủy
              </Button>
              <Button
                type="button"
                className="flex-1 h-9"
                onClick={() => handleConfirmInsufficient(item)}
              >
                <Check className="h-4 w-4 mr-1" />
                Xác nhận
              </Button>
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
        Bấm <strong>Đủ hàng</strong> nếu còn đủ, hoặc <strong>Thiếu</strong> để nhập số lượng còn lại.
      </div>

      {/* Summary */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {hasBookingData ? (
                <>
                  <span className="text-muted-foreground">Booking hiện tại:</span>
                  <span className="ml-2 font-medium">{bookingConsumables!.length} mặt hàng</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Tiêu hao:</span>
                  <span className="ml-2 font-medium">{items.length} mặt hàng</span>
                </>
              )}
            </div>
            <Badge variant="secondary">
              {totalCheckedCount}/{items.length} đã kiểm
            </Badge>
          </div>
        </CardContent>
      </Card>

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

      {/* Checkout Summary Report */}
      {allItemsChecked && summaryData.length > 0 && hasBookingData && (
        <Card className="mt-6 border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              📋 Báo cáo tiêu thụ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Mặt hàng</th>
                    <th className="text-center py-2 font-medium w-12">C.in</th>
                    <th className="text-center py-2 font-medium w-12">+BS</th>
                    <th className="text-center py-2 font-medium w-12">Tổng</th>
                    <th className="text-center py-2 font-medium w-12">Còn</th>
                    <th className="text-center py-2 font-medium w-12">Dùng</th>
                    <th className="text-right py-2 font-medium w-16">Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map(item => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2 truncate max-w-[120px]">{item.name}</td>
                      <td className="text-center py-2">{item.initialQty}</td>
                      <td className={cn("text-center py-2", item.supplemented > 0 && "text-blue-600")}>
                        {item.supplemented > 0 ? `+${item.supplemented}` : '0'}
                      </td>
                      <td className="text-center py-2">{item.total}</td>
                      <td className="text-center py-2">{item.remaining}</td>
                      <td className={cn("text-center py-2 font-medium", item.consumed > 0 && "text-primary")}>
                        {item.consumed}
                      </td>
                      <td className="text-right py-2">
                        {item.value > 0 ? `${(item.value / 1000).toFixed(0)}k` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-primary/10">
                    <td colSpan={6} className="py-2 text-right">TỔNG:</td>
                    <td className="py-2 text-right text-primary">
                      {totalValue > 0 ? `${(totalValue / 1000).toFixed(0)}k` : '0đ'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
