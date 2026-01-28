
## Kế hoạch: Sửa lỗi Notification Click không mở QR trên PWA

### I. NGUYÊN NHÂN GỐC

**Vấn đề hiện tại:**
1. PWA được cài từ `*.lovableproject.com`
2. Notification gửi URL `https://id-preview--*.lovable.app/payment-qr/xxx` (cross-domain)
3. iOS PWA **KHÔNG THỂ** navigate hoặc openWindow đến domain khác trong app context
4. Kết quả: Click notification → Không xảy ra gì hoặc mở Safari thất bại

**Giải pháp:** 
- Service Worker gửi **relative URL** (`/payment-qr/xxx`)
- Trang `PaymentQRPage` tự detect nếu đang ở `*.lovableproject.com` → **auto redirect** sang `id-preview--*.lovable.app`

---

### II. CÁC THAY ĐỔI

#### A. Sửa BookingPaymentDialog.tsx - Gửi relative URL trong notification

**File:** `src/components/bookings/BookingPaymentDialog.tsx`

```typescript
// TRƯỚC (cross-domain URL - không hoạt động trên iOS PWA):
const absoluteUrl = buildPublicUrl(`/payment-qr/${createdPayment.id}`);

// SAU (relative URL - để SW xử lý cùng domain):
const paymentPath = `/payment-qr/${createdPayment.id}`;

// Send push notification với relative URL
const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: user.id,
    title: `QR Thanh toán phòng ${roomNumber}`,
    body: `Số tiền: ${formatVNCurrency(createdPayment.amount)} - Khách: ${guestName}`,
    tag: `payment-qr-${createdPayment.id}`,
    action_url: paymentPath, // Relative URL
    notification_type: 'payment_qr',
    data: {
      url: paymentPath, // Relative URL
      type: 'payment_qr',
      paymentId: createdPayment.id,
      roomNumber,
    },
  },
});
```

---

#### B. Sửa PaymentQRPage.tsx - Auto redirect nếu ở Auth Bridge domain

**File:** `src/pages/payment/PaymentQRPage.tsx`

Thêm logic redirect ở đầu component:

```typescript
import { getPublicBaseUrl } from '@/utils/getPublicUrl';

export default function PaymentQRPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  // Auto-redirect if on Auth Bridge domain (*.lovableproject.com)
  useEffect(() => {
    const currentOrigin = window.location.origin;
    const publicBaseUrl = getPublicBaseUrl();
    
    // If publicBaseUrl is different, we're on Auth Bridge domain
    // Redirect to the public URL
    if (publicBaseUrl !== currentOrigin && paymentId) {
      const targetUrl = `${publicBaseUrl}/payment-qr/${paymentId}`;
      console.log('[PaymentQR] Redirecting to bypass Auth Bridge:', targetUrl);
      window.location.href = targetUrl;
      return;
    }
  }, [paymentId]);

  // ... rest of component
}
```

---

#### C. Giữ nguyên Service Worker - Xử lý relative URL

**File:** `src/sw.ts` (không cần sửa)

Logic hiện tại đã đúng:
```typescript
if (rawUrl.startsWith('http')) {
  urlToOpen = rawUrl;
} else {
  // Relative URL → resolve với SW origin
  urlToOpen = new URL(rawUrl, self.location.origin).toString();
}
```

Service Worker sẽ tự resolve `/payment-qr/xxx` thành `https://[current-domain]/payment-qr/xxx`

---

### III. FLOW SAU KHI SỬA

```text
PWA trên iOS (từ *.lovableproject.com):
=========================================
1. User bấm "Gửi QR sang điện thoại"
   ↓
2. Notification gửi với url: "/payment-qr/abc123" (relative)
   ↓
3. User click notification trên iPhone
   ↓
4. Service Worker nhận click event
   ↓
5. SW resolve: /payment-qr/abc123 → https://[pwa-origin].lovableproject.com/payment-qr/abc123
   ↓
6. PWA mở URL (cùng domain → OK!)
   ↓
7. PaymentQRPage load, detect đang ở *.lovableproject.com
   ↓
8. Auto redirect → https://id-preview--[id].lovable.app/payment-qr/abc123
   ↓
9. Safari mở trang QR public (không cần login) ✓


PWA trên iOS (từ Live domain):
=========================================
1. Notification gửi với url: "/payment-qr/abc123"
   ↓
2. SW resolve → https://room-weave-pro.lovable.app/payment-qr/abc123
   ↓
3. PWA mở URL (cùng domain → OK!)
   ↓
4. PaymentQRPage detect domain OK → Không redirect
   ↓
5. Hiển thị QR trực tiếp ✓
```

---

### IV. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| `src/components/bookings/BookingPaymentDialog.tsx` | **Sửa** - Gửi relative URL thay vì absolute |
| `src/pages/payment/PaymentQRPage.tsx` | **Sửa** - Thêm auto-redirect logic |
| `src/sw.ts` | **Giữ nguyên** |
| `src/utils/getPublicUrl.ts` | **Giữ nguyên** |

---

### V. TEST SAU KHI SỬA

1. **Từ PWA Preview (*.lovableproject.com):**
   - Tạo payment, bấm "Gửi QR sang điện thoại"
   - Click notification trên iPhone
   - PWA mở → tự redirect sang `id-preview--*.lovable.app`
   - Safari mở trang QR public

2. **Từ PWA Live:**
   - Click notification
   - PWA mở trang QR trực tiếp (không redirect)
   - Hiển thị QR trong PWA

3. **Edge cases:**
   - Click notification khi PWA đóng → openWindow tạo tab mới
   - Click notification khi PWA đang mở → navigate trong app
