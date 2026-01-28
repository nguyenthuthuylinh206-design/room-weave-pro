
## Kế hoạch: Sửa lỗi QR Payment trắng trang trên Preview + Live

### I. NGUYÊN NHÂN GỐC

Khi gửi thông báo từ Preview, URL được tạo là:
```
https://894427c4-74e7-48d3-b143-a401e780c7a2.lovableproject.com/payment-qr/...
```

Domain `*.lovableproject.com` bị **Auth Bridge** chặn, nên trang QR public không thể mở được.

**Giải pháp:** Chuyển đổi URL sang domain `id-preview--*.lovable.app` khi đang ở Preview, domain này không có Auth Bridge.

---

### II. CÁC THAY ĐỔI CẦN THỰC HIỆN

#### A. Tạo utility function để lấy đúng domain (file mới)

**File:** `src/utils/getPublicUrl.ts`

```typescript
/**
 * Get the correct public URL for QR payments that bypasses Auth Bridge
 * 
 * Preview domains:
 * - *.lovableproject.com (has Auth Bridge - blocked)
 * - id-preview--*.lovable.app (no Auth Bridge - works!)
 * 
 * Live domains:
 * - *.lovable.app (no Auth Bridge - works!)
 */
export function getPublicBaseUrl(): string {
  const origin = window.location.origin;
  
  // Check if we're on Preview domain with Auth Bridge
  // Pattern: {project-id}.lovableproject.com
  const lovableProjectMatch = origin.match(
    /^https:\/\/([a-f0-9-]+)\.lovableproject\.com$/
  );
  
  if (lovableProjectMatch) {
    // Convert to id-preview--{project-id}.lovable.app format
    const projectId = lovableProjectMatch[1];
    return `https://id-preview--${projectId}.lovable.app`;
  }
  
  // For all other domains (Live, custom), use as-is
  return origin;
}

export function buildPublicUrl(path: string): string {
  const base = getPublicBaseUrl();
  return new URL(path, base).toString();
}
```

**Giải thích:**
- Hàm `getPublicBaseUrl()` phát hiện nếu đang ở Preview domain (`*.lovableproject.com`)
- Tự động chuyển sang `id-preview--{project-id}.lovable.app` (domain không có Auth Bridge)
- Nếu đang ở Live hoặc custom domain, giữ nguyên

---

#### B. Cập nhật BookingPaymentDialog.tsx

**File:** `src/components/bookings/BookingPaymentDialog.tsx`

Thay đổi hàm `handleSendQRNotification`:

```typescript
// Trước:
const path = `/payment-qr/${createdPayment.id}`;
const absoluteUrl = new URL(path, window.location.origin).toString();

// Sau:
import { buildPublicUrl } from '@/utils/getPublicUrl';

const absoluteUrl = buildPublicUrl(`/payment-qr/${createdPayment.id}`);
```

---

#### C. Cập nhật Service Worker (sw.ts)

**File:** `src/sw.ts`

Đảm bảo Service Worker cũng xử lý đúng URL:

```typescript
// Trong notificationclick handler:
const rawUrl = (event.notification.data?.url as string) || '/';
let urlToOpen = rawUrl;

try {
  // Nếu URL đã là absolute, dùng trực tiếp
  if (rawUrl.startsWith('http')) {
    urlToOpen = rawUrl;
  } else {
    // Nếu relative, resolve với origin hiện tại
    urlToOpen = new URL(rawUrl, self.location.origin).toString();
  }
} catch {
  urlToOpen = new URL('/', self.location.origin).toString();
}
```

Giữ nguyên logic navigate/openWindow nhưng đảm bảo không override absolute URL từ payload.

---

### III. FLOW SAU KHI SỬA

```text
Preview Environment:
================================
BookingPaymentDialog gửi notification
    ↓
buildPublicUrl('/payment-qr/abc')
    ↓
Phát hiện: *.lovableproject.com
    ↓
Chuyển: https://id-preview--{id}.lovable.app/payment-qr/abc
    ↓
Push notification gửi URL mới
    ↓
Service Worker mở URL → Không qua Auth Bridge → Hiển thị QR ✓


Live Environment:
================================
BookingPaymentDialog gửi notification
    ↓
buildPublicUrl('/payment-qr/abc')
    ↓
Phát hiện: *.lovable.app (Live)
    ↓
Giữ nguyên: https://room-weave-pro.lovable.app/payment-qr/abc
    ↓
Push notification gửi URL
    ↓
Service Worker mở URL → Hiển thị QR ✓
```

---

### IV. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| `src/utils/getPublicUrl.ts` | **Tạo mới** - Utility chuyển đổi URL |
| `src/components/bookings/BookingPaymentDialog.tsx` | **Sửa** - Dùng `buildPublicUrl()` |
| `src/sw.ts` | **Sửa** - Hỗ trợ absolute URL từ payload |

---

### V. CHI TIẾT KỸ THUẬT

**Tại sao dùng `id-preview--*.lovable.app`?**
- Đây là domain Preview chính thức của Lovable
- Không có Auth Bridge
- Dữ liệu Test database giống như `*.lovableproject.com`
- User có thể truy cập public route mà không cần login

**RLS Policies đã có (không cần sửa):**
- `booking_payments`: Policy `SELECT` cho anonymous với `USING (true)`
- `bank_payment_settings`: Policy `SELECT` cho anonymous với `is_active = true`

**Realtime vẫn hoạt động:**
- Hook `usePaymentById` đã có realtime subscription
- Khi SePay webhook confirm payment, UI sẽ tự cập nhật

---

### VI. TEST SAU KHI SỬA

1. **Từ Preview domain:**
   - Tạo booking payment mới
   - Bấm "Gửi QR sang điện thoại"
   - Kiểm tra URL trong notification phải là `https://id-preview--894427c4-74e7-48d3-b143-a401e780c7a2.lovable.app/payment-qr/...`
   - Click notification → Mở QR không cần login

2. **Từ Live domain:**
   - Tương tự, URL phải là `https://room-weave-pro.lovable.app/payment-qr/...`
   - Click notification → Mở QR không cần login
