import { useState, useMemo } from 'react'
import { Armchair, Check, Wrench, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { RoomItemWithDetails, LostItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'

interface DamagedItem {
  item_id: string
  item_name: string
  item_code?: string
  notes?: string
}

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface FurnitureTabProps {
  items: ExtendedRoomItem[]
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
  const [checkedOk, setCheckedOk] = useState<Set<string>>(new Set())

  const isLost = (itemId: string) => lostItems.some(i => i.item_id === itemId)
  const isDamaged = (itemId: string) => damagedItems.some(i => i.item_id === itemId)
  const isCheckedOk = (itemId: string) => checkedOk.has(itemId)

  const getStatus = (itemId: string) => {
    if (isLost(itemId)) return 'lost'
    if (isDamaged(itemId)) return 'damaged'
    if (isCheckedOk(itemId)) return 'ok'
    return 'pending'
  }

  // Group items by category
  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => 
      isLost(item.item_id) || isDamaged(item.item_id) || isCheckedOk(item.item_id)
    ).length
  }

  const handleMarkOk = (itemId: string) => {
    setCheckedOk(prev => new Set(prev).add(itemId))
  }

  const handleResetItem = (item: RoomItemWithDetails) => {
    const status = getStatus(item.item_id)
    if (status === 'lost') {
      onRemoveFromLost(item.item_id)
    } else if (status === 'damaged') {
      onRemoveFromDamaged(item.item_id)
    } else if (status === 'ok') {
      setCheckedOk(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.item_id)
        return newSet
      })
    }
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

  const renderItemCard = (item: ExtendedRoomItem) => {
    const status = getStatus(item.item_id)
    const damagedInfo = damagedItems.find(i => i.item_id === item.item_id)

    return (
      <Card 
        key={item.item_id} 
        className={
          status === 'lost' ? 'border-destructive bg-destructive/5' : 
          status === 'damaged' ? 'border-warning bg-warning/5' : 
          status === 'ok' ? 'border-success/50 bg-success/5' : ''
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
                  <Armchair className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.item_name}</h4>
                <p className="text-xs text-muted-foreground">{item.item_code}</p>
              </div>
              {status === 'ok' && (
                <Badge variant="outline" className="bg-success/10 text-success border-success flex-shrink-0">
                  <Check className="mr-1 h-3 w-3" />
                  OK
                </Badge>
              )}
              {status === 'lost' && (
                <Badge variant="destructive" className="flex-shrink-0">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Mất
                </Badge>
              )}
              {status === 'damaged' && (
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning flex-shrink-0">
                  <Wrench className="mr-1 h-3 w-3" />
                  Cần sửa
                </Badge>
              )}
            </div>

            {status === 'pending' ? (
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

                {/* Action Buttons - Improved touch targets */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="flex-1 h-11 border-success text-success hover:bg-success hover:text-success-foreground active:scale-95 transition-transform"
                    onClick={() => handleMarkOk(item.item_id)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    OK
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="flex-1 h-11 border-warning text-warning hover:bg-warning hover:text-warning-foreground active:scale-95 transition-transform"
                    onClick={() => onMarkDamaged(item, damageNotes[item.item_id])}
                  >
                    <Wrench className="mr-1.5 h-4 w-4" />
                    Cần sửa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    className="h-11 active:scale-95 transition-transform"
                    onClick={() => onMarkLost(item, 1)}
                  >
                    <AlertTriangle className="mr-1.5 h-4 w-4" />
                    Mất
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {damagedInfo?.notes || (status === 'ok' ? 'Đã kiểm tra, không vấn đề' : 'Không có ghi chú')}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => handleResetItem(item)}
                >
                  Đặt lại
                </Button>
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
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Armchair className="inline-block h-4 w-4 mr-2" />
        Kiểm tra nội thất: ghế, bàn, tủ, đèn, rèm cửa...
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
