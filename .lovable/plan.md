

## Kiểm tra logic tạo hóa đơn tự động sau checkout

Sau khi kiểm tra `invoiceHelpers.ts` và tất cả caller sites, tôi phát hiện **3 lỗi**:

---

### Bug 1: Line items tổng cộng KHÔNG khớp với `subtotal` trên hóa đơn 🔴 CRITICAL

**Vấn đề:** Hóa đơn build line items thủ công (room + surcharges + services + consumables), nhưng lấy `subtotal`, `vat_amount`, `total_amount` trực tiếp từ DB booking (line 172-179). Hai nguồn dữ liệu này có thể **không khớp nhau**.

**Ví dụ cụ thể:**
- Booking daily, 3 đêm × 1M = 3M room charge
- Late checkout 30% = 300k
- Minibar 100k (từ `chargeable_consumptions`)
- `subtotal` trong DB = 3M + 300k + 100k = 3.4M (đúng, RPC đã tính)

Nhưng line items build ra:
- Room 3M ✓
- Late checkout 300k ✓
- Minibar 100k ✓
- **Tổng line items = 3.4M ✓** (khớp)

**Trường hợp SAI:** Booking hourly. `booking_hours = 3`, `hourly_rate = 100k`. Line item = 3 × 100k = 300k. Nhưng `subtotal` trong DB đã bao gồm **phí vượt giờ** (VD: thêm 2h overtime = 200k → subtotal = 500k). Hóa đơn hiển thị line item = 300k nhưng subtotal = 500k → **không khớp**.

Tương tự, nếu booking daily quá hạn (overdue), `perform_checkout` truyền `p_check_out_date` để tính lại `nights`. Nhưng invoice dùng `differenceInDays(actual_check_out, check_in_date)` riêng — **có thể ra khác** vì timezone/rounding.

**Sửa:** Thêm line item cho phí vượt giờ (hourly overtime). Cụ thể:
```typescript
if (booking.booking_type === 'hourly') {
  // Base hourly charge
  lineItems.push({ description: `Tiền phòng ${roomNumber} (${hours} giờ)`, ... })
  // Overtime = late_checkout_charge for hourly bookings
  if (booking.late_checkout_charge > 0) {
    lineItems.push({ description: 'Phí vượt giờ', quantity: 1, 
      unit_price: booking.late_checkout_charge, amount: booking.late_checkout_charge })
  }
}
```
Và **bỏ** block `lateCheckout` riêng khi `booking_type === 'hourly'` để tránh trùng label "Phụ thu trả phòng muộn" (không đúng nghĩa cho hourly).

---

### Bug 2: Race condition — invoice đọc booking trước khi RPC commit xong 🟡 HIGH

**Vấn đề:** `createInvoiceAfterCheckout` được gọi fire-and-forget **ngay sau** `supabase.rpc('perform_checkout')` return. Tuy RPC là synchronous transaction, nhưng do:
1. Supabase client dùng connection pooling → read-after-write có thể đọc replica cũ
2. `createInvoiceAfterCheckout` chạy async → không đảm bảo thứ tự

Nếu `booking` fetch được là **trước khi RPC update** → `total_amount`, `subtotal`, `late_checkout_charge`, `damage_charges` đều = giá trị cũ → hóa đơn sai.

**Sửa:** Thêm delay nhỏ hoặc retry logic. Đơn giản nhất:
```typescript
// Đợi 500ms để đảm bảo RPC đã commit và replication đã sync
await new Promise(resolve => setTimeout(resolve, 500))
const { data: booking } = await supabase.from('room_bookings')...
```
Hoặc kiểm tra `booking.status === 'checked_out'` trước khi tạo invoice, nếu không thì retry.

---

### Bug 3: `check_out_date` trên hóa đơn có thể là timestamp thay vì date 🟡 MEDIUM

**Vị trí:** Line 203: `check_out_date: booking.actual_check_out || booking.check_out_date`

`actual_check_out` là ISO timestamp (VD: `"2026-03-12T14:15:34.851639+00:00"`), còn `check_out_date` là date string (`"2026-03-13"`). Hóa đơn nhận giá trị không nhất quán. Nếu column `check_out_date` trong `guest_invoices` là type `date`, timestamp sẽ bị truncate — có thể đúng hoặc sai tùy timezone.

**Sửa:** Normalize thành date string:
```typescript
check_out_date: booking.actual_check_out 
  ? format(new Date(booking.actual_check_out), 'yyyy-MM-dd')
  : booking.check_out_date,
```

---

### Tóm tắt

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `invoiceHelpers.ts` L76-101, 114-123 | Thêm line item "Phí vượt giờ" cho hourly; skip "Phụ thu trả phòng muộn" khi hourly |
| 2 | 🟡 | `invoiceHelpers.ts` L22-27 | Thêm delay/retry trước khi fetch booking data |
| 3 | 🟡 | `invoiceHelpers.ts` L203 | Normalize `check_out_date` thành date string |

