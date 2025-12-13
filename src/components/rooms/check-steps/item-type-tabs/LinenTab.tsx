import { useState } from 'react'
import { Shirt, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { RoomItemWithDetails, LaundryItem, LostItem, ReplacedItem } from '@/types/rooms.types'

type LinenStatus = 'ok' | 'change' | 'lost'

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
    if (inLost) return 'lost'
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
        const needsQuantity = status === 'change' || status === 'lost'

        return (
          <Card 
            key={item.item_id} 
            className={
              status === 'lost' ? 'border-destructive bg-destructive/5' :
              status === 'change' ? 'border-primary bg-primary/5' : ''
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
                    <Badge variant={status === 'lost' ? 'destructive' : 'secondary'}>
                      {status === 'change' && 'Thay đổi'}
                      {status === 'lost' && 'Mất'}
                    </Badge>
                  )}
                </div>

                {/* Status Radio Group */}
                <RadioGroup
                  value={status}
                  onValueChange={(value) => handleStatusChange(item, value as LinenStatus)}
                  className="flex flex-wrap gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ok" id={`${item.item_id}-ok`} />
                    <Label 
                      htmlFor={`${item.item_id}-ok`} 
                      className="flex items-center gap-1 cursor-pointer text-sm"
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      OK
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="change" id={`${item.item_id}-change`} />
                    <Label 
                      htmlFor={`${item.item_id}-change`}
                      className="flex items-center gap-1 cursor-pointer text-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      Thay đổi
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lost" id={`${item.item_id}-lost`} />
                    <Label 
                      htmlFor={`${item.item_id}-lost`}
                      className="flex items-center gap-1 cursor-pointer text-sm text-destructive"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Mất
                    </Label>
                  </div>
                </RadioGroup>

                {/* Quantity Input - only show when needed */}
                {needsQuantity && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Label className="text-xs whitespace-nowrap">
                      {status === 'change' ? 'Số lượng thay:' : 'Số lượng mất:'}
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
                {status === 'change' && (
                  <p className="text-xs text-muted-foreground italic">
                    → Đồ bẩn sẽ được lấy đi giặt, đồ sạch sẽ được thay vào
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
