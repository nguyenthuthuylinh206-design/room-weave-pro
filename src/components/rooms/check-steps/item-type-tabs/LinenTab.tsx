import { useState } from 'react'
import { Shirt, Send, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RoomItemWithDetails, LaundryItem, LostItem, ReplacedItem } from '@/types/rooms.types'

interface LinenTabProps {
  items: RoomItemWithDetails[]
  laundryItems: LaundryItem[]
  lostItems: LostItem[]
  replacedItems: ReplacedItem[]
  onSendToLaundry: (item: RoomItemWithDetails, quantity: number) => void
  onMarkLost: (item: RoomItemWithDetails, quantity: number) => void
  onMarkReplaced: (item: RoomItemWithDetails, quantity: number) => void
  onRemoveFromLaundry: (itemId: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromReplaced: (itemId: string) => void
}

export function LinenTab({
  items,
  laundryItems,
  lostItems,
  replacedItems,
  onSendToLaundry,
  onMarkLost,
  onMarkReplaced,
  onRemoveFromLaundry,
  onRemoveFromLost,
  onRemoveFromReplaced,
}: LinenTabProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const getQuantity = (itemId: string, defaultQty: number) => {
    return quantities[itemId] ?? defaultQty
  }

  const isInLaundry = (itemId: string) => laundryItems.some(i => i.item_id === itemId)
  const isLost = (itemId: string) => lostItems.some(i => i.item_id === itemId)
  const isReplaced = (itemId: string) => replacedItems.some(i => i.item_id === itemId)

  const getStatus = (itemId: string) => {
    if (isInLaundry(itemId)) return 'laundry'
    if (isLost(itemId)) return 'lost'
    if (isReplaced(itemId)) return 'replaced'
    return 'ok'
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

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Shirt className="inline-block h-4 w-4 mr-2" />
        Đánh dấu đồ vải cần lấy giặt, thay mới hoặc báo mất
      </div>

      {items.map((item) => {
        const status = getStatus(item.item_id)
        const qty = getQuantity(item.item_id, item.standard_quantity)

        return (
          <Card key={item.item_id} className={status !== 'ok' ? 'border-primary' : ''}>
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
                    <p className="text-xs text-muted-foreground">Số lượng chuẩn: {item.standard_quantity}</p>
                  </div>
                  {status !== 'ok' && (
                    <Badge variant={status === 'lost' ? 'destructive' : 'secondary'}>
                      {status === 'laundry' && 'Lấy giặt'}
                      {status === 'lost' && 'Mất'}
                      {status === 'replaced' && 'Đã thay'}
                    </Badge>
                  )}
                </div>

                {/* Quantity Input */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Số lượng:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={item.standard_quantity}
                    value={qty}
                    onChange={(e) => setQuantities(prev => ({
                      ...prev,
                      [item.item_id]: parseInt(e.target.value) || 1
                    }))}
                    className="w-20 h-8"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {status === 'ok' ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSendToLaundry(item, qty)}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Lấy giặt
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onMarkReplaced(item, qty)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Đã thay mới
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onMarkLost(item, qty)}
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Mất
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (status === 'laundry') onRemoveFromLaundry(item.item_id)
                        if (status === 'lost') onRemoveFromLost(item.item_id)
                        if (status === 'replaced') onRemoveFromReplaced(item.item_id)
                      }}
                    >
                      Hủy đánh dấu
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
