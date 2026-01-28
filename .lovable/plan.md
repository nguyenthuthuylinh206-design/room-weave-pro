
## Kế hoạch: Tích hợp QR Payment vào nút "Thu tiền & Trả phòng"

### I. QUY TRÌNH HIỆN TẠI

```text
User click "Thu tiền & Trả phòng"
          │
          ▼
┌─────────────────────────────┐
│ handlePayAndCheckout()      │
│ • Update payment trực tiếp  │
│ • Thực hiện checkout        │
│ • Không có lựa chọn method  │
└─────────────────────────────┘
```

**Vấn đề:** Thanh toán được xử lý ngầm, không cho phép chọn phương thức (tiền mặt/chuyển khoản QR).

---

### II. QUY TRÌNH MỚI

```text
User click "Thu tiền & Trả phòng"
          │
          ▼
┌─────────────────────────────────┐
│       BookingPaymentDialog      │
│  ┌─────────┐    ┌───────────┐   │
│  │Tiền mặt │ OR │Chuyển khoản│  │
│  └────┬────┘    └─────┬─────┘   │
│       │               │         │
│       ▼               ▼         │
│   Xác nhận      ┌───────────┐   │
│   đã nhận      │  QR Code   │   │
│   tiền         │  VietQR    │   │
│       │        │            │   │
│       │        │ [Fullscreen]│  │
│       │        │  Button    │   │
│       │        └─────┬─────┘   │
│       │              │         │
│       ▼              ▼         │
│     ┌────────────────────┐     │
│     │ onPaymentComplete  │     │
│     │ → Gọi checkout     │     │
│     └────────────────────┘     │
└─────────────────────────────────┘
```

---

### III. CHI TIẾT THAY ĐỔI

#### A. CheckoutSummaryDialog.tsx

**1. Import thêm:**
```typescript
import { BookingPaymentDialog } from '@/components/bookings/BookingPaymentDialog'
```

**2. Thêm state:**
```typescript
const [showPaymentDialog, setShowPaymentDialog] = useState(false)
```

**3. Thay đổi handler nút "Thu tiền & Trả phòng":**
```typescript
// Cũ: onClick={handlePayAndCheckout}
// Mới: onClick={() => setShowPaymentDialog(true)}
```

**4. Thêm callback xử lý sau khi thanh toán:**
```typescript
const handlePaymentComplete = () => {
  setShowPaymentDialog(false)
  // Gọi callback checkout sau khi thanh toán xong
  onPayAndCheckout(
    adjustedLateCharge,
    isAdjusted ? adjustmentNote : undefined,
    totalDamageCharge,
    isDamageAdjusted ? damageAdjustmentNote : undefined,
    adjustedDamageItems
  )
}
```

**5. Thêm BookingPaymentDialog component:**
```typescript
<BookingPaymentDialog
  open={showPaymentDialog}
  onOpenChange={setShowPaymentDialog}
  booking={{
    id: bookingId!,
    guest_name: guestName,
    room_number: roomNumber,
    total_amount: adjustedCostBreakdown.totalAmount,
    amount_paid: costBreakdown.amountPaid,
    tenant_id: tenantId!,
    hotel_id: hotelId!,
  }}
  onPaymentComplete={handlePaymentComplete}
/>
```

---

### IV. FLOW CHI TIẾT

#### Flow 1: Thanh toán tiền mặt
```text
1. User click "Thu tiền & Trả phòng"
2. Mở BookingPaymentDialog (step: select)
3. Chọn "Tiền mặt" (đã chọn mặc định)
4. Số tiền hiển thị = số tiền còn lại
5. Click "Xác nhận đã nhận tiền"
6. System:
   - Tạo booking_payment (status: completed)
   - Cập nhật room_bookings.amount_paid
7. Dialog đóng, gọi handlePaymentComplete()
8. CheckoutSummaryDialog gọi onPayAndCheckout → Checkout
9. Toast: "Đã thanh toán và check-out thành công"
```

#### Flow 2: Thanh toán chuyển khoản
```text
1. User click "Thu tiền & Trả phòng"
2. Mở BookingPaymentDialog (step: select)
3. Chọn "Chuyển khoản"
4. Số tiền hiển thị = số tiền còn lại
5. Click "Tạo mã QR thanh toán"
6. System:
   - Tạo booking_payment (status: pending)
   - Generate transaction_reference: BP{room}{timestamp}
7. Hiển thị QR Code VietQR (step: qr)
8. Nhân viên có thể:
   a. "Mở QR toàn màn hình" → Đưa khách quét
   b. "Đã nhận được tiền" → Manual confirm
   c. Đợi SePay webhook tự xác nhận
9. Khi confirmed:
   - booking_payment status → completed
   - room_bookings.amount_paid cập nhật
   - Realtime cập nhật UI
10. Dialog đóng → Checkout
```

#### Flow 3: Mobile QR Fullscreen
```text
1. Từ BookingPaymentDialog, click "Mở QR toàn màn hình"
2. MobilePaymentQRDisplay mở (overlay fullscreen)
3. Hiển thị:
   - QR code lớn (dễ quét)
   - Thông tin: Phòng, Số tiền, Nội dung CK
   - Tên chủ TK, số TK
4. Nhân viên đưa điện thoại cho khách quét
5. Khách mở app ngân hàng → Quét → Chuyển tiền
6. Click X hoặc vuốt xuống để đóng
```

---

### V. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/bookings/CheckoutSummaryDialog.tsx` | Thêm state, import, BookingPaymentDialog component |

---

### VI. DỮ LIỆU TRUYỀN VÀO BookingPaymentDialog

```typescript
booking={{
  id: bookingId,               // ID booking
  guest_name: guestName,       // Tên khách (hiển thị)
  room_number: roomNumber,     // Số phòng (hiển thị + tạo mã)
  total_amount: adjustedCostBreakdown.totalAmount,  // Tổng tiền (đã tính phụ thu)
  amount_paid: costBreakdown.amountPaid,            // Đã thanh toán
  tenant_id: tenantId,         // Tenant isolation
  hotel_id: hotelId,           // Hotel context
}}
```

**Số tiền còn lại = total_amount - amount_paid** (tính trong dialog)

---

### VII. TESTING CHECKLIST

1. Click "Thu tiền & Trả phòng" → Mở BookingPaymentDialog
2. Tiền mặt: Xác nhận → Checkout thành công
3. Chuyển khoản: QR hiển thị đúng số tiền còn lại
4. Mobile QR fullscreen hoạt động
5. Sau thanh toán xong → Tự động checkout
6. Trường hợp partial payment (trả một phần) hoạt động
7. Realtime cập nhật khi webhook SePay xác nhận

---

### VIII. EDGE CASES

| Case | Xử lý |
|------|-------|
| Đã thanh toán đủ | Nút chuyển thành "Xác nhận Check-out" (không qua payment dialog) |
| Còn nợ partial | Hiển thị số tiền còn lại, cho phép trả một phần |
| Cancel payment dialog | Quay về CheckoutSummaryDialog, không checkout |
| Webhook confirm trước manual | UI tự cập nhật, dialog đóng → checkout |
