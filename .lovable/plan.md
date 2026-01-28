
## Kế hoạch: Tính năng QR Code thanh toán tiền phòng

### I. TỔNG QUAN

Xây dựng hệ thống thanh toán tiền phòng với mã QR, cho phép:
1. Nhân viên chọn phương thức thanh toán (tiền mặt/chuyển khoản)
2. Nếu chuyển khoản: hiển thị QR code với nội dung thanh toán tự động
3. Nhân viên có thể hiển thị QR fullscreen trên mobile để đưa khách quét
4. Lưu lịch sử giao dịch thanh toán booking

---

### II. KIẾN TRÚC HỆ THỐNG

```text
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ RoomBookingDialog│    │CheckoutSummaryDialog│                │
│  │  "Thu tiền"      │    │  "Thu tiền & Trả"   │                │
│  └────────┬─────────┘    └─────────┬──────────┘                 │
│           │                        │                             │
│           └───────────┬────────────┘                             │
│                       ▼                                          │
│           ┌───────────────────────┐                              │
│           │ BookingPaymentDialog  │ ◄── NEW                      │
│           │ • Chọn phương thức    │                              │
│           │ • Nhập số tiền        │                              │
│           │ • Hiển thị QR/xác nhận│                              │
│           └───────────┬───────────┘                              │
│                       │                                          │
│      ┌────────────────┼────────────────┐                         │
│      ▼                ▼                ▼                         │
│ ┌─────────┐    ┌─────────────┐   ┌──────────────────┐           │
│ │  Cash   │    │ Bank QR     │   │ MobileQRDisplay  │ ◄── NEW   │
│ │ (update │    │ (BankQRCode)│   │ (Fullscreen QR)  │           │
│ │ booking)│    │             │   │                  │           │
│ └─────────┘    └─────────────┘   └──────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE                                   │
├─────────────────────────────────────────────────────────────────┤
│  booking_payments (NEW)                                          │
│  ├── id                                                          │
│  ├── tenant_id                                                   │
│  ├── hotel_id                                                    │
│  ├── booking_id → room_bookings                                  │
│  ├── amount                                                      │
│  ├── payment_method (cash | bank_transfer)                       │
│  ├── payment_status (pending | completed | cancelled)            │
│  ├── transaction_reference (mã CK: BP-XXXXXX)                    │
│  ├── paid_at                                                     │
│  ├── created_by                                                  │
│  └── metadata (room_number, guest_name...)                       │
│                                                                  │
│  room_bookings (UPDATE)                                          │
│  └── Cập nhật amount_paid, payment_status khi thanh toán         │
└─────────────────────────────────────────────────────────────────┘
```

---

### III. CHI TIẾT COMPONENTS

#### A. BookingPaymentDialog (NEW)
**File:** `src/components/bookings/BookingPaymentDialog.tsx`

Dialog chính để xử lý thanh toán booking:
- **Step 1**: Chọn phương thức (Tiền mặt / Chuyển khoản)
- **Step 2**: Nhập số tiền (mặc định = số còn lại)
- **Step 3a** (Tiền mặt): Xác nhận → Cập nhật booking
- **Step 3b** (Chuyển khoản): Hiển thị QR Code + nút "Mở QR toàn màn hình"

```typescript
interface BookingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    guest_name: string;
    room_number: string;
    total_amount: number;
    amount_paid: number;
  };
  onPaymentComplete?: () => void;
}
```

#### B. MobilePaymentQRDisplay (NEW)
**File:** `src/components/payment/MobilePaymentQRDisplay.tsx`

Fullscreen QR display cho mobile:
- QR code phóng to toàn màn hình
- Thông tin thanh toán ngắn gọn
- Nút đóng/thu nhỏ
- Auto-brightness tối đa (nếu supported)
- Pull-down để thu nhỏ

```typescript
interface MobilePaymentQRDisplayProps {
  open: boolean;
  onClose: () => void;
  qrData: {
    bankCode: string;
    accountNumber: string;
    accountHolder: string;
    amount: number;
    paymentContent: string;
  };
  bookingInfo: {
    guestName: string;
    roomNumber: string;
  };
}
```

#### C. Cập nhật RoomBookingDialog
**File:** `src/components/rooms/RoomBookingDialog.tsx`

Thay đổi nút "Nhận thanh toán đầy đủ":
- Mở `BookingPaymentDialog` thay vì cập nhật trực tiếp
- Truyền thông tin booking hiện tại

#### D. Cập nhật CheckoutSummaryDialog
**File:** `src/components/bookings/CheckoutSummaryDialog.tsx`

Thay đổi nút "Thu tiền & Trả phòng":
- Mở `BookingPaymentDialog` trước
- Sau khi thanh toán xong → Thực hiện checkout

---

### IV. DATABASE MIGRATION

**Tạo bảng `booking_payments`:**

```sql
CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES room_bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
  transaction_reference TEXT, -- Mã chuyển khoản: BP-XXXXXX
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX idx_booking_payments_tenant ON booking_payments(tenant_id);
CREATE INDEX idx_booking_payments_reference ON booking_payments(transaction_reference);

-- RLS
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_payments_tenant_isolation" ON booking_payments
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE booking_payments;
```

---

### V. HOOK & UTILITIES

#### A. useBookingPayments (NEW)
**File:** `src/hooks/useBookingPayments.ts`

```typescript
export function useBookingPayments(bookingId?: string) {
  // Query payments for a booking
  // Mutation to create payment
  // Mutation to confirm cash payment
  // Realtime subscription for status updates
}

export function useCreateBookingPayment() {
  // Create payment transaction
  // Generate unique reference (BP-{timestamp})
  // Update booking amount_paid if cash
}
```

#### B. Payment Reference Generator
**Format:** `BP-{hotelCode}-{timestamp36}`
**Ví dụ:** `BP-P102-M8X4Y2`

---

### VI. FLOW THANH TOÁN

#### Flow 1: Thanh toán tiền mặt
```text
1. Nhân viên click "Thu tiền"
2. Mở BookingPaymentDialog
3. Chọn "Tiền mặt"
4. Nhập số tiền (mặc định = còn lại)
5. Click "Xác nhận đã nhận tiền"
6. System:
   - Insert booking_payments (status: completed)
   - Update room_bookings.amount_paid
   - Update room_bookings.payment_status
7. Đóng dialog, hiển thị toast thành công
```

#### Flow 2: Thanh toán chuyển khoản
```text
1. Nhân viên click "Thu tiền"
2. Mở BookingPaymentDialog
3. Chọn "Chuyển khoản"
4. Nhập số tiền (mặc định = còn lại)
5. Click "Tạo mã thanh toán"
6. System:
   - Insert booking_payments (status: pending)
   - Generate transaction_reference
7. Hiển thị QR Code + thông tin CK
8. Nhân viên có thể:
   a. "Mở QR toàn màn hình" → MobilePaymentQRDisplay
   b. "Đã nhận tiền" → Confirm manual
   c. Đợi webhook SePay auto-confirm
9. Khi confirmed:
   - Update booking_payments.status = completed
   - Update room_bookings.amount_paid
   - Realtime cập nhật UI
```

#### Flow 3: Mobile QR Display
```text
1. Từ BookingPaymentDialog, click "Mở QR toàn màn hình"
2. MobilePaymentQRDisplay mở fullscreen
3. Nhân viên đưa điện thoại cho khách quét
4. Khách quét QR bằng app ngân hàng
5. Khách chuyển khoản
6. SePay webhook → Auto confirm
7. UI tự cập nhật "Đã thanh toán"
```

---

### VII. FILES CẦN TẠO/SỬA

| File | Loại | Mô tả |
|------|------|-------|
| `src/components/bookings/BookingPaymentDialog.tsx` | **NEW** | Dialog thanh toán chính |
| `src/components/payment/MobilePaymentQRDisplay.tsx` | **NEW** | Fullscreen QR cho mobile |
| `src/hooks/useBookingPayments.ts` | **NEW** | Hook quản lý thanh toán |
| `src/components/rooms/RoomBookingDialog.tsx` | UPDATE | Thêm state, gọi BookingPaymentDialog |
| `src/components/bookings/CheckoutSummaryDialog.tsx` | UPDATE | Tích hợp payment dialog |
| `supabase/functions/sepay-webhook/index.ts` | UPDATE | Xử lý booking payments |

---

### VIII. SePay Webhook Integration

Cập nhật `sepay-webhook` để xử lý booking payments:

```typescript
// Thêm logic match booking payment
const bookingPayment = await supabase
  .from('booking_payments')
  .select('*, booking:room_bookings(*)')
  .eq('transaction_reference', normalizedContent)
  .eq('payment_status', 'pending')
  .maybeSingle();

if (bookingPayment) {
  // Update booking payment
  await supabase.from('booking_payments')
    .update({ payment_status: 'completed', paid_at: new Date() })
    .eq('id', bookingPayment.id);
  
  // Update room booking
  const newAmountPaid = (bookingPayment.booking.amount_paid || 0) + bookingPayment.amount;
  await supabase.from('room_bookings')
    .update({ 
      amount_paid: newAmountPaid,
      payment_status: newAmountPaid >= bookingPayment.booking.total_amount ? 'paid' : 'partial'
    })
    .eq('id', bookingPayment.booking_id);
}
```

---

### IX. UI/UX SPECIFICATIONS

#### A. BookingPaymentDialog
- Max width: `sm:max-w-md`
- Payment method: Radio buttons với icons
- Amount input: Số tiền với format VND
- QR section: Sử dụng `BankQRCode` component hiện có
- Mobile button: "Mở QR toàn màn hình" với icon Maximize

#### B. MobilePaymentQRDisplay
- Fullscreen overlay (fixed, inset-0)
- Background: White
- QR size: 80% viewport width (max 400px)
- Swipe down to close (gesture)
- Thông tin ngắn: Phòng, Số tiền, Nội dung CK

---

### X. TESTING CHECKLIST

1. Thanh toán tiền mặt:
   - Số tiền cập nhật đúng
   - Payment status chuyển đúng (partial/paid)
   
2. Thanh toán chuyển khoản:
   - QR hiển thị đúng thông tin
   - Transaction reference unique
   - Webhook xử lý đúng khi nhận tiền
   
3. Mobile QR Display:
   - Fullscreen hoạt động trên iOS/Android
   - Swipe down đóng được
   - QR readable by banking apps
   
4. Realtime updates:
   - UI cập nhật khi webhook confirm
   - Toast notification hiển thị

5. Edge cases:
   - Thanh toán partial (một phần)
   - Thanh toán nhiều lần
   - Cancel payment
