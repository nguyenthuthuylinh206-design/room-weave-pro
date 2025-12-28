import { useState, useMemo } from 'react'
import { Tv, Check, AlertTriangle, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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

interface EquipmentTabProps {
  items: ExtendedRoomItem[]
  lostItems: LostItem[]
  damagedItems: DamagedItem[]
  onMarkLost: (item: RoomItemWithDetails, quantity: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, notes?: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

type PendingAction = {
  itemId: string
  type: 'lost' | 'damaged'
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
  const [checkedOk, setCheckedOk] = useState<Set<string>>(new Set())
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionNotes, setActionNotes] = useState('')

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

  // Calculate progress
  const checkedCount = items.filter(item => 
    isLost(item.item_id) || isDamaged(item.item_id) || isCheckedOk(item.item_id)
  ).length
  const progressPercent = items.length > 0 ? (checkedCount / items.length) * 100 : 0

  // Get checked count for a category
  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => 
      isLost(item.item_id) || isDamaged(item.item_id) || isCheckedOk(item.item_id)
    ).length
  }

  const handleMarkOk = (itemId: string) => {
    setCheckedOk(prev => new Set(prev).add(itemId))
    setPendingAction(null)
  }

  const handleStartAction = (itemId: string, type: 'lost' | 'damaged') => {
    setPendingAction({ itemId, type })
    setActionNotes('')
  }

  const handleConfirmAction = (item: RoomItemWithDetails) => {
    if (!pendingAction) return

    if (pendingAction.type === 'lost') {
      onMarkLost(item, 1)
    } else {
      onMarkDamaged(item, actionNotes || undefined)
    }
    
    setPendingAction(null)
    setActionNotes('')
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setActionNotes('')
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
          <Tv className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không có thiết bị nào trong phòng này</p>
        </CardContent>
      </Card>
    )
  }

  const renderItemCard = (item: ExtendedRoomItem) => {
    const status = getStatus(item.item_id)
    const isPending = pendingAction?.itemId === item.item_id
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
        <CardContent className="p-3">
          {/* Item Header */}
          <div className="flex items-center gap-3">
            {item.item_thumbnail ? (
              <img
                src={item.item_thumbnail}
                alt={item.item_name}
                className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Tv className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{item.item_name}</h4>
              <p className="text-xs text-muted-foreground truncate">{item.item_code}</p>
            </div>

            {/* Status Badge */}
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
                Hỏng
              </Badge>
            )}
          </div>

          {/* Action Buttons - Improved touch targets */}
          {status === 'pending' && !isPending && (
            <div className="flex gap-2 mt-3">
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
                className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition-transform"
                onClick={() => handleStartAction(item.item_id, 'lost')}
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Mất
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                className="flex-1 h-11 border-warning text-warning hover:bg-warning hover:text-warning-foreground active:scale-95 transition-transform"
                onClick={() => handleStartAction(item.item_id, 'damaged')}
              >
                <Wrench className="mr-1.5 h-4 w-4" />
                Hỏng
              </Button>
            </div>
          )}

          {/* Pending Action - Notes Input */}
          {isPending && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={pendingAction.type === 'lost' ? 'Lý do mất (không bắt buộc)...' : 'Mô tả tình trạng hỏng...'}
                className="h-16 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={pendingAction.type === 'lost' ? 'destructive' : 'secondary'}
                  size="default"
                  className={`h-10 ${pendingAction.type === 'damaged' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}`}
                  onClick={() => handleConfirmAction(item)}
                >
                  {pendingAction.type === 'lost' ? 'Xác nhận mất' : 'Xác nhận hỏng'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  className="h-10"
                  onClick={handleCancelAction}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {/* Show notes for damaged items */}
          {status === 'damaged' && damagedInfo?.notes && (
            <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              {damagedInfo.notes}
            </div>
          )}

          {/* Reset Button for checked items */}
          {status !== 'pending' && !isPending && (
            <div className="flex justify-end mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleResetItem(item)}
              >
                <X className="mr-1 h-3 w-3" />
                Đặt lại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Tracker */}
      <div className="bg-muted/50 p-3 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Tv className="h-4 w-4 text-muted-foreground" />
            <span>Đã kiểm tra: <strong>{checkedCount}/{items.length}</strong> thiết bị</span>
          </div>
          {checkedCount === items.length && (
            <Badge variant="outline" className="bg-success/10 text-success border-success">
              <Check className="mr-1 h-3 w-3" />
              Hoàn thành
            </Badge>
          )}
        </div>
        <Progress value={progressPercent} className="h-2" />
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
