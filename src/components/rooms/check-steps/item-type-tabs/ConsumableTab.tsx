import { useState, useMemo } from 'react'
import { Droplets, Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { RoomItemWithDetails, ConsumedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface ConsumableTabProps {
  items: ExtendedRoomItem[]
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

  // Group items by category
  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => getConsumedInfo(item.item_id)).length
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

  const renderItemCard = (item: ExtendedRoomItem) => {
    const consumed = getConsumedInfo(item.item_id)
    const qty = quantities[item.item_id] ?? 1
    const refill = needRefill[item.item_id] ?? true

    return (
      <Card key={item.item_id} className={consumed ? 'border-primary bg-primary/5' : ''}>
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
                  <Droplets className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.item_name}</h4>
                <p className="text-xs text-muted-foreground">{item.item_code}</p>
                <p className="text-xs text-muted-foreground">Số lượng chuẩn: {item.standard_quantity}</p>
              </div>
              {consumed ? (
                <Badge variant="secondary" className="flex-shrink-0">
                  <Package className="mr-1 h-3 w-3" />
                  Đã dùng {consumed.quantity}
                </Badge>
              ) : (
                <Badge variant="outline" className="flex-shrink-0">
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
                  className="h-9"
                  onClick={() => onRemoveConsumed(item.item_id)}
                >
                  Hủy
                </Button>
              </div>
            ) : (
              <>
                {/* Quantity & Refill */}
                <div className="flex flex-wrap items-center gap-4">
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
                      className="w-16 h-9"
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

                {/* Action Button - Improved touch target */}
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full h-11 active:scale-[0.98] transition-transform"
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
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Droplets className="inline-block h-4 w-4 mr-2" />
        Ghi nhận đồ tiêu hao khách đã sử dụng (bàn chải, kem đánh răng, nước uống...)
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
