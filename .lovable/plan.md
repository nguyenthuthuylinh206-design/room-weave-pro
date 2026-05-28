# Vấn đề phát hiện

Sau khi kiểm tra auth logs + DB, tôi xác định **đăng nhập Supabase Auth vẫn OK** (login `nguyenducphuoc3@company.com` trả 200). Vấn đề nằm ở bước **sau đăng nhập**: app gọi RPC `get_user_permissions_summary` để load quyền → RPC này **lỗi ngay tại DB**:

```
ERROR: 42703 column reference "module" is ambiguous
DETAIL: It could refer to either a PL/pgSQL variable or a table column.
```

Lý do: hàm khai báo `RETURNS TABLE(module text, ...)` nên `module` trở thành biến PL/pgSQL. Trong câu `SELECT DISTINCT module FROM permissions` và `m.module` ở SELECT cuối, Postgres không biết là biến hay cột → throw lỗi.

## Hệ quả dây chuyền

1. `useUserModulePermissions` nhận lỗi → `permissions = undefined`.
2. `useFirstAccessibleRoute`:
   - User KHÔNG phải `super_admin`/`owner` (vd `hotel_manager`, `staff`) → bỏ qua nhánh bypass.
   - Duyệt `ROUTE_PRIORITY` nhưng `list = []` → return `/unauthorized`.
3. Đó là lý do `Quản Lý 2` và `Nhân Viên Buồng Tám` đăng nhập xong **văng thẳng `/unauthorized`** (đúng route hiện tại của bạn).
4. Với Owner/Super Admin thì không bị, vì `useFirstAccessibleRoute` có nhánh bypass trả `/` mà không cần permissions.

# Phương án sửa (Migration)

Tạo migration sửa hàm `get_user_permissions_summary`:

- Thêm `#variable_conflict use_column` đầu hàm để Postgres ưu tiên cột khi trùng tên biến.
- Qualify lại các `module` còn mơ hồ (đặc biệt `(SELECT DISTINCT permissions.module AS module FROM permissions)`).
- Giữ nguyên signature `RETURNS TABLE(module, can_view, ...)` và logic nghiệp vụ (bypass super_admin/tenant_owner, gộp user_permissions + role_permissions).

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions_summary(p_user_id uuid)
RETURNS TABLE(module text, can_view boolean, can_create boolean, can_update boolean,
              can_delete boolean, can_export boolean, can_approve boolean,
              can_assign boolean, can_manage boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
#variable_conflict use_column
DECLARE
  v_user_level text;
  v_tenant_id  uuid;
BEGIN
  SELECT user_level_code, tenant_id INTO v_user_level, v_tenant_id
  FROM users WHERE id = p_user_id;

  IF v_user_level IS NULL THEN RETURN; END IF;

  IF v_user_level IN ('super_admin','tenant_owner') THEN
    RETURN QUERY
      SELECT DISTINCT p.module, true, true, true, true, true, true, true, true
      FROM permissions p ORDER BY 1;
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_perms AS (
    SELECT up.module, up.action FROM user_permissions up
      WHERE up.user_id = p_user_id AND up.enabled = true
    UNION
    SELECT p.module, p.action
      FROM user_roles ur
      JOIN roles r ON r.code = ur.role::text
        AND (r.tenant_id = v_tenant_id OR r.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = p_user_id
  )
  SELECT m.module,
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'view'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'create'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action IN ('update','edit')),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'delete'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'export'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'approve'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'assign'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module = m.module AND a.action = 'manage')
  FROM (SELECT DISTINCT permissions.module FROM permissions) m
  ORDER BY m.module;
END;
$$;
```

# Việc đi kèm (FE)

- Bump `APP_VERSION` → `1.0.77` + entry `public/changelog.json`: "Sửa lỗi nhân viên/quản lý đăng nhập bị đá về Không có quyền".
- Không cần đổi `AuthCallback` / `useFirstAccessibleRoute` nữa — chúng đã đúng, chỉ thiếu data do RPC chết.

# QA checklist

- Login `nguyenducphuoc3@company.com` (hotel_manager) → vào đúng module đầu tiên có quyền, không còn `/unauthorized`.
- Login `nguyenducphuoc2@company.com` (staff) → vào module có quyền (vd `/my-tasks` hoặc `/rooms`).
- Login Owner/Super Admin → vẫn vào `/` như cũ.
- Gọi trực tiếp `select * from get_user_permissions_summary('<uid>')` không còn lỗi 42702.

# Rollback

Migration chỉ thay thân function bằng `CREATE OR REPLACE`. Rollback = redeploy bản cũ (đã lưu trong git history của migrations).
