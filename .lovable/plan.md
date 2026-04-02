

## Phân tích Logic Subscription: Vấn đề phát hiện

### Tổng quan hệ thống
Vòng đời subscription: **Trial → Active → Grace Period → Suspended**

Các thành phần liên quan:
- `check-subscription-status` (cron): Chuyển trạng thái tự động
- `sepay-webhook`: Kích hoạt khi thanh toán thành công
- `sync-sepay-transactions`: Đồng bộ giao dịch định kỳ
- `useGracePeriod`: Logic hiển thị cảnh báo phía client
- `ChangePlanDialog`: Super Admin cập nhật gói thủ công
- Trigger `calculate_grace_period_end`: Tự động tính `grace_period_ends_at`

---

### Lỗi 1 (NGHIÊM TRỌNG): Cron job bỏ sót trạng thái `trial`

**Hiện tại**: `check-subscription-status` chỉ xử lý:
- `active` → `grace_period` (khi hết hạn)
- `grace_period` → `suspended` (khi hết grace)

**Thiếu**: Không xử lý `trial`. Khi tenant trial hết hạn 5 tháng → `subscription_end_date < now` nhưng `subscription_status = 'trial'` → **KHÔNG BỊ CHUYỂN** sang grace_period hoặc suspended. Tenant trial hết hạn vẫn dùng bình thường mãi mãi.

**Sửa**: Thêm điều kiện `.in('subscription_status', ['active', 'trial'])` thay vì `.eq('subscription_status', 'active')` trong cron job.

---

### Lỗi 2 (NGHIÊM TRỌNG): `sync-sepay-transactions` không reset `subscription_status`

**Hiện tại**: Khi `sync-sepay-transactions` match thanh toán và gia hạn:
```typescript
const updateData = {
  subscription_end_date: newEndDate.toISOString(),
  updated_at: new Date().toISOString()
};
// THIẾU: subscription_status không được reset
```

So sánh với `sepay-webhook` (đúng):
```typescript
const updateData = {
  subscription_end_date: newEndDate.toISOString(),
  subscription_status: 'active',      // ✅ Reset status
  grace_period_ends_at: null,          // ✅ Clear grace
  updated_at: new Date().toISOString()
};
```

**Hậu quả**: Nếu tenant đang `suspended` hoặc `grace_period`, thanh toán qua sync (không qua webhook) → gia hạn ngày nhưng status vẫn bị khoá.

**Sửa**: Thêm `subscription_status: 'active'` vào update trong `sync-sepay-transactions`.

---

### Lỗi 3 (TRUNG BÌNH): `sync-sepay-transactions` không validate rooms theo plan limit

**Hiện tại**: `sepay-webhook` có logic cap rooms theo `planMaxRooms`. Nhưng `sync-sepay-transactions` không có → có thể vượt giới hạn gói khi sync.

**Sửa**: Thêm check `planMaxRooms` tương tự `sepay-webhook`.

---

### Lỗi 4 (NHẸ): `statusConfig` thiếu trạng thái `trial`

**Hiện tại**: `SubscriptionOverview.tsx` có config cho `trialing` nhưng database lưu `trial`. Client check `subscription_status === 'trial'` (FreeTrialPopup) nhưng statusConfig dùng key `trialing`.

**Hậu quả**: Tenant trial hiển thị "Không hoạt động" (fallback `inactive`) thay vì "Dùng thử".

**Sửa**: Thêm `trial: { label: 'Dùng thử', variant: 'secondary' }` vào statusConfig.

---

### Lỗi 5 (NHẸ): `useGracePeriod` không phân biệt trial vs active

**Hiện tại**: Hook chỉ so sánh `subscription_end_date` với `now` mà không xét `subscription_status`. Nếu tenant trial sắp hết hạn → hiện cảnh báo "Sắp hết hạn" giống active, nhưng nội dung cảnh báo nên khác ("Chương trình dùng thử sắp kết thúc").

**Sửa**: Không cần sửa logic tính toán (đã đúng), chỉ cần truyền `subscriptionStatus` cho component hiển thị để customize message.

---

### Lỗi 6 (NHẸ): `isGracePeriodExpired` sai khi chưa có grace date

**Hiện tại**:
```typescript
const isGracePeriodExpired = graceEndDate ? now >= graceEndDate : false;
```
Nếu tenant không có `subscription_end_date` (null) → `grace_period_ends_at` cũng null → `isGracePeriodExpired = false`. Đúng.

Nhưng nếu tenant có `subscription_end_date` đã qua + `grace_period_ends_at` đã qua → `isGracePeriodExpired = true` ngay cả khi `subscription_status = 'active'` (đã gia hạn thành công nhưng Super Admin quên clear grace date). 

Tuy nhiên, trigger `calculate_grace_period_end` tự động set `grace_period_ends_at` khi `subscription_end_date` thay đổi → nếu Super Admin gia hạn qua ChangePlanDialog → end date mới → grace tự cập nhật → OK.

Webhook sepay set `grace_period_ends_at: null` khi kích hoạt → OK.

**Kết luận**: Logic này OK nếu tất cả flow đều đi qua đúng path. Vấn đề chỉ xảy ra với `sync-sepay-transactions` (Lỗi 2).

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/check-subscription-status/index.ts` | Thêm `trial` vào filter: `.in('subscription_status', ['active', 'trial'])` thay cho `.eq('subscription_status', 'active')` |
| `supabase/functions/sync-sepay-transactions/index.ts` | Thêm `subscription_status: 'active'` + validate rooms theo plan limit khi gia hạn/thêm phòng |
| `src/components/settings/subscription/SubscriptionOverview.tsx` | Thêm `trial` vào `statusConfig` |

