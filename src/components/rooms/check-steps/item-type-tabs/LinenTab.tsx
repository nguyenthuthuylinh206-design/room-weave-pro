import { useState, useEffect, useMemo } from 'react'
import { Shirt, Check, RefreshCw, AlertTriangle, Waves, Plus, Wrench, Minus, MoreHorizontal, CheckCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RoomItemWithDetails, LaundryItem, LostItem, ReplacedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'

type LinenStatus = 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'damaged' | 'missing'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface LinenTabProps {
  items: ExtendedRoomItem[]
  laundryItems: LaundryItem[]
  lostItems: LostItem[]
  replacedItems: ReplacedItem[]
  onLinenStatusChange: (item: RoomItemWithDetails, status: LinenStatus, quantity: number) => void
  onResetStatus: (itemId: string) => void
}

export function LinenTab({
  items,
  laundryItems,
  lostItems,
  replacedItems,
  onLinenStatusChange,
  onResetStatus,
}: LinenTabProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>({})
  const [statuses, setStatuses] = useState<Record<string, LinenStatus>>({})
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Initialize actual quantities with standard quantities
  useEffect(() => {
    const initial: Record<string, number> = {}
    items.forEach(item => {
      if (actualQuantities[item.item_id] === undefined) {
        initial[item.item_id] = item.standard_quantity
      }
    })
    if (Object.keys(initial).length > 0) {
      setActualQuantities(prev => ({ ...prev, ...initial }))
    }
  }, [items])

  // Group items by category
  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  const getQuantity = (itemId: string, defaultQty: number) => {
    return quantities[itemId] ?? defaultQty
  }

  const getActualQuantity = (itemId: string, standardQty: number) => {
    return actualQuantities[itemId] ?? standardQty
  }

  // Determine current status from props (for items already processed)
  const getCurrentStatus = (itemId: string): LinenStatus => {
    if (statuses[itemId]) return statuses[itemId]
    
    const inLaundry = laundryItems.some(i => i.item_id === itemId)
    const inReplaced = replacedItems.some(i => i.item_id === itemId)
    const inLost = lostItems.some(i => i.item_id === itemId)
    
    if (inLaundry && inReplaced) return 'change'
    if (inLaundry && !inReplaced) return 'laundry'
    if (!inLaundry && inReplaced) return 'add'
    if (inLost) return 'lost'
    return 'ok'
  }

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => {
      const status = getCurrentStatus(item.item_id)
      return status !== 'ok' || statuses[item.item_id] === 'ok'
    }).length
  }

  const handleStatusChange = (item: RoomItemWithDetails, newStatus: LinenStatus) => {
    const currentStatus = getCurrentStatus(item.item_id)
    
    // Reset old status first
    if (currentStatus !== 'ok') {
      onResetStatus(item.item_id)
    }
    
    setStatuses(prev => ({ ...prev, [item.item_id]: newStatus }))
    
    // Expand item if not OK to show quantity input
    if (newStatus !== 'ok') {
      setExpandedItems(prev => new Set(prev).add(item.item_id))
    } else {
      setExpandedItems(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
    }
    
    // Apply new status
    if (newStatus !== 'ok') {
      let qty = getQuantity(item.item_id, item.standard_quantity)
      
      // For 'missing' status, calculate missing quantity
      if (newStatus === 'missing') {
        const actual = getActualQuantity(item.item_id, item.standard_quantity)
        qty = item.standard_quantity - actual
      }
      
      onLinenStatusChange(item, newStatus, qty)
    }
  }

  const handleQuantityChange = (item: RoomItemWithDetails, qty: number) => {
    setQuantities(prev => ({ ...prev, [item.item_id]: qty }))
    
    const currentStatus = getCurrentStatus(item.item_id)
    if (currentStatus !== 'ok') {
      // Re-apply status with new quantity
      onResetStatus(item.item_id)
      onLinenStatusChange(item, currentStatus, qty)
    }
  }

  const handleActualQuantityChange = (item: RoomItemWithDetails, actualQty: number) => {
    // Clamp between 0 and standard quantity
    const clampedQty = Math.max(0, Math.min(actualQty, item.standard_quantity))
    setActualQuantities(prev => ({ ...prev, [item.item_id]: clampedQty }))
    
    const currentStatus = getCurrentStatus(item.item_id)
    const missingQty = item.standard_quantity - clampedQty
    
    // Auto-select 'missing' when quantity drops below standard
    if (missingQty > 0) {
      setStatuses(prev => ({ ...prev, [item.item_id]: 'missing' }))
      setExpandedItems(prev => new Set(prev).add(item.item_id))
      onResetStatus(item.item_id)
      onLinenStatusChange(item, 'missing', missingQty)
    } else if (currentStatus === 'missing') {
      // No longer missing, reset to ok
      setStatuses(prev => ({ ...prev, [item.item_id]: 'ok' }))
      setExpandedItems(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
      onResetStatus(item.item_id)
    }
  }

  // Mark all items in category as OK
  const handleMarkAllOk = (categoryItems: ExtendedRoomItem[]) => {
    categoryItems.forEach(item => {
      const currentStatus = getCurrentStatus(item.item_id)
      if (currentStatus !== 'ok') {
        onResetStatus(item.item_id)
      }
      setStatuses(prev => ({ ...prev, [item.item_id]: 'ok' }))
      setActualQuantities(prev => ({ ...prev, [item.item_id]: item.standard_quantity }))
    })
    // Collapse all items
    setExpandedItems(prev => {
      const next = new Set(prev)
      categoryItems.forEach(item => next.delete(item.item_id))
      return next
    })
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không có đồ vải nào trong phòng này</p>
        </CardContent>
      </Card>
    )
  }

  const renderItemCard = (item: ExtendedRoomItem) => {
    const status = getCurrentStatus(item.item_id)
    const qty = getQuantity(item.item_id, item.standard_quantity)
    const actualQty = getActualQuantity(item.item_id, item.standard_quantity)
    const missingQty = item.standard_quantity - actualQty
    const isExpanded = expandedItems.has(item.item_id) || status !== 'ok'
    const needsQuantity = status === 'laundry' || status === 'add' || status === 'change' || status === 'lost' || status === 'damaged'

    return (
      <Card 
        key={item.item_id} 
        className={
          status === 'ok' && statuses[item.item_id] === 'ok' ? 'border-success bg-success/5' :
          status === 'lost' ? 'border-destructive bg-destructive/5' :
          status === 'damaged' ? 'border-orange-500 bg-orange-500/5' :
          status === 'missing' ? 'border-yellow-500 bg-yellow-500/5' :
          status === 'change' ? 'border-primary bg-primary/5' :
          status === 'laundry' ? 'border-blue-500 bg-blue-500/5' :
          status === 'add' ? 'border-green-500 bg-green-500/5' : ''
        }
      >
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            {/* Compact Item Header */}
            <div className="flex items-center gap-3">
              {item.item_thumbnail ? (
                <img
                  src={item.item_thumbnail}
                  alt={item.item_name}
                  className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shirt className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.item_name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>SL: {actualQty}/{item.standard_quantity}</span>
                  {missingQty > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-yellow-500 text-yellow-600 bg-yellow-50">
                      Thiếu {missingQty}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Status Badge */}
              {status !== 'ok' ? (
                <Badge variant={
                  status === 'lost' ? 'destructive' : 
                  status === 'damaged' ? 'outline' :
                  status === 'missing' ? 'outline' :
                  status === 'laundry' ? 'outline' : 
                  status === 'add' ? 'default' : 'secondary'
                } className={
                  status === 'add' ? 'bg-green-500 text-white flex-shrink-0 text-xs' : 
                  status === 'damaged' ? 'border-orange-500 text-orange-600 flex-shrink-0 text-xs' :
                  status === 'missing' ? 'border-yellow-500 text-yellow-600 bg-yellow-50 flex-shrink-0 text-xs' : 
                  status === 'laundry' ? 'border-blue-500 text-blue-600 flex-shrink-0 text-xs' :
                  status === 'change' ? 'border-primary text-primary flex-shrink-0 text-xs' : 'flex-shrink-0 text-xs'
                }>
                  {status === 'laundry' && 'Giặt'}
                  {status === 'add' && 'Thay'}
                  {status === 'change' && 'Giặt+Thay'}
                  {status === 'lost' && 'Mất'}
                  {status === 'damaged' && 'Hỏng'}
                  {status === 'missing' && 'Thiếu'}
                </Badge>
              ) : statuses[item.item_id] === 'ok' && (
                <Badge variant="outline" className="border-success text-success flex-shrink-0 text-xs bg-success/10">
                  <Check className="h-3 w-3 mr-1" />
                  OK
                </Badge>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1.5">
              {/* OK Button - Large and prominent */}
              <Button
                type="button"
                variant={status === 'ok' && statuses[item.item_id] === 'ok' ? 'default' : 'outline'}
                size="sm"
                className={`h-9 flex-1 ${status === 'ok' && statuses[item.item_id] === 'ok' ? 'bg-success hover:bg-success/90' : 'border-success text-success hover:bg-success/10'}`}
                onClick={() => handleStatusChange(item, 'ok')}
              >
                <Check className="h-4 w-4 mr-1" />
                Tốt
              </Button>

              {/* Quick Actions */}
              <Button
                type="button"
                variant={status === 'laundry' ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-3 ${status === 'laundry' ? 'bg-blue-500 hover:bg-blue-600' : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}
                onClick={() => handleStatusChange(item, 'laundry')}
              >
                <Waves className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant={status === 'add' ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-3 ${status === 'add' ? 'bg-green-500 hover:bg-green-600' : 'hover:bg-green-50 hover:text-green-600 hover:border-green-300'}`}
                onClick={() => handleStatusChange(item, 'add')}
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant={status === 'change' ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-3 ${status === 'change' ? 'bg-primary hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary hover:border-primary/30'}`}
                onClick={() => handleStatusChange(item, 'change')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={status === 'lost' || status === 'damaged' ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-9 px-3"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange(item, 'lost')}
                    className="text-destructive focus:text-destructive"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Mất
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange(item, 'damaged')}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Hỏng
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Expandable Details - Only show when needed */}
            {isExpanded && status !== 'ok' && (
              <div className="mt-1 p-2 bg-muted/30 rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-200">
                {/* Actual Quantity Input */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium whitespace-nowrap">
                    SL thực tế:
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleActualQuantityChange(item, actualQty - 1)}
                      disabled={actualQty <= 0}
                      className="w-7 h-7 flex items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <Input
                      type="number"
                      min={0}
                      max={item.standard_quantity}
                      value={actualQty}
                      onChange={(e) => handleActualQuantityChange(item, parseInt(e.target.value) || 0)}
                      className={`w-12 h-7 text-center text-sm ${missingQty > 0 ? 'border-yellow-500 bg-yellow-50' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleActualQuantityChange(item, actualQty + 1)}
                      disabled={actualQty >= item.standard_quantity}
                      className="w-7 h-7 flex items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">/ {item.standard_quantity}</span>
                </div>

                {/* Quantity Input for action */}
                {needsQuantity && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">
                      {status === 'laundry' && 'SL giặt:'}
                      {status === 'add' && 'SL thay:'}
                      {status === 'change' && 'SL:'}
                      {status === 'lost' && 'SL mất:'}
                      {status === 'damaged' && 'SL hỏng:'}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={item.standard_quantity}
                      value={qty}
                      onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
                      className="w-16 h-7 text-sm"
                    />
                  </div>
                )}

                {/* Status explanation */}
                <p className="text-xs text-muted-foreground italic">
                  {status === 'laundry' && '→ Thu gom đồ bẩn để mang đi giặt'}
                  {status === 'add' && '→ Đặt đồ sạch mới vào phòng'}
                  {status === 'change' && '→ Lấy đồ bẩn đi giặt và thay đồ sạch vào'}
                  {status === 'lost' && '→ Đồ bị mất, cần báo quản lý'}
                  {status === 'damaged' && '→ Đồ bị hỏng, cần báo quản lý'}
                  {status === 'missing' && `→ Phòng thiếu ${missingQty} ${item.item_name.toLowerCase()}`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg flex items-center gap-2">
        <Shirt className="h-4 w-4 flex-shrink-0" />
        <span>Nhấn <strong>Tốt</strong> nếu đồ vải đầy đủ, hoặc chọn hành động phù hợp</span>
      </div>

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
              className="h-7 text-xs border-success text-success hover:bg-success/10"
              onClick={() => handleMarkAllOk(categoryItems)}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tất cả OK
            </Button>
          }
        >
          {categoryItems.map(renderItemCard)}
        </CategoryGroup>
      ))}
    </div>
  )
}
