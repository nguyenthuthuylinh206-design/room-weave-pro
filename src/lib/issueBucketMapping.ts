/**
 * Issue UI → Bucket mapping (Decision v1.2 §6.3)
 *
 * Trả về:
 *  - bucket: chỗ ghi vào jsonb room_checks
 *  - issue_role: 'primary_issue' (housekeeper báo trực tiếp) | 'derived_action' (hệ thống suy ra)
 *  - needs_review: có cần manager xem không
 *  - extra: field bổ sung snapshot vào entry
 */
import type { AssetGroup, IssueBucket } from '@/types/assetGroup.types'

export type IssueRole = 'primary_issue' | 'derived_action'

export interface BucketResolution {
  bucket: IssueBucket
  issue_role: IssueRole
  needs_review: boolean
  extra?: Record<string, any>
}

/**
 * Key format: `<assetGroup>.<actionId>`
 * Ví dụ: 'linen.send_laundry', 'minibar.consumed_by_guest'
 */
export const BUCKET_MAP: Record<string, BucketResolution> = {
  // ─── LINEN ───
  'linen.send_laundry': {
    bucket: 'items_sent_to_laundry',
    issue_role: 'primary_issue',
    needs_review: false,
  },
  'linen.dirty_unrecoverable': {
    bucket: 'items_sent_to_laundry',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { quality_issue: true },
  },
  'linen.lifecycle_end': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { retire_reason: 'lifecycle' },
  },
  'linen.lost': {
    bucket: 'items_lost',
    issue_role: 'primary_issue',
    needs_review: true,
  },
  'linen.need_more': {
    bucket: 'items_replaced',
    issue_role: 'primary_issue',
    needs_review: false,
  },

  // ─── CONSUMABLE_FREE ───
  'consumable_free.used_up': {
    bucket: 'items_consumed',
    issue_role: 'primary_issue',
    needs_review: false,
  },
  'consumable_free.refill': {
    bucket: 'items_replaced',
    issue_role: 'derived_action',
    needs_review: false,
  },
  'consumable_free.missing': {
    bucket: 'items_missing',
    issue_role: 'primary_issue',
    needs_review: true,
  },

  // ─── MINIBAR ───
  'minibar.consumed_by_guest': {
    bucket: 'items_consumed',
    issue_role: 'primary_issue',
    needs_review: false,
    extra: { charge_to_guest: true },
  },
  'minibar.missing_no_charge': {
    bucket: 'items_missing',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { charge_to_guest: false },
  },
  'minibar.expired': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { reason: 'expired' },
  },

  // ─── STATIONERY ───
  'stationery.used_up': {
    bucket: 'items_consumed',
    issue_role: 'primary_issue',
    needs_review: false,
  },
  'stationery.missing': {
    bucket: 'items_missing',
    issue_role: 'primary_issue',
    needs_review: false,
  },
  'stationery.refill': {
    bucket: 'items_replaced',
    issue_role: 'derived_action',
    needs_review: false,
  },

  // ─── EQUIPMENT_LARGE ───
  'equipment_large.broken': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { create_maintenance: true },
  },
  'equipment_large.missing': {
    bucket: 'items_lost',
    issue_role: 'primary_issue',
    needs_review: true,
  },
  'equipment_large.unknown_cause': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { unknown_cause: true },
  },

  // ─── ELECTRONIC_ACCESSORY ───
  'electronic_accessory.missing': {
    bucket: 'items_lost',
    issue_role: 'primary_issue',
    needs_review: true,
  },
  'electronic_accessory.broken': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
  },

  // ─── FURNITURE ───
  'furniture.damaged': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { create_maintenance: true },
  },
  'furniture.stained': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { reason: 'stained' },
  },

  // ─── GLASSWARE ───
  'glassware.broken': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: false,
  },
  'glassware.missing': {
    bucket: 'items_lost',
    issue_role: 'primary_issue',
    needs_review: true,
  },
  'glassware.replace': {
    bucket: 'items_replaced',
    issue_role: 'derived_action',
    needs_review: false,
  },

  // ─── BATHROOM_HARDWARE ───
  'bathroom_hardware.broken': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { create_maintenance: true },
  },
  'bathroom_hardware.leaking': {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { reason: 'leaking', create_maintenance: true },
  },
  'bathroom_hardware.missing': {
    bucket: 'items_lost',
    issue_role: 'primary_issue',
    needs_review: true,
  },
}

/**
 * L1 options theo asset_group — tối đa 4 lựa chọn cho mobile
 */
export interface L1Option {
  key: string
  title: string
  example: string
  defaultCharge?: boolean
  /** Có yêu cầu sub_reason text không */
  subReasonRequired?: boolean
}

const UNKNOWN_OPTION = (group: AssetGroup): L1Option => ({
  key: `${group}.unknown_cause`,
  title: 'Chưa rõ nguyên nhân',
  example: 'Khi không chắc nguyên nhân — quản lý sẽ xem lại',
  subReasonRequired: false,
})

export const L1_BY_GROUP: Record<AssetGroup, L1Option[]> = {
  linen: [
    { key: 'linen.send_laundry', title: 'Gửi giặt', example: 'Khăn / ga đã dùng cần giặt' },
    { key: 'linen.dirty_unrecoverable', title: 'Bẩn không cứu được', example: 'Vết máu, hoá chất, ố nặng', subReasonRequired: true },
    { key: 'linen.lifecycle_end', title: 'Hết vòng đời', example: 'Sờn, mỏng, thủng — cần thay mới' },
    { key: 'linen.lost', title: 'Mất', example: 'Khách lấy hoặc thất lạc' },
  ],
  consumable_free: [
    { key: 'consumable_free.used_up', title: 'Khách đã dùng hết', example: 'Nước suối, dầu gội, kem đánh răng' },
    { key: 'consumable_free.missing', title: 'Thiếu / mất', example: 'Không có trong phòng' },
    { key: 'consumable_free.refill', title: 'Bổ sung mới', example: 'Đặt thêm cho khách' },
  ],
  minibar: [
    { key: 'minibar.consumed_by_guest', title: 'Khách đã dùng (tính phí)', example: 'Bia, snack, mì gói', defaultCharge: true },
    { key: 'minibar.missing_no_charge', title: 'Thiếu nhưng không tính phí', example: 'Đã có sẵn lúc khách nhận phòng' },
    { key: 'minibar.expired', title: 'Hàng hết hạn', example: 'Cần huỷ và bổ sung lô mới' },
  ],
  stationery: [
    { key: 'stationery.used_up', title: 'Khách đã dùng', example: 'Bút, giấy note, phong bì' },
    { key: 'stationery.missing', title: 'Thiếu / mất', example: 'Không còn trong phòng' },
    { key: 'stationery.refill', title: 'Bổ sung mới', example: 'Đặt thêm cho khách' },
  ],
  equipment_large: [
    { key: 'equipment_large.broken', title: 'Hỏng — cần sửa', example: 'TV, điều hoà, tủ lạnh không chạy', subReasonRequired: true },
    { key: 'equipment_large.missing', title: 'Mất', example: 'Không còn trong phòng — báo manager' },
  ],
  electronic_accessory: [
    { key: 'electronic_accessory.missing', title: 'Mất', example: 'Remote, dây sạc, cốc sạc' },
    { key: 'electronic_accessory.broken', title: 'Hỏng', example: 'Remote không bấm được, sạc không vào điện' },
  ],
  furniture: [
    { key: 'furniture.damaged', title: 'Hư hỏng', example: 'Ghế gãy chân, bàn nứt mặt', subReasonRequired: true },
    { key: 'furniture.stained', title: 'Vết bẩn lớn', example: 'Sofa dính rượu, ga đệm vết loang' },
  ],
  glassware: [
    { key: 'glassware.broken', title: 'Vỡ', example: 'Cốc, ly, bình hoa' },
    { key: 'glassware.missing', title: 'Mất', example: 'Không còn trong phòng' },
    { key: 'glassware.replace', title: 'Bổ sung mới', example: 'Thay thế cái đã vỡ / mất' },
  ],
  bathroom_hardware: [
    { key: 'bathroom_hardware.broken', title: 'Hỏng', example: 'Vòi sen, gương, chậu rửa', subReasonRequired: true },
    { key: 'bathroom_hardware.leaking', title: 'Rò rỉ nước', example: 'Vòi, ống thoát chảy nước', subReasonRequired: true },
    { key: 'bathroom_hardware.missing', title: 'Mất', example: 'Phụ kiện gắn tường bị tháo' },
  ],
}

/**
 * Trả về L1 options + UNKNOWN_OPTION cuối danh sách (mọi group đều có)
 */
export function getL1Options(group: AssetGroup): L1Option[] {
  const opts = L1_BY_GROUP[group] ?? []
  return [...opts, UNKNOWN_OPTION(group)]
}

export function resolveBucket(actionKey: string): BucketResolution {
  const found = BUCKET_MAP[actionKey]
  if (found) return found
  // Fallback: ghi tạm vào damaged + needs_review
  return {
    bucket: 'items_damaged',
    issue_role: 'primary_issue',
    needs_review: true,
    extra: { fallback_action: actionKey },
  }
}
