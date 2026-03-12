

## Kiểm tra logic thanh toán khi checkout - Kết quả

Sau khi kiểm tra kỹ toàn bộ luồng checkout + payment, tôi phát hiện **4 lỗi**:

---

### Bug 1: "Thu tiền & Trả phòng" ghi đè `amount_paid` sai khi thanh toán một phần 🔴 CRITICAL

**Vị trí:** `CheckoutSummaryDialog.tsx` line 356-366, `BookingsPage.tsx` line 847, `RoomBookingDialog.tsx` line 723

**Luồng lỗi:**
1. User bấm "Thu tiền & Trả phòng" → mở `BookingPaymentDialog`
2. User thanh toán **một phần** (VD: 300k/500k còn lại) → `BookingPaymentDialog` gọi `update_booking_amount_paid` RPC → ADD 300k vào DB
3. `handlePaymentComplete` gọi `onPayAndCheckout` → parent gọi `perform_checkout` với `p_new_amount_paid = totalAmount - depositAmount`
4. RPC **SET** `amount_paid = totalAmount - deposit` → ghi đè 300k vừa ADD thành "đã trả đủ"

**Hậu quả:** Khách trả 300k nhưng hệ thống ghi nhận đã trả đủ 500k. Thiệt hại tài chính.

**Sửa:** Sau khi `BookingPaymentDialog` hoàn tất, lấy `paidAmount` thực tế rồi tính `newAmountPaid = existingAmountPaid + paidAmount`. Hoặc đơn giản hơn: truyền `p_new_amount_paid: null` cho `perform_checkout` (giữ nguyên DB) vì `BookingPaymentDialog` đã cập nhật rồi.

---

### Bug 2: `BookingsPage.performCheckOut` thiếu `p_new_amount_paid` 🟡 HIGH

**Vị trí:** `BookingsPage.tsx` line 736-749

**Vấn đề:** Không truyền `p_new_amount_paid` cho RPC. RoomBookingDialog truyền `null` (line 628). Nếu RPC yêu cầu parameter này, sẽ lỗi. Nếu default là `undefined` thay vì `null`, behavior khác nhau.

**Sửa:** Thêm `p_new_amount_paid: null` giống RoomBookingDialog.

---

### Bug 3: `RoomBookingDialog` truyền `scheduledCheckoutDate` sai cho overdue 🟡 HIGH

**Vị trí:** `RoomBookingDialog.tsx` line 1326

```
scheduledCheckoutDate={overdueCheckoutDate ? new Date(overdueCheckoutDate) : ...}
```

Khi overdue, `overdueCheckoutDate` = hôm nay (VD: 2026-03-12). `CheckoutSummaryDialog` nhận `scheduledCheckoutDate = hôm nay` và `actualCheckoutDate = hôm nay` → `isEarlyCheckout` = false, late checkout charge tính đúng. NHƯNG UI hiển thị "ngày trả phòng dự kiến: hôm nay" thay vì ngày gốc (VD: 2026-02-12). User không thấy được booking đã quá hạn bao lâu.

**Sửa:** Truyền ngày gốc: `scheduledCheckoutDate={booking?.check_out_date ? new Date(booking.check_out_date) : new Date()}`. Late charge calculation đã tính riêng ở parent, không ảnh hưởng.

---

### Bug 4: `BookingPaymentDialog` trong CheckoutSummaryDialog nhận `amount_paid` cũ 🟡 MEDIUM

**Vị trí:** `CheckoutSummaryDialog.tsx` line 918

```
amount_paid: costBreakdown.amountPaid,  // costBreakdown từ parent, không cập nhật
```

Nếu user đã thanh toán partial trước đó (qua BookingPaymentDialog từ trang khác), rồi mở CheckoutSummaryDialog, `costBreakdown.amountPaid` có thể stale. `BookingPaymentDialog` sẽ hiển thị "Còn lại" sai, cho phép user trả nhiều hơn cần thiết.

**Sửa:** Fetch `amount_paid` mới nhất từ DB khi mở BookingPaymentDialog, hoặc dùng `adjustedCostBreakdown.amountPaid` (cũng stale nhưng ít nhất consistent).

---

### Tóm tắt

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `CheckoutSummaryDialog.tsx` + parents | "Pay & Checkout" truyền `p_new_amount_paid: null` thay vì overwrite |
| 2 | 🟡 | `BookingsPage.tsx` L749 | Thêm `p_new_amount_paid: null` |
| 3 | 🟡 | `RoomBookingDialog.tsx` L1326 | Truyền `booking.check_out_date` thay vì `overdueCheckoutDate` |
| 4 | 🟡 | `CheckoutSummaryDialog.tsx` L918 | Dùng giá trị consistent hoặc fetch fresh |

