

## Phân tích RoomBookingDialog — Lỗi còn tồn tại

### Bug: Overdue checkout (`onCheckoutNow`) thiếu fetch service charges

**Vị trí**: Dòng 1309-1363 — callback `onCheckoutNow` trong `ExtendBookingDialog`

Khi khách quá hạn và chọn "Checkout ngay", handler này:
- ✅ Tính late checkout charge
- ✅ Fetch damage items từ room_checks
- ❌ **KHÔNG gọi `fetchServiceChargeSummary()`** → `checkoutServiceDetails` rỗng/cũ → checkout dialog không hiển thị chi tiết dịch vụ
- ❌ **KHÔNG cập nhật `serviceCharges` state** với tổng mới nhất từ DB

So sánh với `handleCheckOutClick` (dòng 462-528) đã đúng: gọi `fetchServiceChargeSummary` → set cả `serviceCharges` và `checkoutServiceDetails`.

### Kế hoạch sửa

**File**: `src/components/rooms/RoomBookingDialog.tsx`

Thêm đoạn fetch service charges vào `onCheckoutNow` (sau dòng ~1331, trước fetch damage items):

```typescript
// Fetch service charges summary
try {
  const summary = await fetchServiceChargeSummary(booking.id, tenantId)
  setServiceCharges(summary.grandTotal)
  setCheckoutServiceDetails(summary.details)
} catch (err) {
  console.error('Failed to fetch service charges:', err)
  setCheckoutServiceDetails([])
}
```

Ngoài ra, **không có lỗi nào khác**:
- Console không có error
- Logic tính phí trong `handleCheckOutClick` đã đúng
- `BookingServiceCharges` component đồng bộ qua `onTotalChange` callback đúng
- `performCheckOut` và `handlePayAndCheckout` truyền `serviceCharges` state chính xác vào RPC

