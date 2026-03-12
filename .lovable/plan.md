

## Phân tích toàn diện lỗi thanh toán nhóm (Group Checkout)

Sau khi kiểm tra kỹ code, database, network requests và session replay, tôi phát hiện **6 lỗi** nghiêm trọng:

---

### Bug 1: `distributePayment` phân phối tiền dựa trên `total_amount` CŨ từ DB 🔴 CRITICAL

**Đây là lỗi nghiêm trọng nhất.**

`GroupPaymentDialog.distributePayment()` (line 137-167) tính `bookingOwed = booking.total_amount - booking.amount_paid`. Nhưng `booking.total_amount` lấy từ DB là giá trị **gốc** (VD: P107 = 2,599,000đ cho 1 đêm). Trong khi thực tế khách ở 37 đêm, chi phí tính toán (từ `roomCosts`) là ~50-80 triệu/phòng.

Kết quả:
- Hệ thống thu 215,313,025đ nhưng chỉ phân phối được ~7.7M (tổng `total_amount` DB)
- 207M+ bị "mất" - không ghi nhận vào booking nào
- Booking hiển thị `payment_status: paid` nhưng thực tế chưa cập nhật `total_amount` mới

**Sửa:** `GroupPaymentDialog` cần nhận `calculatedRemaining` và danh sách `roomCosts` (tổng đã tính bao gồm overdue + VAT + phụ thu) để phân phối chính xác. Hoặc: Trước khi phân phối, cập nhật `total_amount` trên DB cho từng booking bằng giá trị tính toán mới.

### Bug 2: `onPaymentComplete` auto-checkout dùng stale `groupData` 🔴 CRITICAL

Line 1321-1336: Sau `refetchQueries`, `groupData` trong closure vẫn là giá trị cũ (React chưa re-render). `performCheckout()` lấy `booking.amount_paid` từ stale data.

Đã fix `p_new_amount_paid: null` ở vòng trước, nhưng vấn đề thực sự là **auto-checkout không nên chạy ngay** vì:
- User yêu cầu bắt buộc hoàn tất kiểm tra phòng
- Dữ liệu chưa đồng bộ

**Sửa:** Bỏ auto-checkout trong `onPaymentComplete`. Chỉ refetch data, hiển thị toast thành công, để user tự bấm checkout.

### Bug 3: Booking status `confirmed` bị include vào checkout 🟡 HIGH

DB cho thấy booking `60365f50` (P105) có status = `confirmed` (chưa check-in). Nhưng `selectedRooms` include tất cả (line 164: filter `status === 'checked_in'` đúng). Tuy nhiên `handleDirectCheckout` (line 572-576) chỉ filter `status === 'checked_out'`, **không filter `confirmed`**. RPC `perform_checkout` sẽ throw exception vì booking không ở trạng thái `checked_in`.

**Sửa:** Thêm filter `booking.status === 'checked_in'` trong `handleDirectCheckout` và `performCheckout`.

### Bug 4: `update_booking_amount_paid` RPC bỏ qua `deposit_amount` 🟡 HIGH

RPC so sánh `amount_paid + p_amount_to_add >= p_total_amount` nhưng **không cộng `deposit_amount`**. Booking có deposit 500k + amount_paid 1.5M = 2M, nhưng RPC nghĩ chỉ có 1.5M + thêm → `payment_status` sai.

**Sửa:** Sửa RPC để include `deposit_amount` trong phép tính payment_status:
```sql
WHEN COALESCE(amount_paid, 0) + p_amount_to_add + COALESCE(deposit_amount, 0) >= p_total_amount THEN 'paid'
```

### Bug 5: GroupPaymentDialog hiển thị số dư DB, không phải số tính toán 🟡 MEDIUM

Lines 473-488: UI hiển thị `groupData.totalAmount` và `groupData.totalPaid` (từ DB gốc), không phải `calculatedRemaining`. User thấy "CÒN LẠI" khác với con số trong GroupCheckoutDialog.

**Sửa:** Sử dụng `calculatedRemaining` nhất quán, và truyền thêm `calculatedTotal` cho phần hiển thị.

### Bug 6: Missing `DialogDescription` trong GroupPaymentDialog 🟢 MINOR

Loading state (line 370) và main dialog (line 386) thiếu `DialogDescription`.

---

### Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `GroupPaymentDialog.tsx` | Nhận thêm prop `roomCostsByBooking` để phân phối đúng; bỏ hiển thị total cũ; thêm DialogDescription |
| `GroupCheckoutDialog.tsx` | Truyền `roomCosts` map cho PaymentDialog; bỏ auto-checkout trong `onPaymentComplete`; filter `status === 'checked_in'` kỹ hơn |
| DB Migration | Sửa `update_booking_amount_paid` RPC để include `deposit_amount` |

### Luồng mới sau sửa

```text
User bấm "Thu tiền"
  → GroupPaymentDialog mở (hiển thị calculatedRemaining)
  → User chọn thanh toán đủ
  → Tạo payment record
  → distributePayment dùng calculated total_amount (không phải DB gốc)
    → Trước tiên gọi perform_checkout hoặc update total_amount trên DB
    → Rồi phân phối tiền
  → Toast "Thanh toán thành công"
  → Dialog đóng, GroupCheckoutDialog refetch
  → User kiểm tra → bấm "Checkout" thủ công
```

