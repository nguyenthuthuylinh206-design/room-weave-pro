## Sửa lỗi phân quyền bật rồi bị tắt + Tối ưu hệ thống

### Vấn đề phát hiện

**Lỗi 1 (NGHIÊM TRỌNG): `get_user_permissions_summary` thiếu `assign` và `manage`**
Hàm SQL chỉ trả về 6 trường (`can_view, can_create, can_update, can_delete, can_export, can_approve`) nhưng hệ thống có 8 actions (`assign, manage` bị thiếu). Modules dùng `assign`/`manage` (maintenance, settings) bị đánh giá sai trạng thái.

**Lỗi 2 (NGHIÊM TRỌNG): `bookings` module thiếu trong bảng `permissions`**
`get_user_permissions_summary` lấy danh sách module từ `SELECT DISTINCT module FROM permissions`. Bảng `permissions` không có `bookings` → quyền bookings lưu thành công nhưng khi đọc lại luôn hiển thị tắt.

**Lỗi 3 (NGHIÊM TRỌNG): `dashboard` thiếu action `view` trong bảng `permissions`**
Dashboard chỉ có `approve, create, delete, export, update` — thiếu `view`. Nhưng `MODULE_ACTIONS.dashboard = ['view']`. Lưu `dashboard+view` thành công nhưng summary không tìm thấy.

**Lỗi 4 (UX): Nút Lưu ở cuối scroll, dễ bỏ qua**
User toggle xong tưởng đã lưu nhưng thực tế chưa click "Lưu thay đổi". Nút nằm cuối danh sách 13 modules, phải scroll xuống mới thấy.

**Lỗi 5 (UX): Không có cảnh báo khi rời trang mà chưa lưu**
User toggle permissions, rời trang → mất hết thay đổi không báo trước.

---

### Kế hoạch sửa

| # | File | Thay đổi |
|---|------|----------|
| 1 | Migration SQL | Cập nhật `get_user_permissions_summary`: thêm `can_assign` và `can_manage` |
| 2 | Migration SQL | Thêm records cho `bookings` module và `dashboard.view` vào bảng `permissions` |
| 3 | `src/hooks/useUserPermissions.ts` | Cập nhật `PermissionSummary` type: thêm `can_assign`, `can_manage` |
| 4 | `src/hooks/useUserPermissionConfiguration.ts` | Cập nhật `hasAnyPermission` check: thêm `can_assign`, `can_manage` |
| 5 | `src/components/permissions/UserPermissionPanel.tsx` | Di chuyển nút Lưu ra ngoài ScrollArea (sticky ở bottom), thêm visual indicator khi có thay đổi chưa lưu |
| 6 | `src/hooks/useUserModulePermissions.ts` | Cập nhật type thêm `can_assign`, `can_manage` |

### Chi tiết kỹ thuật

**SQL Migration:**
```sql
-- 1. Fix function
CREATE OR REPLACE FUNCTION get_user_permissions_summary(p_user_id uuid)
RETURNS TABLE(..., can_assign boolean, can_manage boolean)
-- Add: EXISTS(... action = 'assign') as can_assign
-- Add: EXISTS(... action = 'manage') as can_manage

-- 2. Add missing permissions
INSERT INTO permissions (module, action, ...) VALUES
('bookings', 'view', ...), ('bookings', 'create', ...), ...
('dashboard', 'view', ...);
```

**UI: Sticky save button**
Di chuyển nút "Lưu thay đổi" ra khỏi `ScrollArea`, đặt cố định ở bottom panel. Khi có thay đổi chưa lưu, hiển thị border vàng + pulse animation trên nút.