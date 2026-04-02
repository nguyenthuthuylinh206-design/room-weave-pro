

## Fix: Phân quyền bật lên vẫn bị tắt

### Nguyên nhân gốc (3 lỗi)

**Lỗi 1 — Migration chưa được áp dụng**: File `20260402160000_fix_permissions_summary.sql` tồn tại nhưng chưa chạy trên database. Hàm `get_user_permissions_summary` vẫn thiếu `can_assign`/`can_manage`. Bảng `permissions` vẫn thiếu `bookings`. Kết quả: modules dùng actions này luôn hiển thị tắt dù đã lưu thành công.

**Lỗi 2 — `isDirtyRef` reset quá sớm**: `handleSave()` gọi `saveConfiguration.mutate()` (fire-and-forget) rồi ngay lập tức set `isDirtyRef.current = false`. Mutation chưa hoàn thành → invalidate chưa chạy → nhưng `isDirtyRef` đã `false` → nếu có refetch nào xảy ra → `useEffect` ghi đè local state bằng dữ liệu cũ.

**Lỗi 3 — Summary function không thấy bookings**: Dù `user_permissions` table có data cho bookings (đã confirm có records), hàm `get_user_permissions_summary` lấy module list từ `SELECT DISTINCT module FROM permissions` — bảng permissions không có bookings → không bao giờ trả về bookings trong summary → UI luôn hiển thị tắt.

### Kế hoạch sửa

| # | Thay đổi | File |
|---|----------|------|
| 1 | Tạo migration MỚI (vì migration cũ không applied) | New migration SQL |
| 2 | Fix `handleSave` — chuyển reset `isDirtyRef` vào callback `onSuccess` của mutation | `UserPermissionPanel.tsx` |
| 3 | Dùng `mutateAsync` hoặc truyền callbacks vào `.mutate()` | `UserPermissionPanel.tsx` |

### Chi tiết

**Migration mới** — cùng nội dung migration cũ (drop + recreate function với 8 columns, insert missing permissions):
```sql
DROP FUNCTION IF EXISTS public.get_user_permissions_summary(UUID);
CREATE OR REPLACE FUNCTION ... RETURNS TABLE(..., can_assign BOOLEAN, can_manage BOOLEAN) ...

INSERT INTO permissions ... bookings (view/create/update/delete/export)
INSERT INTO permissions ... dashboard.view
INSERT INTO permissions ... maintenance.assign, settings.manage
```

**Fix handleSave** — di chuyển reset logic vào mutation callbacks:
```typescript
const handleSave = () => {
  if (!user) return
  
  saveConfiguration({ 
    userId: user.id, 
    modules: localPermissions,
    actions: localActions,
  }, {
    onSuccess: () => {
      setHasActionChanges(false)
      isDirtyRef.current = false  // Chỉ reset SAU KHI mutation + invalidation thành công
    }
  })
}
```

Thay đổi này đảm bảo `isDirtyRef` chỉ reset khi dữ liệu mới đã được lưu xong và cache đã invalidate, tránh useEffect ghi đè local state bằng data cũ.

