

## Danh sách toàn bộ lỗi hiện tại trong logic đặt phòng, tính tiền, thanh toán, checkout và hóa đơn

---

### Bug 1: BookingsPage không tính overdue nights khi checkout 🔴 CRITICAL

**Vị trí:** `BookingsPage.tsx` line 573-575, 703-704, 813-815, 970-971

**Vấn đề:** Khi khách quá hạn (VD: đặt 1 đêm, ở 37 đêm), `nights` vẫn tính bằng `checkOut - checkIn` (= 1 đêm gốc). Hàm `performCheckOut` và `handlePayAndCheckout` sử dụng `new Date(actionBooking.check_out_date)` (ngày gốc) thay vì ngày thực tế checkout.

**Hậu quả:** Tổng tiền phòng chỉ = 1 đêm thay vì 37 đêm. Thiệt hại hàng chục triệu.

**Sửa:** Khi `overdueCheckoutDate` tồn tại, dùng nó để tính `nights`:
```text
const effectiveCheckOut = overdueCheckoutDate 
  ? new Date(overdueCheckoutDate) 
  : new Date(actionBooking.check_out_date)
const nights = differenceInDays(effectiveCheckOut, checkIn)
```

Áp dụng cho cả 4 chỗ: `performCheckOut`, `handlePayAndCheckout`, `handleInspectionCompleted`, và `handleCheckOutClick`.

---

### Bug 2: Wizard ghi `amount_paid = deposit` → double-count 🔴 CRITICAL

**Vị trí:** `useBookingForm.ts` line 443

**Vấn đề:** Walk-in booking đặt `finalAmountPaid = roomDeposit` VÀ `finalDepositAmount = roomDeposit`. Khi checkout, RPC `update_booking_amount_paid` tính: `amount_paid + deposit_amount >= total_amount` → double-count, khách trả 500k nhưng hệ thống tính 1M.

**Hậu quả:** `payment_status` hiển thị `paid` khi thực tế chưa đủ.

**Sửa:** Walk-in: `finalAmountPaid = 0`, `finalDepositAmount = roomDeposit`. `amount_paid` chỉ tăng qua `BookingPaymentDialog` hoặc lúc "Pay & Checkout".

---

### Bug 3: RoomBookingDialog `performCheckOut` không cập nhật `nights` khi overdue 🟡 HIGH

**Vị trí:** `RoomBookingDialog.tsx` line 146, 552-565

**Vấn đề:** `nights` được tính 1 lần từ state `checkOutDate` (line 146). Khi "Checkout ngay" từ overdue dialog, `setCheckOutDate(checkOut)` (line 1321) cập nhật state nhưng `costBreakdown` useMemo vẫn dùng nights cũ trong cùng render cycle. Hàm `performCheckOut` và `handlePayAndCheckout` gọi `calculateBookingCost` với local state `nights` → có thể đã đúng sau re-render, nhưng nếu checkout xảy ra trước re-render thì sai.

**Sửa:** Trong `onCheckoutNow`, tính `updatedNights` rồi truyền trực tiếp vào `calculateBookingCost` tại `performCheckOut` thay vì phụ thuộc vào state.

---

### Bug 4: GroupPaymentDialog per-booking progress bar dùng DB `total_amount` 🟡 HIGH

**Vị trí:** `GroupPaymentDialog.tsx` line 430-491

**Vấn đề:** UI per-booking hiển thị `booking.amount_paid / booking.total_amount` (từ DB). Nhưng `total_amount` DB là giá gốc (1 đêm), trong khi thực tế có thể ở 37 đêm. Progress bar và "Còn lại" sai lệch lớn.

**Sửa:** Dùng `roomCostsByBooking` để hiển thị `calculatedTotal` thay `booking.total_amount` cho mỗi phòng.

---

### Bug 5: `onPaymentComplete` không recalculate costs 🟡 MEDIUM

**Vị trí:** `GroupCheckoutDialog.tsx` line 1340-1347

**Vấn đề:** Sau payment, `onPaymentComplete` chỉ gọi `refetchQueries`. Nhưng `calculateAllCosts` useEffect phụ thuộc vào `selectedRooms` (không đổi) → costs không tự recalculate. `totals.remaining` cũ.

**Sửa:** Thêm trigger recalculate sau refetch:
```text
onPaymentComplete={async () => {
  await refetchQueries(...)
  // Re-trigger cost calculation
  const bookingsToCalc = ... // same logic as useEffect
  await calculateAllCosts(bookingsToCalc)
  toast.success(...)
}}
```

---

### Bug 6: Invoice `createInvoiceAfterCheckout` tính `nights` từ `actual_check_out` nhưng có thể null 🟡 MEDIUM

**Vị trí:** `invoiceHelpers.ts` line 54

**Vấn đề:** `booking.actual_check_out` có thể null (RPC chỉ set cho overdue). Khi null, fallback về `booking.check_out_date` (ngày gốc 1 đêm) → invoice line item "1 đêm" thay vì 37 đêm, dù `total_amount` đúng.

**Sửa:** Dùng logic consistent: nếu `actual_check_out` null, kiểm tra `booking.status === 'checked_out'` thì dùng `updated_at` hoặc tính từ `total_amount / room_price`.

---

### Bug 7: Invoice cho group checkout tạo N hóa đơn riêng lẻ 🟢 LOW

**Vấn đề:** Group 4 phòng → 4 invoice. Không có option gộp 1 hóa đơn tổng.

**Đề xuất:** Thêm option trong `GroupCheckoutDialog` để user chọn: "Xuất hóa đơn riêng từng phòng" hoặc "Xuất 1 hóa đơn gộp".

---

### Bug 8: Duplicate invoice khi checkout lại 🟢 LOW

**Vấn đề:** `createInvoiceAfterCheckout` không kiểm tra invoice đã tồn tại. Nếu checkout fail rồi retry, hoặc call 2 lần, tạo duplicate invoice.

**Sửa:** Thêm check `SELECT id FROM guest_invoices WHERE booking_id = ?` trước khi insert.

---

### Tóm tắt thay đổi

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `BookingsPage.tsx` | Dùng `overdueCheckoutDate` để tính `nights` đúng tại 4 vị trí |
| 2 | 🔴 | `useBookingForm.ts` | Walk-in: `finalAmountPaid = 0` |
| 3 | 🟡 | `RoomBookingDialog.tsx` | Truyền `nights` trực tiếp trong overdue checkout flow |
| 4 | 🟡 | `GroupPaymentDialog.tsx` | Dùng `calculatedTotal` từ `roomCostsByBooking` cho per-booking UI |
| 5 | 🟡 | `GroupCheckoutDialog.tsx` | Gọi `calculateAllCosts` sau payment refetch |
| 6 | 🟡 | `invoiceHelpers.ts` | Tính `nights` chính xác khi `actual_check_out` null |
| 7 | 🟢 | `GroupCheckoutDialog.tsx` + `invoiceHelpers.ts` | Thêm option gộp hóa đơn group |
| 8 | 🟢 | `invoiceHelpers.ts` | Check duplicate trước khi insert |

