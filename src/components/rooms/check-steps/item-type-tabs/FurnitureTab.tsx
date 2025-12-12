import { useState } from 'react'
import { Armchair, Check, Wrench, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { RoomItemWithDetails, LostItem } from '@/types/rooms.types'

interface DamagedItem {
  item_id: string
  item_name: string
  item_code?: string
  notes?: string
}

interface FurnitureTabProps {
  items: RoomItemWithDetails[]
  lostItems: LostItem[]
  damagedItems: DamagedItem[]
  onMarkLost: (item: RoomItemWithDetails, quantity: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, notes?: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

export function FurnitureTab({
  items,
  lostItems,
  damagedItems,
  onMarkLost,
  onMarkDamaged,
  onRemoveFromLost,
  onRemoveFromDamaged,
}: FurnitureTabProps) {
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
          <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không có nội thất nào trong phòng này</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Armchair className="inline-block h-4 w-4 mr-2" />
        Kiểm tra nội thất: ghế, bàn, tủ, đèn, rèm cửa...
      </div>

      {items.map((item) => {
        const status = getStatus(item.item_id)
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
                      OK
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
                      Cần sửa
                    </Badge>
                  )}
                </div>

                {status === 'ok' ? (
                  <>
                    {/* Damage Notes */}
                    <div className="space-y-1">
                      <Label className="text-xs">Ghi chú (nếu cần sửa):</Label>
                      <Textarea
                        value={damageNotes[item.item_id] || ''}
                        onChange={(e) => setDamageNotes(prev => ({
                          ...prev,
                          [item.item_id]: e.target.value
                        }))}
                        placeholder="Mô tả vấn đề cần sửa chữa..."
                        className="h-16 text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onMarkDamaged(item, damageNotes[item.item_id])}
                      >
                        <Wrench className="mr-1 h-3 w-3" />
                        Cần sửa chữa
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onMarkLost(item, 1)}
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Mất
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {damagedInfo?.notes || 'Không có ghi chú'}
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
