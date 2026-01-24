import { useState, useMemo, useEffect } from 'react'
import { Tv, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { RoomItemWithDetails, LostItem, DamagedItem } from '@/types/rooms.types'
import { CategoryGroup, groupItemsByCategory } from './CategoryGroup'
import { getCheckTypeConfig, type CheckType } from '@/lib/roomCheckConfig'

interface ExtendedRoomItem extends RoomItemWithDetails {
  category_name?: string | null
}

interface EquipmentTabProps {
  items: ExtendedRoomItem[]
  checkType: CheckType
  lostItems: LostItem[]
  damagedItems: DamagedItem[]
  onMarkLost: (item: RoomItemWithDetails, quantity: number, estimatedValue?: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, damageInfo: { damage_type: 'repairable' | 'replacement_needed'; damage_cost: number; notes?: string }) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

type PendingAction = {
  itemId: string
  type: 'lost' | 'damaged'
}

export function EquipmentTab({
  items,
  checkType,
  lostItems,
  damagedItems,
  onMarkLost,
  onMarkDamaged,
  onRemoveFromLost,
  onRemoveFromDamaged,
}: EquipmentTabProps) {
  const config = getCheckTypeConfig(checkType)
  const allowedActions = config.equipmentActions
  const [checkedOk, setCheckedOk] = useState<Set<string>>(new Set())
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [damageType, setDamageType] = useState<'repairable' | 'replacement_needed'>('repairable')
  const [damageCost, setDamageCost] = useState<number>(0)
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({})
  
  // Fetch unit prices for items
  useEffect(() => {
    const fetchPrices = async () => {
      const itemIds = items.map(i => i.item_id)
      if (itemIds.length === 0) return
      
      const { data } = await supabase
        .from('items')
        .select('id, unit_price')
        .in('id', itemIds)
      
      if (data) {
        const priceMap: Record<string, number> = {}
        data.forEach(item => {
          priceMap[item.id] = item.unit_price || 0
        })
        setItemPrices(priceMap)
      }
    }
    fetchPrices()
  }, [items])

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
    setDamageType('repairable')
    const itemPrice = itemPrices[itemId] || 0
    setDamageCost(type === 'damaged' ? Math.round(itemPrice * 0.5) : itemPrice)
  }

  const handleConfirmAction = (item: RoomItemWithDetails) => {
    if (!pendingAction) return
    const itemPrice = itemPrices[item.item_id] || 0

    if (pendingAction.type === 'lost') {
      onMarkLost(item, 1, itemPrice)
    } else {
      onMarkDamaged(item, {
        damage_type: damageType,
        damage_cost: damageCost,
        notes: actionNotes || undefined
      })
    }
    
    setPendingAction(null)
    setActionNotes('')
    setDamageCost(0)
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setActionNotes('')
    setDamageCost(0)
  }
  
  const handleDamageTypeChange = (value: 'repairable' | 'replacement_needed') => {
    setDamageType(value)
    const itemPrice = itemPrices[pendingAction?.itemId || ''] || 0
    setDamageCost(value === 'repairable' ? Math.round(itemPrice * 0.5) : itemPrice)
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
        <Tv className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Không có thiết bị</p>
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
                          {allowedActions.includes('lost') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleStartAction(item.item_id, 'lost')}
                            >
                              Mất
                            </Button>
                          )}
                          {allowedActions.includes('damaged') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                              onClick={() => handleStartAction(item.item_id, 'damaged')}
                            >
                              Hỏng
                            </Button>
                          )}
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
                    </div>

                    {/* Pending Action - Lost */}
                    {isPending && pendingAction.type === 'lost' && (
                      <div className="mt-2 space-y-2 p-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-700">Giá đền bù</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatCurrency(itemPrices[item.item_id] || 0)}
                          </span>
                        </div>
                        <Textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Lý do mất..."
                          className="h-12 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8"
                            onClick={() => handleConfirmAction(item)}
                          >
                            Xác nhận mất
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
                    
                    {/* Pending Action - Damaged */}
                    {isPending && pendingAction.type === 'damaged' && (
                      <div className="mt-2 space-y-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-amber-700">Loại hư hỏng</Label>
                          <RadioGroup 
                            value={damageType} 
                            onValueChange={(v) => handleDamageTypeChange(v as 'repairable' | 'replacement_needed')}
                            className="flex gap-3"
                          >
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="repairable" id={`eq-repairable-${item.item_id}`} />
                              <Label htmlFor={`eq-repairable-${item.item_id}`} className="text-xs cursor-pointer">Cần sửa (50%)</Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="replacement_needed" id={`eq-replacement-${item.item_id}`} />
                              <Label htmlFor={`eq-replacement-${item.item_id}`} className="text-xs cursor-pointer">Cần thay (100%)</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-amber-700">Chi phí đền bù</Label>
                            <span className="text-xs text-muted-foreground">
                              Giá gốc: {formatCurrency(itemPrices[item.item_id] || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 text-right font-mono text-sm"
                              value={damageCost > 0 ? damageCost.toString() : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '')
                                setDamageCost(parseInt(value) || 0)
                              }}
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">đ</span>
                          </div>
                        </div>
                        
                        <Textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Mô tả hư hỏng..."
                          className="h-12 text-sm"
                        />
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => handleConfirmAction(item)}
                          >
                            Xác nhận hỏng
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

                    {/* Show info for damaged items */}
                    {status === 'damaged' && damagedInfo && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>{damagedInfo.damage_type === 'repairable' ? 'Cần sửa' : 'Cần thay thế'}</span>
                          <span className="font-mono text-amber-600">{formatCurrency(damagedInfo.damage_cost)}</span>
                        </div>
                        {damagedInfo.notes && <div>{damagedInfo.notes}</div>}
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
