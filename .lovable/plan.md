

## Kiểm tra luồng Đặt phòng → Nhận phòng → Checkout: Phát hiện lỗi

Sau khi kiểm tra toàn bộ codebase, tôi phát hiện **4 lỗi**:

---

### Bug 1: `hourly_end_time` bị parse sai → overtime = NaN 🔴 CRITICAL

**Vị trí:** `BookingsPage.tsx` line 640, 1195, 1268, 1765, 1874

**Vấn đề:** `hourly_end_time` được lưu dưới dạng ISO timestamp đầy đủ (VD: `"2026-03-12T16:00:00.000Z"`) — xác nhận từ `useBookingForm.ts` line 325: `hourlyEndTime = endDateTime.toISOString()` và line 1542 dùng `new Date(booking.hourly_end_time)` trực tiếp.

Nhưng ở nhiều nơi khác, code lại nối chuỗi:
```typescript
new Date(`${booking.check_out_date}T${booking.hourly_end_time}`)
// → new Date("2026-03-12T2026-03-12T16:00:00.000Z")
// → Invalid Date → NaN → overtimeMinutes = NaN → hourlyOvertimeCharge = NaN
```

**Hậu quả:** Booking theo giờ KHÔNG BAO GIỜ tính được phí vượt giờ. `NaN` lan sang `costBreakdown.totalAmount` → toàn bộ hóa đơn sai.

**Sửa:** Tại 5 vị trí, đổi thành `new Date(booking.hourly_end_time)` trực tiếp:
- Line 640: `const scheduledEnd = new Date(booking.hourly_end_time)`
- Line 1195: `scheduledEndTime={actionBooking.hourly_end_time ? new Date(actionBooking.hourly_end_time) : undefined}`
- Line 1268: tương tự
- Line 1765: tương tự
- Line 1874: tương tự

---

### Bug 2: `calculateLateCheckoutCharge` thiếu tham số ngày → early checkout bị tính phụ thu 🟡 HIGH

**Vị trí:** `BookingsPage.tsx` line 571

```typescript
const calculatedLateCharge = calculateLateCheckoutCharge(actualTime, roomPrice)
// Thiếu actualCheckoutDate và scheduledCheckoutDate
```

**Vấn đề:** Nếu khách checkout sớm (VD: ngày 10 thay vì ngày 15), nhưng checkout lúc 14:00 (sau 12:00), hàm KHÔNG biết đây là early checkout → vẫn tính phụ thu 30%. Hàm `calculateLateCheckoutCharge` chỉ skip late charge khi có dates và `isBefore(actualDay, scheduledDay)`.

**Sửa:** Truyền đủ params:
```typescript
const calculatedLateCharge = calculateLateCheckoutCharge(
  actualTime, roomPrice, now, new Date(booking.check_out_date)
)
```

---

### Bug 3: Walk-in deposit → `payment_status = 'partial'` nhưng `amount_paid = 0` 🟡 MEDIUM

**Vị trí:** `useBookingForm.ts` line 457-465

```typescript
// Walk-in with deposit 200k, total 500k:
finalPaymentStatus = 'partial' // ✓ đúng
finalAmountPaid = 0 // amount_paid stays 0
```

**Vấn đề:** Khi checkout, `remainingAmount = totalAmount - deposit - amountPaid = 500k - 200k - 0 = 300k`. Đúng về mặt tính toán. Nhưng `payment_status = 'partial'` trong khi `amount_paid = 0` gây nhầm lẫn — "partial" thường nghĩa là "đã trả một phần". Thực tế deposit chưa phải payment.

Đây là vấn đề **ngữ nghĩa**, không gây sai tính toán tài chính. Tuy nhiên nếu filter booking theo `payment_status = 'partial'`, sẽ lẫn booking chưa trả đồng nào (chỉ có deposit) với booking đã trả thật.

**Sửa:** Walk-in có deposit nhưng chưa trả tiền nên giữ `payment_status = 'pending'`. Chỉ set `'partial'` khi `amount_paid > 0`.

---

### Bug 4: `performCheckOut` trong `BookingsPage` truyền `lateCheckoutCharge` kép cho hourly 🟡 MEDIUM

**Vị trí:** `BookingsPage.tsx` line 707-715

```typescript
const adjustedCostBreakdown = calculateBookingCost({
  lateCheckoutCharge: adjustedLateCharge,     // Line 712
  hourlyOvertimeCharge: bType === 'hourly' ? adjustedLateCharge : 0,  // Line 715
})
```

Với hourly booking, `adjustedLateCharge` được truyền vào **CẢ HAI** `lateCheckoutCharge` và `hourlyOvertimeCharge`. Trong `calculateBookingCost`, case `'daily'` dùng `lateCheckoutCharge`, case `'hourly'` dùng `hourlyOvertimeCharge`. Vì `switch` đúng case, nên thực tế chỉ tính 1 lần → **KHÔNG sai giá trị**. Nhưng code dễ gây nhầm lẫn.

**Sửa:** Cho rõ ràng: `lateCheckoutCharge: bType === 'daily' ? adjustedLateCharge : 0`

---

### Tóm tắt

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `BookingsPage.tsx` (5 chỗ) | Parse `hourly_end_time` trực tiếp bằng `new Date()` |
| 2 | 🟡 | `BookingsPage.tsx` L571 | Truyền đủ 4 params cho `calculateLateCheckoutCharge` |
| 3 | 🟡 | `useBookingForm.ts` L457-465 | Walk-in deposit → `payment_status = 'pending'` |
| 4 | 🟡 | `BookingsPage.tsx` L707-715, 819-829 | Tách rõ `lateCheckoutCharge` vs `hourlyOvertimeCharge` |

