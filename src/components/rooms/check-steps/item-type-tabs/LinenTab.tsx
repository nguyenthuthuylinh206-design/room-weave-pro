import { useState, useEffect, useMemo } from 'react'
import { Shirt, Check, RefreshCw, AlertTriangle, Waves, Plus, Wrench, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
      onResetStatus(item.item_id)
      onLinenStatusChange(item, 'missing', missingQty)
    } else if (currentStatus === 'missing') {
      // No longer missing, reset to ok
      setStatuses(prev => ({ ...prev, [item.item_id]: 'ok' }))
      onResetStatus(item.item_id)
    }
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
    const needsQuantity = status === 'laundry' || status === 'add' || status === 'change' || status === 'lost' || status === 'damaged'

    return (
      <Card 
        key={item.item_id} 
        className={
          status === 'lost' ? 'border-destructive bg-destructive/5' :
          status === 'damaged' ? 'border-orange-500 bg-orange-500/5' :
          status === 'missing' ? 'border-yellow-500 bg-yellow-500/5' :
          status === 'change' ? 'border-primary bg-primary/5' :
          status === 'laundry' ? 'border-blue-500 bg-blue-500/5' :
          status === 'add' ? 'border-green-500 bg-green-500/5' : ''
        }
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Item Info */}
            <div className="flex items-start gap-3">
              {item.item_thumbnail ? (
                <img
                  src={item.item_thumbnail}
                  alt={item.item_name}
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shirt className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.item_name}</h4>
                <p className="text-xs text-muted-foreground">{item.item_code}</p>
                <p className="text-xs text-muted-foreground">
                  Số lượng chuẩn: {item.standard_quantity}
                </p>
              </div>
              {status !== 'ok' && (
                <Badge variant={
                  status === 'lost' ? 'destructive' : 
                  status === 'damaged' ? 'outline' :
                  status === 'missing' ? 'outline' :
                  status === 'laundry' ? 'outline' : 
                  status === 'add' ? 'default' : 'secondary'
                } className={
                  status === 'add' ? 'bg-green-500 text-white flex-shrink-0' : 
                  status === 'damaged' ? 'border-orange-500 text-orange-600 flex-shrink-0' :
                  status === 'missing' ? 'border-yellow-500 text-yellow-600 bg-yellow-50 flex-shrink-0' : 'flex-shrink-0'
                }>
                  {status === 'laundry' && 'Lấy đi giặt'}
                  {status === 'add' && 'Thay mới'}
                  {status === 'change' && 'Lấy giặt + Thay mới'}
                  {status === 'lost' && 'Mất'}
                  {status === 'damaged' && 'Hỏng'}
                  {status === 'missing' && `Thiếu ${missingQty}`}
                </Badge>
              )}
            </div>

            {/* Actual Quantity Input */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Label className="text-xs font-medium whitespace-nowrap">
                Số lượng thực tế:
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleActualQuantityChange(item, actualQty - 1)}
                  disabled={actualQty <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number"
                  min={0}
                  max={item.standard_quantity}
                  value={actualQty}
                  onChange={(e) => handleActualQuantityChange(item, parseInt(e.target.value) || 0)}
                  className={`w-14 h-8 text-center text-sm ${missingQty > 0 ? 'border-yellow-500 bg-yellow-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => handleActualQuantityChange(item, actualQty + 1)}
                  disabled={actualQty >= item.standard_quantity}
                  className="w-8 h-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                / {item.standard_quantity}
              </span>
              {status === 'missing' && missingQty > 0 && (
                <Badge variant="outline" className="ml-auto border-yellow-500 text-yellow-600 bg-yellow-50 text-xs">
                  Thiếu {missingQty}
                </Badge>
              )}
            </div>

            {/* Status Radio Group */}
            <RadioGroup
              value={status}
              onValueChange={(value) => handleStatusChange(item, value as LinenStatus)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="ok" id={`${item.item_id}-ok`} />
                <Label 
                  htmlFor={`${item.item_id}-ok`} 
                  className="flex items-center gap-1.5 cursor-pointer text-sm"
                >
                  <Check className="h-4 w-4 text-green-600" />
                  Tốt
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="laundry" id={`${item.item_id}-laundry`} />
                <Label 
                  htmlFor={`${item.item_id}-laundry`}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-blue-600"
                >
                  <Waves className="h-4 w-4" />
                  Lấy đi giặt
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="add" id={`${item.item_id}-add`} />
                <Label 
                  htmlFor={`${item.item_id}-add`}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-green-600"
                >
                  <Plus className="h-4 w-4" />
                  Thay mới
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="change" id={`${item.item_id}-change`} />
                <Label 
                  htmlFor={`${item.item_id}-change`}
                  className="flex items-center gap-1.5 cursor-pointer text-sm"
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Giặt + Thay
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="lost" id={`${item.item_id}-lost`} />
                <Label 
                  htmlFor={`${item.item_id}-lost`}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-destructive"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Mất
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="damaged" id={`${item.item_id}-damaged`} />
                <Label 
                  htmlFor={`${item.item_id}-damaged`}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-orange-600"
                >
                  <Wrench className="h-4 w-4" />
                  Hỏng
                </Label>
              </div>

              <div className={`flex items-center space-x-2 p-2.5 rounded-lg col-span-2 border border-dashed ${missingQty > 0 ? 'border-yellow-400 bg-yellow-50/50 hover:bg-yellow-100/50' : 'border-muted-foreground/30 bg-muted/20 opacity-50'}`}>
                <RadioGroupItem value="missing" id={`${item.item_id}-missing`} disabled={missingQty <= 0} />
                <Label 
                  htmlFor={`${item.item_id}-missing`}
                  className={`flex items-center gap-1.5 text-sm ${missingQty > 0 ? 'cursor-pointer text-yellow-600' : 'cursor-not-allowed text-muted-foreground'}`}
                >
                  <Minus className="h-4 w-4" />
                  Thiếu đồ {missingQty > 0 && <span className="font-medium">(thiếu {missingQty})</span>}
                </Label>
              </div>
            </RadioGroup>

            {/* Quantity Input - only show when needed */}
            {needsQuantity && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Label className="text-xs whitespace-nowrap">
                  {status === 'laundry' && 'Số lượng lấy giặt:'}
                  {status === 'add' && 'Số lượng thay mới:'}
                  {status === 'change' && 'Số lượng:'}
                  {status === 'lost' && 'Số lượng mất:'}
                  {status === 'damaged' && 'Số lượng hỏng:'}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={item.standard_quantity}
                  value={qty}
                  onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
                  className="w-20 h-9"
                />
                <span className="text-xs text-muted-foreground">
                  / {item.standard_quantity}
                </span>
              </div>
            )}

            {/* Missing status explanation */}
            {status === 'missing' && (
              <p className="text-xs text-yellow-600 italic bg-yellow-50 p-2 rounded">
                → Phòng thiếu {missingQty} {item.item_name.toLowerCase()}, cần bổ sung
              </p>
            )}

            {/* Explanation text */}
            {status === 'laundry' && (
              <p className="text-xs text-muted-foreground italic">
                → Thu gom đồ bẩn để mang đi giặt
              </p>
            )}
            {status === 'add' && (
              <p className="text-xs text-muted-foreground italic">
                → Đặt đồ sạch mới vào phòng
              </p>
            )}
            {status === 'change' && (
              <p className="text-xs text-muted-foreground italic">
                → Lấy đồ bẩn đi giặt và thay đồ sạch vào ngay
              </p>
            )}
            {status === 'damaged' && (
              <p className="text-xs text-muted-foreground italic">
                → Đồ bị hỏng, cần báo quản lý
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Shirt className="inline-block h-4 w-4 mr-2" />
        Kiểm tra từng món đồ vải và chọn trạng thái phù hợp
      </div>

      {/* Grouped Items by Category */}
      {Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => (
        <CategoryGroup
          key={categoryName}
          categoryName={categoryName}
          itemCount={categoryItems.length}
          checkedCount={getCategoryCheckedCount(categoryItems)}
          defaultOpen={true}
        >
          {categoryItems.map(renderItemCard)}
        </CategoryGroup>
      ))}
    </div>
  )
}
