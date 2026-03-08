

## Kết quả kiểm tra Check-in / Check-out

### Check-in: Không có lỗi
- Logic check-in qua `perform_checkin` RPC hoạt động đúng: kiểm tra room status, tính phụ thu check-in sớm (chỉ daily), atomic transaction.
- Cả BookingsPage và RoomBookingDialog đều dùng RPC đúng cách.

### Check-out: Phát hiện 2 vấn đề

#### Vấn đề 1: RoomBookingDialog thiếu "Checkout ngay" cho overdue
- Khi checkout overdue từ **trang phòng** (RoomBookingDialog), `ExtendBookingDialog` được mở nhưng **không có `onCheckoutNow` handler** (line 1265-1281).
- Lễ tân chỉ có thể "Gia hạn", không thể "Checkout ngay" từ giao diện phòng.
- So sánh: BookingsPage đã có `onCheckoutNow` đầy đủ (line 1588-1686).

**Fix**: Thêm `onCheckoutNow` handler vào `RoomBookingDialog`'s ExtendBookingDialog, tương tự logic ở BookingsPage — set `overdueCheckoutDate`, tính cost, mở CheckoutSummaryDialog.

#### Vấn đề 2: RoomBookingDialog's `performCheckOut` thiếu `p_check_out_date`
- `performCheckOut` (line 546) gọi `perform_checkout` RPC nhưng **không truyền `p_check_out_date`**.
- Nếu fix vấn đề 1 (thêm onCheckoutNow), cần đảm bảo `p_check_out_date` cũng được truyền.

**Fix**: Thêm state `overdueCheckoutDate` vào RoomBookingDialog, truyền vào RPC call.

### Tóm tắt
| Luồng | Check-in | Check-out thường | Check-out quá hạn |
|-------|----------|-------------------|-------------------|
| BookingsPage | OK | OK | OK (đã fix) |
| RoomBookingDialog | OK | OK | **Thiếu nút Checkout ngay** |
| GroupCheckoutDialog | N/A | OK | OK (đã fix) |

### Kế hoạch fix
1. **RoomBookingDialog.tsx**: Thêm state `overdueCheckoutDate`, thêm `onCheckoutNow` handler vào ExtendBookingDialog (copy logic tương tự BookingsPage), truyền `p_check_out_date` vào cả 2 hàm `performCheckOut` và `performCheckOutWithPayment`.

