import { useState, useEffect, useMemo } from 'react'
import { Shirt, Check, X, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RoomItemWithDetails, LaundryItem, LostItem, ReplacedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'
import { getCheckTypeConfig, ACTION_LABELS, ACTION_COLORS, type LinenAction, type CheckType } from '@/lib/roomCheckConfig'

type LinenStatus = 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'damaged' | 'missing'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface LinenTabProps {
  items: ExtendedRoomItem[]
  checkType: CheckType
  laundryItems: LaundryItem[]
  lostItems: LostItem[]
  replacedItems: ReplacedItem[]
  onLinenStatusChange: (item: RoomItemWithDetails, status: LinenStatus, quantity: number) => void
  onResetStatus: (itemId: string) => void
}

export function LinenTab({
  items,
  checkType,
  laundryItems,
  lostItems,
  replacedItems,
  onLinenStatusChange,
  onResetStatus,
}: LinenTabProps) {
  const config = getCheckTypeConfig(checkType)
  const allowedActions = config.linenActions
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [statuses, setStatuses] = useState<Record<string, LinenStatus>>({})

  useEffect(() => {
    const initial: Record<string, number> = {}
    items.forEach(item => {
      if (quantities[item.item_id] === undefined) {
        // Fallback: standard_quantity -> current_quantity -> 1
        initial[item.item_id] = item.standard_quantity || item.current_quantity || 1
      }
    })
    if (Object.keys(initial).length > 0) {
      setQuantities(prev => ({ ...prev, ...initial }))
    }
  }, [items])

  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  const getQuantity = (itemId: string, defaultQty: number) => {
    return quantities[itemId] ?? defaultQty
  }

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

  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => {
      const status = getCurrentStatus(item.item_id)
      return status !== 'ok' || statuses[item.item_id] === 'ok'
    }).length
  }

  const checkedCount = items.filter(item => {
    const status = getCurrentStatus(item.item_id)
    return status !== 'ok' || statuses[item.item_id] === 'ok'
  }).length
  const progressPercent = items.length > 0 ? (checkedCount / items.length) * 100 : 0

  const handleStatusChange = (item: RoomItemWithDetails, newStatus: LinenStatus) => {
    const currentStatus = getCurrentStatus(item.item_id)
    
    if (currentStatus !== 'ok') {
      onResetStatus(item.item_id)
    }
    
    setStatuses(prev => ({ ...prev, [item.item_id]: newStatus }))
    
    if (newStatus !== 'ok') {
      const qty = getQuantity(item.item_id, item.standard_quantity)
      onLinenStatusChange(item, newStatus, qty)
    }
  }

  const handleQuantityChange = (item: RoomItemWithDetails, qty: number) => {
    const newQty = Math.max(0, qty)
    setQuantities(prev => ({ ...prev, [item.item_id]: newQty }))
    
    const currentStatus = getCurrentStatus(item.item_id)
    if (currentStatus !== 'ok') {
      onResetStatus(item.item_id)
      onLinenStatusChange(item, currentStatus, newQty)
    }
  }

  const handleReset = (item: RoomItemWithDetails) => {
    onResetStatus(item.item_id)
    setStatuses(prev => {
      const newStatuses = { ...prev }
      delete newStatuses[item.item_id]
      return newStatuses
    })
  }

  const handleMarkAllOk = (categoryItems: ExtendedRoomItem[]) => {
    categoryItems.forEach(item => {
      const currentStatus = getCurrentStatus(item.item_id)
      if (currentStatus !== 'ok') {
        onResetStatus(item.item_id)
      }
      setStatuses(prev => ({ ...prev, [item.item_id]: 'ok' }))
    })
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Shirt className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Không có đồ vải</p>
      </div>
    )
  }

  const getStatusLabel = (status: LinenStatus) => {
    switch (status) {
      case 'laundry': return 'Giặt'
      case 'add': return 'Thay'
      case 'change': return 'Đổi'
      case 'lost': return 'Mất'
      case 'damaged': return 'Hỏng'
      default: return ''
    }
  }

  const getStatusColor = (status: LinenStatus) => {
    switch (status) {
      case 'laundry': return 'text-blue-600'
      case 'add': return 'text-green-600'
      case 'change': return 'text-primary'
      case 'lost': return 'text-destructive'
      case 'damaged': return 'text-amber-600'
      default: return ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {checkedCount}/{items.length} đã kiểm tra
        </span>
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      {Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => {
        if (categoryItems.length === 0) return null
        
        return (
          <CategoryGroup
            key={categoryName}
            categoryName={categoryName}
            itemCount={categoryItems.length}
            checkedCount={getCategoryCheckedCount(categoryItems)}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleMarkAllOk(categoryItems)}
              >
                Tất cả OK
              </Button>
            }
          >
            <div className="divide-y divide-border">
              {categoryItems.map(item => {
                const status = getCurrentStatus(item.item_id)
                const qty = getQuantity(item.item_id, item.standard_quantity)
                const isChecked = status !== 'ok' || statuses[item.item_id] === 'ok'
                const needsQuantity = status === 'laundry' || status === 'add' || status === 'change' || status === 'lost' || status === 'damaged'
                
                return (
                  <div key={item.item_id} className="py-2.5 px-1">
                    <div className="flex items-center gap-2">
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">SL: {item.standard_quantity}</div>
                      </div>
                      
                      {/* Status badge or actions */}
                      {!isChecked ? (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                            onClick={() => handleStatusChange(item, 'ok')}
                          >
                            OK
                          </Button>
                          {allowedActions.includes('laundry') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => handleStatusChange(item, 'laundry')}
                            >
                              Giặt
                            </Button>
                          )}
                          {allowedActions.includes('add') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                              onClick={() => handleStatusChange(item, 'add')}
                            >
                              Thêm
                            </Button>
                          )}
                          {allowedActions.includes('change') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs hover:bg-primary/10"
                              onClick={() => handleStatusChange(item, 'change')}
                            >
                              Đổi
                            </Button>
                          )}
                          {allowedActions.includes('missing') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-yellow-600 hover:bg-yellow-50"
                              onClick={() => handleStatusChange(item, 'missing')}
                            >
                              Thiếu
                            </Button>
                          )}
                          {allowedActions.includes('lost') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleStatusChange(item, 'lost')}
                            >
                              Mất
                            </Button>
                          )}
                          {allowedActions.includes('damaged') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                              onClick={() => handleStatusChange(item, 'damaged')}
                            >
                              Hỏng
                            </Button>
                          )}
                        </div>
                      ) : status === 'ok' && statuses[item.item_id] === 'ok' ? (
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-green-600" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleReset(item)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${getStatusColor(status)}`}>
                            {getStatusLabel(status)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleReset(item)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Quantity input when needed */}
                    {needsQuantity && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">SL:</span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item, qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={qty}
                            onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                            className="w-12 h-7 text-center text-sm px-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item, qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CategoryGroup>
        )
      })}
    </div>
  )
}
