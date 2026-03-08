

## Bug: Checkout quá hạn thất bại khi có booking xung đột

### Nguyên nhân gốc

Khi lễ tân nhấn **"Checkout ngay"** từ ExtendBookingDialog, luồng xử lý hiện tại:

1. **Line 1594**: PATCH `check_out_date` → `2026-03-08` → **THẤT BẠI** (400 - trigger `prevent_booking_overlap` chặn vì phòng P102 đã có booking khác từ 04/02/2026)
2. **Không có error handling** — code tiếp tục chạy như thường
3. **Line 1600-1671**: Tính cost với `todayStr` — kết quả đúng trên UI
4. **Nhưng khi xác nhận checkout**: `perform_checkout` RPC **không cập nhật `check_out_date`** → DB vẫn giữ `check_out_date = 2026-01-31` (cũ)
5. **Kết quả**: Booking được checkout nhưng `check_out_date` sai, và nếu reload trang thì tính phí theo ngày cũ

### Vấn đề cụ thể

- **Trigger `prevent_booking_overlap`**: Chặn mọi UPDATE trên booking active khi có overlap — kể cả khi đang checkout
- **`perform_checkout` RPC**: Không nhận `check_out_date` parameter → không thể cập nhật ngày checkout thực tế
- **`onCheckoutNow` handler** (line 1594): Không check error từ PATCH

### Kế hoạch fix

#### 1. Cập nhật `perform_checkout` RPC — nhận thêm `p_check_out_date`

Thêm parameter `p_check_out_date DATE DEFAULT NULL`. Khi có giá trị, UPDATE `check_out_date` cùng lúc với `status = 'checked_out'`. Trigger overlap sẽ **skip** vì `NEW.status = 'checked_out'` → không nằm trong `('confirmed', 'checked_in')`.

#### 2. Fix `onCheckoutNow` handler — bỏ PATCH riêng, truyền date qua perform_checkout

Xóa đoạn PATCH `check_out_date` riêng (line 1593-1596). Thay vào đó, lưu `todayStr` vào state để truyền vào `perform_checkout` khi xác nhận checkout.

#### 3. Cập nhật `handleFinalCheckout` — truyền `p_check_out_date`

Khi gọi `perform_checkout`, thêm `p_check_out_date` nếu booking đang overdue (check_out_date < today).

#### 4. Áp dụng tương tự cho `RoomBookingDialog` và `GroupCheckoutDialog`

Các luồng checkout khác cũng cần truyền `p_check_out_date` khi overdue.

### Files thay đổi
- **Migration SQL**: Cập nhật `perform_checkout` RPC thêm `p_check_out_date` parameter
- `src/pages/bookings/BookingsPage.tsx`: Fix `onCheckoutNow` handler + `handleFinalCheckout`
- `src/components/rooms/RoomBookingDialog.tsx`: Truyền `p_check_out_date` khi overdue
- `src/components/bookings/GroupCheckoutDialog.tsx`: Truyền `p_check_out_date` khi overdue

