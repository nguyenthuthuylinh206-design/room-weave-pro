## Nguyên nhân (đã xác định bằng network log + DB)

Bạn đăng nhập với user `nguyenducphuoc@company.com`:
- `users.user_level_code = 'tenant_owner'`, `is_primary_owner = true`
- `user_roles.role = 'owner'`
- Nhưng bảng `user_permissions` **trống** (0 dòng)

Khi load app, client gọi `rpc/get_user_permissions_summary`. Hàm này hiện chỉ đọc `user_permissions` thuần — **không có nhánh bypass cho `super_admin` / `tenant_owner`** như `has_user_permission` đã có. Vì vậy mọi module trả về `can_view=false`, dẫn tới:

- UI inventory/dashboard không gọi `get_inventory_dashboard_stats` → hiển thị 0.
- Các trang khác cũng bị "ẩn data" mặc dù RLS và data thật vẫn còn nguyên (đã verify: `get_dashboard_stats` trả về `total_value: 12.27 tỷ`, `total_items: 75431`).

Đây **không phải** do migration revoke UPDATE status hôm qua — RLS SELECT vẫn hoạt động bình thường. Đây là bug cũ trong RPC summary, lộ ra khi UI bắt đầu dựa nhiều hơn vào kết quả của nó.

## Phạm vi sửa

Chỉ sửa 1 RPC trong DB. Không đụng code frontend, không đụng RLS, không đụng FSM.

### Migration
Thay `get_user_permissions_summary(p_user_id)`:

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions_summary(p_user_id uuid)
RETURNS TABLE(module text, can_view boolean, can_create boolean, can_update boolean,
              can_delete boolean, can_export boolean, can_approve boolean,
              can_assign boolean, can_manage boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_level text;
BEGIN
  SELECT user_level_code INTO v_user_level FROM users WHERE id = p_user_id;

  -- Bypass: super_admin & tenant_owner luôn có toàn quyền
  IF v_user_level IN ('super_admin', 'tenant_owner') THEN
    RETURN QUERY
      SELECT DISTINCT p.module,
             true, true, true, true, true, true, true, true
      FROM permissions p
      ORDER BY 1;
    RETURN;
  END IF;

  -- Mặc định: gộp user_permissions + role_permissions (đầy đủ nguồn,
  -- không chỉ user_permissions như hàm cũ).
  RETURN QUERY
  WITH all_perms AS (
    SELECT up.module, up.action
      FROM user_permissions up
      WHERE up.user_id = p_user_id AND up.enabled = true
    UNION
    SELECT p.module, p.action
      FROM user_roles ur
      JOIN roles r ON r.code = ur.role::text
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = p_user_id
        AND (r.tenant_id = (SELECT tenant_id FROM users WHERE id = p_user_id)
             OR r.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
  SELECT m.module,
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='view'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='create'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action IN ('update','edit')),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='delete'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='export'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='approve'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='assign'),
    EXISTS(SELECT 1 FROM all_perms a WHERE a.module=m.module AND a.action='manage')
  FROM (SELECT DISTINCT module FROM permissions) m
  ORDER BY m.module;
END $$;
```

Hai cải tiến so với hàm cũ:
1. **Bypass** cho `super_admin` / `tenant_owner` (đồng bộ với `has_user_permission`).
2. Manager/Staff cũng được tính cả `role_permissions` (trước đây hàm cũ bỏ sót — chỉ đọc `user_permissions`).

### Verify sau migration
- `SELECT * FROM get_user_permissions_summary('4e5885ed-…')` → tất cả module `can_view=true`.
- Reload app → Inventory dashboard hiện `12.27B ₫`, items `75431`, rooms `52` thay vì 0.
- Test với 1 staff thật để chắc role_permissions vẫn được trả đúng.

## Rollout
- Migration không phá vỡ schema, có thể rollback bằng cách restore phiên bản cũ của hàm.
- Không cần code change client.
- Không cần invalidate cache thủ công — react-query sẽ tự refetch khi user reload.

## Phần KHÔNG làm trong lượt này
- Không đụng tới migration revoke UPDATE status (không liên quan).
- Không refactor permission_matrix docs.
