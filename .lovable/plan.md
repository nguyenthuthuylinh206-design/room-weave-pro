

## Phân tích logic RoomBookingDialog - Các vấn đề cần cải thiện

### 1. **Thiếu nút Checkout cho booking đang ở (CRITICAL)**
`handleCheckOutClick` được định nghĩa (line 464) nhưng **không được gọi ở đâu trong UI**. Phần Quick Actions (line 1158-1173) chỉ hiện nút "Nhận phòng" cho trạng thái `confirmed`, không có nút "Trả phòng" cho `checked_in`.

**Sửa:** Thêm nút "Trả phòng" trong Quick Actions khi `booking.status === 'checked_in'`.

---

### 2. **Cho phép thay đổi trạng thái thủ công qua dropdown - nguy hiểm**
Dropdown trạng thái (line 1130-1143) cho phép set thủ công `checked_in`, `checked_out`... rồi bấm Lưu. Điều này **bypass** toàn bộ logic check-in/check-out (không cập nhật room status, không gửi notification, không tính phụ thu).

**Sửa:** Khi đang edit booking đã checked_in, disable các option `checked_out` trong dropdown (buộc phải dùng nút Checkout chính thức). Hoặc cảnh báo khi user thay đổi status thủ công.

---

### 3. **Check-in không atomic (race condition)**
`performCheckIn` (line 394) update booking rồi update room riêng biệt - 2 query tách rời. Nếu query thứ 2 fail, booking = `checked_in` nhưng room vẫn `vacant`.

**Sửa:** Sử dụng RPC `perform_checkin` (đã có trong DB theo memory) thay vì 2 query riêng.

---

### 4. **`handlePayAndCheckout` tính `newAmountPaid` sai**
Line 653: `newAmountPaid = totalAmount - depositAmount`. Điều này **bỏ qua** `amountPaid` hiện tại. Nếu khách đã thu 200k trước đó, hàm vẫn tính `newAmountPaid = total - deposit`, khiến `amount_paid` bị ghi đè sai.

**Sửa:** `newAmountPaid = totalAmount - depositAmount - amountPaid + amountPaid` → đúng hơn: nên tính remaining rồi cộng thêm vào amount_paid hiện tại.

---

### 5. **`handlePayAndCheckout` có race condition**
Line 656-664: Gọi `.update()` trực tiếp set `amount_paid` → rồi gọi RPC `perform_checkout` với `p_new_amount_paid`. RPC có thể **ghi đè** lại giá trị vừa update, hoặc 2 thao tác xung đột.

**Sửa:** Bỏ `.update()` trực tiếp, chỉ dùng RPC `perform_checkout` với `p_new_amount_paid` đúng.

---

### 6. **Early checkin charge bị tự động ghi đè khi mở dialog**
`useEffect` (line 161-166) tính lại `earlyCheckinCharge` mỗi khi `checkInTime` thay đổi. Khi mở dialog edit, `checkInTime` được set → trigger useEffect → **ghi đè** giá trị thực tế từ DB (đã được nhân viên điều chỉnh khi check-in).

**Sửa:** Chỉ auto-calculate khi tạo booking mới (`!isEdit`), hoặc khi user thay đổi thủ công check-in time (dùng flag `userChangedTime`).

---

### 7. **Late checkout description hiển thị theo giờ dự kiến, không phải thực tế**
Line 732: `lateCheckoutDesc` dùng `checkOutTime` (giờ expected). Điều này gây nhầm lẫn - hiển thị phụ thu checkout trễ dựa trên giờ dự kiến chứ không phải giờ thực tế checkout.

**Sửa:** Chỉ hiện mô tả phụ thu này khi đang trong quá trình checkout thực tế, không hiện trong form edit thông thường.

---

### 8. **Sau khi thu tiền, state local không đồng bộ**
`onPaymentComplete` (line 1350-1353) chỉ `invalidateQueries` nhưng dialog vẫn mở → `amountPaid` state cũ vẫn hiển thị. User thấy số "Còn lại" chưa cập nhật cho đến khi đóng/mở lại dialog.

**Sửa:** Trong `onPaymentComplete`, fetch lại booking data hoặc update `setAmountPaid` trực tiếp dựa trên số tiền vừa thu.

---

### 9. **Type safety kém - dùng `(booking as any)` quá nhiều**
Hơn 15 chỗ dùng `(booking as any)` để access các field như `room_price`, `deposit_amount`, `booking_type`... Điều này khiến không phát hiện được lỗi khi field bị đổi tên hoặc thiếu.

**Sửa:** Mở rộng interface `RoomBooking` trong `useRoomBooking.ts` để include đầy đủ các field tài chính, hoặc tạo type riêng cho dialog.

---

### 10. **`performCheckOut` không truyền `p_new_amount_paid`**
Line 562: RPC call thiếu `p_new_amount_paid`, nên payment status có thể không được update đúng trong trường hợp "Checkout không thu tiền".

**Sửa:** Truyền `p_new_amount_paid: amountPaid` để RPC tính đúng payment_status.

---

## Tóm tắt mức ưu tiên

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Thiếu nút Checkout | 🔴 Critical |
| 4,5 | PayAndCheckout tính sai + race condition | 🔴 Critical |
| 3 | Check-in không atomic | 🟡 High |
| 6 | Early charge bị ghi đè | 🟡 High |
| 8 | State không đồng bộ sau thu tiền | 🟡 High |
| 2 | Dropdown status bypass logic | 🟡 High |
| 10 | Checkout không truyền amount_paid | 🟡 High |
| 9 | Type safety | 🟢 Medium |
| 7 | Late checkout desc misleading | 🟢 Low |

