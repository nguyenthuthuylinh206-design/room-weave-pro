
## Kế hoạch: Thêm chức năng Grace Period 7 ngày khi hết hạn gói

### TỔNG QUAN

Khi gói đăng ký hết hạn, tenant được phép tiếp tục sử dụng trong **7 ngày gia hạn (grace period)**. Trong thời gian này:
- Hệ thống hiển thị cảnh báo rõ ràng yêu cầu gia hạn
- Một số tính năng có thể bị giới hạn
- Sau 7 ngày, nếu không gia hạn → tài khoản bị tạm ngưng

---

### LOGIC HOẠT ĐỘNG

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION TIMELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Subscription Active]  [Grace Period]  [Suspended]              │
│  ──────────────────────►──────────────►─────────────────         │
│                         │             │                          │
│                    subscription_   grace_period_                 │
│                    end_date       ends_at                        │
│                         │     (+7 days)│                         │
│                         ▼              ▼                         │
│                    Hiện cảnh báo    Chặn truy cập                │
│                    "Còn X ngày"     yêu cầu gia hạn              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Các trạng thái subscription_status:**
- `active`: Đang hoạt động bình thường
- `grace_period`: Đã hết hạn, đang trong 7 ngày gia hạn
- `suspended`: Quá grace period, chưa thanh toán → tạm ngưng
- `cancelled`: Đã hủy bởi user

---

### THAY ĐỔI CẦN THỰC HIỆN

#### 1. Database Migration

**Thêm cột `grace_period_ends_at` vào bảng `tenants`:**

```sql
ALTER TABLE tenants 
ADD COLUMN grace_period_ends_at TIMESTAMPTZ;
```

**Tạo function tự động cập nhật grace period:**

```sql
CREATE OR REPLACE FUNCTION calculate_grace_period_end()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription_end_date changes, calculate grace period (7 days after)
  IF NEW.subscription_end_date IS NOT NULL THEN
    NEW.grace_period_ends_at := NEW.subscription_end_date + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### 2. Frontend Components

**Files cần tạo/sửa:**

| File | Thay đổi |
|------|----------|
| `src/lib/pricing.ts` | Thêm hàm `calculateGracePeriodStatus()` |
| `src/hooks/useSubscription.ts` | Thêm logic kiểm tra grace period |
| `src/hooks/useGracePeriod.ts` | **MỚI** - Hook quản lý grace period |
| `src/components/settings/subscription/SubscriptionOverview.tsx` | Hiển thị cảnh báo grace period |
| `src/components/settings/subscription/GracePeriodAlert.tsx` | **MỚI** - Component cảnh báo |
| `src/components/layout/GracePeriodBanner.tsx` | **MỚI** - Banner cảnh báo toàn app |

---

#### 3. Chi tiết Implementation

**A. Hook useGracePeriod (MỚI):**

```typescript
// src/hooks/useGracePeriod.ts
export function useGracePeriod() {
  const { data: subscription } = useTenantSubscription();
  
  const now = new Date();
  const endDate = subscription?.subscription_end_date 
    ? new Date(subscription.subscription_end_date) 
    : null;
  const graceEndDate = subscription?.grace_period_ends_at
    ? new Date(subscription.grace_period_ends_at)
    : null;
  
  // Calculate status
  const isExpired = endDate && endDate < now;
  const isInGracePeriod = isExpired && graceEndDate && now < graceEndDate;
  const isGracePeriodExpired = graceEndDate && now >= graceEndDate;
  
  const graceDaysRemaining = isInGracePeriod 
    ? Math.ceil((graceEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  return {
    isExpired,
    isInGracePeriod,
    isGracePeriodExpired,
    graceDaysRemaining,
    graceEndDate,
    subscriptionEndDate: endDate,
  };
}
```

**B. GracePeriodBanner Component (MỚI):**

```typescript
// src/components/layout/GracePeriodBanner.tsx
export function GracePeriodBanner() {
  const { isInGracePeriod, graceDaysRemaining } = useGracePeriod();
  const navigate = useNavigate();
  
  if (!isInGracePeriod) return null;
  
  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Gói đăng ký đã hết hạn! Còn <strong>{graceDaysRemaining} ngày</strong> để gia hạn.
        </span>
      </div>
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => navigate('/settings/subscription')}
      >
        Gia hạn ngay
      </Button>
    </div>
  );
}
```

**C. Cập nhật SubscriptionOverview.tsx:**

Thêm logic hiển thị trạng thái grace period:

```typescript
// Thêm vào statusConfig
const statusConfig = {
  // ...existing
  grace_period: { label: 'Gia hạn (Grace Period)', variant: 'destructive' },
  suspended: { label: 'Tạm ngưng', variant: 'outline' },
};

// Thêm alert cho grace period
{isInGracePeriod && (
  <Alert variant="destructive" className="bg-amber-500/10 border-amber-500">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    <AlertDescription className="text-amber-700">
      <strong>Gói đăng ký đã hết hạn!</strong> Bạn còn {graceDaysRemaining} ngày 
      để gia hạn trước khi tài khoản bị tạm ngưng.
    </AlertDescription>
  </Alert>
)}

{isGracePeriodExpired && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      <strong>Tài khoản đã bị tạm ngưng!</strong> Vui lòng gia hạn để tiếp tục sử dụng.
    </AlertDescription>
  </Alert>
)}
```

**D. Cập nhật sepay-webhook (Edge Function):**

Khi thanh toán thành công, cập nhật `subscription_status` và xóa grace period:

```typescript
// Thêm vào logic update tenant
const updateData = {
  subscription_end_date: newEndDate.toISOString(),
  subscription_status: 'active', // Reset về active
  grace_period_ends_at: null, // Xóa grace period
  updated_at: new Date().toISOString()
};
```

---

#### 4. Scheduled Job (Cron)

Cần tạo một edge function chạy định kỳ để:
1. Cập nhật `subscription_status = 'grace_period'` khi hết hạn
2. Cập nhật `subscription_status = 'suspended'` khi hết grace period

```typescript
// supabase/functions/check-subscription-status/index.ts
Deno.serve(async () => {
  const now = new Date().toISOString();
  
  // Mark expired subscriptions as grace_period
  await supabase
    .from('tenants')
    .update({ subscription_status: 'grace_period' })
    .lt('subscription_end_date', now)
    .gte('grace_period_ends_at', now)
    .eq('subscription_status', 'active');
  
  // Mark grace period expired as suspended
  await supabase
    .from('tenants')
    .update({ subscription_status: 'suspended' })
    .lt('grace_period_ends_at', now)
    .eq('subscription_status', 'grace_period');
});
```

---

### FILES CẦN TẠO/SỬA

| # | File | Thay đổi |
|---|------|----------|
| 1 | Database Migration | Thêm cột `grace_period_ends_at`, trigger tự động tính |
| 2 | `src/hooks/useGracePeriod.ts` | **MỚI** - Hook quản lý grace period |
| 3 | `src/lib/pricing.ts` | Thêm hàm `calculateGracePeriodStatus()` |
| 4 | `src/components/layout/GracePeriodBanner.tsx` | **MỚI** - Banner cảnh báo toàn app |
| 5 | `src/components/settings/subscription/SubscriptionOverview.tsx` | Cập nhật hiển thị grace period |
| 6 | `src/components/settings/subscription/GracePeriodAlert.tsx` | **MỚI** - Component cảnh báo chi tiết |
| 7 | `src/pages/AppLayout.tsx` hoặc `MainLayout.tsx` | Thêm GracePeriodBanner |
| 8 | `supabase/functions/sepay-webhook/index.ts` | Reset grace period khi thanh toán |
| 9 | `supabase/functions/check-subscription-status/index.ts` | **MỚI** - Cron job kiểm tra status |

---

### KẾT QUẢ MONG ĐỢI

| Trạng thái | Hiển thị | Quyền truy cập |
|------------|----------|----------------|
| **active** | Badge xanh "Đang hoạt động" | Đầy đủ |
| **grace_period** | Banner cam "Còn X ngày để gia hạn" | Đầy đủ, hiện cảnh báo |
| **suspended** | Banner đỏ + chặn truy cập | Chỉ trang gia hạn |

---

### UI MOCKUP

**Grace Period Banner (hiển thị ở đầu trang):**
```text
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ Gói đăng ký đã hết hạn! Còn 5 ngày để gia hạn.  [Gia hạn]  │
└────────────────────────────────────────────────────────────────┘
```

**Subscription Overview Card:**
```text
┌────────────────────────────────────────────────────────────────┐
│ 📦 Gói Tiêu Chuẩn                           [Gia hạn (5 ngày)]│
├────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐                    │
│ │    50    │ │  1.000đ  │ │  -3 (hết hạn)│                    │
│ │Phòng ĐK  │ │/phòng/ng │ │   Ngày       │                    │
│ └──────────┘ └──────────┘ └──────────────┘                    │
│                                                                │
│ ⚠️ GÓI ĐĂNG KÝ ĐÃ HẾT HẠN!                                    │
│ Bạn còn 5 ngày để gia hạn trước khi tài khoản bị tạm ngưng.   │
│                                                                │
│ [Gia hạn ngay]                                                 │
└────────────────────────────────────────────────────────────────┘
```
