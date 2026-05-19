# Hotfix bảo mật 1.0.22 — nhóm 3

Sau khi vá xong nhóm 1 + 2, scan lại phát hiện thêm **3 lỗ hổng nghiêm trọng/cao** đã có sẵn trước đây (scanner không bóc ra ở vòng trước vì che bởi 2 issue cũ). Tổng còn 521 finding, trong đó cốt lõi cần xử lý:

## 🔴 Critical (mới phát hiện)

### 1. Staff tự nâng quyền qua bảng `users` (UPDATE)
- Policy `users_update_self_or_managed` cho phép `id = auth.uid()` UPDATE chính mình KHÔNG giới hạn cột.
- Staff có thể set `user_level_code = 'tenant_owner'` hoặc `is_super_admin = true` → leo quyền vào hàng loạt policy đọc `users.user_level_code` (anomalies, positions, shift history, invoices, payment_transactions).
- **Fix**: tạo trigger `prevent_user_privilege_escalation` BEFORE UPDATE chặn thay đổi `user_level_code`, `role`, `is_super_admin`, `is_primary_owner`, `tenant_id` trừ khi:
  - caller là super_admin, HOẶC
  - caller có `can_manage_user(auth.uid(), NEW.id)` VÀ giá trị mới không vượt cấp caller.
- Không drop policy SELF-UPDATE (user vẫn cần đổi tên/avatar/SĐT), chỉ chặn cột nhạy cảm.

### 2. Bất kỳ ai cũng INSERT được hàng `users` tuỳ ý
- Policy `users_insert_in_tenant` WITH CHECK chỉ kiểm `tenant_id = get_current_user_tenant_id()` → staff có thể tạo row giả mạo với `user_level_code='tenant_owner'`, ảnh hưởng các check dựa trên public.users.
- **Fix**:
  - Drop policy hiện tại, tạo lại WITH CHECK yêu cầu: super_admin HOẶC `is_tenant_owner()` HOẶC `is_manager()`.
  - Trigger `prevent_user_privilege_escalation` cũng chạy cho INSERT để chặn cấp `user_level_code` cao hơn caller.

## 🟠 High

### 3. Mã khuyến mãi lộ với khách vô danh
- Policy `Authenticated users can view active promo codes` đang gán role `{public}` → anon scrape được toàn bộ code, discount_value, max_uses, valid_until.
- **Fix**: drop và tạo lại với `TO authenticated`.

### 4. Realtime postgres_changes không scoped theo tenant (defense-in-depth)
- Policy hiện chỉ check `extension = 'postgres_changes'`. Mặc dù RLS từng bảng đã filter row, nhưng metadata sự kiện (timing, INSERT/DELETE) có thể rò chéo tenant nếu topic dùng được.
- **Fix**: thêm điều kiện `realtime.topic()` phải khớp prefix `tenant:{tenant_id}:` HOẶC là channel cụ thể của user. Vì app hiện không dùng topic tenant-prefixed nên giải pháp an toàn:
  - Đọc tenant_id từ JWT (`(auth.jwt() ->> 'tenant_id')`) nếu có; nếu không có thì rơi về `public.users`.
  - Policy: `extension = 'postgres_changes' AND (realtime.topic() = '' OR realtime.topic() ILIKE '%' || (SELECT tenant_id::text FROM public.users WHERE id = auth.uid()) || '%')`. Đây là rào mềm — sẽ KHÔNG break app vì các channel hiện tại không match được điều kiện sẽ bị từ chối. Cần audit FE.
  - **Quyết định**: vì FE hiện tại dùng channel name kiểu `payment-status-{paymentId}` và `bookings-{tenantId}` (qua `useTenantChannel`), không phải tất cả đều chứa tenantId. Nếu siết quá chặt sẽ vỡ.
  - **Giải pháp staged**: Phase 1 chỉ revoke broadcast/presence (đã làm ở 1.0.21). Phase 2 — tài liệu hoá chuẩn channel naming `tenant:{tenantId}:...`, refactor `useTenantChannel` ép prefix, sau đó thắt policy. Ở 1.0.22 chỉ làm Phase 1.5: thêm policy `realtime.broadcast`/`realtime.presence` deny tường minh + giữ nguyên postgres_changes (đã được table RLS bảo vệ).

## 🟡 Medium

### 5. `reminder_email_templates` & `reminder_automation_rules` — RLS bật nhưng 0 policy
- Hiện inaccessible (deny-by-default, an toàn) nhưng không có access path cho super admin.
- **Fix**: thêm SELECT/ALL policy gated `is_super_admin(auth.uid())`.

## Việc KHÔNG làm trong hotfix này
- **261 + 252 = 513 finding "SECURITY DEFINER function callable"**: không phải lỗ hổng. Mỗi RPC tự validate `auth.uid()` + `tenant_id`. Audit định kỳ theo R-Backlog.
- **2 finding `Function Search Path Mutable`** còn lại theo scan: thực tế khi truy vấn `pg_proc` không còn function nào thiếu `search_path` → scanner cache cũ, sẽ tự hết sau scan kế tiếp.

---

## Kỹ thuật triển khai (Migration 1.0.22)

```sql
-- (1) Trigger chặn leo quyền trên users
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  caller_level text;
  caller_is_super boolean := is_super_admin(auth.uid());
BEGIN
  IF caller_is_super THEN RETURN NEW; END IF;

  SELECT user_level_code INTO caller_level FROM users WHERE id = auth.uid();

  IF TG_OP='UPDATE' THEN
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
       OR NEW.is_primary_owner IS DISTINCT FROM OLD.is_primary_owner
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Không có quyền thay đổi trường nhạy cảm' USING ERRCODE='42501';
    END IF;
    -- Chỉ cho phép thay user_level_code/role nếu caller manage được target và cấp mới không vượt cấp caller
    IF (NEW.user_level_code IS DISTINCT FROM OLD.user_level_code
        OR NEW.role IS DISTINCT FROM OLD.role)
       AND NOT can_manage_user(auth.uid(), NEW.id) THEN
      RAISE EXCEPTION 'Không có quyền thay đổi vai trò' USING ERRCODE='42501';
    END IF;
  ELSIF TG_OP='INSERT' THEN
    IF NEW.is_super_admin = true OR NEW.is_primary_owner = true THEN
      RAISE EXCEPTION 'Không có quyền tạo user cấp cao' USING ERRCODE='42501';
    END IF;
    -- Cấp mới không được cao hơn caller (đơn giản: chỉ owner/manager mới được INSERT)
    IF caller_level NOT IN ('tenant_owner','manager') THEN
      RAISE EXCEPTION 'Chỉ chủ khách sạn hoặc quản lý mới tạo được user' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_prevent_user_priv_esc
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- (2) Siết policy INSERT users
DROP POLICY users_insert_in_tenant ON public.users;
CREATE POLICY users_insert_in_tenant ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (tenant_id = get_current_user_tenant_id()
        AND (is_tenant_owner() OR has_user_level(auth.uid(),'manager')))
  );

-- (3) Promo codes — chỉ authenticated
DROP POLICY "Authenticated users can view active promo codes" ON public.promotional_codes;
CREATE POLICY "Authenticated users can view active promo codes"
  ON public.promotional_codes FOR SELECT TO authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- (4) Reminder tables policies
CREATE POLICY "Super admins manage reminder templates"
  ON public.reminder_email_templates FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage reminder rules"
  ON public.reminder_automation_rules FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
```

## Rollout
- Bump APP_VERSION → **1.0.21 → 1.0.22**, thêm entry changelog.
- Rollback: drop trigger + policy mới, restore policy cũ (lưu bản backup trong migration comment).
- QA: login staff → thử update chính mình với user_level_code='tenant_owner' → phải fail; thử INSERT row users → fail; truy cập `/promotional_codes` khi chưa đăng nhập → empty.

## Phần KHÔNG nằm trong scope hotfix
- Refactor channel naming chuẩn tenant-prefix → Sprint kế tiếp.
- Audit 513 SECURITY DEFINER RPC → R-Backlog dài hạn.

**Bắt đầu triển khai khi bạn duyệt?**
