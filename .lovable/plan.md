

## Phân tích lỗi trong GroupCheckoutDialog

### Bug 1 (Nghiêm trọng): GroupPaymentDialog hiển thị sai số tiền cần thanh toán

Khi user nhấn "Thu tiền & Trả phòng", `GroupPaymentDialog` mở ra nhưng dùng `groupData.remainingAmount` (= `total_amount - amount_paid` từ DB gốc). Con số này **không bao gồm**:
- Phí checkout trễ (late charges)
- Phí đền bù thiệt hại (damage charges)  
- Dịch vụ sử dụng (service charges)
- Tiền đặt cọc (deposit)

Ví dụ thực tế: Dialog checkout hiển thị CÒN LẠI = **7.755.333đ**, nhưng GroupPaymentDialog có thể hiển thị số hoàn toàn khác.

**Sửa**: Truyền `totals.remaining` từ GroupCheckoutDialog vào GroupPaymentDialog qua prop mới (ví dụ `calculatedRemaining`), dùng nó thay cho `groupData.remainingAmount`.

### Bug 2 (Trung bình): Query `chargeableTotals` dư thừa, gây double-counting trong fallback

Dòng 313-331: Query riêng `chargeable_consumptions` vẫn tồn tại. Khi `roomCosts` chưa tính xong (fallback path dòng 393), `chargeableTotals` chỉ lấy `chargeable_consumptions` mà bỏ qua `booking_service_charges` → số liệu không nhất quán.

**Sửa**: Xóa query `chargeableTotals` và realtime channel liên quan. Fallback path chỉ cần dùng `booking.service_charges` (từ DB) hoặc chờ `roomCosts` tính xong.

### Bug 3 (Nhỏ): `getAggregatedTotals` import nhưng không dùng

Hook `useGroupCheckoutCalculations` cung cấp `getAggregatedTotals` nhưng dialog tự tính `totals` trong `useMemo`. Không gây lỗi nhưng code thừa.

### Kế hoạch sửa

**File 1: `src/components/bookings/GroupCheckoutDialog.tsx`**
- Truyền `calculatedRemaining={totals.remaining}` vào `<GroupPaymentDialog>`
- Xóa query `chargeableTotals`, realtime channel `group-chargeables-realtime`, và `refetchChargeables`
- Xóa `chargeableTotals` khỏi fallback path trong `useMemo` totals
- Xóa `getAggregatedTotals` khỏi destructuring

**File 2: `src/components/bookings/GroupPaymentDialog.tsx`**
- Thêm prop `calculatedRemaining?: number`
- Dùng `calculatedRemaining ?? groupData.remainingAmount` làm `remainingAmount`
- Cập nhật `useEffect` init amount dùng giá trị mới

