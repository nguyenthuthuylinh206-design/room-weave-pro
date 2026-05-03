/**
 * Mapping lỗi server (UPPER_SNAKE / lowercase tag) → thông điệp tiếng Việt cho UI Lean.
 * Tách ra module thuần để có thể unit-test mà không phải mock supabase.
 */
export function mapLeanError(msg: string, rateLimitMin = 30): string {
  if (!msg) return 'Đã có lỗi không xác định. Vui lòng thử lại.'
  if (msg.includes('conflict_room_updated'))
    return 'Phòng này vừa có người cập nhật. Bạn cần tải lại trước khi gửi kết quả.'
  if (msg.includes('photo_required:damaged_lost'))
    return 'Cần chụp ảnh bằng chứng cho mục Hỏng / Mất trước khi gửi.'
  if (msg.includes('photo_required:missing_replace'))
    return 'Cần chụp ảnh bằng chứng cho mục Thiếu / Cần thay trước khi gửi.'
  if (msg.includes('photo_required:consumed_chargeable'))
    return 'Cần chụp ảnh bằng chứng cho mục Khách đã dùng (tính phí) trước khi gửi.'
  if (msg.includes('photo_required'))
    return 'Khách sạn yêu cầu chụp ảnh bằng chứng khi kiểm phòng.'
  if (msg.includes('invalid_quantity'))
    return 'Số lượng phải lớn hơn 0. Vui lòng kiểm tra lại các mục đã nhập.'
  if (msg.includes('invalid_check_type'))
    return 'Loại kiểm phòng không hợp lệ.'
  if (msg.includes('task_not_found'))
    return 'Không tìm thấy công việc liên quan.'
  if (msg.includes('quick_path_disabled'))
    return 'Khách sạn đã tắt chế độ kiểm nhanh.'
  if (msg.startsWith('quick_rate_limited') || msg.includes('quick_rate_limited:')) {
    const m = msg.match(/quick_rate_limited:(\d+)/)
    const min = m ? Number(m[1]) : rateLimitMin
    return `Vừa có lần kiểm nhanh. Vui lòng đợi đủ ${min} phút giữa hai lần kiểm nhanh.`
  }
  if (msg.includes('quick_path_not_allowed'))
    return 'Loại kiểm này không hỗ trợ chế độ nhanh.'
  if (msg.includes('forbidden_tenant'))
    return 'Bạn không có quyền thao tác trên dữ liệu của khách sạn này.'
  if (msg.includes('forbidden_role'))
    return 'Bạn không có quyền thực hiện thao tác này.'
  if (msg.includes('room_not_found')) return 'Không tìm thấy phòng.'
  if (msg.includes('check_not_found')) return 'Không tìm thấy bản kiểm.'
  if (msg.includes('unauthorized')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  return msg
}

// ───────────────────────── Draft sanitizer ─────────────────────────

export type LeanIssueKind = 'damaged' | 'lost' | 'missing' | 'consumed'
export type LeanIssueLevel1 = 'damaged_lost' | 'missing_replace' | 'consumed_chargeable'

export interface SanitizedLeanIssue {
  item_id: string
  item_name: string
  item_type: string
  level1: LeanIssueLevel1
  kind: LeanIssueKind
  quantity: number
  photos: string[]
  chargeToGuest?: boolean
  notes?: string
}

export interface SanitizedLeanDraft {
  startedAt: string
  issues: Record<string, SanitizedLeanIssue>
  minibar: Record<string, number>
}

const VALID_KINDS: LeanIssueKind[] = ['damaged', 'lost', 'missing', 'consumed']
const VALID_LEVEL1: LeanIssueLevel1[] = ['damaged_lost', 'missing_replace', 'consumed_chargeable']

/**
 * Chịu được draft thiếu/sai field. Drop entry không hợp lệ thay vì throw.
 */
export function sanitizeLeanDraft(raw: unknown): SanitizedLeanDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as any
  const safeIssues: Record<string, SanitizedLeanIssue> = {}
  if (r.issues && typeof r.issues === 'object') {
    for (const [k, v] of Object.entries(r.issues)) {
      const it = v as any
      if (!it || typeof it !== 'object') continue
      const qty = Number(it.quantity)
      if (!it.item_id || !VALID_KINDS.includes(it.kind) || !Number.isFinite(qty) || qty <= 0) continue
      const level1: LeanIssueLevel1 = VALID_LEVEL1.includes(it.level1) ? it.level1 : 'damaged_lost'
      safeIssues[k] = {
        item_id: String(it.item_id),
        item_name: String(it.item_name || ''),
        item_type: String(it.item_type || ''),
        level1,
        kind: it.kind,
        quantity: qty,
        photos: Array.isArray(it.photos) ? it.photos.filter((p: any) => typeof p === 'string') : [],
        chargeToGuest: typeof it.chargeToGuest === 'boolean' ? it.chargeToGuest : undefined,
        notes: typeof it.notes === 'string' ? it.notes : undefined,
      }
    }
  }
  const safeMinibar: Record<string, number> = {}
  if (r.minibar && typeof r.minibar === 'object') {
    for (const [k, v] of Object.entries(r.minibar)) {
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) safeMinibar[k] = n
    }
  }
  return {
    startedAt: typeof r.startedAt === 'string' ? r.startedAt : new Date().toISOString(),
    issues: safeIssues,
    minibar: safeMinibar,
  }
}

// ───────── Pre-submit validation theo per-hotel config ─────────

export interface LeanPhotoConfig {
  photo_required_damaged_lost: boolean
  photo_required_missing_replace: boolean
  photo_required_consumed_chargeable: boolean
}

export interface PreSubmitInput {
  issues: SanitizedLeanIssue[]
  config?: LeanPhotoConfig | null
}

export interface PreSubmitError {
  code:
    | 'invalid_quantity'
    | 'photo_required:damaged_lost'
    | 'photo_required:missing_replace'
    | 'photo_required:consumed_chargeable'
  itemName: string
  message: string
}

/**
 * Trả về null nếu OK, hoặc lỗi đầu tiên gặp phải (item-level).
 */
export function preSubmitValidate({ issues, config }: PreSubmitInput): PreSubmitError | null {
  const badQty = issues.find((i) => !(Number(i.quantity) > 0))
  if (badQty) {
    return {
      code: 'invalid_quantity',
      itemName: badQty.item_name || 'một mục',
      message: `Số lượng phải lớn hơn 0 cho "${badQty.item_name || 'một mục đã ghi'}".`,
    }
  }
  if (!config) return null

  if (config.photo_required_damaged_lost) {
    const miss = issues.find(
      (i) => (i.kind === 'damaged' || i.kind === 'lost') && (!i.photos || i.photos.length === 0),
    )
    if (miss) {
      return {
        code: 'photo_required:damaged_lost',
        itemName: miss.item_name,
        message: `Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Hỏng / Mất).`,
      }
    }
  }
  if (config.photo_required_missing_replace) {
    const miss = issues.find(
      (i) => i.kind === 'missing' && (!i.photos || i.photos.length === 0),
    )
    if (miss) {
      return {
        code: 'photo_required:missing_replace',
        itemName: miss.item_name,
        message: `Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Thiếu / Cần thay).`,
      }
    }
  }
  if (config.photo_required_consumed_chargeable) {
    const miss = issues.find(
      (i) =>
        i.kind === 'consumed' &&
        (i.chargeToGuest ?? true) &&
        (!i.photos || i.photos.length === 0),
    )
    if (miss) {
      return {
        code: 'photo_required:consumed_chargeable',
        itemName: miss.item_name,
        message: `Cần chụp ảnh bằng chứng cho "${miss.item_name}" (Khách đã dùng – tính phí).`,
      }
    }
  }
  return null
}
