

## Kết quả kiểm tra chi tiết từng luồng logic đặt phòng

Sau khi kiểm tra kỹ tất cả các file, tôi phát hiện **5 vấn đề còn tồn tại**:

---

### Bug A: `RoomBookingDialog` costBreakdown + checkout KHÔNG hỗ trợ hourly/monthly 🔴 CRITICAL

**Vị trí:** `RoomBookingDialog.tsx` line 149-162, 564-576, 660-679

**Vấn đề:** `costBreakdown` useMemo tại line 149 luôn gọi `calculateBookingCost()` **không truyền** `bookingType`, `hourlyRate`, `hours`, `monthlyRate`, `months`. Mặc định function sẽ dùng `bookingType: 'daily'`.

Khi checkout từ RoomBookingDialog (mở từ trang Sơ đồ phòng), booking hourly/monthly bị tính sai hoàn toàn:
- Hourly 4 giờ × 100k = tính thành 1 đêm × roomPrice
- Monthly 3 tháng × 5M = tính thành 1 đêm × roomPrice

Cả `performCheckOut` (line 564) và `handlePayAndCheckout` (line 660) cũng không truyền `bookingType` → RPC nhận `total_amount` sai.

**Sửa:** Đọc `booking.booking_type`, `booking.hourly_rate`, `booking.booking_hours`, `booking.monthly_rate`, `booking.booking_months` rồi truyền vào cả 3 nơi: `costBreakdown` useMemo, `performCheckOut`, `handlePayAndCheckout`.

---

### Bug B: `BookingsPage.performCheckIn` KHÔNG dùng RPC `perform_checkin` 🟡 HIGH

**Vị trí:** `BookingsPage.tsx` line 481-536

**Vấn đề:** Trong khi `RoomBookingDialog.performCheckIn` (line 400) dùng RPC `perform_checkin` (atomic), `BookingsPage.performCheckIn` lại dùng 2 lệnh `.update()` riêng lẻ:
1. `supabase.from('room_bookings').update(...)` (line 503)
2. `supabase.from('rooms').update({ status: 'occupied' })` (line 511)

Nếu lệnh 1 thành công nhưng lệnh 2 thất bại → booking = `checked_in` nhưng phòng vẫn `available`. Race condition cũng có thể xảy ra: 2 nhân viên check-in cùng lúc vào cùng 1 phòng.

**Sửa:** Thay bằng `supabase.rpc('perform_checkin', { p_booking_id, p_room_id, p_early_checkin_charge })` giống `RoomBookingDialog`.

---

### Bug C: `RoomBookingDialog` handleSubmit (tạo/sửa booking) không hỗ trợ hourly/monthly 🟡 HIGH

**Vị trí:** `RoomBookingDialog.tsx` line 209-320

**Vấn đề:** `handleSubmit` (tạo booking mới hoặc edit booking) insert/update `bookingData` nhưng không bao gồm các trường:
- `booking_type`
- `hourly_rate`, `monthly_rate`
- `booking_hours`, `booking_months`
- `hourly_start_time`, `hourly_end_time`

Khi user edit booking từ RoomBookingDialog (mở từ sơ đồ phòng hoặc click vào booking), các trường booking type bị null. Tuy nhiên, trang này chỉ dùng cho Daily booking (form chỉ có ngày check-in/out, không có UI chọn giờ/tháng), nên tác động thực tế thấp — NHƯNG nếu edit 1 hourly booking, `booking_type` có thể bị reset về null.

**Sửa:** Khi edit, preserve các trường booking type hiện có. Không cho phép thay đổi `booking_type` từ form này (chỉ AddBookingDialog/Wizard mới hỗ trợ đầy đủ).

---

### Bug D: `RoomBookingDialog` checkout dialog nhận `costBreakdown` thiếu damage charges 🟡 MEDIUM

**Vị trí:** `RoomBookingDialog.tsx` line 1287

```
costBreakdown={costBreakdown}
```

Khi `handleCheckOutClick` (line 470-542), code cập nhật `lateCheckoutCharge` và `serviceCharges` qua `setState`, nhưng `costBreakdown` useMemo sẽ re-render với state mới. Tuy nhiên **damage charges** từ `room_checks` được lưu vào `checkoutDamageItems` state — KHÔNG được inject vào `costBreakdown`.

Kết quả: `CheckoutSummaryDialog` nhận `costBreakdown` với `damageCharges: 0`, dù đã fetch damage items. Dialog phải tự tính lại — tùy thuộc vào implementation bên trong dialog.

**Sửa:** Tính damage charges từ `checkoutDamageItems` rồi truyền vào costBreakdown hoặc sử dụng state riêng.

---

### Bug E: `BookingsPage` handlePayAndCheckout `newAmountPaid` tính sai 🟡 MEDIUM

**Vị trí:** `BookingsPage.tsx` line 846

```
const newAmountPaid = adjustedCostBreakdown.totalAmount - checkoutCostBreakdown.depositAmount
```

Nếu khách đã thanh toán partial trước đó (`amount_paid = 200k`, `deposit = 500k`, `total = 1M`), `newAmountPaid = 1M - 500k = 500k`. RPC set `amount_paid = 500k`. Nhưng thực tế khách đã trả 200k trước → tổng = 500k + 200k = 700k, còn thiếu 300k.

So sánh `RoomBookingDialog.tsx` line 683: `newAmountPaid = adjustedCostBreakdown.totalAmount - depositAmount` — cùng logic. Cả hai đều sai nếu có partial payment trước đó.

**Sửa:** `newAmountPaid = totalAmount - depositAmount - existingAmountPaid + existingAmountPaid = totalAmount - depositAmount` — đúng rồi nếu RPC **SET** (không ADD). Cần xác nhận RPC behavior: nếu RPC SET `amount_paid = newAmountPaid` thì đúng vì `newAmountPaid` = toàn bộ số tiền cần trả ngoài deposit. Nếu RPC ADD thì sai.

Đây cần xác nhận lại logic RPC `perform_checkout` để đảm bảo.

---

### Tóm tắt thay đổi

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| A | 🔴 | `RoomBookingDialog.tsx` L149, L564, L660 | Truyền `bookingType`, `hourlyRate`, `hours`, `monthlyRate`, `months` vào `calculateBookingCost` |
| B | 🟡 | `BookingsPage.tsx` L481-536 | Thay 2 lệnh `.update()` bằng `perform_checkin` RPC |
| C | 🟡 | `RoomBookingDialog.tsx` L239-268 | Preserve booking type fields khi edit |
| D | 🟡 | `RoomBookingDialog.tsx` L470-542 | Inject damage charges vào costBreakdown trước khi truyền cho CheckoutSummaryDialog |
| E | 🟡 | `BookingsPage.tsx` L846 | Xác nhận RPC behavior, sửa nếu cần |

