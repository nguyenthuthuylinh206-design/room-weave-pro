## Khi nào hiện banner "Chế độ chỉ đọc"

Banner `ReadOnlyBanner` (MainLayout.tsx:64) hiện khi cờ `tenants.is_read_only = true`.

**Cờ này được BẬT bởi:**
- Cron `auto_apply_read_only_after_grace` chạy hàng ngày (03:30 UTC) — set `is_read_only=true` cho mọi tenant đã hết grace period (`grace_period_ends_at < now()`).
- Hoặc gọi RPC `set_tenant_read_only(tenant_id, reason)` thủ công.

**Cờ này được TẮT bởi:**
- Chỉ duy nhất RPC `clear_tenant_read_only(tenant_id)` — nhưng **KHÔNG có flow nào gọi RPC này**.

---

## Bug đã phát hiện (rất nghiêm trọng)

Kiểm tra DB, có **6 tenants** đang `is_read_only=true` dù `subscription_status='active'` và `subscription_end_date` ở **tương lai** (ví dụ "Gia Lộc Hưng Phát" hết hạn 2026-06-11, hôm nay 2026-05-12). Tức là họ **đã thanh toán/gia hạn xong** nhưng banner vẫn hiện và mọi mutation vẫn bị DB trigger `enforce_read_only_mutation` chặn.

**Nguyên nhân:**
1. `supabase/functions/sepay-webhook/index.ts:524-528` khi nhận thanh toán gia hạn chỉ update:
   ```ts
   subscription_end_date, subscription_status='active', grace_period_ends_at=null
   ```
   Không hề reset `is_read_only`. → Tenant trả tiền xong vẫn kẹt chỉ-đọc.

2. Cron `auto_apply_read_only_after_grace` chỉ **bật** cờ, không có cron đối ứng để **tắt** cờ khi subscription được gia hạn lại.

3. Các flow renewal khác (manual approve, super-admin extend) cũng không gọi `clear_tenant_read_only`.

---

## Phương án sửa

### A. Migration mới — tự động clear khi grace_period_ends_at lùi về tương lai
Mở rộng `auto_apply_read_only_after_grace()` (hoặc tạo function `auto_clear_read_only_after_renewal()`) chạy cùng cron:
```sql
UPDATE tenants
SET is_read_only=false, read_only_reason=NULL, read_only_since=NULL
WHERE is_read_only=true
  AND (grace_period_ends_at IS NULL OR grace_period_ends_at > now())
  AND subscription_status IN ('active','trial');
-- + ghi audit log 'auto_clear_read_only'
```

### B. Sửa `sepay-webhook` (và mọi nhánh extend / add_rooms / approve manual)
Sau khi update subscription thành công, gọi:
```ts
await supabase.rpc('clear_tenant_read_only', { 
  p_tenant_id: tenantId, 
  p_reason: 'payment_received' 
});
```
Áp dụng ở 2 nhánh: `metadata.type === 'extend'` (line 535) và bất kỳ nhánh nào khác làm `subscription_status='active'`.

### C. Backfill ngay (one-shot SQL trong cùng migration)
Clear `is_read_only` cho 6 tenants hiện đang bị kẹt (điều kiện: end_date tương lai HOẶC grace chưa hết).

### D. (Tùy chọn) Realtime invalidate
Sau khi clear, banner tự ẩn ở lần `useReadOnlyMode` refetch tiếp theo (staleTime 60s). Có thể thêm subscribe `postgres_changes` trên `tenants` để ẩn ngay lập tức — nhưng không bắt buộc.

---

## Files sẽ sửa

- **NEW** `supabase/migrations/<timestamp>_auto_clear_read_only.sql` — function clear + thêm vào cron + backfill 6 tenants kẹt.
- `supabase/functions/sepay-webhook/index.ts` — gọi `clear_tenant_read_only` sau khi extend (line ~538) và sau add_rooms nếu subscription đang active.
- (kiểm tra) các edge function khác có set `subscription_status='active'`: `check-subscription-status`, các RPC super-admin extend.

## Test cases
1. Tenant đang read-only → SePay webhook báo extend → sau webhook: `is_read_only=false`, banner biến mất, mutations OK.
2. Cron chạy: tenant có `grace_period_ends_at > now()` và `is_read_only=true` → bị clear.
3. Tenant thực sự hết hạn (grace đã qua) → vẫn bị set `is_read_only=true` như cũ (không regression).
4. Audit log có entry `auto_clear_read_only` / `clear_read_only` cho từng case.

## Rollback
- Drop function `auto_clear_read_only_after_renewal`, gỡ schedule cron, revert sepay-webhook diff. Backfill không cần rollback vì 6 tenants đó đáng lẽ phải `false`.
