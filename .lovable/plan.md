

## Phân tích lỗi còn tồn tại

### Bug: Double-counting vẫn còn ở 2 chỗ trong BookingsPage.tsx

Bug double-counting `get_booking_chargeable_total` đã được sửa ở `handleCheckOutClick` (dòng 570-684), nhưng **vẫn còn tồn tại ở 2 vị trí khác**:

**1. Overdue checkout handler (~dòng 1248-1271)**
- Dòng 1248: Dùng `calculateServiceChargesFromConsumables` (cũ, chỉ lấy `booking_consumables`)
- Dòng 1250: Gọi `get_booking_chargeable_total` RPC → `extraChargeableAmount`
- Dòng 1271: `extraCharges: ... + extraChargeableAmount` → **double-counting**
- Dòng 1278-1279: Không set `checkoutServiceDetails` → checkout dialog **thiếu chi tiết dịch vụ**

**2. Mobile overdue checkout handler (~dòng 1831-1892)**
- Cùng pattern: `calculateServiceChargesFromConsumables` + `get_booking_chargeable_total` → **double-counting**
- Dòng 1891-1892: Không set `checkoutServiceDetails` → **thiếu chi tiết dịch vụ**

### Sửa lỗi

Cả 2 vị trí cần thay thế logic cũ bằng `fetchServiceChargeSummary()` (giống `handleCheckOutClick` đã sửa):

1. Thay `calculateServiceChargesFromConsumables` + `get_booking_chargeable_total` bằng `fetchServiceChargeSummary`
2. Bỏ `+ extraChargeableAmount` khỏi `extraCharges`
3. Thêm `setCheckoutServiceDetails(serviceDetails)` để truyền chi tiết vào dialog

### File thay đổi
- `src/pages/bookings/BookingsPage.tsx` — 2 đoạn overdue checkout (dòng ~1248-1271 và ~1831-1892)

