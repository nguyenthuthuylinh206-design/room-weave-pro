import { useState, useMemo } from 'react'
import { Armchair, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

type PendingAction = {
  itemId: string
  type: 'lost' | 'damaged'
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

  const groupedItems = useMemo(() => groupItemsByCategory(items), [items])

  const checkedCount = items.filter(item => 
    isLost(item.item_id) || isDamaged(item.item_id) || isCheckedOk(item.item_id)
  ).length
  const progressPercent = items.length > 0 ? (checkedCount / items.length) * 100 : 0

  const getCategoryCheckedCount = (categoryItems: ExtendedRoomItem[]) => {
    return categoryItems.filter(item => 
      isLost(item.item_id) || isDamaged(item.item_id) || isCheckedOk(item.item_id)
    ).length
  }

  const handleMarkOk = (itemId: string) => {
    setCheckedOk(prev => new Set(prev).add(itemId))
    setPendingAction(null)
  }

  const handleMarkAllOk = (categoryItems: ExtendedRoomItem[]) => {
    const newSet = new Set(checkedOk)
    categoryItems.forEach(item => {
      if (getStatus(item.item_id) === 'pending') {
        newSet.add(item.item_id)
      }
    })
    setCheckedOk(newSet)
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
      <div className="py-8 text-center text-muted-foreground">
        <Armchair className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Không có nội thất</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {checkedCount}/{items.length} đã kiểm tra
        </span>
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      {Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => {
        if (categoryItems.length === 0) return null
        
        return (
          <CategoryGroup
            key={categoryName}
            categoryName={categoryName}
            itemCount={categoryItems.length}
            checkedCount={getCategoryCheckedCount(categoryItems)}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleMarkAllOk(categoryItems)}
              >
                Tất cả OK
              </Button>
            }
          >
            <div className="divide-y divide-border">
              {categoryItems.map(item => {
                const status = getStatus(item.item_id)
                const isPending = pendingAction?.itemId === item.item_id
                const damagedInfo = damagedItems.find(i => i.item_id === item.item_id)
                
                return (
                  <div key={item.item_id} className="py-2.5 px-1">
                    <div className="flex items-center gap-2">
                      {/* Item name */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.item_name}</div>
                      </div>
                      
                      {/* Status or Actions */}
                      {status === 'pending' && !isPending && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleMarkOk(item.item_id)}
                          >
                            OK
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                            onClick={() => handleStartAction(item.item_id, 'damaged')}
                          >
                            Hỏng
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleStartAction(item.item_id, 'lost')}
                          >
                            Mất
                          </Button>
                        </div>
                      )}
                      
                      {status === 'ok' && (
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-green-600" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleResetItem(item)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      
                      {status === 'damaged' && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-amber-600">Hỏng</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleResetItem(item)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      
                      {status === 'lost' && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-destructive">Mất</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleResetItem(item)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Pending Action - Notes Input */}
                    {isPending && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder={pendingAction.type === 'lost' ? 'Lý do mất...' : 'Mô tả hỏng...'}
                          className="h-14 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleConfirmAction(item)}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={handleCancelAction}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Show notes for damaged items */}
                    {status === 'damaged' && damagedInfo?.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {damagedInfo.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CategoryGroup>
        )
      })}
    </div>
  )
}
