import { useState, useMemo, useEffect, useCallback } from 'react'
import { Droplets, Check, Minus, Plus, Package, Loader2, Undo2, FileText, Filter, AlertTriangle, TrendingUp, Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { RoomItemWithDetails, ConsumedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'
import { useBookingConsumables, useInitializeBookingConsumables, useUpdateConsumableRemaining, BookingConsumableWithItem } from '@/hooks/useBookingConsumables'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

type FilterType = 'all' | 'unchecked' | 'lacking' | 'excess' | 'ok'

// Simplified state: just track what user "sees" (actual count)
interface ItemState {
  seen: number | null  // null = chưa kiểm, number = đã kiểm đếm
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
  const updateRemaining = useUpdateConsumableRemaining()
  
  // Track "seen" count for each item
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Map booking consumables by item_id for easy lookup
  const consumablesMap = useMemo(() => {
    const map = new Map<string, BookingConsumableWithItem>()
    bookingConsumables?.forEach(bc => {
      map.set(bc.item_id, bc)
    })
    return map
  }, [bookingConsumables])

  // Get "Cần có" (required/baseline) for an item
  const getRequired = useCallback((item: ExtendedRoomItem): number => {
    const bc = consumablesMap.get(item.item_id)
    if (bc) return bc.total_available // initial + supplemented
    // Fallback: use standard_quantity or current_quantity
    return item.standard_quantity ?? item.current_quantity ?? 0
  }, [consumablesMap])

  // Get "Thấy" (what user counted) - null means not checked yet
  const getSeen = useCallback((item: ExtendedRoomItem): number | null => {
    const state = itemStates[item.item_id]
    if (state?.seen !== undefined && state.seen !== null) {
      return state.seen
    }
    
    // Check if already has saved remaining from DB
    const bc = consumablesMap.get(item.item_id)
    if (bc?.remaining_quantity !== null && bc?.remaining_quantity !== undefined) {
      return bc.remaining_quantity
    }
    
    return null // chưa kiểm
  }, [itemStates, consumablesMap])

  // Calculate status for an item
  const getItemStatus = useCallback((item: ExtendedRoomItem) => {
    const required = getRequired(item)
    const seen = getSeen(item)
    
    if (seen === null) {
      return { status: 'unchecked' as const, diff: 0, required, seen: null }
    }
    
    const diff = seen - required
    let status: 'lacking' | 'excess' | 'ok'
    if (diff < 0) status = 'lacking'
    else if (diff > 0) status = 'excess'
    else status = 'ok'
    
    return { status, diff, required, seen }
  }, [getRequired, getSeen])

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

  // Initialize item states from booking consumables (if has saved remaining)
  useEffect(() => {
    if (bookingConsumables && bookingConsumables.length > 0) {
      const states: Record<string, ItemState> = {}
      bookingConsumables.forEach(bc => {
        if (bc.remaining_quantity !== null) {
          states[bc.item_id] = { seen: bc.remaining_quantity }
        }
      })
      if (Object.keys(states).length > 0) {
        setItemStates(prev => ({ ...prev, ...states }))
      }
    }
  }, [bookingConsumables])

  // Persist seen value to booking_consumables
  const persistSeen = useCallback(async (item: ExtendedRoomItem, seen: number) => {
    const bc = consumablesMap.get(item.item_id)
    if (!bc) return // Only persist if booking data exists
    
    try {
      await updateRemaining.mutateAsync({
        bookingConsumableId: bc.id,
        remainingQuantity: seen,
      })
      
      // Update consumed items for room check submission
      const required = getRequired(item)
      const consumed = Math.max(0, required - seen)
      if (consumed > 0) {
        onMarkConsumed(item, consumed, true)
      } else {
        onRemoveConsumed(item.item_id)
      }
      
      toast.success(`Đã lưu: ${item.item_name}`)
    } catch (error) {
      toast.error('Không thể lưu thay đổi')
    }
  }, [consumablesMap, updateRemaining, getRequired, onMarkConsumed, onRemoveConsumed])

  // Handle quick "Đủ X" button - set seen = required
  const handleQuickOk = async (item: ExtendedRoomItem) => {
    const required = getRequired(item)
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: { seen: required },
    }))
    onRemoveConsumed(item.item_id)
    await persistSeen(item, required)
  }

  // Handle seen change via +/- buttons
  const handleSeenChange = (item: ExtendedRoomItem, newSeen: number) => {
    const clamped = Math.max(0, newSeen)
    setItemStates(prev => ({
      ...prev,
      [item.item_id]: { seen: clamped },
    }))
  }

  // Handle confirm after adjusting seen
  const handleConfirmSeen = async (item: ExtendedRoomItem) => {
    const seen = getSeen(item)
    if (seen === null) return
    await persistSeen(item, seen)
  }

  // Handle reset - clear seen value
  const handleReset = (item: ExtendedRoomItem) => {
    setItemStates(prev => {
      const newStates = { ...prev }
      delete newStates[item.item_id]
      return newStates
    })
    onRemoveConsumed(item.item_id)
    
    // Reset in DB to null (actually set to total_available)
    const bc = consumablesMap.get(item.item_id)
    if (bc) {
      updateRemaining.mutate({
        bookingConsumableId: bc.id,
        remainingQuantity: bc.total_available,
      })
    }
  }

  // Handle mark all in category as OK
  const handleMarkAllOk = async (categoryItems: ExtendedRoomItem[]) => {
    const updates: Record<string, ItemState> = {}
    
    for (const item of categoryItems) {
      const required = getRequired(item)
      updates[item.item_id] = { seen: required }
      onRemoveConsumed(item.item_id)
      
      // Persist to DB
      const bc = consumablesMap.get(item.item_id)
      if (bc) {
        updateRemaining.mutate({
          bookingConsumableId: bc.id,
          remainingQuantity: required,
        })
      }
    }
    
    setItemStates(prev => ({ ...prev, ...updates }))
    toast.success(`Đã đánh dấu ${categoryItems.length} mục là Đủ`)
  }

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items
    
    return items.filter(item => {
      const { status } = getItemStatus(item)
      if (activeFilter === 'unchecked') return status === 'unchecked'
      if (activeFilter === 'lacking') return status === 'lacking'
      if (activeFilter === 'excess') return status === 'excess'
      if (activeFilter === 'ok') return status === 'ok'
      return true
    })
  }, [items, activeFilter, getItemStatus])

  // Group filtered items by category
  const groupedItems = useMemo(() => groupItemsByCategory(filteredItems), [filteredItems])

  // Get counts for filter badges
  const filterCounts = useMemo(() => {
    let unchecked = 0, lacking = 0, excess = 0, ok = 0
    
    items.forEach(item => {
      const { status } = getItemStatus(item)
      if (status === 'unchecked') unchecked++
      else if (status === 'lacking') lacking++
      else if (status === 'excess') excess++
      else if (status === 'ok') ok++
    })
    
    return { unchecked, lacking, excess, ok }
  }, [items, getItemStatus])

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => getItemStatus(item).status !== 'unchecked').length
  }

  // Loading state
  if (bookingId && (isLoading || initializeConsumables.isPending)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">
            {initializeConsumables.isPending ? 'Đang khởi tạo dữ liệu...' : 'Đang tải...'}
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
          <p className="text-muted-foreground">Không có đồ tiêu hao</p>
        </CardContent>
      </Card>
    )
  }

  const hasBookingData = bookingId && bookingConsumables && bookingConsumables.length > 0
  const totalCheckedCount = items.filter(item => getItemStatus(item).status !== 'unchecked').length
  const allItemsChecked = totalCheckedCount === items.length

  // Get summary data for report
  const getSummaryData = () => {
    return items.map(item => {
      const bc = consumablesMap.get(item.item_id)
      const { status, required, seen } = getItemStatus(item)
      const initialQty = bc?.initial_quantity ?? item.standard_quantity ?? 0
      const supplementedQty = bc?.supplemented_quantity ?? 0
      const remaining = seen ?? required
      const consumed = Math.max(0, required - remaining)
      const unitPrice = bc?.unit_price ?? 0
      const value = consumed * unitPrice

      return {
        id: item.item_id,
        name: item.item_name,
        initialQty,
        supplemented: supplementedQty,
        total: required,
        remaining,
        consumed,
        unitPrice,
        value,
        status,
      }
    }).filter(item => item.status !== 'unchecked')
  }

  const summaryData = getSummaryData()
  const totalValue = summaryData.reduce((sum, item) => sum + item.value, 0)

  // Render item card with new simplified UI
  const renderItemCard = (item: ExtendedRoomItem) => {
    const { status, diff, required, seen } = getItemStatus(item)
    const bc = consumablesMap.get(item.item_id)
    const unitPrice = bc?.unit_price ?? 0
    const consumed = seen !== null ? Math.max(0, required - seen) : 0
    const consumedValue = consumed * unitPrice
    
    // Determine if user is currently editing (has local state but not persisted)
    const localState = itemStates[item.item_id]
    const dbRemaining = bc?.remaining_quantity
    const isEditing = localState?.seen !== null && 
                      localState?.seen !== undefined && 
                      (dbRemaining === null || dbRemaining === undefined || localState.seen !== dbRemaining)

    return (
      <Card 
        key={item.item_id} 
        className={cn(
          "transition-all",
          status === 'unchecked' && "border-border",
          status === 'lacking' && "border-destructive/70 bg-destructive/5",
          status === 'excess' && "border-warning/70 bg-warning/5",
          status === 'ok' && "border-green-500/70 bg-green-500/5"
        )}
      >
        <CardContent className="p-3 space-y-3">
          {/* Row 1: Item info + status badge */}
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
              <div className="text-xs text-muted-foreground">
                Cần có: <span className="font-semibold text-foreground">{required}</span>
              </div>
            </div>
            
            {/* Status badges */}
            {status === 'lacking' && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Thiếu {Math.abs(diff)}
              </Badge>
            )}
            {status === 'excess' && (
              <Badge className="bg-warning/20 text-warning border-warning text-xs">
                <TrendingUp className="mr-1 h-3 w-3" />
                Thừa {diff}
              </Badge>
            )}
            {status === 'ok' && (
              <Badge className="bg-green-500/20 text-green-600 border-green-500 text-xs">
                <Check className="mr-1 h-3 w-3" />
                Đủ
              </Badge>
            )}
          </div>

          {/* Row 2: "Thấy" input section */}
          {status === 'unchecked' ? (
            <div className="space-y-2">
              {/* Quick OK button */}
              <Button
                type="button"
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={() => handleQuickOk(item)}
                disabled={updateRemaining.isPending}
              >
                <Check className="h-5 w-5 mr-2" />
                ✓ Đủ {required}
              </Button>
              
              {/* Or adjust manually */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center gap-2 bg-muted/50 rounded-lg p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleSeenChange(item, (getSeen(item) ?? required) - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] text-muted-foreground uppercase">Thấy</span>
                    <Input
                      type="number"
                      min={0}
                      value={getSeen(item) ?? required}
                      onChange={(e) => handleSeenChange(item, parseInt(e.target.value) || 0)}
                      className="w-14 h-8 text-center font-bold text-lg p-0 border-none bg-transparent"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleSeenChange(item, (getSeen(item) ?? required) + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Confirm if user changed from default */}
                {localState?.seen !== null && localState?.seen !== undefined && localState.seen !== required && (
                  <Button
                    type="button"
                    className="h-10"
                    onClick={() => handleConfirmSeen(item)}
                    disabled={updateRemaining.isPending}
                  >
                    {updateRemaining.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Already checked - show result */
            <div className="space-y-2">
              {/* Show seen value with edit capability */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center gap-2 bg-muted/30 rounded-lg p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSeenChange(item, (seen ?? required) - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] text-muted-foreground uppercase">Thấy</span>
                    <span className={cn(
                      "font-bold text-lg",
                      status === 'lacking' && "text-destructive",
                      status === 'excess' && "text-warning",
                      status === 'ok' && "text-green-600"
                    )}>
                      {seen}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSeenChange(item, (seen ?? required) + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Save changes button if editing */}
                {isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleConfirmSeen(item)}
                    disabled={updateRemaining.isPending}
                  >
                    {updateRemaining.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Lưu
                      </>
                    )}
                  </Button>
                )}
                
                {/* Reset button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleReset(item)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Consumed info */}
              {consumed > 0 && (
                <div className="flex items-center justify-between text-sm bg-primary/5 rounded-lg p-2">
                  <span className="text-muted-foreground">
                    Đã dùng: <span className="font-semibold text-foreground">{consumed}</span>
                  </span>
                  {unitPrice > 0 && (
                    <span className="text-primary font-medium">
                      {consumedValue.toLocaleString()}đ
                    </span>
                  )}
                </div>
              )}
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
        <Eye className="inline-block h-4 w-4 mr-2" />
        <strong>Kiểm đếm:</strong> Bấm <span className="text-green-600 font-medium">Đủ X</span> nếu đủ, 
        hoặc dùng <span className="font-medium">+/-</span> để điều chỉnh số thấy.
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          className="h-8"
          onClick={() => setActiveFilter('all')}
        >
          <Filter className="h-3 w-3 mr-1" />
          Tất cả ({items.length})
        </Button>
        {filterCounts.lacking > 0 && (
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'lacking' ? 'destructive' : 'outline'}
            className={cn("h-8", activeFilter !== 'lacking' && "border-destructive text-destructive hover:bg-destructive/10")}
            onClick={() => setActiveFilter('lacking')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Thiếu ({filterCounts.lacking})
          </Button>
        )}
        {filterCounts.excess > 0 && (
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'excess' ? 'secondary' : 'outline'}
            className={cn("h-8", activeFilter !== 'excess' && "border-warning text-warning hover:bg-warning/10")}
            onClick={() => setActiveFilter('excess')}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Thừa ({filterCounts.excess})
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={activeFilter === 'unchecked' ? 'secondary' : 'outline'}
          className="h-8"
          onClick={() => setActiveFilter('unchecked')}
        >
          Chưa kiểm ({filterCounts.unchecked})
        </Button>
        {filterCounts.ok > 0 && (
          <Button
            type="button"
            size="sm"
            variant={activeFilter === 'ok' ? 'default' : 'outline'}
            className={cn("h-8", activeFilter !== 'ok' && "border-green-500 text-green-600 hover:bg-green-500/10")}
            onClick={() => setActiveFilter('ok')}
          >
            <Check className="h-3 w-3 mr-1" />
            Đủ ({filterCounts.ok})
          </Button>
        )}
      </div>

      {/* Progress Summary */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Tiến độ:</span>
              <span className="ml-2 font-medium">{totalCheckedCount}/{items.length} đã kiểm</span>
            </div>
            {filterCounts.lacking > 0 && (
              <Badge variant="destructive" className="text-xs">
                {filterCounts.lacking} thiếu
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No items match filter */}
      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Không có mục nào phù hợp</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              Xem tất cả
            </Button>
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
              onClick={() => handleMarkAllOk(categoryItems)}
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
              Báo cáo tiêu thụ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Mặt hàng</th>
                    <th className="text-center py-2 font-medium w-12">Cần</th>
                    <th className="text-center py-2 font-medium w-12">Thấy</th>
                    <th className="text-center py-2 font-medium w-12">Dùng</th>
                    <th className="text-right py-2 font-medium w-16">Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map(item => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2 truncate max-w-[120px]">{item.name}</td>
                      <td className="text-center py-2">{item.total}</td>
                      <td className={cn(
                        "text-center py-2",
                        item.remaining < item.total && "text-destructive font-medium",
                        item.remaining > item.total && "text-warning font-medium"
                      )}>
                        {item.remaining}
                      </td>
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
                    <td colSpan={4} className="py-2 text-right">TỔNG:</td>
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
