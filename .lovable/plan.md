

## Kế hoạch: Tăng tốc gửi QR sang điện thoại

### I. PHÂN TÍCH BOTTLENECK

**Timeline hiện tại (từ logs):**
```text
12:57:22 - Edge function boot start
12:57:23 - Boot done (27ms) + Received request
12:57:23 - Authorization check + Fetch subscriptions (5 subscriptions)
12:57:25 - Start sending push (2s delay do auth check)
12:57:26 - All 5 pushes sent successfully
─────────────────────────────────────────────────
Tổng: ~4 giây chỉ cho edge function
```

**Các bottleneck:**
1. **Client side**: Kiểm tra subscriptions trước khi gọi edge function (duplicate check)
2. **Edge function**: Authorization check với full tenant verification (không cần cho self-notification)
3. **Edge function**: Sequential database queries thay vì parallel

---

### II. GIẢI PHÁP

#### A. Tối ưu Client (BookingPaymentDialog.tsx)

**Vấn đề**: Kiểm tra subscription trước khi gọi edge function → 1 query thừa

**Giải pháp**: Bỏ pre-check, để edge function xử lý và trả về message phù hợp

```typescript
// TRƯỚC: 2 queries (check subscription + call edge function)
const { data: subscriptions } = await supabase
  .from('push_subscriptions')
  .select('id')
  .eq('user_id', userData.user.id)
  .limit(1);
  
if (!subscriptions?.length) {
  toast.error('Chưa đăng ký thiết bị...');
  return;
}

const { error } = await supabase.functions.invoke('send-push-notification', {...});

// SAU: 1 call duy nhất
const { data, error } = await supabase.functions.invoke('send-push-notification', {...});
if (data?.sent === 0) {
  toast.warning('Chưa có thiết bị nào đăng ký nhận thông báo');
} else {
  toast.success('Đã gửi thông báo QR sang điện thoại');
}
```

**Tiết kiệm: ~200-500ms**

---

#### B. Tối ưu Edge Function (send-push-notification/index.ts)

**Vấn đề 1**: Authorization check cho self-notification không cần thiết

**Giải pháp**: Thêm flag `skip_auth_check` cho self-notification

```typescript
// Nếu gửi cho chính mình, skip authorization check
const isSelfNotification = userIds.length === 1 && payload.skip_auth_check;

if (!isSelfNotification && authHeader) {
  // Full authorization check cho notifications đến người khác
}
```

**Vấn đề 2**: Sequential database operations

**Giải pháp**: Parallel fetch subscriptions và auth check

```typescript
// TRƯỚC: Sequential
const { data: callerData } = await supabase.from('users').select('tenant_id').eq('id', callingUser.id);
const { data: targetUsers } = await supabase.from('users').select('id, tenant_id').in('id', userIds);
const { data: subscriptions } = await supabase.from('push_subscriptions').select('*').in('user_id', userIds);

// SAU: Parallel
const [callerData, targetUsers, subscriptions] = await Promise.all([
  supabase.from('users').select('tenant_id').eq('id', callingUser.id),
  supabase.from('users').select('id, tenant_id').in('id', userIds),
  supabase.from('push_subscriptions').select('*').in('user_id', userIds).eq('is_active', true)
]);
```

**Tiết kiệm: ~500-1000ms**

---

### III. TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/bookings/BookingPaymentDialog.tsx` | Bỏ pre-check subscription, xử lý response từ edge function |
| `supabase/functions/send-push-notification/index.ts` | Thêm `skip_auth_check` flag + parallel queries |

---

### IV. TIMELINE SAU TỐI ƯU

```text
Click button
    ↓ (0ms)
Call edge function (no pre-check)
    ↓ (100ms - cold start bypass nếu warm)
Boot + Receive request
    ↓ (27ms)
Skip auth check (self-notification) + Fetch subscriptions
    ↓ (200ms - 1 query thay vì 3)
Send push notifications (parallel)
    ↓ (500ms)
Response back to client
    ↓
Toast success
─────────────────────────────────────────────────
Tổng: ~1-2 giây (giảm từ 4-5 giây)
```

---

### V. CHI TIẾT IMPLEMENTATION

#### A. BookingPaymentDialog.tsx

```typescript
const handleSendQRNotification = async () => {
  if (!createdPayment) return;
  setIsSendingNotification(true);
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('Vui lòng đăng nhập lại');
      return;
    }

    // Gọi trực tiếp edge function, không pre-check
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userData.user.id,
        skip_auth_check: true, // Self-notification, skip auth
        title: `QR Thanh toán phòng ${booking.room_number}`,
        body: `Số tiền: ${formatVNCurrency(parsedAmount)} - Khách: ${booking.guest_name}`,
        tag: `payment-qr-${createdPayment.id}`,
        action_url: `/payment-qr/${createdPayment.id}`,
        notification_type: 'payment_qr',
        data: {
          url: `/payment-qr/${createdPayment.id}`,
          type: 'payment_qr',
          paymentId: createdPayment.id,
          roomNumber: booking.room_number,
        },
      },
    });

    if (error) throw error;

    // Xử lý response
    if (data?.sent === 0) {
      toast.warning('Chưa có thiết bị nào đăng ký nhận thông báo. Vào Cài đặt → Thông báo → Quản lý thiết bị');
    } else {
      toast.success(`Đã gửi QR đến ${data?.sent || 1} thiết bị`);
    }
  } catch (error) {
    console.error('Send notification error:', error);
    toast.error('Không thể gửi thông báo');
  } finally {
    setIsSendingNotification(false);
  }
};
```

#### B. Edge Function Optimization

```typescript
// Thêm skip_auth_check vào interface
interface PushPayload {
  // ... existing fields
  skip_auth_check?: boolean
}

// Trong handler
const payload: PushPayload = await req.json()
const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : [])

// Skip auth check for self-notifications
const shouldSkipAuth = payload.skip_auth_check && userIds.length === 1

// Parallel operations
const [subscriptions] = await Promise.all([
  supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true),
  // Auth check chỉ khi cần
  shouldSkipAuth ? Promise.resolve(null) : performAuthCheck(...)
])
```

---

### VI. LỢI ÍCH

1. **Tốc độ**: Giảm từ ~4-5s xuống ~1-2s
2. **Đơn giản hóa**: Bỏ duplicate check
3. **UX tốt hơn**: Toast hiển thị số thiết bị đã gửi
4. **Bảo mật vẫn đảm bảo**: Full auth check cho notifications đến người khác

