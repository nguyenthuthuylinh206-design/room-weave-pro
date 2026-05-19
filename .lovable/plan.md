# Đánh giá bảo mật — Hotel Asset Manager

Đã chạy security scan trên dự án. Tổng **533 findings**, tập trung lại còn **2 lỗ hổng nghiêm trọng** + **một số cảnh báo cần xử lý**. RLS đa số đã ổn, nhưng có vài chỗ thật sự nguy hiểm cho mô hình multi-tenant.

---

## 🔴 NHÓM 1 — Nghiêm trọng, vá ngay (Sprint hotfix)

### 1. Realtime rò rỉ dữ liệu chéo tenant

- `realtime.messages` có 2 policy đều `USING (true)` — **bất kỳ user đã đăng nhập nào** cũng subscribe được mọi channel của tenant khác.
- 34 bảng publish realtime, bao gồm `booking_payments`, `payment_transactions`, `invoices`, `room_bookings` (chứa PII: tên, SĐT, CCCD, địa chỉ), `guests`, `document_scan_sessions`.
- **Tác động**: nhân viên khách sạn A có thể nghe được booking + thanh toán của khách sạn B theo thời gian thực.
- **Fix**: viết lại policy `realtime.messages` filter theo topic, ép topic prefix `tenant:{tenant_id}:...` và validate `tenant_id` lấy từ JWT/`user_roles`. Audit lại mọi `supabase.channel(...)` ở FE để dùng topic có tenant prefix.

### 2. Tenant owner tự nâng quyền super_admin

- Policy `Owners can manage roles in their tenant` trên `user_roles` cho phép owner INSERT/UPDATE/DELETE **mọi giá trị** `app_role`, kể cả `super_admin`.
- Vì `is_super_admin()` đọc từ chính bảng đó → owner có thể leo quyền lên super_admin, bypass mọi check tenant-scope (ví dụ `tenants_update_super_admin` cho UPDATE không giới hạn).
- **Fix**: thêm `WITH CHECK (role <> 'super_admin')` cho policy của owner. Tạo policy riêng cho super_admin để cấp quyền super_admin. Viết test regression.

---

## 🟠 NHÓM 2 — Cần xử lý sớm

### 3. Public Storage Buckets cho phép listing (4 bucket)

- Bucket public có policy SELECT rộng → client list được toàn bộ file.
- **Fix**: rà 4 bucket (`guest-documents`, `room-photos`, `mobile-scan`, …), bỏ policy SELECT trên `storage.objects` cho anon; nếu cần preview thì dùng signed URL hoặc giới hạn theo path prefix `{tenant_id}/{hotel_id}/…`.

### 4. `user_roles` policy không chặn cấp `super_admin` cross-tenant

- Liên quan #2: cần đảm bảo không owner nào set role vượt cấp.

### 5. `payment_webhook_logs` thiếu SELECT policy rõ ràng

- Hiện deny-by-default (an toàn) nhưng owner không audit được webhook của tenant mình. Thêm SELECT policy gated theo `tenant_id` + `tenant_owner`/`super_admin`.

### 6. `platform_settings` & `super_admin_activity_log` RLS bật nhưng 0 policy

- An toàn hiện tại nhưng không có access path policy-controlled cho super admin. Thêm SELECT policy gated `is_super_admin(auth.uid())` để minh bạch + tránh migration sau lỡ bật policy permissive.

### 7. Leaked Password Protection đang tắt

- Bật trong Auth settings (HaveIBeenPwned check) để chặn user đặt mật khẩu đã bị lộ.

### 8. 6 function thiếu `SET search_path`

- Risk: search_path injection trong SECURITY DEFINER functions. Thêm `SET search_path = public, pg_temp` cho 6 function được liệt kê.

### 9. Extension cài trong schema `public` + Materialized View expose qua Data API

- Move extension sang schema `extensions`.
- Revoke quyền REST API trên materialized view (hoặc đặt sau view thường có RLS).

---

## 🟡 NHÓM 3 — Tham khảo / dọn dẹp

- **511 finding "Public/Signed-In can execute SECURITY DEFINER function"** — đa số là behavior bình thường của Supabase (RPC cần execute được). Cần audit có chọn lọc: với mỗi SECURITY DEFINER quan trọng (payment, role, tenant) → đảm bảo bên trong RPC tự validate `auth.uid()` + `tenant_id`, không tin tham số đầu vào. Đây là việc dài hạn, không phải lỗ hổng tức thì.

---

## Kế hoạch triển khai đề xuất


| Sprint            | Mục                                                         | Effort   | Risk                              |
| ----------------- | ----------------------------------------------------------- | -------- | --------------------------------- |
| **Hotfix 1.0.21** | #1 Realtime tenant filter                                   | 1 ngày   | trung bình (cần audit FE channel) |
| **Hotfix 1.0.21** | #2 Chặn cấp `super_admin`                                   | 0.5 ngày | thấp                              |
| **1.0.22**        | #3 Storage bucket lockdown + signed URL                     | 1 ngày   | trung bình (cần đổi UI preview)   |
| **1.0.22**        | #5, #6 Policy minh bạch cho audit/webhook/platform_settings | 0.3 ngày | thấp                              |
| **1.0.22**        | #7 Bật leaked-password + #8 search_path                     | 0.2 ngày | thấp                              |
| **R-Backlog**     | #9 Extension/MView + audit SECURITY DEFINER RPC             | 2 ngày   | thấp                              |


## Rollout & QA

- Mỗi migration kèm SQL rollback.
- Test regression: login owner thử cấp super_admin → phải fail; staff tenant A subscribe channel tenant B → phải bị reject; list bucket public không lộ file tenant khác.
- Bump `APP_VERSION` + changelog mỗi release.

---

**Yêu cầu thực hiện ngay : Fix triệt để từng lỗi , xong lỗi A thì đến Lỗi B** 