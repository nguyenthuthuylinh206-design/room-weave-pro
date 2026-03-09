

## Phân tích: 3 vị trí còn lại vẫn bị double-counting hoặc dùng logic cũ

Sau khi sửa `handleCheckOutClick`, overdue checkout (desktop + mobile) trong BookingsPage và `onCheckoutNow` trong RoomBookingDialog, vẫn còn **3 nơi** dùng pattern cũ (`calculateServiceChargesFromConsumables` + `get_booking_chargeable_total`):

### Bug 1: BookingsPage.tsx — sau inspection completed (~dòng 962-980)
- Dòng 963: Gọi `get_booking_chargeable_total` RPC
- Dòng 980: `extraCharges: ... + extraChargeableAmount` → **double-counting** nếu `serviceCharges` đã chứa chargeable từ trước

### Bug 2: useBookingActions.ts — checkout action (~dòng 202-212)
- Dòng 203: `calculateServiceChargesFromConsumables` (logic cũ, chỉ lấy `booking_consumables`)
- Dòng 207-208: `get_booking_chargeable_total` RPC → `extraChargeableAmount`
- Dòng 212: `totalExtraCharges = extra_charges + extraChargeableAmount` → **double-counting**

### Bug 3: useGroupCheckoutCalculations.ts — group checkout (~dòng 134-143)
- Dòng 136: `calculateServiceChargesFromConsumables`
- Dòng 139-142: `get_booking_chargeable_total` → `Math.max(serviceCharges, chargeableTotal)`
- Logic `Math.max` tránh double-counting nhưng vẫn **không chính xác** vì không bao gồm `booking_service_charges` (dịch vụ cộng thêm như massage, spa)

---

## Kế hoạch sửa

Thay thế logic cũ bằng `fetchServiceChargeSummary()` ở cả 3 vị trí:

### File 1: `src/pages/bookings/BookingsPage.tsx` (~dòng 962-980)
- Xóa `get_booking_chargeable_total` RPC call
- Bỏ `+ extraChargeableAmount` khỏi `extraCharges`

### File 2: `src/hooks/useBookingActions.ts` (~dòng 202-212)
- Thay `calculateServiceChargesFromConsumables` + `get_booking_chargeable_total` bằng `fetchServiceChargeSummary`
- `serviceCharges = summary.grandTotal`
- `extraCharges = booking.extra_charges || 0` (không cộng thêm)

### File 3: `src/hooks/useGroupCheckoutCalculations.ts` (~dòng 134-146)
- Thay cả block bằng `fetchServiceChargeSummary`
- `serviceCharges = summary.grandTotal`

