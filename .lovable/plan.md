# Kiểm tra hotfix 1.0.22 — kết quả & vá tiếp 1.0.23

## ✅ Đã sửa xong (xác nhận)
- **users INSERT escalation** → policy đã siết về owner/manager + trigger chặn cấp cao → scanner không còn flag.
- **promotional_codes lộ với anon** → đã đổi `TO authenticated`, scanner không còn flag.
- **reminder_email_templates / reminder_automation_rules** → có policy super_admin, scanner không còn flag.
- **Mutable search_path** trong public: query trực tiếp `pg_proc` cho thấy **0 function** thiếu `search_path`. 2 finding còn lại thuộc schema khác (extension), không phải code app.

## ⚠️ Còn lại sau scan mới (524 finding)

### 🔴 1 lỗ hổng quan trọng vẫn bị flag
**`users_update_self_or_managed` — vẫn báo "self-escalation"**
- Trigger `prevent_user_privilege_escalation` ĐÃ chặn tại runtime, nhưng scanner làm static analysis chỉ nhìn policy `WITH CHECK` — không thấy guard nên báo error.
- Cần thêm `WITH CHECK` defense-in-depth (2 lớp bảo vệ: policy + trigger).

### 🟠 Lỗ hổng mới scanner phát hiện (trước bị che bởi issue lớn hơn)

| # | Vấn đề | Mức |
|---|--------|-----|
| A | `marketing_campaigns` policy gán role `{public}` → anon đọc được toàn bộ campaign (subject, template, cta_link, target audience) | warn |
| B | `plan_price_history` cho mọi authenticated đọc → lộ chiến lược giá (old_price, new_price, reason) | warn |
| C | `bank_payment_settings` chỉ có SELECT policy, thiếu INSERT/UPDATE/DELETE → tenant owner không cập nhật được STK qua API | warn |

### 🟡 Deferred (không phải lỗ hổng, ghi nhận)
- **Realtime "không tenant-scoped"**: scanner cảnh báo defense-in-depth. RLS từng bảng đã filter row, không rò data. Fix triệt để cần refactor channel naming `tenant:{id}:*` ở FE → để Sprint kế.
- **`email_send_log`, `suppressed_emails`**: chỉ service_role đọc/ghi, không rò ra ngoài → chấp nhận, ghi vào security memory.
- **513 finding "SECURITY DEFINER function callable"**: không phải lỗ hổng, mỗi RPC tự validate auth.uid()+tenant_id → R-Backlog.

---

## Migration 1.0.23 (đề xuất)

```sql
-- (1) Defense-in-depth: thêm WITH CHECK cho users UPDATE
DROP POLICY IF EXISTS users_update_self_or_managed ON public.users;
CREATE POLICY users_update_self_or_managed ON public.users
  FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR id = auth.uid()
    OR (tenant_id = get_current_user_tenant_id() AND can_manage_user(auth.uid(), id))
  )
  WITH CHECK (
    -- Super admin: full quyền
    is_super_admin(auth.uid())
    OR (
      -- Self-update: KHÔNG được đổi cột nhạy cảm (cộng hưởng với trigger)
      id = auth.uid()
      AND tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
      AND user_level_code = (SELECT user_level_code FROM public.users WHERE id = auth.uid())
      AND COALESCE(role::text, '') = COALESCE((SELECT role::text FROM public.users WHERE id = auth.uid()), '')
      AND is_super_admin = false
      AND COALESCE(is_primary_owner, false) = COALESCE((SELECT is_primary_owner FROM public.users WHERE id = auth.uid()), false)
    )
    OR (
      -- Manager/Owner update target: scope theo tenant + quản lý được + không cấp super admin
      tenant_id = get_current_user_tenant_id()
      AND can_manage_user(auth.uid(), id)
      AND is_super_admin = false
    )
  );

-- (2) marketing_campaigns: chỉ authenticated
DROP POLICY IF EXISTS "Active campaigns are viewable by authenticated users" ON public.marketing_campaigns;
CREATE POLICY "Active campaigns are viewable by authenticated users"
  ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (status = 'active' AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

-- (3) plan_price_history: chỉ super admin
DROP POLICY IF EXISTS "Authenticated users can view price history" ON public.plan_price_history;
CREATE POLICY "Super admins can view price history"
  ON public.plan_price_history FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- (4) bank_payment_settings: cho tenant_owner CRUD
CREATE POLICY bank_payment_settings_tenant_insert
  ON public.bank_payment_settings FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (tenant_id = get_current_user_tenant_id() AND is_tenant_owner())
  );
CREATE POLICY bank_payment_settings_tenant_update
  ON public.bank_payment_settings FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (tenant_id = get_current_user_tenant_id() AND is_tenant_owner())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (tenant_id = get_current_user_tenant_id() AND is_tenant_owner())
  );
CREATE POLICY bank_payment_settings_tenant_delete
  ON public.bank_payment_settings FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (tenant_id = get_current_user_tenant_id() AND is_tenant_owner())
  );
```

## Rollout
- Bump `APP_VERSION` → **1.0.23**, thêm entry changelog.
- Cập nhật `mem://security/...` ghi nhận:
  - email_send_log / suppressed_emails — accepted risk (service_role only).
  - Realtime channel refactor — đưa vào sprint kế.
- Rollback: drop policy mới, restore policy cũ.

## QA cần làm tay
- Staff login → UPDATE chính mình đổi `user_level_code='tenant_owner'` → DB từ chối (policy + trigger).
- Tenant owner UPDATE thông tin ngân hàng → thành công.
- Anon GET `/marketing_campaigns` → trống.
- Manager (không phải super admin) GET `/plan_price_history` → trống.

**Bạn duyệt thì triển khai luôn?**
