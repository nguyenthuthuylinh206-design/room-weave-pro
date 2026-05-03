# Security Fixes — 2026-05-03

Tài liệu ghi nhận các vấn đề bảo mật được phát hiện qua scan và cách xử lý.

---

## 1. Tổng quan

| # | Issue | Severity | Status | Loại fix |
|---|-------|----------|--------|----------|
| 1 | `booking_payments` cho phép đọc công khai | **error** | ✅ Fixed | Migration |
| 2 | View `user_with_levels` có thể bypass RLS | **warn** | ✅ Fixed | Migration |
| 3 | Bucket `guest-documents` public | **error** | ⚪ Ignored (by design) | Documented |
| 4 | Realtime `realtime.messages` chưa có RLS | **error** | 🟡 Pending | Platform action |
| 5 | SePay webhook không verify signature | **warn** | 🟡 Pending | Cấu hình secret |
| 6 | Supabase linter long-tail (~460 warning) | **warn/info** | 🟡 Backlog | Incremental |

---

## 2. Đã sửa

### 2.1 `booking_payments` — Lộ dữ liệu thanh toán công khai

**Vấn đề**
- Policy `Allow public read booking_payments by id` áp dụng cho role `public` với `USING (true)`.
- Bất kỳ ai (chưa đăng nhập) cũng có thể đọc toàn bộ payment records: số tiền, tên khách, số phòng, transaction reference, dữ liệu tài chính của mọi tenant.

**Fix**
```sql
DROP POLICY IF EXISTS "Allow public read booking_payments by id"
  ON public.booking_payments;
```

**Sau khi fix**
- Chỉ còn policy `booking_payments_select` (authenticated, scoped theo `tenant_id = users.tenant_id`).
- Insert/Update đã có policy tenant-scoped sẵn.

**Quy tắc**: Không bao giờ tái lập policy `USING (true)` cho `booking_payments` hay bất kỳ bảng tài chính/PII nào.

---

### 2.2 View `user_with_levels` — Bypass RLS

**Vấn đề**
- View chứa PII: `email`, `phone`, `full_name`, `status`, `tenant_id`...
- Mặc định view chạy với quyền của owner → bỏ qua RLS của bảng `users` → có thể lộ dữ liệu xuyên tenant.

**Fix**
```sql
DROP VIEW IF EXISTS public.user_with_levels;
CREATE VIEW public.user_with_levels
WITH (security_invoker = true)
AS
SELECT u.id, u.email, u.full_name, u.phone, u.avatar_url,
       u.tenant_id, u.hotel_id, u.user_level_code, u.is_super_admin,
       ul.name AS user_level_name, ul.hierarchy_level,
       u.status, u.last_login_at, u.login_count, u.account_locked, u.created_at
FROM users u
LEFT JOIN user_levels ul ON ul.code = u.user_level_code
WHERE u.deleted_at IS NULL;
```

**Quy tắc**: Mọi view đụng tới bảng nhạy cảm bắt buộc `WITH (security_invoker = true)`.

---

## 3. Ignored (by design)

### 3.1 Bucket `guest-documents` public

**Lý do giữ public**
- Staff cần preview ảnh CCCD/passport ngay trên mọi thiết bị (PC + mobile remote scan).
- Filename là UUID ngẫu nhiên → không enumerable.
- **Upload** vẫn gated bởi RLS theo folder `tenant_id/...`.

**Mitigation hiện có**
- RLS policy chỉ cho upload vào folder đúng tenant của user.
- Edge function `mobile-scan-upload` validate session token trước khi proxy upload.

**Nếu muốn siết hơn (phase sau)**
- Chuyển bucket sang private.
- Dùng `createSignedUrl(filePath, ttl)` ở mọi nơi đang render `getPublicUrl()`.
- Thêm tenant-ownership check trong storage policy SELECT.

---

## 4. Pending — cần thao tác platform

### 4.1 Realtime channel chưa có RLS

**Vấn đề**
- 24 bảng nhạy cảm (booking_payments, room_bookings, guests, staff_status, document_scan_sessions...) đang publish vào `supabase_realtime`.
- `realtime.messages` không có RLS → user authenticated có thể subscribe topic của tenant khác và nhận change events.

**Hành động yêu cầu**
1. Vào **Lovable Cloud → Realtime → Authorization**.
2. Thêm policy cho từng channel: chỉ cho phép subscribe nếu `topic` chứa đúng `tenant_id` của user.
3. Refactor client: đổi tên channel thành `tenant:{tenant_id}:bookings` thay vì `bookings` chung.

**Workaround tạm thời**
- Đảm bảo mọi `.on('postgres_changes', ...)` ở client đã filter `tenant_id` ở handler trước khi xử lý.

---

### 4.2 SePay webhook chưa bắt buộc signature

**Trạng thái hiện tại**
- Edge function `sepay-webhook` đã hỗ trợ verify `Authorization` header với `SEPAY_API_KEY`.
- Nếu secret chưa cấu hình → fallback nhận unauthenticated (để dễ test ban đầu).

**Hành động cho production**
1. Tạo secret `SEPAY_API_KEY` trong Lovable Cloud → Secrets.
2. Vào SePay dashboard → bật **"Có chứng thực"** và nhập đúng API key.
3. Verify webhook log `payment_webhook_logs` → các call mới phải có `auth_status = 'authenticated'`.

---

### 4.3 Supabase linter long-tail

Tổng ~460 warning/info từ scan, gồm:
- `function_search_path_mutable` — function chưa `SET search_path = public`.
- `materialized_view_in_api` — MV expose qua Data API.
- `extension_in_public` — extension cài ở schema `public`.
- `rls_enabled_no_policy` — bảng bật RLS nhưng chưa có policy nào.
- Leaked password protection (HIBP) chưa bật.

**Kế hoạch**: xử lý theo từng module, không regress. Bật HIBP qua `configure_auth` khi có cửa sổ release.

---

## 5. Quy tắc bảo mật cần nhớ (đã ghi vào @security-memory)

- **Không bao giờ**: policy `USING (true)` cho bảng tài chính/PII; lưu role ở `users`/`profiles`; sửa `src/integrations/supabase/{client,types}.ts` hay `.env`; client-side-only authorization.
- **Mọi view nhạy cảm** phải `WITH (security_invoker = true)`.
- **Mọi function mới** phải `SET search_path = public` và `SECURITY INVOKER` mặc định.
- **Mutation đa bảng** đi qua RPC atomic + audit log (`log_state_transition`).
- **Bucket `guest-documents` public** là cố ý, không flag lại.
- **Edge functions `verify_jwt = false`** trong `config.toml` (sepay-webhook, telegram-webhook, mobile-scan-upload, OTP flows...) là cố ý — mỗi function tự verify (signature/OTP/session).

---

## 6. Migration & file liên quan

- Migration: `supabase/migrations/<timestamp>_fix_booking_payments_public_and_user_view.sql`
- Memory: `mem://~security-memory` (đã cập nhật)
- Tài liệu: `docs/security-fixes-2026-05-03.md` (file này)
