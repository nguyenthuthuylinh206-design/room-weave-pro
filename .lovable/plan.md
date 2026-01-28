

## Kế hoạch: Sửa lỗi QR không hiển thị khi PWA đang hoạt động + Cải tiến giao diện

### I. PHÂN TÍCH VẤN ĐỀ

**Vấn đề 1: PWA đang hoạt động không mở QR**

Khi PWA đang mở sẵn và user click notification:
1. Service Worker gọi `client.navigate(url)` → Component được navigate trong app
2. `PaymentQRPage` nhận URL, detect Auth Bridge domain → Hiển thị UI "Mở trong trình duyệt"
3. `useEffect` auto-open sử dụng state `autoOpenAttempted` để tránh mở nhiều lần
4. **Vấn đề**: State này có thể bị giữ lại từ lần navigate trước, hoặc React không re-mount component khi navigate cùng route

**Giải pháp**: Reset `autoOpenAttempted` khi `paymentId` thay đổi, và dùng `key={paymentId}` để force re-mount component nếu cần.

**Vấn đề 2: Giao diện đơn giản, chưa đẹp mắt**

UI hiện tại chỉ có nền trắng và các element cơ bản. Cần thêm:
- Gradient background đẹp mắt
- Animation cho icon và nút
- Thẻ card với shadow đẹp
- Progress indicator khi đang mở browser

---

### II. CÁC THAY ĐỔI

#### A. Sửa logic auto-open khi navigate trong PWA

**File:** `src/pages/payment/PaymentQRPage.tsx`

```typescript
// Reset autoOpenAttempted khi paymentId thay đổi
useEffect(() => {
  setAutoOpenAttempted(false);
}, [paymentId]);
```

#### B. Cải tiến giao diện Auth Bridge UI

Thiết kế mới với:
- **Gradient background**: Từ màu primary nhẹ đến background
- **Card với blur effect**: Glassmorphism style
- **Icon animation**: Pulse effect cho icon QR
- **Loading indicator**: Hiển thị khi đang tự động mở browser
- **Better typography**: Rõ ràng, dễ đọc hơn

**Thiết kế UI mới:**

```text
┌─────────────────────────────────────────────────┐
│ ┌─ Gradient Background ───────────────────────┐ │
│ │                                             │ │
│ │                                             │ │
│ │         ┌─ Card (glassmorphism) ───────┐    │ │
│ │         │                              │    │ │
│ │         │      ╔═══════════════╗       │    │ │
│ │         │      ║   📱 (pulse)  ║       │    │ │
│ │         │      ╚═══════════════╝       │    │ │
│ │         │                              │    │ │
│ │         │    Xem mã QR thanh toán      │    │ │
│ │         │                              │    │ │
│ │         │  ⏳ Đang mở trình duyệt...   │    │ │
│ │         │                              │    │ │
│ │         │  ┌─────────────────────────┐ │    │ │
│ │         │  │ 🔗 Mở trong trình duyệt │ │    │ │
│ │         │  └─────────────────────────┘ │    │ │
│ │         │                              │    │ │
│ │         │        ← Quay lại            │    │ │
│ │         │                              │    │ │
│ │         └──────────────────────────────┘    │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Code mới cho Auth Bridge UI:**

```typescript
if (isOnAuthBridge && paymentId) {
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/20 via-primary/10 to-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-border/50"
      >
        {/* Animated QR Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <QrCode className="h-10 w-10 text-primary" />
          </motion.div>
        </motion.div>

        <h2 className="text-xl font-bold mb-2">Xem mã QR thanh toán</h2>
        
        {/* Auto-open indicator */}
        {!autoOpenAttempted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang mở trình duyệt...</span>
          </motion.div>
        )}

        <p className="text-muted-foreground mb-6">
          Nhấn nút bên dưới để mở trang thanh toán
        </p>

        <Button 
          size="lg" 
          className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all"
          onClick={() => window.open(targetUrl, '_blank')}
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Mở trong trình duyệt
        </Button>

        <Button 
          variant="ghost" 
          className="mt-4 w-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </motion.div>
    </div>
  );
}
```

---

### III. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| `src/pages/payment/PaymentQRPage.tsx` | **Sửa** - Reset state khi navigate + Cải tiến UI Auth Bridge |

---

### IV. CHI TIẾT KỸ THUẬT

**1. Reset `autoOpenAttempted` khi `paymentId` thay đổi:**
- Thêm `useEffect` mới để watch `paymentId`
- Khi `paymentId` thay đổi → reset state về `false`
- Điều này đảm bảo auto-open chạy mỗi khi có payment mới

**2. Cải tiến UI:**
- **Gradient background**: `bg-gradient-to-br from-primary/20 via-primary/10 to-background`
- **Glassmorphism card**: `bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl`
- **Animated icon**: Framer Motion với pulse effect
- **Loading state**: Hiển thị spinner khi đang auto-open
- **Better buttons**: Thêm shadow và hover effects

---

### V. FLOW SAU KHI SỬA

```text
PWA đang hoạt động + Click notification:
=========================================
1. User click notification
   ↓
2. Service Worker gọi client.navigate('/payment-qr/abc123')
   ↓
3. PaymentQRPage nhận paymentId mới
   ↓
4. useEffect reset autoOpenAttempted = false
   ↓
5. useEffect auto-open chạy → window.open(targetUrl)
   ↓
6. Safari mở trang QR public ✓
   ↓
7. PWA hiển thị UI đẹp với loading indicator


PWA đóng + Click notification:
=========================================
1. Service Worker mở window mới với URL
   ↓
2. PaymentQRPage load, autoOpenAttempted = false
   ↓
3. Auto-open chạy ngay → Safari mở
   ↓
4. UI hiển thị đẹp ✓
```

