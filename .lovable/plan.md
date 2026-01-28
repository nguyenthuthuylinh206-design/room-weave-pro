

## Kế hoạch: Sửa lỗi QR không hiển thị khi click notification trên PWA iOS

### I. PHÂN TÍCH VẤN ĐỀ

**Hiện tại:**
1. PWA cài từ `*.lovableproject.com` (có Auth Bridge)
2. Notification gửi relative URL: `/payment-qr/xxx`
3. Service Worker resolve → `https://894427c4-...lovableproject.com/payment-qr/xxx`
4. PWA mở trang nhưng:
   - Auth Bridge **chặn** request đến Supabase (yêu cầu login)
   - Trang cố redirect sang `id-preview--*.lovable.app` bằng `window.location.href`
   - iOS PWA mở Safari thay vì ở trong app → **Trải nghiệm xấu**

**Giải pháp:**
Thay đổi chiến lược - PWA trên Preview domain sẽ:
1. Detect ngay khi vào trang PaymentQR
2. **Không fetch data** - chỉ hiển thị loading với nút mở trong browser
3. Dùng phương pháp an toàn để mở URL trong Safari

---

### II. CÁC THAY ĐỔI

#### A. Sửa PaymentQRPage.tsx - Xử lý Auth Bridge domain trước khi fetch

**Thay đổi logic:**
- Nếu đang ở Auth Bridge domain (`*.lovableproject.com`), hiển thị UI đặc biệt với nút "Mở trong trình duyệt"
- KHÔNG fetch data từ Supabase (vì sẽ bị Auth Bridge chặn)
- Dùng `window.open()` thay vì `window.location.href` để mở Safari

```typescript
// src/pages/payment/PaymentQRPage.tsx
export default function PaymentQRPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  // Check if on Auth Bridge domain
  const currentOrigin = window.location.origin;
  const publicBaseUrl = getPublicBaseUrl();
  const isOnAuthBridge = publicBaseUrl !== currentOrigin;
  
  // If on Auth Bridge, show "Open in Browser" UI immediately
  if (isOnAuthBridge && paymentId) {
    const targetUrl = `${publicBaseUrl}/payment-qr/${paymentId}`;
    
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6">
        <QrCode className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-center">Xem mã QR thanh toán</h2>
        <p className="text-muted-foreground text-center mb-6">
          Nhấn nút bên dưới để mở trang thanh toán
        </p>
        <Button 
          size="lg" 
          className="w-full max-w-xs"
          onClick={() => {
            // Use window.open for better iOS PWA compatibility
            window.open(targetUrl, '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Mở trong trình duyệt
        </Button>
        <Button 
          variant="ghost" 
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Quay lại
        </Button>
      </div>
    );
  }

  // Normal flow for public domain (id-preview-- or live)
  const { data: payment, isLoading } = usePaymentById(paymentId);
  // ... rest of component
}
```

---

#### B. Thêm auto-open với delay (cải thiện UX)

Để tự động mở trình duyệt ngay sau khi click notification mà không cần user bấm thêm:

```typescript
useEffect(() => {
  if (isOnAuthBridge && paymentId) {
    const targetUrl = `${publicBaseUrl}/payment-qr/${paymentId}`;
    
    // Small delay to ensure page loads first
    const timer = setTimeout(() => {
      window.open(targetUrl, '_blank');
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [isOnAuthBridge, paymentId, publicBaseUrl]);
```

---

### III. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| `src/pages/payment/PaymentQRPage.tsx` | **Sửa** - Xử lý Auth Bridge domain với UI riêng và auto-open |

---

### IV. FLOW SAU KHI SỬA

```text
PWA trên iOS (từ *.lovableproject.com):
=========================================
1. User click notification trên iPhone
   ↓
2. Service Worker resolve → https://[pwa].lovableproject.com/payment-qr/xxx
   ↓
3. PWA mở trang PaymentQRPage
   ↓
4. Component detect đang ở Auth Bridge domain
   ↓
5. KHÔNG fetch data (tránh bị Auth Bridge chặn)
   ↓
6. Auto-open Safari với URL: https://id-preview--[id].lovable.app/payment-qr/xxx
   ↓
7. Safari mở trang QR (public, không cần login) ✓
   ↓
8. PWA hiển thị nút "Mở trong trình duyệt" để user có thể mở lại nếu cần


PWA trên iOS (từ Live domain room-weave-pro.lovable.app):
=========================================
1. Notification → SW resolve → https://room-weave-pro.lovable.app/payment-qr/xxx
   ↓
2. Component detect domain OK (không phải Auth Bridge)
   ↓  
3. Fetch data từ Supabase (cho phép vì public RLS policy)
   ↓
4. Hiển thị QR trực tiếp trong PWA ✓
```

---

### V. FALLBACK UI

Nếu auto-open không hoạt động (bị popup blocker), user vẫn thấy:

```
┌─────────────────────────────────┐
│                                 │
│          📱 [QR Icon]           │
│                                 │
│    Xem mã QR thanh toán         │
│                                 │
│  Nhấn nút bên dưới để mở        │
│       trang thanh toán          │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🔗 Mở trong trình duyệt │    │
│  └─────────────────────────┘    │
│                                 │
│         ← Quay lại              │
│                                 │
└─────────────────────────────────┘
```

---

### VI. LƯU Ý KỸ THUẬT

1. **Không dùng `window.location.href`** để redirect cross-domain trong iOS PWA vì:
   - Có thể không hoạt động
   - Hoặc mở Safari nhưng PWA chuyển sang trạng thái lạ

2. **Dùng `window.open(url, '_blank')`** vì:
   - Rõ ràng intent mở tab mới
   - Tương thích tốt hơn với iOS Safari/PWA
   - User biết sẽ mở trình duyệt

3. **Hooks phải được gọi unconditionally** - sửa code để tuân thủ rules of hooks

