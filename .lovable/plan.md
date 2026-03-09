

## Tạo logic tính phí dịch vụ cho booking

### Vấn đề hiện tại
1. **State không đồng bộ**: `BookingServiceCharges` thêm/xóa dịch vụ và update DB, nhưng state `serviceCharges` trong `RoomBookingDialog` không cập nhật theo → checkout dùng giá trị cũ
2. **Không có chi tiết dịch vụ tại checkout**: `CheckoutSummaryDialog` chỉ hiển thị 1 dòng tổng "Dịch vụ sử dụng" mà không breakdown từng dịch vụ
3. **BookingsPage checkout** cũng không fetch `booking_service_charges` total mới nhất
4. **Chargeable consumables + booking services** chưa được cộng gộp đúng cách — hai nguồn phí dịch vụ riêng biệt

### Giải pháp

#### 1. Đồng bộ service charges state trong RoomBookingDialog
- Thêm callback `onTotalChange` vào `BookingServiceCharges` component
- Khi thêm/xóa dịch vụ thành công → gọi callback để update `serviceCharges` state
- Đảm bảo `costBreakdown` tính đúng tổng phí dịch vụ real-time

#### 2. Tổng hợp phí dịch vụ khi checkout
- Tạo helper function `fetchTotalServiceCharges(bookingId)` trong `useBookingServiceCharges.ts`:
  - Query `booking_service_charges` SUM(total_price)
  - Cộng thêm `chargeable_consumptions` total (minibar)
  - Trả về tổng 2 nguồn
- Gọi function này trước khi mở `CheckoutSummaryDialog` trong cả `RoomBookingDialog` và `BookingsPage`

#### 3. Hiển thị chi tiết dịch vụ trong CheckoutSummaryDialog
- Thêm props `serviceChargeDetails` vào `CheckoutSummaryDialog`
- Thay dòng đơn "Dịch vụ sử dụng" bằng danh sách chi tiết:
  - Từng dịch vụ: tên × SL = thành tiền
  - Minibar/consumables (nếu có): tổng riêng
  - Tổng dịch vụ

#### 4. Đồng bộ checkout flow trên BookingsPage
- Áp dụng cùng logic fetch tổng service charges trước khi checkout
- Đảm bảo `p_service_charges` trong RPC `perform_checkout` luôn chính xác

### File thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useBookingServiceCharges.ts` | Thêm `onTotalChange` callback + `fetchTotalServiceCharges()` helper |
| `src/components/services/BookingServiceCharges.tsx` | Thêm prop `onTotalChange`, gọi sau add/delete |
| `src/components/rooms/RoomBookingDialog.tsx` | Wire `onTotalChange` → `setServiceCharges`, fetch total trước checkout |
| `src/components/bookings/CheckoutSummaryDialog.tsx` | Thêm hiển thị chi tiết từng dịch vụ |
| `src/pages/bookings/BookingsPage.tsx` | Fetch service charges total trước checkout |

