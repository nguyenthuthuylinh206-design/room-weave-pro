import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

// Catalog tình trạng — không emoji, chỉ chữ + màu chữ semantic khi chọn
const ISSUE_CATALOG: Record<string, { label: string; color: string }> = {
  laundry:  { label: 'Bẩn (cần giặt)', color: 'border-blue-500 text-blue-700' },
  change:   { label: 'Đã thay',         color: 'border-primary text-primary' },
  add:      { label: 'Đã thêm',         color: 'border-green-500 text-green-700' },
  missing:  { label: 'Thiếu',           color: 'border-amber-500 text-amber-700' },
  damaged:  { label: 'Hỏng',            color: 'border-amber-600 text-amber-700' },
  lost:     { label: 'Mất',             color: 'border-destructive text-destructive' },
  consumed: { label: 'Đã dùng',         color: 'border-cyan-500 text-cyan-700' },
  empty:    { label: 'Hết',             color: 'border-cyan-500 text-cyan-700' },
}

const ITEM_TYPE_ACTIONS: Record<ItemType, string[]> = {
  linen:      ['laundry', 'change', 'add', 'missing', 'damaged', 'lost'],
  consumable: ['consumed', 'empty', 'missing', 'lost'],
  equipment:  ['damaged', 'missing', 'lost'],
  furniture:  ['damaged', 'missing', 'lost'],
}
const PRIORITY = ['missing', 'damaged', 'laundry', 'empty', 'consumed', 'change', 'add', 'lost']

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

  useEffect(() => {
    if (open) {
      setSelectedType(null)
      setQuantity(1)
      setNeedRefill(true)
      setNotes('')
    }
  }, [open])

  // Linen: nếu config cho phép `laundry` thì luôn cho hiện "Bẩn (cần giặt)" map sang laundry
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
        <SheetHeader className="px-4 pb-3 text-left">
          <SheetTitle className="text-base font-bold leading-tight">{itemName}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Tiêu chuẩn: {standardQuantity} · Cập nhật tình trạng thực tế.
          </p>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Tình trạng */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Tình trạng
            </Label>
            {issueTypes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground italic">
                Không có tình trạng khả dụng cho loại đồ này.
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
                        'h-11 rounded-md border-2 font-semibold text-sm transition-colors active:bg-muted/50',
                        isSelected
                          ? cfg.color
                          : 'border-border bg-background text-foreground hover:bg-muted/40'
                      )}
                    >
                      {cfg.label}
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
                Số lượng
              </Label>
              <div className="mt-2 flex items-center gap-3 border rounded-md p-2">
                <span className="flex-1 text-sm">Số lượng ảnh hưởng</span>
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    type="button"
                    className="h-9 w-9 text-lg font-semibold hover:bg-muted disabled:opacity-40"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <div className="w-14 text-center text-sm font-bold tabular-nums">
                    {quantity} / {standardQuantity}
                  </div>
                  <button
                    type="button"
                    className="h-9 w-9 text-lg font-semibold hover:bg-muted"
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              {isOverStandard && (
                <p className="mt-1.5 text-[11px] text-amber-600 px-1">
                  Vượt tiêu chuẩn ({standardQuantity})
                </p>
              )}
            </div>
          )}

          {/* Tạo phiếu bổ sung */}
          {selectedType && showRefillSwitch && (
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="text-sm font-medium">Tạo phiếu bổ sung từ kho</Label>
              <Switch checked={needRefill} onCheckedChange={setNeedRefill} />
            </div>
          )}

          {/* Cảnh báo kho — chỉ text, không icon */}
          {selectedType && showStockWarning && isOutOfStock && (needRefill || !showRefillSwitch) && (
            <p className="text-xs text-destructive px-1">
              Hết hàng trong kho. Cần nhập kho mới có thể bổ sung.
            </p>
          )}
          {selectedType && showStockWarning && isLowStock && (
            <p className="text-xs text-amber-600 px-1">
              Tồn kho thấp: chỉ còn {availableStock}.
            </p>
          )}

          {/* Ghi chú */}
          {selectedType && showNotes && (
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Ghi chú (tùy chọn)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={selectedType === 'damaged' ? 'Mô tả tình trạng hư hỏng...' : 'Lý do/hoàn cảnh...'}
                className="mt-2 h-20 text-sm resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 font-semibold"
              disabled={!selectedType}
              onClick={handleConfirm}
            >
              Lưu
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
