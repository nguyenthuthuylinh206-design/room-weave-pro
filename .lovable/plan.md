

## Phân tích vấn đề hiện tại

### Bug 1: Double-counting chargeable consumptions trong BookingsPage

Trong `BookingsPage.tsx` (dòng 576-664), khi tính checkout:

1. `fetchServiceChargeSummary()` đã **bao gồm** cả `booking_service_charges` + `chargeable_consumptions` → trả về `grandTotal` chứa cả hai
2. Ngay sau đó (dòng 590-592), code **lại fetch riêng** `get_booking_chargeable_total` RPC → lấy `extraChargeableAmount`
3. `extraChargeableAmount` được cộng vào `extraCharges` (dòng 664): `extraCharges: ((booking as any).extra_charges || 0) + extraChargeableAmount`

**Kết quả**: Tiền minibar/chargeable bị tính **2 lần** — một lần trong `serviceCharges` (từ `fetchServiceChargeSummary`), một lần trong `extraCharges`.

### Bug 2: Tương tự trong RoomBookingDialog

Cần kiểm tra xem `RoomBookingDialog` có cùng vấn đề hay không. Dựa trên code đã xem (dòng 480-488), `RoomBookingDialog` chỉ gọi `fetchServiceChargeSummary` mà **không** gọi thêm `get_booking_chargeable_total`, nên không bị double-counting.

### Vấn đề khác: Session replay cho thấy flickering

Session replay cho thấy component `BookingServiceCharges` flickering giữa "Chưa có dịch vụ nào" và "Chưa có dịch vụ. Vui lòng thêm..." — có thể do `useEffect` với `onTotalChange` callback gây re-render liên tục. Tuy nhiên đây là vấn đề UX nhỏ, không ảnh hưởng logic.

### Hotel services trống

Network request cho `hotel_services` trả về `[]` — hotel hiện tại chưa có dịch vụ nào được cấu hình. Đây không phải bug, chỉ là chưa có dữ liệu.

---

## Kế hoạch sửa

### File thay đổi: `src/pages/bookings/BookingsPage.tsx`

**Xóa** đoạn fetch `get_booking_chargeable_total` (dòng 590-592) và không cộng `extraChargeableAmount` vào `extraCharges` (dòng 664), vì `fetchServiceChargeSummary` đã bao gồm chargeable consumptions rồi.

Cụ thể:
- Xóa dòng 590-592: `const { data: chargeableTotal } = await supabase.rpc('get_booking_chargeable_total', ...)`
- Sửa dòng 664: `extraCharges: (booking as any).extra_charges || 0` (bỏ `+ extraChargeableAmount`)

