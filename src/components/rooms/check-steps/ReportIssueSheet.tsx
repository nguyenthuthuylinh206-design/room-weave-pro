import { useEffect, useState } from 'react'
import { Minus, Plus, AlertTriangle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { ItemType } from '@/types/items.types'

export type IssueAction = 
  | { type: 'laundry'; quantity: number }
  | { type: 'add'; quantity: number }
  | { type: 'change'; quantity: number }
  | { type: 'missing'; quantity: number }
  | { type: 'damaged'; quantity: number; notes?: string }
  | { type: 'lost'; quantity: number; notes?: string }
  | { type: 'consumed'; quantity: number; needRefill: boolean }
  | { type: 'empty'; quantity: number; needRefill: boolean }

export interface ReportIssueSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: ItemType
  standardQuantity: number
  availableStock?: number
  allowedActions: string[]
  onSubmit: (action: IssueAction) => void
}

// Catalog các loại sự cố — gom hợp lý theo type
const ISSUE_CATALOG: Record<string, { label: string; emoji: string; color: string }> = {
  laundry:  { label: 'Cần giặt',     emoji: '🧺', color: 'border-blue-500 bg-blue-50 text-blue-700' },
  change:   { label: 'Đổi mới',      emoji: '🔄', color: 'border-primary bg-primary/10 text-primary' },
  add:      { label: 'Thêm',          emoji: '➕', color: 'border-green-500 bg-green-50 text-green-700' },
  missing:  { label: 'Thiếu',         emoji: '🚫', color: 'border-amber-500 bg-amber-50 text-amber-700' },
  damaged:  { label: 'Hỏng / Bẩn',   emoji: '🛠️', color: 'border-amber-600 bg-amber-50 text-amber-700' },
  lost:     { label: 'Mất',           emoji: '⛔', color: 'border-destructive bg-destructive/10 text-destructive' },
  consumed: { label: 'Đã dùng',      emoji: '📦', color: 'border-cyan-500 bg-cyan-50 text-cyan-700' },
  empty:    { label: 'Hết',           emoji: '📭', color: 'border-cyan-500 bg-cyan-50 text-cyan-700' },
}

// Giao của (action hợp lệ cho item type) × (allowedActions config) × (priority)
const ITEM_TYPE_ACTIONS: Record<ItemType, string[]> = {
  linen:      ['laundry', 'change', 'add', 'missing', 'damaged', 'lost'],
  consumable: ['consumed', 'empty', 'missing', 'lost'],
  equipment:  ['damaged', 'missing', 'lost'],
  furniture:  ['damaged', 'missing', 'lost'],
}
const PRIORITY = ['missing', 'damaged', 'empty', 'consumed', 'laundry', 'change', 'add', 'lost']

export function ReportIssueSheet({
  open,
  onOpenChange,
  itemName,
  itemType,
  standardQuantity,
  availableStock = 0,
  allowedActions,
  onSubmit,
}: ReportIssueSheetProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [needRefill, setNeedRefill] = useState(true)
  const [notes, setNotes] = useState('')

  // Reset khi mở/đóng
  useEffect(() => {
    if (open) {
      setSelectedType(null)
      setQuantity(1)
      setNeedRefill(true)
      setNotes('')
    }
  }, [open])

  // Build danh sách action khả dụng cho item này
  const allowed = ITEM_TYPE_ACTIONS[itemType] || []
  const issueTypes = PRIORITY.filter(a => allowed.includes(a) && allowedActions.includes(a))

  const handleConfirm = () => {
    if (!selectedType) return
    const qty = Math.max(1, Math.min(quantity, standardQuantity))
    
    switch (selectedType) {
      case 'laundry':  onSubmit({ type: 'laundry', quantity: qty }); break
      case 'change':   onSubmit({ type: 'change', quantity: qty }); break
      case 'add':      onSubmit({ type: 'add', quantity: qty }); break
      case 'missing':  onSubmit({ type: 'missing', quantity: qty }); break
      case 'damaged':  onSubmit({ type: 'damaged', quantity: qty, notes: notes || undefined }); break
      case 'lost':     onSubmit({ type: 'lost', quantity: qty, notes: notes || undefined }); break
      case 'consumed': onSubmit({ type: 'consumed', quantity: qty, needRefill }); break
      case 'empty':    onSubmit({ type: 'empty', quantity: qty, needRefill }); break
    }
    onOpenChange(false)
  }

  const isOutOfStock = availableStock === 0
  const isLowStock = availableStock > 0 && availableStock <= 5
  const showStockWarning = ['add', 'change', 'consumed', 'empty'].includes(selectedType || '')
  const showRefillSwitch = ['consumed', 'empty'].includes(selectedType || '')
  const showNotes = ['damaged', 'lost'].includes(selectedType || '')
  const isOverStandard = quantity > standardQuantity

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
      >
        <div className="mx-auto w-10 h-1 bg-muted rounded-full mt-2 mb-3" />
        <SheetHeader className="px-4 pb-3">
          <SheetTitle className="text-lg font-bold leading-tight">{itemName}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Tiêu chuẩn: {standardQuantity} • Báo sự cố để xử lý.
          </p>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-5">
          {/* Loại sự cố */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Loại sự cố
            </Label>
            {issueTypes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground italic">
                Không có hành động khả dụng cho loại đồ này.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {issueTypes.map(type => {
                  const cfg = ISSUE_CATALOG[type]
                  if (!cfg) return null
                  const isSelected = selectedType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        'h-14 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]',
                        isSelected ? cfg.color : 'border-border bg-background text-foreground hover:bg-muted/50'
                      )}
                    >
                      <span className="text-lg">{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Số lượng */}
          {selectedType && (
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Số lượng ảnh hưởng
              </Label>
              <div className="mt-2 flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <span className="flex-1 text-sm font-medium">Số lượng:</span>
                <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-14 text-center text-base font-bold tabular-nums">
                    {quantity} / {standardQuantity}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {isOverStandard && (
                <p className="mt-1.5 text-[11px] text-amber-600 px-1">
                  ⚠ Vượt tiêu chuẩn ({standardQuantity})
                </p>
              )}
            </div>
          )}

          {/* Cần bổ sung từ kho */}
          {selectedType && showRefillSwitch && (
            <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3">
              <div>
                <Label className="text-sm font-semibold">Cần bổ sung từ kho</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tự tạo phiếu yêu cầu bổ sung
                </p>
              </div>
              <Switch checked={needRefill} onCheckedChange={setNeedRefill} />
            </div>
          )}

          {/* Cảnh báo kho */}
          {selectedType && showStockWarning && isOutOfStock && (needRefill || !showRefillSwitch) && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Hết hàng trong kho! Cần nhập kho mới có thể bổ sung.
              </AlertDescription>
            </Alert>
          )}
          {selectedType && showStockWarning && isLowStock && (
            <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                Tồn kho thấp: chỉ còn {availableStock}
              </AlertDescription>
            </Alert>
          )}

          {/* Ghi chú cho hỏng/mất */}
          {selectedType && showNotes && (
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Ghi chú (tùy chọn)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={selectedType === 'damaged' ? 'Mô tả hư hỏng...' : 'Lý do/hoàn cảnh...'}
                className="mt-2 h-20 text-sm resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className={cn(
                'flex-1 h-12 rounded-xl font-bold',
                selectedType === 'lost' || selectedType === 'damaged' || selectedType === 'missing'
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : ''
              )}
              disabled={!selectedType}
              onClick={handleConfirm}
            >
              Lưu sự cố
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
