import { useState } from 'react'
import { Minus, Plus, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { RoomItemWithDetails } from '@/types/rooms.types'
import type { ItemType } from '@/types/items.types'
import { ITEM_TYPE_LABELS } from '@/types/items.types'

export type ItemAction = 
  | { type: 'ok' }
  | { type: 'laundry'; quantity: number }
  | { type: 'add'; quantity: number }
  | { type: 'change'; quantity: number }
  | { type: 'lost'; quantity: number; estimatedValue?: number }
  | { type: 'damaged'; damageType: 'repairable' | 'replacement_needed'; damageCost: number; notes?: string }
  | { type: 'missing'; quantity: number }
  | { type: 'consumed'; quantity: number; needRefill: boolean }

export interface CategoryItemRowProps {
  item: RoomItemWithDetails & { item_type?: ItemType; category_name?: string | null }
  itemType: ItemType
  status: 'pending' | 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'damaged' | 'missing' | 'consumed'
  statusLabel?: string
  statusColor?: string
  availableStock?: number
  unitPrice?: number
  allowedActions: string[]
  onAction: (action: ItemAction) => void
  onReset: () => void
  isSaving?: boolean
}

const STATUS_CONFIG = {
  ok: { label: 'OK', color: 'text-green-600' },
  laundry: { label: 'Giặt', color: 'text-blue-600' },
  add: { label: 'Thêm', color: 'text-green-600' },
  change: { label: 'Đổi', color: 'text-primary' },
  lost: { label: 'Mất', color: 'text-destructive' },
  damaged: { label: 'Hỏng', color: 'text-amber-600' },
  missing: { label: 'Thiếu', color: 'text-yellow-600' },
  consumed: { label: 'Đã dùng', color: 'text-blue-600' },
  pending: { label: '', color: '' },
}

const ITEM_TYPE_BADGE_COLORS: Record<ItemType, string> = {
  linen: 'bg-blue-100 text-blue-700 border-blue-200',
  consumable: 'bg-rose-100 text-rose-700 border-rose-200',
  equipment: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  furniture: 'bg-amber-100 text-amber-700 border-amber-200',
}

export function CategoryItemRow({
  item,
  itemType,
  status,
  statusLabel,
  statusColor,
  availableStock = 0,
  unitPrice = 0,
  allowedActions,
  onAction,
  onReset,
  isSaving = false,
}: CategoryItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [pendingType, setPendingType] = useState<'lost' | 'damaged' | null>(null)
  const [quantity, setQuantity] = useState(item.standard_quantity || 1)
  const [damageType, setDamageType] = useState<'repairable' | 'replacement_needed'>('repairable')
  const [damageCost, setDamageCost] = useState(Math.round(unitPrice * 0.5))
  const [actionNotes, setActionNotes] = useState('')

  const isPending = status === 'pending'
  const isOk = status === 'ok'
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const handleMarkOk = () => {
    onAction({ type: 'ok' })
    setExpanded(false)
  }

  const handleQuickAction = (actionType: string) => {
    setExpanded(true)
    
    switch (actionType) {
      case 'laundry':
        onAction({ type: 'laundry', quantity })
        break
      case 'add':
        onAction({ type: 'add', quantity })
        break
      case 'change':
        onAction({ type: 'change', quantity })
        break
      case 'missing':
        onAction({ type: 'missing', quantity })
        break
      case 'consumed':
        onAction({ type: 'consumed', quantity, needRefill: true })
        break
      case 'lost':
        setPendingType('lost')
        break
      case 'damaged':
        setPendingType('damaged')
        setDamageCost(Math.round(unitPrice * 0.5))
        break
    }
  }

  const handleConfirmLostDamaged = () => {
    if (pendingType === 'lost') {
      onAction({ type: 'lost', quantity: 1, estimatedValue: unitPrice })
    } else if (pendingType === 'damaged') {
      onAction({ type: 'damaged', damageType, damageCost, notes: actionNotes || undefined })
    }
    setPendingType(null)
    setExpanded(false)
    setActionNotes('')
  }

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, Math.min(newQty, (item.standard_quantity || 1) * 2))
    setQuantity(qty)
  }

  const handleReset = () => {
    onReset()
    setExpanded(false)
    setPendingType(null)
    setQuantity(item.standard_quantity || 1)
  }

  // Build actions based on item_type and allowedActions
  const getActionsForItemType = (): { label: string; color: string; actionType: string }[] => {
    const actions: { label: string; color: string; actionType: string }[] = []
    
    if (itemType === 'linen') {
      if (allowedActions.includes('laundry')) {
        actions.push({ label: 'Giặt', color: 'text-blue-600 hover:bg-blue-50', actionType: 'laundry' })
      }
      if (allowedActions.includes('change')) {
        actions.push({ label: 'Đổi', color: 'hover:bg-primary/10', actionType: 'change' })
      }
      if (allowedActions.includes('add')) {
        actions.push({ label: 'Thêm', color: 'text-green-600 hover:bg-green-50', actionType: 'add' })
      }
      if (allowedActions.includes('lost')) {
        actions.push({ label: 'Mất', color: 'text-destructive hover:bg-destructive/10', actionType: 'lost' })
      }
    } else if (itemType === 'consumable') {
      if (allowedActions.includes('missing') || allowedActions.includes('empty')) {
        actions.push({ label: 'Thiếu', color: 'text-amber-600 hover:bg-amber-50', actionType: 'consumed' })
      }
    } else if (itemType === 'equipment' || itemType === 'furniture') {
      if (allowedActions.includes('damaged')) {
        actions.push({ label: 'Hỏng', color: 'text-amber-600 hover:bg-amber-50', actionType: 'damaged' })
      }
      if (allowedActions.includes('lost')) {
        actions.push({ label: 'Mất', color: 'text-destructive hover:bg-destructive/10', actionType: 'lost' })
      }
    }
    
    return actions
  }

  const itemActions = getActionsForItemType()
  const needsStockCheck = ['add', 'change'].includes(status)
  const isOverStock = needsStockCheck && quantity > availableStock
  const needsQuantity = ['laundry', 'add', 'change', 'missing'].includes(status)

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role={isPending ? "button" : undefined}
        tabIndex={isPending ? 0 : undefined}
        onClick={isPending ? handleMarkOk : undefined}
        onKeyDown={(e) => {
          if (isPending && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleMarkOk()
          }
        }}
        className={cn(
          "flex items-center gap-2 py-2.5 px-2 transition-colors",
          isPending && "cursor-pointer hover:bg-muted/50 active:bg-muted",
          isOk && "bg-green-50/30"
        )}
      >
        {/* Status indicator */}
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
          isPending && "border border-dashed border-muted-foreground/40",
          isOk && "bg-green-500 text-white",
          !isPending && !isOk && "bg-muted"
        )}>
          {isOk && <Check className="h-3 w-3" />}
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{item.item_name}</span>
            {item.standard_quantity && item.standard_quantity > 1 && (
              <span className="text-xs text-muted-foreground">×{item.standard_quantity}</span>
            )}
          </div>
          {/* Item type badge - small */}
          <Badge 
            variant="outline" 
            className={cn("h-4 px-1 text-[10px] mt-0.5", ITEM_TYPE_BADGE_COLORS[itemType])}
          >
            {ITEM_TYPE_LABELS[itemType]}
          </Badge>
        </div>

        {/* Actions or status */}
        {isPending ? (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {itemActions.slice(0, 3).map((action, idx) => (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 text-xs", action.color)}
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAction(action.actionType)
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            {statusLabel && !isOk && (
              <span className={cn("text-xs font-medium", statusColor || statusInfo.color)}>
                {statusLabel || statusInfo.label}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
            >
              <span className="text-muted-foreground text-xs">✕</span>
            </Button>
          </div>
        )}
      </div>

      {/* Expanded content for quantity adjustments */}
      {expanded && needsQuantity && !pendingType && (
        <div className="px-2 pb-2">
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Số lượng:</span>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const newQty = quantity - 1
                    handleQuantityChange(newQty)
                    // Re-trigger action with new quantity
                    if (status === 'laundry') onAction({ type: 'laundry', quantity: Math.max(1, newQty) })
                    else if (status === 'add') onAction({ type: 'add', quantity: Math.max(1, newQty) })
                    else if (status === 'change') onAction({ type: 'change', quantity: Math.max(1, newQty) })
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const newQty = parseInt(e.target.value) || 1
                    handleQuantityChange(newQty)
                  }}
                  className={cn("w-12 h-7 text-center text-sm px-1", isOverStock && 'border-amber-500')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const newQty = quantity + 1
                    handleQuantityChange(newQty)
                    if (status === 'laundry') onAction({ type: 'laundry', quantity: newQty })
                    else if (status === 'add') onAction({ type: 'add', quantity: newQty })
                    else if (status === 'change') onAction({ type: 'change', quantity: newQty })
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {needsStockCheck && (
                <span className={cn("text-xs", isOverStock ? 'text-amber-600' : 'text-muted-foreground')}>
                  Kho: {availableStock}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={() => setExpanded(false)}
              >
                Xong
              </Button>
            </div>
            {isOverStock && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Kho chỉ còn {availableStock}, yêu cầu {quantity}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded form for lost */}
      {expanded && pendingType === 'lost' && (
        <div className="px-2 pb-2">
          <div className="space-y-2 p-2 bg-red-50 rounded-lg border border-red-200 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-700">Giá đền bù</span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatCurrency(unitPrice)}
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
                onClick={handleConfirmLostDamaged}
              >
                Xác nhận
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => { setPendingType(null); setExpanded(false) }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded form for damaged */}
      {expanded && pendingType === 'damaged' && (
        <div className="px-2 pb-2">
          <div className="space-y-2 p-2 bg-amber-50 rounded-lg border border-amber-200 mt-1">
            <RadioGroup 
              value={damageType} 
              onValueChange={(v) => {
                setDamageType(v as 'repairable' | 'replacement_needed')
                setDamageCost(v === 'repairable' ? Math.round(unitPrice * 0.5) : unitPrice)
              }}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="repairable" id={`r-${item.item_id}`} />
                <Label htmlFor={`r-${item.item_id}`} className="text-xs">Sửa (50%)</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="replacement_needed" id={`rn-${item.item_id}`} />
                <Label htmlFor={`rn-${item.item_id}`} className="text-xs">Thay (100%)</Label>
              </div>
            </RadioGroup>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-amber-700">Chi phí:</Label>
              <Input
                type="text"
                inputMode="numeric"
                className="h-7 w-24 text-right font-mono text-sm"
                value={damageCost > 0 ? damageCost.toString() : ''}
                onChange={(e) => setDamageCost(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              />
              <span className="text-xs">đ</span>
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
                className="h-8 border-amber-300 text-amber-700"
                onClick={handleConfirmLostDamaged}
              >
                Xác nhận
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => { setPendingType(null); setExpanded(false) }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
