

## Phân tích logic thanh toán Group Checkout - Các lỗi cần sửa

### Bug 1: `performCheckout` ghi đè `amount_paid` cũ sau khi thanh toán 🔴 CRITICAL

**Đây là nguyên nhân chính "thanh toán rồi nhưng không hoàn thành".**

Tại line 625 của `GroupCheckoutDialog.tsx`:
```typescript
p_new_amount_paid: booking.amount_paid || 0
```

Luồng lỗi:
1. User mở GroupCheckoutDialog → `groupData` load từ DB (amount_paid = 904,000)
2. User click "Thu tiền" → GroupPaymentDialog → thanh toán thành công → `distributePayment` gọi RPC `update_booking_amount_paid` → DB cập nhật amount_paid = 1,804,000
3. `onPaymentComplete` callback gọi `performCheckout` → truyền `booking.amount_paid` từ **stale** `groupData` = 904,000
4. RPC `perform_checkout` ghi `amount_paid = 904,000` → **XÓA** khoản thanh toán vừa thực hiện

**Sửa:** Sau khi payment complete, cần refetch `groupData` trước khi gọi `performCheckout`. Hoặc tốt hơn: truyền `p_new_amount_paid: null` để RPC giữ nguyên giá trị hiện tại trong DB (vì RPC đã có logic `CASE WHEN p_new_amount_paid IS NOT NULL`).

### Bug 2: VAT/Service Fee bất nhất giữa per-room và aggregate 🔴 CRITICAL

Per-room `calculateBookingCost` dùng `vatRate=8%, serviceFeeRate=5%` (default). Nhưng aggregate tại line 378-379:
```typescript
const vatRate = 0
const serviceFeeRate = 0
```

Kết quả: Mỗi phòng hiển thị tổng bao gồm VAT+fee (P102: 1,856,025đ), nhưng tổng hợp TỔNG CỘNG = subtotal (không VAT/fee). Con số không khớp nhau.

**Sửa:** Aggregate phải lấy `vatAmount` và `serviceFeeAmount` từ từng room's `costBreakdown` thay vì tự tính với rate=0.

### Bug 3: Booking quá hạn không tính thêm đêm phụ trội 🟡 HIGH

Booking P107 từ 03/02 → 04/02 (1 đêm, giá 2,300,000). Nay là 12/03 (quá hạn 36 ngày). Hệ thống chỉ tính:
- 1 đêm × 2,300,000 = 2,300,000
- Phụ thu checkout trễ 100% = 2,300,000 (= 1 đêm thêm)
- Tổng = 4,600,000 + VAT/fee

Nhưng thực tế khách ở thêm 36 đêm. `nights` được tính từ `differenceInDays(checkOut, checkIn)` = 1, không tính đêm overdue.

**Sửa:** Khi booking overdue, cần tính `nights` = `differenceInDays(today, checkInDate)` thay vì `differenceInDays(originalCheckOut, checkIn)`. Đồng thời **không tính thêm late checkout charge** vì đêm phụ đã bao gồm.

### Bug 4: `totalPaid` aggregate dùng data cũ 🟡 MEDIUM

`cost.costBreakdown.amountPaid` lấy từ lúc tính toán ban đầu. Nếu user thanh toán trong session, con số này không cập nhật cho đến khi recalculate.

**Sửa:** Sau payment complete, gọi lại `calculateAllCosts` hoặc invalidate groupData query.

### Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `GroupCheckoutDialog.tsx` line 625 | Truyền `p_new_amount_paid: null` thay vì stale value |
| `GroupCheckoutDialog.tsx` line 378-379 | Lấy VAT/fee từ per-room costBreakdown thay vì hardcode 0 |
| `GroupCheckoutDialog.tsx` line 188-189 | Tính `nights` bao gồm overdue days cho booking quá hạn |
| `GroupCheckoutDialog.tsx` onPaymentComplete | Invalidate + recalculate trước khi checkout |
| `useGroupCheckoutCalculations.ts` | Khi booking overdue, dùng today thay vì scheduled checkout để tính nights |

