

## Sửa Lỗi: Phí Sử Dụng Đồ Không Cập Nhật Khi Kiểm Tra Phòng Xong

### I. VẤN ĐỀ PHÁT HIỆN

Khi mở `CheckoutSummaryDialog`, phí phụ thu từ "Đồ đã dùng" (`items_consumed`) **KHÔNG được tải** vì query ban đầu chỉ lấy 2 loại:

| Vị trí | Query hiện tại | Thiếu |
|--------|----------------|-------|
| `handleCheckOutClick` (line 431-432) | `items_lost, items_damaged` | **`items_consumed`** |
| `handleInspectionCompleted` (line 707-708) | `items_lost, items_damaged, items_consumed` | ✅ Đầy đủ |

**Tác động:**
- Mở dialog checkout lần đầu → Chỉ thấy đồ mất + đồ hỏng
- Sau khi inspection hoàn thành → Mới thấy đầy đủ (bao gồm đồ đã dùng)
- Nếu có room check trước đó với `items_consumed` → **KHÔNG hiển thị** cho đến khi có inspection mới

---

### II. GIẢI PHÁP

**Cập nhật query trong `handleCheckOutClick`** để lấy cả `items_consumed`:

**File:** `src/pages/bookings/BookingsPage.tsx`

**Line 431-456 → Thay đổi:**

```typescript
// TRƯỚC (thiếu items_consumed)
const { data: latestCheck } = await supabase
  .from('room_checks')
  .select('items_lost, items_damaged')  // ❌ Thiếu items_consumed
  .eq('room_id', booking.room_id)
  .in('check_type', ['checkout', 'daily'])
  .order('checked_at', { ascending: false })
  .limit(1)
  .maybeSingle()

// Convert to DamageChargeItem[]
const damageItems: DamageChargeItem[] = [
  // items_lost...
  // items_damaged...
  // ❌ THIẾU items_consumed
]
```

```typescript
// SAU (đầy đủ 3 loại)
const { data: latestCheck } = await supabase
  .from('room_checks')
  .select('items_lost, items_damaged, items_consumed')  // ✅ Thêm items_consumed
  .eq('room_id', booking.room_id)
  .in('check_type', ['checkout', 'daily'])
  .order('checked_at', { ascending: false })
  .limit(1)
  .maybeSingle()

// Convert to DamageChargeItem[]
const damageItems: DamageChargeItem[] = [
  // Đồ mất
  ...((latestCheck?.items_lost as any[]) || []).map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    item_type: 'lost' as const,
    quantity: item.quantity,
    charge_amount: item.estimated_value || 0,
  })),
  // Đồ hỏng
  ...((latestCheck?.items_damaged as any[]) || []).map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    item_type: 'damaged' as const,
    quantity: item.quantity,
    charge_amount: item.damage_cost || 0,
    damage_type: item.damage_type,
  })),
  // ✅ Đồ đã dùng (consumed)
  ...((latestCheck?.items_consumed as any[]) || []).map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    item_type: 'consumed' as const,
    quantity: item.quantity,
    charge_amount: item.unit_price || 0,
  })),
]
```

---

### III. TÓM TẮT THAY ĐỔI

| Bước | File | Thay đổi |
|------|------|----------|
| 1 | `BookingsPage.tsx` | Line 432: Thêm `items_consumed` vào select query |
| 2 | `BookingsPage.tsx` | Lines 440-456: Thêm mapping `items_consumed` → `DamageChargeItem[]` |

---

### IV. UI ĐÃ SẴN SÀNG

`DamageChargesSection.tsx` đã hỗ trợ hiển thị 3 loại:
- ✅ Đồ mất (`lostItems`) - màu đỏ
- ✅ Đồ hỏng (`damagedItems`) - màu cam
- ✅ Đồ đã dùng (`consumedItems`) - màu xanh dương

Không cần thay đổi UI.

---

### V. KẾT QUẢ SAU SỬA

| Trường hợp | Trước | Sau |
|------------|-------|-----|
| Mở checkout dialog lần đầu | Chỉ thấy Mất + Hỏng | Thấy đủ Mất + Hỏng + Đã dùng |
| Sau inspection hoàn thành | Đầy đủ | Đầy đủ (không đổi) |
| Room check trước đó có items_consumed | Không hiển thị | Hiển thị đúng |

**Thời gian ước tính:** ~5 phút

