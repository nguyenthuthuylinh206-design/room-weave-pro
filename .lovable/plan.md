# Kiểm tra sau 1.0.23 — tình trạng còn lại

## ✅ Đã sạch hoàn toàn từ 1.0.23

- Self-escalation `users_update_self_or_managed` — không còn báo error.
- `marketing_campaigns` lộ với anon — fixed.
- `plan_price_history` lộ với mọi user — fixed.
- `bank_payment_settings` thiếu write policy — fixed.

## ⚠️ Còn lại sau scan mới (520 finding)

### 🔴 1 finding error — Realtime không scoped theo tenant

- Đã biết từ trước, đã defer. RLS từng bảng vẫn filter row đúng, không rò data thực; chỉ metadata sự kiện rò ngang.
- **Fix triệt để cần refactor FE**: chuẩn hoá tên kênh `tenant:{tenantId}:resource:{id}` ở mọi `supabase.channel(...)`, rồi siết policy `realtime.messages` chỉ cho `realtime.topic() LIKE 'tenant:' || my_tenant_id || ':%'`.
- Ước lượng: ~30–40 file dùng `supabase.channel`. Phải làm 1 sprint riêng, kèm rollout flag.

### 🟠 2 finding warning đáng vá ngay

**A. `can_manage_user()` thiếu tenant guard nội tại (warn)**

- Hiện hàm chỉ so cấp bậc và `created_by`. Tenant check nằm ở policy gọi nó — nếu sau này có policy/RPC khác gọi `can_manage_user` mà quên tenant guard, attacker có thể quản lý user khác tenant.
- **Fix**: thêm `AND m.tenant_id = t.tenant_id` ngay trong function (defense-in-depth, không ảnh hưởng caller hiện tại).

**B. `avatars` bucket public, không có SELECT policy (warn)**

- Bucket public → ai có URL trực tiếp cũng tải được ảnh staff (PII mức thấp).
- 2 lựa chọn:
  1. **Chuyển private + signed URL** → đảm bảo nhất nhưng phải sửa mọi nơi render `<img src={publicUrl}>` thành signed URL (~10+ chỗ, lazy load avatar khắp app). Hard.
  2. **Chấp nhận rủi ro & document** → ảnh staff công khai là chuẩn nhiều SaaS (Slack, Notion). Phù hợp use case.
- **Đề xuất**: chọn (2), thêm vào `mem://security/` ghi nhận accepted risk.

### 🟡 Còn lại — chấp nhận

- **2 finding `Function Search Path Mutable**`: trong schema `extensions` (pgtap), không phải code app → bỏ qua.
- **513 finding `SECURITY DEFINER function callable**`: mỗi RPC tự validate `auth.uid()` + `tenant_id`, không phải lỗ hổng → R-Backlog audit dài hạn.

---

## Migration 1.0.24 (đề xuất nhỏ gọn)

```sql
-- Defense-in-depth: thêm tenant guard ngay trong can_manage_user
CREATE OR REPLACE FUNCTION public.can_manage_user(p_manager_id uuid, p_target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  manager_level int;
  target_level  int;
  manager_tenant uuid;
  target_tenant  uuid;
  target_created_by uuid;
BEGIN
  IF p_manager_id = p_target_user_id THEN RETURN false; END IF;

  SELECT u.tenant_id INTO manager_tenant FROM public.users u WHERE u.id = p_manager_id;
  SELECT u.tenant_id, u.created_by INTO target_tenant, target_created_by
    FROM public.users u WHERE u.id = p_target_user_id;

  -- Tenant boundary bắt buộc (trừ super_admin được phục vụ ở nơi khác)
  IF manager_tenant IS NULL OR target_tenant IS NULL OR manager_tenant <> target_tenant THEN
    RETURN false;
  END IF;

  -- (giữ logic so cấp bậc / created_by hiện tại — sẽ giữ nguyên phần còn lại)
  ...
END $$;
```

> Tôi sẽ đọc body hiện tại của `can_manage_user` rồi áp dụng giữ nguyên 100% logic, chỉ chèn thêm 4 dòng tenant guard ở đầu.

## Cập nhật `mem://security/accepted-risks-v1`

- Avatars bucket public — ảnh staff PII mức thấp, đồng bộ pattern Slack/Notion. Không rò dữ liệu vận hành.
- Realtime postgres_changes — RLS bảo vệ row, metadata leak chấp nhận tạm thời cho đến sprint refactor channel naming.
- email_send_log / suppressed_emails — service_role only, không có access path cho authenticated.

## Rollout

- Bump `APP_VERSION` → **1.0.24**, entry changelog.
- Migration single-statement, rollback dễ (restore body cũ).
- QA: chạy lại login owner/manager quản lý nhân viên → vẫn hoạt động bình thường (chỉ thêm check tenant, không siết hơn so với policy).

**Duyệt thì làm luôn?**