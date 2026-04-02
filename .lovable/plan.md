

## Sửa lỗi phân quyền bật rồi bị tắt + Tối ưu hệ thống

### Nguyên nhân gốc

Sau khi kiểm tra kỹ database và code, phát hiện **5 lỗi**:

1. **`get_user_permissions_summary` thiếu `assign` và `manage`** — Hàm SQL chỉ trả 6 trường, thiếu 2 action `assign` và `manage`. Modules dùng actions này (maintenance, settings) bị hiển thị sai trạng thái sau khi lưu.

2. **`bookings` module không có trong bảng `permissions`** — Hàm summary lấy danh sách module từ `SELECT DISTINCT module FROM permissions`. Bảng `permissions` không có `bookings` → quyền bookings lưu OK nhưng đọc lại luôn hiển thị tắt.

3. **`dashboard` thiếu action `view` trong bảng `permissions`** — `MODULE_ACTIONS.dashboard = ['view']` nhưng bảng permissions chỉ có `approve, create, delete, export, update` cho dashboard.

4. **Nút "Lưu thay đổi" nằm cuối ScrollArea** — User toggle xong tưởng đã lưu nhưng chưa click Save. Nút bị ẩn dưới danh sách 13 modules.

5. **`UserPermissionsDialog` cũng insert `enabled: false` rows** — Gây rác trong DB dù không ảnh hưởng logic.

### Thay đổi cần thực hiện

| # | File | Thay đổi |
|---|------|----------|
| 1 | Migration SQL | Tạo lại `get_user_permissions_summary` thêm `can_assign`, `can_manage`. Insert missing permissions: `bookings.*`, `dashboard.view`, `maintenance.assign`, `settings.manage` |
| 2 | `src/hooks/useUserPermissions.ts` | Thêm `can_assign`, `can_manage` vào `PermissionSummary` interface |
| 3 | `src/hooks/useUserModulePermissions.ts` | Thêm `can_assign`, `can_manage` vào `PermissionSummary` interface |
| 4 | `src/hooks/useUserPermissionConfiguration.ts` | Thêm `summary.can_assign \|\| summary.can_manage` vào `hasAnyPermission` check |
| 5 | `src/components/permissions/UserPermissionPanel.tsx` | Di chuyển nút Lưu ra ngoài ScrollArea (sticky bottom), thêm visual indicator khi có thay đổi chưa lưu |
| 6 | `src/components/users/UserPermissionsDialog.tsx` | Chỉ insert `enabled: true` rows thay vì cả `enabled: false` |

### Chi tiết kỹ thuật

**Migration SQL:**
```sql
-- Recreate function with 2 new columns
DROP FUNCTION IF EXISTS public.get_user_permissions_summary(UUID);
CREATE OR REPLACE FUNCTION public.get_user_permissions_summary(p_user_id UUID)
RETURNS TABLE(
  module TEXT, can_view BOOLEAN, can_create BOOLEAN, can_update BOOLEAN,
  can_delete BOOLEAN, can_export BOOLEAN, can_approve BOOLEAN,
  can_assign BOOLEAN, can_manage BOOLEAN  -- NEW
) ...
-- Add: EXISTS(... action = 'assign') as can_assign
-- Add: EXISTS(... action = 'manage') as can_manage

-- Insert missing permission records
INSERT INTO permissions ... bookings (view/create/update/delete/export)
INSERT INTO permissions ... dashboard.view
INSERT INTO permissions ... maintenance.assign, settings.manage
```

**UI: Sticky save button (UserPermissionPanel.tsx):**
```tsx
// Move save button OUTSIDE ScrollArea, fixed at bottom
<ScrollArea className="flex-1">
  <TabsContent value="modules">
    {/* Module list only, no save button */}
  </TabsContent>
</ScrollArea>

{/* Sticky save bar - always visible */}
{hasChanges && !isProtectedUser && (
  <div className="p-3 border-t bg-amber-50 border-amber-200">
    <Button onClick={handleSave} className="w-full">
      <Save /> Lưu thay đổi
    </Button>
  </div>
)}
```

**UserPermissionsDialog fix:**
```typescript
// Before: pushes ALL actions including enabled: false
permissionsArray.push({ module, action, enabled })

// After: only push enabled actions
if (enabled) {
  permissionsArray.push({ module, action, enabled: true })
}
```

