
## Kế hoạch: Gửi thông báo QR thanh toán sang điện thoại

### I. TỔNG QUAN

Thêm tính năng cho phép nhân viên gửi mã QR thanh toán sang điện thoại (của mình hoặc đồng nghiệp) qua push notification. Khi nhấn vào thông báo sẽ mở trang hiển thị QR fullscreen, rất tiện lợi để đưa cho khách quét.

### II. FLOW HOẠT ĐỘNG

```text
BookingPaymentDialog (Step: QR)
           │
           ├── [Mở QR toàn màn hình] ← Hiện tại
           │
           └── [Gửi QR sang điện thoại] ← MỚI
                      │
                      ▼
              Push Notification
              (action_url = /payment-qr/{paymentId})
                      │
                      ▼
              ┌─────────────────────┐
              │  Thiết bị nhận      │
              │  notification       │
              │  → Click mở app     │
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ PaymentQRPage       │
              │ (Fullscreen QR)     │
              │                     │
              │ • Load payment info │
              │ • Load bank settings│
              │ • Hiển thị QR lớn   │
              └─────────────────────┘
                        │
                        ▼
              Nhân viên đưa điện thoại
              cho khách quét thanh toán
```

### III. CHI TIẾT THAY ĐỔI

#### A. Tạo PaymentQRPage (NEW)
**File:** `src/pages/payment/PaymentQRPage.tsx`

Page mới hiển thị QR code fullscreen khi mở từ notification:

```typescript
// Route: /payment-qr/:paymentId
// Chức năng:
// 1. Fetch payment info từ booking_payments
// 2. Fetch bank settings
// 3. Hiển thị QR fullscreen (tương tự MobilePaymentQRDisplay)
// 4. Realtime subscribe để tự cập nhật khi payment completed
```

**Giao diện:**
- Background trắng, fullscreen
- QR code lớn giữa màn hình
- Thông tin: Phòng, Khách, Số tiền, Nội dung CK
- Badge realtime khi thanh toán thành công
- Nút quay lại

#### B. Thêm hook usePaymentById (NEW)
**File:** `src/hooks/useBookingPayments.ts`

```typescript
export function usePaymentById(paymentId?: string) {
  // Query payment by ID
  // Include booking info (room_number, guest_name)
  // Realtime subscribe to status changes
}
```

#### C. Cập nhật BookingPaymentDialog
**File:** `src/components/bookings/BookingPaymentDialog.tsx`

Thêm nút "Gửi QR sang điện thoại" trong step QR:

```typescript
// Thêm state
const [isSendingNotification, setIsSendingNotification] = useState(false);

// Handler gửi notification
const handleSendQRNotification = async () => {
  // 1. Get current user
  // 2. Send push notification với action_url = /payment-qr/{paymentId}
  // 3. Toast success
};

// UI: Thêm nút bên dưới "Mở QR toàn màn hình"
<Button variant="outline" onClick={handleSendQRNotification}>
  <Send className="h-4 w-4 mr-2" />
  Gửi QR sang điện thoại
</Button>
```

#### D. Thêm Route trong App.tsx
**File:** `src/App.tsx`

```typescript
// Thêm route cho PaymentQRPage
{ 
  path: "payment-qr/:paymentId", 
  element: (
    <AuthGuard>
      <PaymentQRPage />
    </AuthGuard>
  )
}
```

### IV. DATABASE

Không cần migration mới - sử dụng bảng `booking_payments` hiện có.

### V. FILES CẦN TẠO/SỬA

| File | Loại | Mô tả |
|------|------|-------|
| `src/pages/payment/PaymentQRPage.tsx` | **NEW** | Page hiển thị QR từ notification |
| `src/hooks/useBookingPayments.ts` | UPDATE | Thêm hook usePaymentById |
| `src/components/bookings/BookingPaymentDialog.tsx` | UPDATE | Thêm nút gửi notification |
| `src/App.tsx` | UPDATE | Thêm route /payment-qr/:paymentId |

### VI. UI/UX SPECIFICATIONS

#### A. Nút "Gửi QR sang điện thoại"
- Icon: `Send` hoặc `Smartphone`
- Variant: outline
- Vị trí: Dưới nút "Mở QR toàn màn hình"
- Loading state khi đang gửi

#### B. PaymentQRPage
- Fullscreen, background trắng
- Header với nút Back
- QR code 280x280px (mobile), 320x320px (desktop)
- Hiển thị trạng thái: "Đang chờ thanh toán" / "Đã thanh toán"
- Animation khi thanh toán thành công (confetti hoặc checkmark)
- Thông tin ngân hàng ở footer

### VII. PUSH NOTIFICATION FORMAT

```typescript
{
  title: "QR Thanh toán phòng {roomNumber}",
  body: "Số tiền: {amount} - Khách: {guestName}",
  action_url: "/payment-qr/{paymentId}",
  tag: "payment-qr-{paymentId}",
  data: {
    type: "payment_qr",
    paymentId: paymentId,
    roomNumber: roomNumber
  }
}
```

### VIII. TESTING CHECKLIST

1. Tạo mã QR thanh toán → Nút "Gửi QR sang điện thoại" hiển thị
2. Click gửi → Nhận push notification trên thiết bị đã đăng ký
3. Click notification → Mở trang /payment-qr/:id
4. Trang hiển thị đúng QR code và thông tin
5. Khi thanh toán qua SePay webhook → Trang tự cập nhật "Đã thanh toán"
6. Quay lại từ trang QR hoạt động

### IX. EDGE CASES

| Case | Xử lý |
|------|-------|
| Payment không tồn tại | Hiển thị thông báo lỗi, nút quay về |
| Payment đã completed | Hiển thị trạng thái "Đã thanh toán" |
| Không có thiết bị push | Toast thông báo cần đăng ký thiết bị |
| Bank settings chưa cấu hình | Hiển thị thông báo cần cấu hình |
