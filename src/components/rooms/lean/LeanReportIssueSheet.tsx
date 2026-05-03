import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'
import type { ItemType } from '@/types/items.types'

/**
 * LeanReportIssueSheet — 2 tầng, không VIP/dispute/laundry-special.
 *
 * L1 — Đúng 3 lựa chọn lớn:
 *   - 'damaged_lost'        → Đồ hỏng / mất
 *   - 'missing_replace'     → Thiếu / cần thay
 *   - 'consumed_chargeable' → Khách đã dùng / cần ghi nhận
 *
 * L2 — Form tối giản: stepper lớn, ảnh, "Tính phí khách?" (nếu phù hợp), note tự do.
 *
 * Map về model nội bộ (truyền lên parent):
 *   - damaged_lost        → kind: 'damaged' | 'lost' (mặc định 'damaged'; không tách phụ ở Lean)
 *   - missing_replace     → kind: 'missing'
 *   - consumed_chargeable → kind: 'consumed'  (charge_to_guest có/không)
 */

export type LeanIssueLevel1 = 'damaged_lost' | 'missing_replace' | 'consumed_chargeable'

export interface LeanIssueResult {
  level1: LeanIssueLevel1
  /** Chuẩn hoá để parent gom vào jsonb buckets */
  kind: 'damaged' | 'lost' | 'missing' | 'consumed'
  quantity: number
  photos: string[]
  chargeToGuest?: boolean
  notes?: string
}

export interface LeanReportIssueSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: ItemType
  standardQuantity: number
  /** Per-hotel rule: nhánh nào BẮT BUỘC ảnh */
  photoRequiredFor: {
    damaged_lost: boolean
    missing_replace: boolean
    consumed_chargeable: boolean
  }
  /** Khi edit lại 1 issue đã ghi nhận */
  initial?: Partial<LeanIssueResult> | null
  onSubmit: (result: LeanIssueResult) => void
}

const L1_OPTIONS: {
  key: LeanIssueLevel1
  title: string
  example: string
}[] = [
  {
    key: 'damaged_lost',
    title: 'Đồ hỏng / mất',
    example: 'Ví dụ: TV không lên, mất khăn tắm',
  },
  {
    key: 'missing_replace',
    title: 'Thiếu / cần thay',
    example: 'Ví dụ: Thiếu 1 gối, cần thay ga giường',
  },
  {
    key: 'consumed_chargeable',
    title: 'Khách đã dùng / cần ghi nhận',
    example: 'Ví dụ: Khách dùng 2 nước suối minibar',
  },
]

function deriveKind(l1: LeanIssueLevel1): LeanIssueResult['kind'] {
  if (l1 === 'damaged_lost') return 'damaged'
  if (l1 === 'missing_replace') return 'missing'
  return 'consumed'
}

export function LeanReportIssueSheet({
  open,
  onOpenChange,
  itemName,
  itemType,
  standardQuantity,
  photoRequiredFor,
  initial,
  onSubmit,
}: LeanReportIssueSheetProps) {
  const [level1, setLevel1] = useState<LeanIssueLevel1 | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [photos, setPhotos] = useState<string[]>([])
  const [chargeToGuest, setChargeToGuest] = useState<boolean>(true)
  const [notes, setNotes] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { tenantId } = useUser()
  const { uploadImage, isUploading } = useImageUpload()

  // Reset / hydrate mỗi lần mở
  useEffect(() => {
    if (!open) return
    const lvl = (initial?.level1 as LeanIssueLevel1) ?? null
    setLevel1(lvl)
    setQuantity(Math.max(1, initial?.quantity ?? 1))
    setPhotos(initial?.photos ?? [])
    // Mặc định nghiệp vụ:
    //  - consumed_chargeable → Có (khách dùng minibar/đồ tính phí)
    //  - damaged_lost → Không (housekeeping KHÔNG tự quyết phí, manager duyệt)
    const defaultCharge = lvl === 'consumed_chargeable'
    setChargeToGuest(initial?.chargeToGuest ?? defaultCharge)
    setNotes(initial?.notes ?? '')
    setUploadError(null)
  }, [open, initial])

  const photoRequired = useMemo(() => {
    if (!level1) return false
    return photoRequiredFor[level1] === true
  }, [level1, photoRequiredFor])

  const showChargeToggle = level1 === 'consumed_chargeable' || level1 === 'damaged_lost'

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    setUploadError(null)
    try {
      const uploaded = await uploadImage(file, tenantId)
      if (uploaded?.url) setPhotos((p) => [...p, uploaded.url])
    } catch (err: any) {
      setUploadError(
        'Ảnh chưa gửi lên được. Bạn có thể thử lại hoặc chụp ảnh khác.',
      )
    } finally {
      e.target.value = ''
    }
  }

  const handleSubmit = () => {
    if (!level1) return
    if (quantity < 1) {
      toast.error('Chọn số lượng cần xử lý.')
      return
    }
    if (photoRequired && photos.length === 0) {
      toast.error('Mục này cần ít nhất 1 ảnh để gửi.')
      return
    }
    onSubmit({
      level1,
      kind: deriveKind(level1),
      quantity,
      photos,
      chargeToGuest: showChargeToggle ? chargeToGuest : undefined,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[92vh] overflow-y-auto"
      >
        <div className="mx-auto w-10 h-1 bg-muted rounded-full mt-2 mb-3" />
        <SheetHeader className="px-4 pb-3 text-left">
          <SheetTitle className="text-[20px] font-bold leading-tight">
            {itemName}
          </SheetTitle>
          <p className="text-[14px] text-muted-foreground">
            Tiêu chuẩn: {standardQuantity}
          </p>
        </SheetHeader>

        {/* ====== L1: 3 lựa chọn lớn ====== */}
        {!level1 && (
          <div className="px-4 pb-6 space-y-3">
            <p className="text-[16px] text-muted-foreground">
              Chọn loại vấn đề
            </p>
            {L1_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setLevel1(opt.key)}
                className="w-full text-left rounded-xl border-2 px-4 py-4 active:bg-muted/50 hover:bg-muted/30 transition-colors"
                style={{ minHeight: 72 }}
              >
                <div className="text-[18px] font-semibold leading-tight">
                  {opt.title}
                </div>
                <div className="text-[14px] text-muted-foreground mt-1">
                  {opt.example}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ====== L2: form tối giản ====== */}
        {level1 && (
          <div className="px-4 pb-6 space-y-5">
            {/* Loại đã chọn (đổi nhanh) */}
            <button
              type="button"
              onClick={() => setLevel1(null)}
              className="text-[14px] text-muted-foreground underline"
            >
              ← Đổi loại vấn đề
            </button>

            {/* Quantity stepper LỚN */}
            <div>
              <Label className="text-[14px] font-semibold">
                Số lượng
              </Label>
              <div className="mt-2 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="rounded-xl border-2 text-2xl font-bold disabled:opacity-40 active:bg-muted/50"
                  style={{ width: 56, height: 56 }}
                  aria-label="Giảm"
                >
                  −
                </button>
                <div
                  className="text-center font-bold tabular-nums"
                  style={{ minWidth: 80, fontSize: 32 }}
                >
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="rounded-xl border-2 text-2xl font-bold active:bg-muted/50"
                  style={{ width: 56, height: 56 }}
                  aria-label="Tăng"
                >
                  +
                </button>
              </div>
              {quantity > standardQuantity && (
                <p className="mt-2 text-[13px] text-amber-600 text-center">
                  Vượt tiêu chuẩn ({standardQuantity})
                </p>
              )}
            </div>

            {/* Ảnh */}
            <div>
              <Label className="text-[14px] font-semibold">
                {photoRequired ? 'Ảnh (bắt buộc)' : 'Ảnh (nếu cần)'}
              </Label>

              {photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img
                        src={url}
                        alt=""
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((p) => p.filter((_, idx) => idx !== i))
                        }
                        aria-label="Xoá ảnh"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label
                  className={cn(
                    'rounded-xl border-2 flex items-center justify-center font-semibold text-[15px] cursor-pointer active:bg-muted/50',
                    isUploading && 'opacity-60 cursor-not-allowed',
                  )}
                  style={{ minHeight: 52 }}
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi...
                    </span>
                  ) : (
                    'Chụp ảnh'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePickPhoto}
                    disabled={isUploading}
                  />
                </label>
                <label
                  className={cn(
                    'rounded-xl border-2 flex items-center justify-center font-semibold text-[15px] cursor-pointer active:bg-muted/50',
                    isUploading && 'opacity-60 cursor-not-allowed',
                  )}
                  style={{ minHeight: 52 }}
                >
                  {isUploading ? '...' : 'Chọn từ máy'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePickPhoto}
                    disabled={isUploading}
                  />
                </label>
              </div>

              {uploadError && (
                <p className="mt-2 text-[13px] text-destructive">
                  {uploadError}
                </p>
              )}
              {photoRequired && photos.length === 0 && !uploadError && (
                <p className="mt-2 text-[13px] text-destructive">
                  Mục này cần ít nhất 1 ảnh để gửi.
                </p>
              )}
            </div>

            {/* Tính phí khách? */}
            {showChargeToggle && (
              <div>
                <Label className="text-[14px] font-semibold">
                  Tính phí khách?
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeToGuest(true)}
                    className={cn(
                      'rounded-xl border-2 font-semibold text-[16px] active:bg-muted/50',
                      chargeToGuest
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border bg-background text-foreground',
                    )}
                    style={{ minHeight: 56 }}
                  >
                    Có
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeToGuest(false)}
                    className={cn(
                      'rounded-xl border-2 font-semibold text-[16px] active:bg-muted/50',
                      !chargeToGuest
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border bg-background text-foreground',
                    )}
                    style={{ minHeight: 56 }}
                  >
                    Không
                  </button>
                </div>
              </div>
            )}

            {/* Note tự do */}
            <div>
              <Label className="text-[14px] font-semibold">
                Ghi chú (tuỳ chọn)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Thiếu 1 khăn tắm lớn"
                className="mt-2 text-[16px] resize-none"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full font-semibold text-[18px]"
                style={{ minHeight: 56 }}
                disabled={photoRequired && photos.length === 0}
              >
                Lưu mục này
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full font-medium text-[16px]"
                style={{ minHeight: 52 }}
              >
                Huỷ
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export type { ItemType }
