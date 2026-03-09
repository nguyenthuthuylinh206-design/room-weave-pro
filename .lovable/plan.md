
## Mục tiêu
Sửa luồng “Thu tiền” để:
1) **Còn lại** hiển thị đúng (phải trừ cả **tiền đặt cọc**).
2) **Validation** số tiền thu đúng theo “còn lại” thực tế.
3) **payment_status** trong backend cập nhật đúng (tính cả deposit), tránh case đã có cọc nhưng vẫn pending/partial sai.

---

## Nguyên nhân gốc
### 1) UI: `BookingPaymentDialog` tính “còn lại” sai
Hiện tại:
- `remainingAmount = booking.total_amount - booking.amount_paid`
- **Không trừ `deposit_amount`** ⇒ còn lại bị **lớn hơn thực tế**, kéo theo validation sai.

### 2) Backend: RPC `update_booking_amount_paid` tính `payment_status` sai
Trong migration `20260308053613_...sql`, function đang set:
- `payment_status = (amount_paid + amount_to_add >= total_amount) ? 'paid' : 'partial'`
- **Không cộng `deposit_amount`** ⇒ nếu booking có cọc, backend vẫn có thể báo `partial` dù thực tế đã đủ.

---

## Thiết kế sửa (giữ đúng convention hiện tại: deposit tách riêng, amount_paid không bao gồm deposit)
### A) Sửa `BookingPaymentDialog` (UI) để tính đúng số còn lại
**File:** `src/components/bookings/BookingPaymentDialog.tsx`

1) Mở rộng prop `booking`:
- Thêm `deposit_amount?: number` (default 0)

2) Tính lại các biến chuẩn:
- `deposit = booking.deposit_amount ?? 0`
- `totalPaid = deposit + booking.amount_paid`
- `remaining = Math.max(0, booking.total_amount - totalPaid)`

3) Update toàn bộ chỗ đang dùng `remainingAmount`:
- init state `amount` khi mở dialog
- `isValidAmount` và cảnh báo vượt số còn lại
- hiển thị block “Còn lại”

4) UI hiển thị rõ ràng:
- Nếu `deposit > 0`: thêm dòng “Đã đặt cọc: -xxx”
- “Đã thanh toán” vẫn hiển thị `amount_paid` (thu thêm)
- “Còn lại” dùng `remaining` mới

5) Chặn thao tác thu tiền khi remaining = 0:
- Disable nút tiếp tục/thu tiền
- (Optional) hiển thị note “Đã thanh toán đủ”

---

### B) Truyền `deposit_amount` vào `BookingPaymentDialog` ở các nơi gọi
1) **RoomBookingDialog**
**File:** `src/components/rooms/RoomBookingDialog.tsx`
- Khi mở `BookingPaymentDialog`, truyền thêm:
  - `deposit_amount: depositAmount`

2) **CheckoutSummaryDialog**
**File:** `src/components/bookings/CheckoutSummaryDialog.tsx`
- Truyền thêm:
  - `deposit_amount: adjustedCostBreakdown.depositAmount`
- Đồng thời đảm bảo `amount_paid` & `total_amount` cùng “hệ” với breakdown đang hiển thị (ưu tiên dùng `adjustedCostBreakdown` cho nhất quán).

---

### C) Sửa RPC `update_booking_amount_paid` để cập nhật `payment_status` đúng (tính cả deposit)
**File migration:** tạo migration mới (không sửa file cũ), `CREATE OR REPLACE FUNCTION public.update_booking_amount_paid(...)`

Logic mới đề xuất:
1) Update `amount_paid = coalesce(amount_paid,0) + p_amount_to_add`
2) Tính `v_total_paid = new_amount_paid + coalesce(deposit_amount,0)`
3) Set:
- `payment_status = 'paid'` nếu `v_total_paid >= p_total_amount`
- `payment_status = 'partial'` nếu `v_total_paid > 0`
- `payment_status = 'pending'` nếu `v_total_paid = 0`
4) `paid_at = now()` chỉ khi chuyển sang `paid` (hoặc đạt điều kiện paid)

(Tuỳ chọn an toàn) Reject nếu `p_amount_to_add <= 0` bằng `RAISE EXCEPTION`.

**Tác động tích cực:** mọi nơi đang dùng RPC này (thu tiền thủ công, group payment, webhook xác nhận chuyển khoản) sẽ tự đồng bộ đúng `payment_status`.

---

## Checklist test (E2E các case hay lỗi)
1) **Có cọc**: total 1.243.000, deposit 500.000, amount_paid 0  
   - Dialog Thu tiền phải hiện “Còn lại” = 743.000  
   - Không cho nhập > 743.000  
   - Thu 743.000 ⇒ `payment_status` backend = `paid`

2) **Cọc đủ/ dư**: deposit >= total  
   - Dialog Thu tiền còn lại = 0, nút thu tiền bị disable

3) **Không cọc, đã thu 1 phần**: total 1.000.000, deposit 0, amount_paid 200.000  
   - Còn lại = 800.000, validation đúng

4) **Sau khi thu tiền**: quay lại /bookings hoặc mở lại dialog  
   - Status/Remaining đồng bộ đúng (nhờ invalidate + backend `payment_status` chuẩn)

---

## Phạm vi thay đổi
- Frontend:
  - `src/components/bookings/BookingPaymentDialog.tsx`
  - `src/components/rooms/RoomBookingDialog.tsx`
  - `src/components/bookings/CheckoutSummaryDialog.tsx`
- Backend (Lovable Cloud migration):
  - `CREATE OR REPLACE FUNCTION public.update_booking_amount_paid(...)` (tính cả deposit)
