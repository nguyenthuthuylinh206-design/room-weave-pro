

## Kế hoạch: Hiển thị QR trực tiếp trong PWA khi app đang mở

### I. PHÂN TÍCH VẤN ĐỀ

**Hiện tại:**
1. User nhấn "Gửi QR sang điện thoại" → Push notification gửi đến PWA
2. Click notification → Service Worker navigate đến `/payment-qr/{id}`
3. `PaymentQRPage` detect Auth Bridge domain → **Luôn redirect ra browser**
4. **Vấn đề**: Ngay cả khi PWA đang mở và user đã login, vẫn redirect ra ngoài

**Thực tế:**
- Khi PWA đang foreground và user đã login → Có session Supabase → **CÓ THỂ fetch data**
- Auth Bridge chỉ chặn khi fresh request (chưa có session)
- Service Worker xử lý notification sẽ navigate trong app đang mở

**Giải pháp:**
1. Kiểm tra xem có Supabase session hay không (thay vì chỉ check domain)
2. Nếu có session → Fetch data và hiển thị QR trực tiếp
3. Nếu không có session (fresh open) → Redirect ra browser

---

### II. CÁC THAY ĐỔI

#### A. Sửa PaymentQRPage.tsx - Logic mới

**Thay đổi chính:**
- Thêm check Supabase session trước khi quyết định redirect
- Nếu có session → Fetch và hiển thị QR trực tiếp
- Nếu không có session + Auth Bridge domain → Hiển thị UI redirect

```typescript
// src/pages/payment/PaymentQRPage.tsx

export default function PaymentQRPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  // State để track session status
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  
  // Check Auth Bridge domain
  const { isOnAuthBridge, targetUrl } = useMemo(() => {
    const currentOrigin = window.location.origin;
    const publicBaseUrl = getPublicBaseUrl();
    const isOnAuthBridge = publicBaseUrl !== currentOrigin;
    const targetUrl = paymentId ? `${publicBaseUrl}/payment-qr/${paymentId}` : '';
    return { isOnAuthBridge, targetUrl };
  }, [paymentId]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setHasSession(!!data.session);
      } catch {
        setHasSession(false);
      } finally {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  // Quyết định có fetch data hay không:
  // - Nếu KHÔNG phải Auth Bridge domain → fetch
  // - Nếu Auth Bridge + có session → fetch
  // - Nếu Auth Bridge + không session → không fetch, redirect
  const shouldFetchData = !isOnAuthBridge || (isOnAuthBridge && hasSession);
  const shouldShowRedirectUI = isOnAuthBridge && sessionChecked && !hasSession;

  // Fetch data (chỉ khi cần)
  const { data: payment, isLoading } = usePaymentById(
    shouldFetchData ? paymentId : undefined
  );
  
  // ... rest of component
}
```

#### B. Flow logic mới

```text
Trường hợp 1: PWA đang mở (user đã login)
=========================================
1. User click notification
2. Service Worker navigate trong app
3. PaymentQRPage mount
4. Check session → ĐÃ CÓ SESSION
5. shouldFetchData = true
6. Fetch payment data từ Supabase → SUCCESS
7. Hiển thị QR trực tiếp trong app ✓


Trường hợp 2: PWA đóng (click notification mở fresh)
====================================================
1. User click notification  
2. Service Worker openWindow (fresh)
3. PaymentQRPage mount
4. Check session → KHÔNG CÓ (Auth Bridge chưa có session)
5. shouldShowRedirectUI = true
6. Hiển thị UI + auto-open browser
7. Browser mở public URL với QR ✓
```

---

### III. CHI TIẾT IMPLEMENTATION

#### File: `src/pages/payment/PaymentQRPage.tsx`

**Thay đổi:**

1. **Thêm session check:**
```typescript
const [sessionChecked, setSessionChecked] = useState(false);
const [hasSession, setHasSession] = useState(false);

useEffect(() => {
  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    } catch {
      setHasSession(false);
    } finally {
      setSessionChecked(true);
    }
  };
  checkSession();
}, []);
```

2. **Logic quyết định:**
```typescript
// Nếu không phải Auth Bridge → fetch bình thường
// Nếu Auth Bridge + có session → fetch được (PWA đang mở)
// Nếu Auth Bridge + không session → redirect (fresh open)
const shouldFetchData = !isOnAuthBridge || (isOnAuthBridge && hasSession);
const shouldShowRedirectUI = isOnAuthBridge && sessionChecked && !hasSession;
```

3. **UI loading khi đang check session:**
```typescript
// Đang check session
if (!sessionChecked) {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

4. **Chỉ show redirect UI khi cần:**
```typescript
// Chỉ redirect khi: Auth Bridge + không có session
if (shouldShowRedirectUI && paymentId) {
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br ...">
      {/* UI đẹp với nút mở browser */}
    </div>
  );
}
```

---

### IV. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| `src/pages/payment/PaymentQRPage.tsx` | **Sửa** - Thêm session check + conditional fetch |

---

### V. LƯU Ý QUAN TRỌNG

1. **Không break existing flow**: 
   - Live domain vẫn hoạt động bình thường
   - Preview qua browser vẫn hoạt động

2. **Session persistence trong PWA**:
   - Khi PWA đang mở, session được lưu trong memory/storage
   - Service Worker navigate trong app → session vẫn có
   - Fresh open (openWindow) → session chưa có

3. **Fallback an toàn**:
   - Nếu fetch fail vì bất kỳ lý do → Hiển thị error UI với nút quay lại
   - Không bị stuck ở loading screen

