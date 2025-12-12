import { useState } from 'react'
import { Droplets, Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { RoomItemWithDetails, ConsumedItem } from '@/types/rooms.types'

interface ConsumableTabProps {
  items: RoomItemWithDetails[]
  consumedItems: ConsumedItem[]
  onMarkConsumed: (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => void
  onRemoveConsumed: (itemId: string) => void
}

export function ConsumableTab({
  items,
  consumedItems,
  onMarkConsumed,
  onRemoveConsumed,
}: ConsumableTabProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [needRefill, setNeedRefill] = useState<Record<string, boolean>>({})

  const getConsumedInfo = (itemId: string) => {
    return consumedItems.find(i => i.item_id === itemId)
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

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Droplets className="inline-block h-4 w-4 mr-2" />
        Ghi nhận đồ tiêu hao khách đã sử dụng (bàn chải, kem đánh răng, nước uống...)
      </div>

      {items.map((item) => {
        const consumed = getConsumedInfo(item.item_id)
        const qty = quantities[item.item_id] ?? 1
        const refill = needRefill[item.item_id] ?? true

        return (
          <Card key={item.item_id} className={consumed ? 'border-primary' : ''}>
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
                  {consumed ? (
                    <Badge variant="secondary">
                      <Package className="mr-1 h-3 w-3" />
                      Đã dùng {consumed.quantity}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Check className="mr-1 h-3 w-3" />
                      Chưa dùng
                    </Badge>
                  )}
                </div>

                {consumed ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {consumed.need_refill ? (
                        <span className="text-primary">Cần bổ sung {consumed.quantity}</span>
                      ) : (
                        <span className="text-muted-foreground">Không bổ sung</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveConsumed(item.item_id)}
                    >
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Quantity & Refill */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Số lượng đã dùng:</Label>
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
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={refill}
                          onCheckedChange={(checked) => setNeedRefill(prev => ({
                            ...prev,
                            [item.item_id]: checked
                          }))}
                        />
                        <Label className="text-xs">Bổ sung ngay</Label>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onMarkConsumed(item, qty, refill)}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Khách đã dùng
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
