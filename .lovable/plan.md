
## Phân tích vấn đề RoomBookingDialog

### Vấn đề hiện tại

1. **Nút "Trả phòng" (Checkout)** (dòng 1209-1218) - Cho phép checkout trực tiếp từ dialog này, nhưng luồng này không đi qua flow chuẩn ở BookingsPage với đầy đủ tính năng (giao kiểm tra phòng, in hóa đơn, xử lý thanh toán).

2. **Nút "Nhận thanh toán đầy đủ"** (dòng 1151-1163 + `handleReceivePayment` dòng 621-658):
   - Trực tiếp update `amount_paid` vào DB bằng `.update()`
   - **Không tạo bản ghi trong `booking_payments`** → mất lịch sử thanh toán
   - **Không đi qua RPC `update_booking_amount_paid`** → thiếu tính nguyên tử (atomic), có nguy cơ race condition
   - Không cho chọn phương thức thanh toán (tiền mặt/chuyển khoản)

### Kế hoạch sửa

#### File: `src/components/rooms/RoomBookingDialog.tsx`

**1. Xóa nút Checkout** (dòng 1209-1218)
- User nên checkout qua BookingsPage để có flow đầy đủ với kiểm tra phòng, damage charges, payment dialog

**2. Thay `handleReceivePayment` bằng mở `BookingPaymentDialog`**
- Import `BookingPaymentDialog`
- Thêm state `showPaymentDialog`
- Thay `onClick={handleReceivePayment}` thành mở dialog
- Khi payment complete, invalidate queries và update UI

**3. Xóa hàm `handleReceivePayment` cũ** (dòng 621-658)
- Logic cũ không tạo payment record và không atomic

**4. Giữ nguyên luồng checkout từ ExtendBookingDialog (overdue)**
- Flow này cần thiết vì khi quá hạn, cần cho phép checkout ngay với `p_check_out_date`
- Checkout này sẽ mở `CheckoutSummaryDialog` → `BookingPaymentDialog` đúng luồng

### Diagram luồng mới

```text
RoomBookingDialog
│
├── [Nhận thanh toán] → Opens BookingPaymentDialog
│                       ├── Cash → create booking_payment + RPC update_booking_amount_paid
│                       └── Bank → QR + Webhook auto-confirm
│
├── [Nhận phòng (Check-in)] → Opens CheckInConfirmDialog (giữ nguyên)
│
└── [Lưu] → Update booking info (giữ nguyên)

Checkout luồng → BookingsPage (hoặc RoomGrid → "Trả phòng" button)
```

### Thay đổi cụ thể

| Vị trí | Hiện tại | Sửa thành |
|--------|----------|-----------|
| Dòng 1209-1218 | Nút "Trả phòng" | **Xóa bỏ** |
| Dòng 1151-1163 | onClick={handleReceivePayment} | onClick={() => setShowPaymentDialog(true)} |
| Dòng 621-658 | handleReceivePayment() | **Xóa bỏ** |
| Imports | - | + BookingPaymentDialog |
| State | - | + showPaymentDialog |
| JSX cuối | - | + \<BookingPaymentDialog ... /\> |
