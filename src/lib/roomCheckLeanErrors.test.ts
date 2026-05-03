import { describe, it, expect } from 'vitest'
import {
  mapLeanError,
  sanitizeLeanDraft,
  preSubmitValidate,
  type SanitizedLeanIssue,
} from './roomCheckLeanErrors'

describe('mapLeanError', () => {
  it('maps conflict to Vietnamese reload message', () => {
    expect(mapLeanError('conflict_room_updated').message).toContain('tải lại trước khi gửi')
  })

  it.each([
    ['photo_required:damaged_lost', 'Hỏng / Mất'],
    ['photo_required:missing_replace', 'Thiếu / Cần thay'],
    ['photo_required:consumed_chargeable', 'Khách đã dùng'],
  ])('maps %s to specific bucket message', (code, hint) => {
    expect(mapLeanError(code).message).toContain(hint)
  })

  it('extracts itemId from server error tag', () => {
    const out = mapLeanError('photo_required:damaged_lost:550e8400-e29b-41d4-a716-446655440000')
    expect(out.itemId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(out.message).toContain('Hỏng / Mất')
  })

  it('extracts itemId from invalid_quantity', () => {
    const out = mapLeanError('invalid_quantity:550e8400-e29b-41d4-a716-446655440000')
    expect(out.itemId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(out.message).toMatch(/lớn hơn 0/)
  })

  it('maps invalid_quantity without itemId', () => {
    expect(mapLeanError('invalid_quantity').message).toMatch(/lớn hơn 0/)
  })

  it('extracts rate limit minutes', () => {
    expect(mapLeanError('quick_rate_limited:45').message).toContain('45 phút')
  })

  it('falls back to default rate limit minutes if number missing', () => {
    expect(mapLeanError('quick_rate_limited', 30).message).toContain('30 phút')
  })

  it('maps forbidden_tenant', () => {
    expect(mapLeanError('forbidden_tenant').message).toMatch(/không có quyền/)
  })

  it('returns raw message for unknown error', () => {
    expect(mapLeanError('something_weird').message).toBe('something_weird')
  })

  it('handles empty message', () => {
    expect(mapLeanError('').message).toMatch(/lỗi không xác định/)
  })
})

describe('sanitizeLeanDraft', () => {
  it('returns null for non-object input', () => {
    expect(sanitizeLeanDraft(null)).toBeNull()
    expect(sanitizeLeanDraft(undefined)).toBeNull()
    expect(sanitizeLeanDraft('foo')).toBeNull()
  })

  it('drops issues missing item_id, kind, or qty<=0', () => {
    const out = sanitizeLeanDraft({
      issues: {
        a: { item_id: 'x', kind: 'damaged', quantity: 2 },
        b: { kind: 'damaged', quantity: 1 }, // missing item_id
        c: { item_id: 'y', kind: 'unknown', quantity: 1 }, // bad kind
        d: { item_id: 'z', kind: 'lost', quantity: 0 }, // qty 0
        e: { item_id: 'w', kind: 'lost', quantity: -3 }, // negative
      },
    })
    expect(Object.keys(out!.issues)).toEqual(['a'])
  })

  it('coerces level1 default and filters non-string photos', () => {
    const out = sanitizeLeanDraft({
      issues: {
        a: {
          item_id: 'x',
          kind: 'consumed',
          quantity: 1,
          level1: 'bogus',
          photos: ['ok.jpg', 123, null, 'two.jpg'],
        },
      },
    })
    const it = out!.issues.a
    expect(it.level1).toBe('damaged_lost')
    expect(it.photos).toEqual(['ok.jpg', 'two.jpg'])
  })

  it('drops minibar entries that are not positive numbers', () => {
    const out = sanitizeLeanDraft({
      minibar: { a: 2, b: 0, c: -1, d: 'x', e: 4 },
    })
    expect(out!.minibar).toEqual({ a: 2, e: 4 })
  })

  it('falls back to fresh startedAt when missing', () => {
    const out = sanitizeLeanDraft({})
    expect(out!.startedAt).toBeTruthy()
  })
})

const mkIssue = (over: Partial<SanitizedLeanIssue> = {}): SanitizedLeanIssue => ({
  item_id: 'i1',
  item_name: 'Khăn tắm',
  item_type: 'amenity',
  level1: 'damaged_lost',
  kind: 'damaged',
  quantity: 1,
  photos: [],
  ...over,
})

describe('preSubmitValidate', () => {
  it('returns null when no issues', () => {
    expect(preSubmitValidate({ issues: [], config: null })).toBeNull()
  })

  it('blocks qty <= 0', () => {
    const err = preSubmitValidate({ issues: [mkIssue({ quantity: 0 })] })
    expect(err?.code).toBe('invalid_quantity')
  })

  it('requires photo for damaged_lost when config on (default)', () => {
    const err = preSubmitValidate({
      issues: [mkIssue({ kind: 'lost' })],
      config: {
        photo_required_damaged_lost: true,
        photo_required_missing_replace: false,
        photo_required_consumed_chargeable: false,
      },
    })
    expect(err?.code).toBe('photo_required:damaged_lost')
    expect(err?.itemName).toBe('Khăn tắm')
    expect(err?.itemId).toBeTruthy()
  })

  it('does NOT block missing/consumed when their flags are off', () => {
    const out = preSubmitValidate({
      issues: [
        mkIssue({ kind: 'missing' }),
        mkIssue({ kind: 'consumed', chargeToGuest: true }),
      ],
      config: {
        photo_required_damaged_lost: true,
        photo_required_missing_replace: false,
        photo_required_consumed_chargeable: false,
      },
    })
    expect(out).toBeNull()
  })

  it('blocks consumed only when charge_to_guest=true and flag on', () => {
    const cfg = {
      photo_required_damaged_lost: false,
      photo_required_missing_replace: false,
      photo_required_consumed_chargeable: true,
    }
    expect(
      preSubmitValidate({
        issues: [mkIssue({ kind: 'consumed', chargeToGuest: false })],
        config: cfg,
      }),
    ).toBeNull()
    const err = preSubmitValidate({
      issues: [mkIssue({ kind: 'consumed', chargeToGuest: true })],
      config: cfg,
    })
    expect(err?.code).toBe('photo_required:consumed_chargeable')
  })

  it('passes when photo provided', () => {
    expect(
      preSubmitValidate({
        issues: [mkIssue({ kind: 'damaged', photos: ['p.jpg'] })],
        config: {
          photo_required_damaged_lost: true,
          photo_required_missing_replace: false,
          photo_required_consumed_chargeable: false,
        },
      }),
    ).toBeNull()
  })
})
