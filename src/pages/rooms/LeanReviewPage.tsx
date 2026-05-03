import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRoom } from '@/hooks/useRooms'
import { readLeanDraft, clearLeanDraft } from '@/hooks/useLeanDraft'
import { useSubmitRoomCheckLean } from '@/hooks/useRoomCheckLean'
import { useRoomCheckLeanConfig } from '@/hooks/useRoomCheckLeanConfig'
import { sanitizeLeanDraft, preSubmitValidate } from '@/lib/roomCheckLeanErrors'
import {
  LeanInlineError,
  LeanFullScreenError,
  LEAN_TEXT,
} from '@/components/rooms/lean/LeanStates'

type LeanCheckType = 'daily' | 'periodic' | 'checkin' | 'checkout' | 'maintenance'

interface LeanIssue {
  item_id: string
  item_name: string
  item_type: string
  level1: 'damaged_lost' | 'missing_replace' | 'consumed_chargeable'
  kind: 'damaged' | 'lost' | 'missing' | 'consumed'
  quantity: number
  photos: string[]
  chargeToGuest?: boolean
  notes?: string
}

interface DraftShape {
  startedAt: string
  issues: Record<string, LeanIssue>
  minibar: Record<string, number>
}

const CHECK_TYPE_LABEL: Record<string, string> = {
  daily: 'Kiểm hằng ngày',
  periodic: 'Kiểm định kỳ',
  checkin: 'Nhận phòng',
  checkout: 'Trả phòng',
  maintenance: 'Bảo trì',
}

const ISSUE_LABEL: Record<LeanIssue['level1'], string> = {
  damaged_lost: 'Đồ hỏng / mất',
  missing_replace: 'Thiếu / cần thay',
  consumed_chargeable: 'Khách đã dùng',
}

export default function LeanReviewPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const checkType: LeanCheckType =
    (params.get('type') as LeanCheckType) || 'daily'
  const startedAtFromQuery = params.get('started') || ''

  const { data: roomData, isLoading, isError, refetch } = useRoom(id)
  const room = roomData?.room
  const items = roomData?.items ?? []

  const [note, setNote] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const draftRef = useRef<DraftShape | null>(null)

  // Đọc draft 1 lần — sanitize chống missing/invalid fields
  if (!draftRef.current && id) {
    const env = readLeanDraft<DraftShape>(id)
    const raw: any = env?.data
    if (raw && typeof raw === 'object') {
      const safeIssues: Record<string, LeanIssue> = {}
      Object.entries(raw.issues || {}).forEach(([k, v]: [string, any]) => {
        if (!v || typeof v !== 'object') return
        const qty = Number(v.quantity)
        if (!v.item_id || !v.kind || !Number.isFinite(qty) || qty <= 0) return
        safeIssues[k] = {
          item_id: String(v.item_id),
          item_name: String(v.item_name || ''),
          item_type: String(v.item_type || ''),
          level1: v.level1 || 'damaged_lost',
          kind: v.kind,
          quantity: qty,
          photos: Array.isArray(v.photos) ? v.photos.filter((p: any) => typeof p === 'string') : [],
          chargeToGuest: typeof v.chargeToGuest === 'boolean' ? v.chargeToGuest : undefined,
          notes: typeof v.notes === 'string' ? v.notes : undefined,
        }
      })
      const safeMinibar: Record<string, number> = {}
      Object.entries(raw.minibar || {}).forEach(([k, v]: [string, any]) => {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) safeMinibar[k] = n
      })
      draftRef.current = {
        startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
        issues: safeIssues,
        minibar: safeMinibar,
      }
    } else {
      draftRef.current = null
    }
  }
  const draft = draftRef.current

  const issues = useMemo(() => Object.values(draft?.issues || {}), [draft])
  const minibar = useMemo(
    () =>
      Object.entries(draft?.minibar || {})
        .filter(([, q]) => (q as number) > 0)
        .map(([itemId, qty]) => {
          const it = items.find((i) => i.item_id === itemId)
          return { item_id: itemId, name: it?.item_name || 'Mục minibar', qty: qty as number }
        }),
    [draft, items],
  )

  const totalItems = items.length
  const issueCount = issues.length
  const minibarCount = minibar.reduce((sum, m) => sum + m.qty, 0)
  const okCount = Math.max(0, totalItems - issueCount)

  const submitMutation = useSubmitRoomCheckLean()

  const handleEditIssue = (itemId: string) => {
    navigate(
      `/rooms/${id}/check-lean/inspection?type=${checkType}&resume=true&edit=${itemId}`,
    )
  }

  const handleBackToInspection = () => {
    navigate(
      `/rooms/${id}/check-lean/inspection?type=${checkType}&resume=true`,
    )
  }

  const { data: leanCfg } = useRoomCheckLeanConfig(room?.hotel_id)

  const handleSubmit = async () => {
    if (!id) return
    setSubmitError(null)

    // Client-side pre-validation — sớm, rõ ràng, không gọi mạng nếu hỏng
    const badQty = issues.find((i) => !(Number(i.quantity) > 0))
    if (badQty) {
      setSubmitError(`Số lượng phải lớn hơn 0 cho "${badQty.item_name || 'một mục đã ghi'}".`)
      return
    }
    if (leanCfg) {
      if (leanCfg.photo_required_damaged_lost) {
        const miss = issues.find(
          (i) => (i.kind === 'damaged' || i.kind === 'lost') && (!i.photos || i.photos.length === 0),
        )
        if (miss) {
          setSubmitError(`Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Hỏng / Mất).`)
          return
        }
      }
      if (leanCfg.photo_required_missing_replace) {
        const miss = issues.find(
          (i) => i.kind === 'missing' && (!i.photos || i.photos.length === 0),
        )
        if (miss) {
          setSubmitError(`Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Thiếu / Cần thay).`)
          return
        }
      }
      if (leanCfg.photo_required_consumed_chargeable) {
        const miss = issues.find(
          (i) => i.kind === 'consumed' && (i.chargeToGuest ?? true) && (!i.photos || i.photos.length === 0),
        )
        if (miss) {
          setSubmitError(`Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Khách đã dùng – tính phí).`)
          return
        }
      }
    }

    // Group issues theo kind
    const itemsDamaged = issues
      .filter((i) => i.kind === 'damaged')
      .map((i) => ({
        item_id: i.item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        photos: i.photos,
        notes: i.notes,
        charge_to_guest: i.chargeToGuest ?? false,
      }))
    const itemsLost = issues
      .filter((i) => i.kind === 'lost')
      .map((i) => ({
        item_id: i.item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        photos: i.photos,
        notes: i.notes,
        charge_to_guest: i.chargeToGuest ?? false,
      }))
    const itemsMissing = issues
      .filter((i) => i.kind === 'missing')
      .map((i) => ({
        item_id: i.item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        photos: i.photos,
        notes: i.notes,
      }))
    const itemsConsumed = [
      ...issues
        .filter((i) => i.kind === 'consumed')
        .map((i) => ({
          item_id: i.item_id,
          item_name: i.item_name,
          quantity: i.quantity,
          photos: i.photos,
          notes: i.notes,
          charge_to_guest: i.chargeToGuest ?? true,
        })),
      ...minibar.map((m) => ({
        item_id: m.item_id,
        item_name: m.name,
        quantity: m.qty,
        photos: [],
        charge_to_guest: true,
        source: 'minibar',
      })),
    ]

    const allPhotos = issues.flatMap((i) => i.photos)

    try {
      const res = await submitMutation.mutateAsync({
        roomId: id,
        checkType,
        startedAt:
          draft?.startedAt || startedAtFromQuery || new Date().toISOString(),
        notes: note.trim() || null,
        photos: allPhotos,
        itemsMissing,
        itemsDamaged,
        itemsLost,
        itemsConsumed,
        itemsReplaced: [],
      })
      // Clear draft
      clearLeanDraft(id)
      navigate(
        `/rooms/${id}/check-lean/success?type=${checkType}&issues=${
          res.summary_issue_count
        }&checkId=${res.check_id}`,
        { replace: true },
      )
    } catch (e: any) {
      setSubmitError(e?.message || LEAN_TEXT.errNetwork)
    }
  }

  // ───────── Loading ─────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="px-4 pt-3 pb-3 border-b">
          <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        </header>
        <main className="flex-1 px-4 py-6 space-y-3">
          <div className="h-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
        </main>
      </div>
    )
  }

  if (isError || !room) {
    return (
      <LeanFullScreenError
        title="Không mở được thông tin phòng này"
        message="Bạn hãy thử lại. Nếu vẫn không được, hãy quay về danh sách việc."
        primaryLabel="Thử lại"
        onPrimary={() => refetch()}
        secondaryLabel="Quay về danh sách việc"
        onSecondary={() => navigate('/my-tasks')}
      />
    )
  }

  const isEmpty = issueCount === 0 && minibarCount === 0

  return (
    <div className="min-h-screen flex flex-col bg-background pb-[calc(env(safe-area-inset-bottom)+128px)]">
      {/* Header */}
      <header className="px-4 pt-3 pb-3 border-b sticky top-0 bg-background z-10">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToInspection}
            aria-label="Quay lại"
            className="-ml-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold leading-tight truncate"
              style={{ fontSize: 22 }}
            >
              Phòng {room.room_number}
            </h1>
            <div className="text-[14px] text-muted-foreground">
              Bước 3/3 — Gửi kết quả kiểm tra
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Summary card */}
        <section className="rounded-xl border bg-card p-4">
          <p className="text-[13px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Tổng kết
          </p>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCell value={okCount} label="mục ổn" tone="ok" />
            <SummaryCell value={issueCount} label="vấn đề" tone="warn" />
            <SummaryCell value={minibarCount} label="minibar" tone="neutral" />
          </div>
          {isEmpty && (
            <p className="mt-3 text-[15px] text-green-700 font-medium">
              Không có vấn đề nào. Phòng sạch.
            </p>
          )}
        </section>

        {/* Issues */}
        {issueCount > 0 && (
          <section>
            <h2 className="text-[14px] font-bold uppercase tracking-wide mb-2 text-muted-foreground">
              Vấn đề đã ghi nhận
            </h2>
            <ul className="space-y-2">
              {issues.map((iss) => (
                <li
                  key={iss.item_id}
                  className="rounded-xl border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold leading-tight">
                        {iss.item_name}
                      </p>
                      <p className="text-[14px] text-amber-700 mt-0.5">
                        {ISSUE_LABEL[iss.level1]} · SL {iss.quantity}
                        {iss.chargeToGuest === true && ' · Tính phí khách'}
                      </p>
                      {iss.notes && (
                        <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                          {iss.notes}
                        </p>
                      )}
                      {iss.photos.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {iss.photos.slice(0, 4).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-12 h-12 rounded-md object-cover border"
                            />
                          ))}
                          {iss.photos.length > 4 && (
                            <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center text-[12px] font-medium">
                              +{iss.photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditIssue(iss.item_id)}
                      className="rounded-lg border-2 px-3 text-[14px] font-semibold active:bg-muted/50"
                      style={{ minHeight: 44 }}
                    >
                      Sửa lại
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Minibar */}
        {minibar.length > 0 && (
          <section>
            <h2 className="text-[14px] font-bold uppercase tracking-wide mb-2 text-muted-foreground">
              Minibar đã dùng
            </h2>
            <ul className="rounded-xl border bg-card divide-y">
              {minibar.map((m) => (
                <li
                  key={m.item_id}
                  className="px-3 py-3 flex items-center justify-between"
                >
                  <span className="text-[16px]">{m.name}</span>
                  <span className="text-[16px] font-semibold tabular-nums">
                    × {m.qty}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Note */}
        <section>
          <h2 className="text-[14px] font-bold uppercase tracking-wide mb-2 text-muted-foreground">
            Ghi chú chung (tuỳ chọn)
          </h2>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Điều hòa vẫn hoạt động, chỉ thiếu remote"
            rows={3}
            className="text-[16px] resize-none"
          />
        </section>

        {/* Submit error */}
        {submitError && (
          <LeanInlineError
            message={submitError}
            onRetry={() => handleSubmit()}
          />
        )}
      </main>

      {/* Sticky footer */}
      <footer className="fixed left-0 right-0 bottom-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-background border-t z-20">
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full text-[18px] font-semibold"
            style={{ minHeight: 56 }}
          >
            {submitMutation.isPending && (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            )}
            {submitMutation.isPending
              ? LEAN_TEXT.submitting
              : 'Gửi kết quả kiểm tra'}
          </Button>
          <Button
            variant="outline"
            onClick={handleBackToInspection}
            disabled={submitMutation.isPending}
            className="w-full text-[16px] font-medium"
            style={{ minHeight: 52 }}
          >
            Quay lại sửa
          </Button>
        </div>
      </footer>
    </div>
  )
}

function SummaryCell({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: 'ok' | 'warn' | 'neutral'
}) {
  const toneCls =
    tone === 'ok'
      ? 'text-green-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : 'text-foreground'
  return (
    <div className="text-center">
      <div className={`text-[28px] font-bold tabular-nums leading-none ${toneCls}`}>
        {value}
      </div>
      <div className="text-[12px] text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
