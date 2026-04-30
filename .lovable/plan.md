## Root cause

User `quanlybuong@company.com` (manager, đã có tenant + hotel đầy đủ trong DB) vẫn bị app đẩy về `/onboarding` và khi bấm "Hoàn tất thiết lập" thì báo **"Lỗi thiết lập"**.

Nguyên nhân thực sự **không nằm ở form Onboarding**:

1. `useUser()` query `select * from public.users where id = auth.uid()` → trả về `[]` (xem network log).
2. Kiểm tra DB: row user TỒN TẠI với `tenant_id`, `hotel_id`, `user_level_code='manager'`.
3. `pg_class.relrowsecurity = true` cho `public.users` nhưng `pg_policy` count = **0**.
4. Hệ quả: RLS chặn 100% SELECT → client tưởng user chưa onboard → vào `/onboarding` → submit gọi `complete_registration` → trùng dữ liệu / vi phạm constraint → toast "Lỗi thiết lập".

Đây là **regression bảo mật**: bảng `users` đang ở trạng thái RLS bật nhưng không policy → không ai (kể cả chính user đó) đọc được. Mọi user hiện hữu đều sẽ bị kẹt onboarding loop, không chỉ tài khoản này.

## Phạm vi sửa

Khôi phục đúng 4 policy gốc đã có trong migration `20260108021340` (dùng các helper `is_super_admin()`, `is_tenant_owner()`, `get_current_user_tenant_id()`, `works_at_same_hotel()`, `can_manage_user()` — tất cả vẫn còn). Đồng thời thêm policy đặc biệt cho phép user CHƯA onboard đọc chính row của mình (đã nằm trong điều kiện `id = auth.uid()`).

## Việc sẽ làm

1. **Migration mới** `restore_users_rls_policies.sql`:
   - `CREATE POLICY "users_select_self_or_tenant"` FOR SELECT TO authenticated  
     USING `is_super_admin() OR id = auth.uid() OR (is_tenant_owner() AND tenant_id = get_current_user_tenant_id()) OR (tenant_id = get_current_user_tenant_id() AND works_at_same_hotel(id))`
   - `CREATE POLICY "users_insert_in_tenant"` FOR INSERT — `is_super_admin() OR tenant_id = get_current_user_tenant_id()` (cho phép trigger/RPC SECURITY DEFINER bypass; client thường không insert trực tiếp)
   - `CREATE POLICY "users_update_self_or_managed"` FOR UPDATE — self hoặc `can_manage_user`
   - `CREATE POLICY "users_delete_subordinates"` FOR DELETE — manager xóa cấp dưới, không xóa primary_owner
   - Tất cả `IF NOT EXISTS`-safe (DROP IF EXISTS trước CREATE).
   - Thêm comment `COMMENT ON POLICY ... IS 'Restored after foundation hardening regression'`.

2. **Verification query** chạy trong cùng migration (DO block) để đảm bảo policy count ≥ 4 sau khi migrate, raise notice nếu thiếu.

3. **Không thay đổi code Onboarding.tsx** — flow đó đúng, chỉ là không bao giờ nên được trigger cho user này.

4. **Sau migration**: user reload → `useUser` trả đúng row → `OnboardingGuard` thấy `tenant_id` và `hotel_id` đầy đủ → redirect vào dashboard. Không cần đụng tới `complete_registration`.

## Test/QA

- Trước migration: `SELECT * FROM users WHERE id=auth.uid()` (qua RLS context của user) → 0 rows.
- Sau migration: cùng query → 1 row.
- Login lại bằng tài khoản `quanlybuong@company.com` → vào thẳng dashboard, không đi qua `/onboarding`.
- Login bằng owner cùng tenant → thấy danh sách users của tenant.
- Login bằng manager hotel khác cùng tenant → KHÔNG thấy user của hotel này (test isolation).
- `psql -c "SELECT count(*) FROM pg_policy WHERE polrelid='public.users'::regclass"` → trả về ≥ 4.

## Rủi ro & Mitigation

- **Risk**: Policy `users_select_self_or_tenant` phụ thuộc helper functions; nếu helper sai sẽ vỡ đăng nhập toàn hệ thống.  
  **Mitigation**: Helpers đã được sử dụng trong nhiều policy khác (đã production), không thay đổi chúng. Migration chỉ recreate policy đúng như bản cũ.
- **Risk**: User đang mở tab cũ vẫn cache `[]`.  
  **Mitigation**: Toast hướng dẫn reload, hoặc invalidate `['user']` query sau khi vào lại.
- **Rollback**: `DROP POLICY` 4 policy mới — nhưng KHÔNG nên rollback vì rollback = quay lại trạng thái lỗi.

## Files

- **Tạo**: `supabase/migrations/<timestamp>_restore_users_rls_policies.sql`
- **Không sửa**: `src/pages/auth/Onboarding.tsx`, `src/hooks/useUser.ts`, `OnboardingGuard.tsx`.

## Phần còn thiếu sau lượt này

- Audit lại toàn bộ bảng có `relrowsecurity=true` nhưng `pg_policy` count = 0 (có thể còn bảng khác bị tương tự sau các migration phase 1/2). Sẽ chạy script audit ở lượt kế tiếp nếu user yêu cầu.
