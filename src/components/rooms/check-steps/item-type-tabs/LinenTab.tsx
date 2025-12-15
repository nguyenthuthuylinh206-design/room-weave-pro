import { useState } from 'react'
import { Shirt, Check, RefreshCw, AlertTriangle, Waves, Plus, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { RoomItemWithDetails, LaundryItem, LostItem, ReplacedItem } from '@/types/rooms.types'

type LinenStatus = 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'damaged'

interface LinenTabProps {
  items: RoomItemWithDetails[]
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
  const [statuses, setStatuses] = useState<Record<string, LinenStatus>>({})

  const getQuantity = (itemId: string, defaultQty: number) => {
    return quantities[itemId] ?? defaultQty
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
    // Note: 'damaged' will be tracked via statuses state
    return 'ok'
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
      const qty = getQuantity(item.item_id, item.standard_quantity)
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

  // Count checked items
  const checkedCount = items.filter(item => {
    const status = getCurrentStatus(item.item_id)
    return status !== 'ok' || statuses[item.item_id] === 'ok'
  }).length

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

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Shirt className="inline-block h-4 w-4 mr-2" />
        Kiểm tra từng món đồ vải và chọn trạng thái phù hợp
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Tiến độ kiểm tra:</span>
        <Badge variant="outline">{checkedCount}/{items.length} đã kiểm tra</Badge>
      </div>

      {items.map((item) => {
        const status = getCurrentStatus(item.item_id)
        const qty = getQuantity(item.item_id, item.standard_quantity)
        const needsQuantity = status === 'laundry' || status === 'add' || status === 'change' || status === 'lost' || status === 'damaged'

        return (
          <Card 
            key={item.item_id} 
            className={
              status === 'lost' ? 'border-destructive bg-destructive/5' :
              status === 'damaged' ? 'border-orange-500 bg-orange-500/5' :
              status === 'change' ? 'border-primary bg-primary/5' :
              status === 'laundry' ? 'border-blue-500 bg-blue-500/5' :
              status === 'add' ? 'border-green-500 bg-green-500/5' : ''
            }
          >
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                {/* Item Info */}
                <div className="flex items-start gap-3">
                  {item.item_thumbnail && (
                    <img
                      src={item.item_thumbnail}
                      alt={item.item_name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
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
                      status === 'laundry' ? 'outline' : 
                      status === 'add' ? 'default' : 'secondary'
                    } className={
                      status === 'add' ? 'bg-green-500 text-white' : 
                      status === 'damaged' ? 'border-orange-500 text-orange-600' : ''
                    }>
                      {status === 'laundry' && 'Lấy đi giặt'}
                      {status === 'add' && 'Thay mới'}
                      {status === 'change' && 'Lấy giặt + Thay mới'}
                      {status === 'lost' && 'Mất'}
                      {status === 'damaged' && 'Hỏng'}
                    </Badge>
                  )}
                </div>

                {/* Status Radio Group */}
                <RadioGroup
                  value={status}
                  onValueChange={(value) => handleStatusChange(item, value as LinenStatus)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="ok" id={`${item.item_id}-ok`} />
                    <Label 
                      htmlFor={`${item.item_id}-ok`} 
                      className="flex items-center gap-1 cursor-pointer text-sm"
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      Tốt
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="laundry" id={`${item.item_id}-laundry`} />
                    <Label 
                      htmlFor={`${item.item_id}-laundry`}
                      className="flex items-center gap-1 cursor-pointer text-sm text-blue-600"
                    >
                      <Waves className="h-3.5 w-3.5" />
                      Lấy đi giặt
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="add" id={`${item.item_id}-add`} />
                    <Label 
                      htmlFor={`${item.item_id}-add`}
                      className="flex items-center gap-1 cursor-pointer text-sm text-green-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thay mới
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="change" id={`${item.item_id}-change`} />
                    <Label 
                      htmlFor={`${item.item_id}-change`}
                      className="flex items-center gap-1 cursor-pointer text-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      Giặt + Thay
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="lost" id={`${item.item_id}-lost`} />
                    <Label 
                      htmlFor={`${item.item_id}-lost`}
                      className="flex items-center gap-1 cursor-pointer text-sm text-destructive"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Mất
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="damaged" id={`${item.item_id}-damaged`} />
                    <Label 
                      htmlFor={`${item.item_id}-damaged`}
                      className="flex items-center gap-1 cursor-pointer text-sm text-orange-600"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Hỏng
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
                      className="w-20 h-8"
                    />
                    <span className="text-xs text-muted-foreground">
                      / {item.standard_quantity}
                    </span>
                  </div>
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
      })}
    </div>
  )
}
