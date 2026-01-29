

## Kế hoạch: Tăng tốc gửi QR sang điện thoại

### I. PHÂN TÍCH NGUYÊN NHÂN

**Timeline chi tiết từ logs:**
```text
13:02:17.814 - Boot start
13:02:18.238 - Boot done (41ms)
13:02:18.273 - Received request
13:02:19.514 - Found 5 subscriptions ← Khoảng 1.2s để query
13:02:19.527-530 - Start sending 5 pushes
13:02:19.878-20.187 - All 5 pushes sent ← ~0.7s để encrypt + gửi
13:02:21.xxx - Response về client
─────────────────────────────────────────────────
Tổng: ~4 giây
```

**Bottleneck chính:**
1. **Database query subscriptions**: ~1.2 giây (đã tối ưu parallel nhưng vẫn chậm)
2. **VAPID JWT + Encryption**: Mỗi push cần generate JWT + encrypt payload riêng (~100-150ms/push)
3. **5 thiết bị đăng ký**: User có 5 subscriptions → 5x processing time

---

### II. GIẢI PHÁP

#### A. Tối ưu UI: "Fire and forget" pattern

**Ý tưởng**: Không chờ edge function hoàn thành, hiển thị toast ngay khi request được gửi

```typescript
const handleSendQRNotification = async () => {
  if (!createdPayment) return;

  // Hiển thị toast NGAY LẬP TỨC
  toast.success('Đang gửi QR đến điện thoại...');

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('Vui lòng đăng nhập lại');
      return;
    }

    // Fire and forget - không await
    supabase.functions.invoke('send-push-notification', {
      body: { ... }
    }).then(({ data, error }) => {
      if (error) {
        toast.error('Không thể gửi thông báo');
      } else if (data?.sent === 0) {
        toast.warning('Chưa có thiết bị nào đăng ký');
      }
      // Không show success toast nữa vì đã show ở đầu
    }).catch(() => {
      toast.error('Không thể gửi thông báo');
    });
    
    // KHÔNG chờ - return ngay
  } catch (error) {
    console.error('Send notification error:', error);
    toast.error('Không thể gửi thông báo');
  }
};
```

**Lợi ích:**
- User thấy phản hồi ngay lập tức (< 100ms)
- Push notification vẫn được gửi trong background
- Nếu có lỗi, toast error sẽ xuất hiện sau

---

#### B. Tối ưu Edge Function: Reuse VAPID JWT

**Ý tưởng**: VAPID JWT có thể reuse cho tất cả requests đến cùng push service (FCM/Apple)

```typescript
// Cache JWT theo audience (push service domain)
const jwtCache = new Map<string, { jwt: string; expiry: number }>();

async function getOrCreateVapidJwt(audience: string, ...): Promise<string> {
  const cached = jwtCache.get(audience);
  const now = Math.floor(Date.now() / 1000);
  
  // JWT còn hạn (trừ buffer 60s)
  if (cached && cached.expiry > now + 60) {
    return cached.jwt;
  }
  
  // Generate new JWT
  const jwt = await generateVapidJwt(audience, ...);
  jwtCache.set(audience, { 
    jwt, 
    expiry: now + 12 * 60 * 60 // 12 hours
  });
  
  return jwt;
}
```

**Lợi ích:**
- 5 pushes đến Apple chỉ cần generate 1 JWT
- Giảm ~300-400ms crypto time

---

### III. TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/bookings/BookingPaymentDialog.tsx` | Fire-and-forget pattern, toast ngay lập tức |
| `supabase/functions/send-push-notification/index.ts` | Cache VAPID JWT theo audience |

---

### IV. TIMELINE SAU TỐI ƯU

**User Experience:**
```text
Click "Gửi QR"
    ↓ (0ms)
Toast "Đang gửi QR..." ← HIỂN THỊ NGAY
    ↓
(Background: Edge function xử lý)
    ↓
Button không loading, user có thể tiếp tục thao tác
    ↓
(Nếu lỗi: Toast error xuất hiện sau)
```

**Từ góc nhìn user**: < 100ms thay vì 4 giây

---

### V. CHI TIẾT IMPLEMENTATION

#### A. BookingPaymentDialog.tsx - Fire and Forget

```typescript
const handleSendQRNotification = async () => {
  if (!createdPayment) return;

  // Show immediate feedback
  toast.success('Đang gửi QR đến điện thoại...');

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('Vui lòng đăng nhập lại');
      return;
    }

    const paymentPath = `/payment-qr/${createdPayment.id}`;

    // Fire and forget - don't await
    supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userData.user.id,
        skip_auth_check: true,
        title: `QR Thanh toán phòng ${booking.room_number}`,
        body: `Số tiền: ${formatVNCurrency(parsedAmount)} - Khách: ${booking.guest_name}`,
        tag: `payment-qr-${createdPayment.id}`,
        action_url: paymentPath,
        notification_type: 'payment_qr',
        data: {
          url: paymentPath,
          type: 'payment_qr',
          paymentId: createdPayment.id,
          roomNumber: booking.room_number,
        },
      },
    }).then(({ data, error }) => {
      if (error) {
        toast.error('Không thể gửi thông báo');
      } else if (data?.sent === 0) {
        toast.warning('Chưa có thiết bị nào đăng ký nhận thông báo');
      }
      // Success case: don't show another toast, first one is enough
    }).catch((err) => {
      console.error('Push notification error:', err);
      toast.error('Không thể gửi thông báo');
    });
    
    // Return immediately - no loading state needed
  } catch (error) {
    console.error('Send notification error:', error);
    toast.error('Không thể gửi thông báo');
  }
};
```

**Thay đổi thêm:**
- Bỏ `setIsSendingNotification(true/false)` 
- Bỏ `isSendingNotification` state
- Button không còn loading spinner

#### B. Edge Function - VAPID JWT Cache

```typescript
// JWT cache - survives across requests in same worker instance
const vapidJwtCache = new Map<string, { jwt: string; expiry: number }>();

async function getOrCreateVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const cacheKey = audience;
  const cached = vapidJwtCache.get(cacheKey);
  const now = Math.floor(Date.now() / 1000);
  
  // JWT valid for 12 hours, use if > 1 hour remaining
  if (cached && cached.expiry > now + 3600) {
    return cached.jwt;
  }
  
  // Generate new JWT
  const jwt = await generateVapidJwt(audience, subject, vapidPrivateKey, vapidPublicKey);
  const expiry = now + 12 * 60 * 60;
  
  vapidJwtCache.set(cacheKey, { jwt, expiry });
  
  return jwt;
}
```

---

### VI. LỢI ÍCH

1. **UX cải thiện rõ rệt**: Phản hồi ngay lập tức thay vì chờ 4 giây
2. **Vẫn đảm bảo chức năng**: Push notification được gửi đầy đủ trong background
3. **Error handling tốt**: Nếu có lỗi, user vẫn được thông báo qua toast
4. **Edge function nhanh hơn**: JWT cache giảm crypto overhead

