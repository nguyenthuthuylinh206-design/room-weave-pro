

## Kế hoạch: Sửa lỗi RLS cho chức năng đặt phòng

### I. NGUYÊN NHÂN

| Yếu tố | Giá trị |
|--------|---------|
| User đang login | NV Linh (staff) |
| RLS Policy INSERT | Chỉ cho phép: owner, hotel_manager, department_manager |
| Role của user | `staff` → **KHÔNG có quyền INSERT** |

### II. GIẢI PHÁP

Có 2 hướng xử lý:

#### **Hướng 1: Thêm `staff` vào RLS policy (Đơn giản, nhanh)**

Cập nhật RLS policy để cho phép staff tạo booking:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Managers can insert room bookings" ON room_bookings;

-- Create new policy including staff
CREATE POLICY "Staff and managers can insert room bookings"
ON room_bookings FOR INSERT
WITH CHECK (
  (tenant_id IN (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'hotel_manager'::app_role)
    OR has_role(auth.uid(), 'department_manager'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
  )
);
```

#### **Hướng 2: Tích hợp Permission-Based System (Chuẩn dài hạn)**

1. Thêm module `bookings` vào `PermissionModule` enum
2. Tạo RLS policy dựa trên `has_user_permission()` thay vì hardcode roles
3. Cấu hình permission cho từng role trong hệ thống quản lý quyền

### III. ĐỀ XUẤT

**Chọn Hướng 1** vì:
- Nhanh chóng fix lỗi hiện tại
- Logic nghiệp vụ: Staff của khách sạn thường cần tạo booking cho khách walk-in
- Có thể migrate sang permission-based sau

### IV. THAY ĐỔI CẦN THỰC HIỆN

| Loại | Chi tiết |
|------|----------|
| **Database Migration** | Update RLS policy cho `room_bookings` table - thêm `staff` vào INSERT và UPDATE policies |

### V. SQL Migration

```sql
-- 1. Update INSERT policy to include staff
DROP POLICY IF EXISTS "Managers can insert room bookings" ON room_bookings;

CREATE POLICY "Staff and managers can insert room bookings"
ON room_bookings FOR INSERT
WITH CHECK (
  (tenant_id IN (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'hotel_manager'::app_role)
    OR has_role(auth.uid(), 'department_manager'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
  )
);

-- 2. Update UPDATE policy to include staff
DROP POLICY IF EXISTS "Managers can update room bookings" ON room_bookings;

CREATE POLICY "Staff and managers can update room bookings"
ON room_bookings FOR UPDATE
USING (
  (tenant_id IN (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'hotel_manager'::app_role)
    OR has_role(auth.uid(), 'department_manager'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
  )
);

-- Note: DELETE policy giữ nguyên - chỉ manager trở lên mới được xóa booking
```

### VI. KẾT QUẢ SAU KHI TRIỂN KHAI

- Staff có thể tạo và sửa booking
- Staff **không thể xóa** booking (vẫn cần manager/owner)
- Data isolation theo tenant vẫn được đảm bảo

