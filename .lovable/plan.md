

## Sửa Lỗi: Phí Đồ Dùng Tính Phí Không Hiển Thị Trong Dialog Thanh Toán

### I. VẤN ĐỀ PHÁT HIỆN

Khi nhân viên kiểm tra phòng và ghi nhận đồ dùng tính phí (minibar, bàn chải...) qua `ChargeableItemsStep`, dữ liệu được lưu vào table `chargeable_consumptions`. Tuy nhiên, khi mở dialog checkout, **số tiền này KHÔNG được cộng vào tổng thanh toán**.

| Thời điểm | Hành vi | Kết quả |
|-----------|---------|---------|
| Mở dialog checkout | Chỉ lấy `booking.extra_charges` | ❌ Thiếu phí minibar |
| Thực hiện checkout thực tế | Có gọi RPC `get_booking_chargeable_total` | ✅ Đúng |
| Sau inspection hoàn thành | Giữ nguyên `extraCharges` cũ | ❌ Không cập nhật |

**Hậu quả:**
- Dialog checkout hiển thị tổng tiền THẤP hơn thực tế
- Khi checkout thật, số tiền mới được tính đúng → Khách bất ngờ

---

### II. GIẢI PHÁP

**Cập nhật `handleCheckOutClick` và `handleInspectionCompleted`** để lấy và cộng thêm `chargeable_consumptions`:

---

### III. CHI TIẾT THAY ĐỔI

#### Bước 1: Trong `handleCheckOutClick` - Thêm query chargeable_consumptions

**File:** `src/pages/bookings/BookingsPage.tsx`

**Vị trí:** Sau dòng 427 (sau khi tính `serviceCharges`), trước khi fetch `room_checks`

**Thêm code:**
```typescript
// Get chargeable consumptions total (minibar, paid items)
const { data: chargeableTotal } = await supabase
  .rpc('get_booking_chargeable_total', { p_booking_id: booking.id })
const extraChargeableAmount = chargeableTotal || 0
```

**Thay đổi line 476:**
```typescript
// TRƯỚC
extraCharges: (booking as any).extra_charges || 0,

// SAU
extraCharges: ((booking as any).extra_charges || 0) + extraChargeableAmount,
```

---

#### Bước 2: Trong `handleInspectionCompleted` - Cập nhật extraCharges

**Vị trí:** Trong phần recalculate cost breakdown (line 768-781)

**Thêm query và cập nhật:**
```typescript
// Sau khi inspection hoàn thành, cũng cần refetch chargeable total
const { data: chargeableTotal } = await supabase
  .rpc('get_booking_chargeable_total', { p_booking_id: actionBooking.id })
const extraChargeableAmount = chargeableTotal || 0

const newCostBreakdown = calculateBookingCost({
  // ...existing params
  extraCharges: ((actionBooking as any).extra_charges || 0) + extraChargeableAmount, // Updated
  // ...rest
})
```

---

### IV. TÓM TẮT THAY ĐỔI

| # | Vị trí | Thay đổi |
|---|--------|----------|
| 1 | `handleCheckOutClick` | Thêm query `get_booking_chargeable_total` |
| 2 | `handleCheckOutClick` line 476 | Cộng `extraChargeableAmount` vào `extraCharges` |
| 3 | `handleInspectionCompleted` | Thêm query và cộng vào `extraCharges` |

---

### V. KẾT QUẢ SAU SỬA

| Trường hợp | Trước | Sau |
|------------|-------|-----|
| Mở dialog checkout (có đồ minibar) | Không hiển thị phí minibar | Hiển thị đầy đủ phí |
| Sau inspection ghi nhận thêm đồ | Không cập nhật | Tự động cập nhật tổng |
| So sánh dialog vs checkout thực | Khác nhau | Đồng nhất |

---

### VI. LƯU Ý KỸ THUẬT

- `chargeable_consumptions` lưu đồ tính phí qua `ChargeableItemsStep` (minibar, bàn chải...)
- `items_consumed` trong `room_checks` lưu đồ tiêu hao miễn phí
- Cả 2 cần được tính riêng và cộng vào đúng chỗ:
  - `items_consumed` → `damageItems` (hiển thị ở DamageChargesSection)
  - `chargeable_consumptions` → `extraCharges` (cộng vào tổng)

**Thời gian thực hiện:** ~10 phút

