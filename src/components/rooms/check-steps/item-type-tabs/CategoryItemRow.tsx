import { useState } from 'react'
import { Minus, Plus, AlertTriangle, Check, Loader2, WashingMachine, RefreshCw, PlusCircle, Ban, Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { RoomItemWithDetails, ConsumedItem, DamagedItem, LostItem, LaundryItem } from '@/types/rooms.types'
import type { ItemType } from '@/types/items.types'

export type ItemAction = 
  | { type: 'ok' }
  | { type: 'laundry'; quantity: number }
  | { type: 'add'; quantity: number }
  | { type: 'change'; quantity: number }
  | { type: 'lost'; quantity: number; estimatedValue?: number; notes?: string }
  | { type: 'damaged'; damageType: 'repairable' | 'replacement_needed'; damageCost: number; notes?: string }
  | { type: 'missing'; quantity: number }
  | { type: 'consumed'; quantity: number; needRefill: boolean }

export interface CategoryItemRowProps {
  item: RoomItemWithDetails & { 
    item_type?: ItemType
    category_name?: string | null
    item_thumbnail?: string | null
  }
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
  // Additional info for displaying after action
  consumedInfo?: ConsumedItem | null
  damagedInfo?: DamagedItem | null
  lostInfo?: LostItem | null
  laundryInfo?: LaundryItem | null
}

const STATUS_CONFIG = {
  ok: { label: 'OK', color: 'text-green-600', bg: 'bg-green-500' },
  laundry: { label: 'Giặt', color: 'text-blue-600', bg: 'bg-blue-500' },
  add: { label: 'Thêm', color: 'text-green-600', bg: 'bg-green-500' },
  change: { label: 'Đổi', color: 'text-primary', bg: 'bg-primary' },
  lost: { label: 'Mất', color: 'text-destructive', bg: 'bg-destructive' },
  damaged: { label: 'Hỏng', color: 'text-amber-600', bg: 'bg-amber-500' },
  missing: { label: 'Thiếu', color: 'text-yellow-600', bg: 'bg-yellow-500' },
  consumed: { label: 'Đã dùng', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  pending: { label: '', color: '', bg: '' },
}

// Action button configs với icon
const ACTION_CONFIG: Record<string, { icon: typeof WashingMachine; label: string; color: string }> = {
  laundry: { icon: WashingMachine, label: 'Giặt', color: 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' },
  change: { icon: RefreshCw, label: 'Đổi', color: 'text-primary hover:bg-primary/10 active:bg-primary/20' },
  add: { icon: PlusCircle, label: 'Thêm', color: 'text-green-600 hover:bg-green-50 active:bg-green-100' },
  lost: { icon: Ban, label: 'Mất', color: 'text-destructive hover:bg-destructive/10 active:bg-destructive/20' },
  damaged: { icon: Wrench, label: 'Hỏng', color: 'text-amber-600 hover:bg-amber-50 active:bg-amber-100' },
  consumed: { icon: Package, label: 'Thiếu', color: 'text-amber-600 hover:bg-amber-50 active:bg-amber-100' },
  missing: { icon: Package, label: 'Thiếu', color: 'text-amber-600 hover:bg-amber-50 active:bg-amber-100' },
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
  consumedInfo,
  damagedInfo,
  lostInfo,
  laundryInfo,
}: CategoryItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [pendingType, setPendingType] = useState<'lost' | 'damaged' | 'consumed' | null>(null)
  const [quantity, setQuantity] = useState(item.standard_quantity || 1)
  const [damageType, setDamageType] = useState<'repairable' | 'replacement_needed'>('repairable')
  const [damageCost, setDamageCost] = useState(Math.round(unitPrice * 0.5))
  const [actionNotes, setActionNotes] = useState('')
  const [needRefill, setNeedRefill] = useState(true)
  const [consumedQty, setConsumedQty] = useState(1)

  const isPending = status === 'pending'
  const isOk = status === 'ok'
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const isOutOfStock = availableStock === 0
  const isLowStock = availableStock > 0 && availableStock <= 5

  const handleMarkOk = () => {
    onAction({ type: 'ok' })
    setExpanded(false)
  }

  const handleQuickAction = (actionType: string) => {
    switch (actionType) {
      case 'laundry':
        onAction({ type: 'laundry', quantity })
        setExpanded(true)
        break
      case 'add':
        onAction({ type: 'add', quantity })
        setExpanded(true)
        break
      case 'change':
        onAction({ type: 'change', quantity })
        setExpanded(true)
        break
      case 'missing':
        onAction({ type: 'missing', quantity })
        break
      case 'consumed':
        // Open form to enter quantity and need_refill
        setPendingType('consumed')
        setConsumedQty(1)
        setNeedRefill(true)
        setExpanded(true)
        break
      case 'lost':
        setPendingType('lost')
        setExpanded(true)
        break
      case 'damaged':
        setPendingType('damaged')
        setDamageCost(Math.round(unitPrice * 0.5))
        setExpanded(true)
        break
    }
  }

  const handleConfirmConsumed = () => {
    onAction({ type: 'consumed', quantity: consumedQty, needRefill })
    setPendingType(null)
    setExpanded(false)
  }

  const handleConfirmLostDamaged = () => {
    if (pendingType === 'lost') {
      onAction({ type: 'lost', quantity: 1, estimatedValue: unitPrice, notes: actionNotes || undefined })
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
    setConsumedQty(1)
    setNeedRefill(true)
  }

  // Build actions based on item_type and allowedActions
  const getActionsForItemType = (): string[] => {
    const actions: string[] = []
    
    if (itemType === 'linen') {
      if (allowedActions.includes('laundry')) actions.push('laundry')
      if (allowedActions.includes('change')) actions.push('change')
      if (allowedActions.includes('add')) actions.push('add')
      if (allowedActions.includes('lost')) actions.push('lost')
    } else if (itemType === 'consumable') {
      if (allowedActions.includes('missing') || allowedActions.includes('empty') || allowedActions.includes('consumed')) {
        actions.push('consumed')
      }
    } else if (itemType === 'equipment' || itemType === 'furniture') {
      if (allowedActions.includes('damaged')) actions.push('damaged')
      if (allowedActions.includes('lost')) actions.push('lost')
    }
    
    return actions
  }

  const itemActions = getActionsForItemType()
  const needsStockCheck = ['add', 'change'].includes(status)
  const isOverStock = needsStockCheck && quantity > availableStock
  const needsQuantity = ['laundry', 'add', 'change'].includes(status)
  const standardQuantity = item.standard_quantity || 1

  // Render inline info after action is taken
  const renderStatusInfo = () => {
    // Consumed item info
    if (status === 'consumed' && consumedInfo) {
      return (
        <div className="px-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-cyan-600 font-medium">Thiếu {consumedInfo.quantity}</span>
            <span>•</span>
            <span>{consumedInfo.need_refill ? 'Cần bổ sung' : 'Không bổ sung'}</span>
          </div>
          {consumedInfo.need_refill && isOutOfStock && (
            <Alert variant="destructive" className="py-1.5 px-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Hết hàng trong kho! Không thể bổ sung ngay.
              </AlertDescription>
            </Alert>
          )}
          {consumedInfo.need_refill && isLowStock && (
            <Alert className="py-1.5 px-2 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                Tồn kho thấp: còn {availableStock}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )
    }

    // Damaged item info
    if (status === 'damaged' && damagedInfo) {
      return (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          <span className="text-amber-600 font-medium">
            {damagedInfo.damage_type === 'repairable' ? 'Cần sửa' : 'Cần thay'}
          </span>
          <span className="mx-1">•</span>
          <span className="font-mono">{formatCurrency(damagedInfo.damage_cost)}</span>
          {damagedInfo.notes && (
            <p className="mt-0.5 text-muted-foreground/80 italic">"{damagedInfo.notes}"</p>
          )}
        </div>
      )
    }

    // Lost item info
    if (status === 'lost' && lostInfo) {
      return (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          <span className="text-destructive font-medium">Mất</span>
          <span className="mx-1">•</span>
          <span className="font-mono">{formatCurrency(lostInfo.estimated_value || unitPrice)}</span>
        </div>
      )
    }

    // Laundry with quantity
    if (status === 'laundry' && laundryInfo) {
      return (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          <span className="text-blue-600 font-medium">Giặt ×{laundryInfo.quantity}</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main Row - With thumbnail for consumables */}
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
          "flex items-center gap-2 py-3 px-2 transition-colors touch-manipulation",
          isPending && "cursor-pointer hover:bg-muted/50 active:bg-muted",
          isOk && "bg-green-50/30",
          status === 'consumed' && "bg-cyan-50/30",
          status === 'damaged' && "bg-amber-50/30",
          status === 'lost' && "bg-red-50/30"
        )}
      >
        {/* Status indicator - Larger for touch */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          isPending && "border-2 border-dashed border-muted-foreground/30",
          !isPending && !isOk && statusInfo.bg,
          isOk && "bg-green-500"
        )}>
          {isOk && <Check className="h-3.5 w-3.5 text-white" />}
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {!isPending && !isOk && <Check className="h-3 w-3 text-white" />}
        </div>

        {/* Item info - Single line with quantity badge */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{item.item_name}</span>
          {standardQuantity > 1 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              ×{standardQuantity}
            </span>
          )}
        </div>

        {/* Actions or Status display */}
        {isPending ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            {itemActions.map((actionType) => {
              const config = ACTION_CONFIG[actionType]
              if (!config) return null
              const Icon = config.icon
              
              return (
                <Button
                  key={actionType}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-2.5 text-xs font-medium",
                    config.color
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuickAction(actionType)
                  }}
                >
                  {config.label}
                </Button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn("text-xs font-medium", statusColor || statusInfo.color)}>
              {statusLabel || statusInfo.label}
              {needsQuantity && status !== 'ok' && ` ×${quantity}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
            >
              <span className="text-sm">✕</span>
            </Button>
          </div>
        )}
      </div>

      {/* Inline Status Info - After action taken */}
      {!isPending && renderStatusInfo()}

      {/* Inline Consumable Form - Full featured */}
      {expanded && pendingType === 'consumed' && (
        <div className="px-2 pb-3 pt-1">
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            {/* Item Name */}
            <div>
              <span className="font-medium text-sm">{item.item_name}</span>
              <p className="text-xs text-muted-foreground">Tiêu chuẩn: {standardQuantity}</p>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Số lượng thiếu:</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setConsumedQty(Math.max(1, consumedQty - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={standardQuantity}
                  value={consumedQty}
                  onChange={(e) => setConsumedQty(Math.max(1, Math.min(parseInt(e.target.value) || 1, standardQuantity)))}
                  className="w-14 h-8 text-center text-sm font-medium"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setConsumedQty(Math.min(standardQuantity, consumedQty + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">/ {standardQuantity}</span>
            </div>

            {/* Need refill switch */}
            <div className="flex items-center gap-2">
              <Switch
                checked={needRefill}
                onCheckedChange={setNeedRefill}
              />
              <Label className="text-sm">Cần bổ sung từ kho</Label>
            </div>

            {/* Stock warnings */}
            {needRefill && isOutOfStock && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Hết hàng trong kho! Không thể bổ sung ngay.
                </AlertDescription>
              </Alert>
            )}
            {needRefill && isLowStock && (
              <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Tồn kho thấp: còn {availableStock}
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 flex-1"
                onClick={handleConfirmConsumed}
              >
                Xác nhận
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => { setPendingType(null); setExpanded(false) }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Quantity Adjuster - For laundry/add/change */}
      {expanded && needsQuantity && !pendingType && (
        <div className="px-2 pb-3 pt-1">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
            <span className="text-xs text-muted-foreground shrink-0">Số lượng:</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newQty = Math.max(1, quantity - 1)
                  handleQuantityChange(newQty)
                  if (status === 'laundry') onAction({ type: 'laundry', quantity: newQty })
                  else if (status === 'add') onAction({ type: 'add', quantity: newQty })
                  else if (status === 'change') onAction({ type: 'change', quantity: newQty })
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className={cn(
                  "w-14 h-8 text-center text-sm font-medium",
                  isOverStock && 'border-amber-500 bg-amber-50'
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newQty = quantity + 1
                  handleQuantityChange(newQty)
                  if (status === 'laundry') onAction({ type: 'laundry', quantity: newQty })
                  else if (status === 'add') onAction({ type: 'add', quantity: newQty })
                  else if (status === 'change') onAction({ type: 'change', quantity: newQty })
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {needsStockCheck && (
              <span className={cn(
                "text-xs shrink-0",
                isOverStock ? 'text-amber-600 font-medium' : 'text-muted-foreground'
              )}>
                Kho: {availableStock}
              </span>
            )}
            
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs ml-auto"
              onClick={() => setExpanded(false)}
            >
              Xong
            </Button>
          </div>
          
          {isOverStock && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5 px-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Kho chỉ còn {availableStock}, yêu cầu {quantity}</span>
            </div>
          )}
        </div>
      )}

      {/* Inline Lost Form - Compact */}
      {expanded && pendingType === 'lost' && (
        <div className="px-2 pb-3 pt-1">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-700">Đền bù</span>
              <span className="text-sm font-mono text-red-700">
                {formatCurrency(unitPrice)}
              </span>
            </div>
            <Textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Lý do mất (tùy chọn)..."
              className="h-16 text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9 flex-1"
                onClick={handleConfirmLostDamaged}
              >
                Xác nhận mất
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => { setPendingType(null); setExpanded(false) }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Damaged Form - Compact */}
      {expanded && pendingType === 'damaged' && (
        <div className="px-2 pb-3 pt-1">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <RadioGroup 
              value={damageType} 
              onValueChange={(v) => {
                setDamageType(v as 'repairable' | 'replacement_needed')
                setDamageCost(v === 'repairable' ? Math.round(unitPrice * 0.5) : unitPrice)
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="repairable" id={`r-${item.item_id}`} />
                <span className="text-sm">Sửa chữa (50%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="replacement_needed" id={`rn-${item.item_id}`} />
                <span className="text-sm">Thay thế (100%)</span>
              </label>
            </RadioGroup>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm text-amber-700 shrink-0">Chi phí:</Label>
              <Input
                type="text"
                inputMode="numeric"
                className="h-9 w-28 text-right font-mono"
                value={damageCost > 0 ? damageCost.toLocaleString('vi-VN') : ''}
                onChange={(e) => setDamageCost(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              />
              <span className="text-sm text-muted-foreground">đ</span>
            </div>
            
            <Textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Mô tả hư hỏng (tùy chọn)..."
              className="h-16 text-sm resize-none"
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleConfirmLostDamaged}
              >
                Xác nhận hỏng
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
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
