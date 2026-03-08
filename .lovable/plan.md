

## Kết quả kiểm tra luồng thanh toán booking

Đã review toàn bộ: `BookingPaymentDialog`, `GroupPaymentDialog`, `useBookingPayments` hooks, `update_booking_amount_paid` RPC, và `sepay-webhook` edge function.

Phát hiện **2 bug** cần fix:

---

### Bug 1: `sepay-webhook` - Single booking payment dùng read-then-write thay vì atomic RPC (NGHIÊM TRỌNG)

**File**: `supabase/functions/sepay-webhook/index.ts` lines 302-321

Khi webhook xử lý single booking payment, code đọc `bp.booking.amount_paid` rồi tính `newAmountPaid = currentPaid + bp.amount` và ghi lại. Đây là **read-then-write** pattern — nếu nhân viên xác nhận thủ công (manual confirm) và webhook SePay chạy gần như đồng thời, cả 2 đều đọc cùng `amount_paid` cũ → **mất 1 lần thanh toán**.

Mâu thuẫn trực tiếp: Client-side đã dùng `update_booking_amount_paid` RPC atomic, nhưng webhook không dùng.

**Fix**: Thay thế direct UPDATE bằng gọi RPC `update_booking_amount_paid` trong webhook, đảm bảo atomic cho cả 2 đường (client + webhook).

Tương tự cho **group payment** trong webhook (lines 269-298) — cũng dùng read-then-write.

---

### Bug 2: `GroupPaymentDialog` - `distributePayment` dùng read-then-write (NGHIÊM TRỌNG)

**File**: `src/components/bookings/GroupPaymentDialog.tsx` lines 137-170

Client-side `distributePayment()` đọc `booking.amount_paid` từ cache (stale data từ query) rồi tính `newAmountPaid` và UPDATE trực tiếp. Nếu webhook SePay auto-confirm chạy song song với realtime handler (line 101), cả 2 đều gọi `distributePayment` → **double payment**.

Thêm vào đó, realtime handler (line 96-109) gọi `distributePayment` **lần nữa** sau khi webhook đã distribute rồi (webhook lines 246-298 cũng distribute). Kết quả: **amount_paid bị cộng gấp đôi**.

**Fix**: 
- Webhook đã distribute rồi → Client realtime handler **KHÔNG cần** distribute lại
- Chỉ cần set step='success' và invalidate queries trong realtime handler
- `distributePayment` chỉ cần gọi cho cash payment (manual) — dùng RPC atomic thay vì direct UPDATE

---

### Các phần ĐÃ KIỂM TRA - KHÔNG CÓ LỖI

1. **`BookingPaymentDialog` cash flow**: Gọi `createPayment` → `updateBookingAmount` (atomic RPC). OK.
2. **`BookingPaymentDialog` manual confirm**: Gọi `confirmPayment` → `updateBookingAmount` (atomic RPC). OK.
3. **`update_booking_amount_paid` RPC**: Atomic `amount_paid = COALESCE(amount_paid, 0) + p_amount_to_add` với auto-set `payment_status`. OK.
4. **`BookingPaymentDialog` realtime**: Subscribe single payment, không gọi `updateBookingAmount` lại — chỉ toast. OK (webhook đã xử lý).
5. **`generatePaymentReference`**: Format `BP{room}{timestamp36}` — unique enough. OK.
6. **`sepay-webhook` matching logic**: Normalize + tolerance ±1000đ. OK.
7. **Webhook group payment matching**: Đọc `metadata.is_group_payment` và `booking_ids`. OK.

---

### Kế hoạch fix

**1. Fix webhook single booking payment** — Thay direct UPDATE bằng RPC call:
```text
// Thay lines 302-321 bằng:
await supabase.rpc('update_booking_amount_paid', {
  p_booking_id: bp.booking_id,
  p_amount_to_add: bp.amount,
  p_total_amount: bp.booking.total_amount
})
```

**2. Fix webhook group payment** — Thay direct UPDATE bằng RPC call cho mỗi booking trong vòng lặp (lines 269-298).

**3. Fix GroupPaymentDialog realtime handler** — Loại bỏ `distributePayment` call vì webhook đã xử lý:
```text
// Line 100-102: Xóa distributePayment call
// Chỉ giữ: setStep('success'), toast, invalidateQueries
```

**4. Fix GroupPaymentDialog distributePayment (cash)** — Dùng RPC `update_booking_amount_paid` thay vì direct UPDATE.

**Files thay đổi**:
- `supabase/functions/sepay-webhook/index.ts`
- `src/components/bookings/GroupPaymentDialog.tsx`

