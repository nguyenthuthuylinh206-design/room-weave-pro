import { useState } from 'react'
import { Tv, Check, AlertTriangle, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { RoomItemWithDetails, LostItem } from '@/types/rooms.types'

interface DamagedItem {
  item_id: string
  item_name: string
  item_code?: string
  notes?: string
}

interface EquipmentTabProps {
  items: RoomItemWithDetails[]
  lostItems: LostItem[]
  damagedItems: DamagedItem[]
  onMarkLost: (item: RoomItemWithDetails, quantity: number, estimatedValue?: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, notes?: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

export function EquipmentTab({
  items,
  lostItems,
  damagedItems,
  onMarkLost,
  onMarkDamaged,
  onRemoveFromLost,
  onRemoveFromDamaged,
}: EquipmentTabProps) {
  const [estimatedValues, setEstimatedValues] = useState<Record<string, number>>({})
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({})

  const isLost = (itemId: string) => lostItems.some(i => i.item_id === itemId)
  const isDamaged = (itemId: string) => damagedItems.some(i => i.item_id === itemId)

  const getStatus = (itemId: string) => {
    if (isLost(itemId)) return 'lost'
    if (isDamaged(itemId)) return 'damaged'
    return 'ok'
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Tv className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không có thiết bị nào trong phòng này</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Tv className="inline-block h-4 w-4 mr-2" />
        Kiểm tra thiết bị điện: TV, điều khiển, ấm nước, máy sấy tóc...
      </div>

      {items.map((item) => {
        const status = getStatus(item.item_id)
        const lostInfo = lostItems.find(i => i.item_id === item.item_id)
        const damagedInfo = damagedItems.find(i => i.item_id === item.item_id)

        return (
          <Card key={item.item_id} className={status !== 'ok' ? (status === 'lost' ? 'border-destructive' : 'border-warning') : ''}>
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
                  </div>
                  {status === 'ok' && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success">
                      <Check className="mr-1 h-3 w-3" />
                      Còn
                    </Badge>
                  )}
                  {status === 'lost' && (
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Mất
                    </Badge>
                  )}
                  {status === 'damaged' && (
                    <Badge variant="secondary" className="bg-warning/10 text-warning border-warning">
                      <Wrench className="mr-1 h-3 w-3" />
                      Hỏng
                    </Badge>
                  )}
                </div>

                {status === 'ok' ? (
                  <>
                    {/* Estimated Value for Lost */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Giá trị ước tính (VNĐ):</Label>
                      <Input
                        type="number"
                        min={0}
                        value={estimatedValues[item.item_id] || ''}
                        onChange={(e) => setEstimatedValues(prev => ({
                          ...prev,
                          [item.item_id]: parseInt(e.target.value) || 0
                        }))}
                        placeholder="0"
                        className="w-32 h-8"
                      />
                    </div>

                    {/* Damage Notes */}
                    <div className="space-y-1">
                      <Label className="text-xs">Ghi chú (nếu hỏng):</Label>
                      <Textarea
                        value={damageNotes[item.item_id] || ''}
                        onChange={(e) => setDamageNotes(prev => ({
                          ...prev,
                          [item.item_id]: e.target.value
                        }))}
                        placeholder="Mô tả tình trạng hỏng..."
                        className="h-16 text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => onMarkLost(item, 1, estimatedValues[item.item_id])}
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Mất
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onMarkDamaged(item, damageNotes[item.item_id])}
                      >
                        <Wrench className="mr-1 h-3 w-3" />
                        Hỏng
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {status === 'lost' && lostInfo?.estimated_value && (
                        <span className="text-destructive">
                          Giá trị: {lostInfo.estimated_value.toLocaleString()}đ
                        </span>
                      )}
                      {status === 'damaged' && damagedInfo?.notes && (
                        <span className="text-muted-foreground">{damagedInfo.notes}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (status === 'lost') onRemoveFromLost(item.item_id)
                        if (status === 'damaged') onRemoveFromDamaged(item.item_id)
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
