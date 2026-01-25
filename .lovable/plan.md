
## Kế hoạch Phase 2: Cập nhật RPC functions để lưu đầy đủ text location

### I. TỔNG QUAN VẤN ĐỀ

Hiện tại các RPC functions tạo transaction đang:
- `create_warehouse_transfer`: Chỉ lưu `from_warehouse_id` và `to_warehouse_id` (UUID), **KHÔNG** lưu text location
- `confirm_receive_order` (warehouse_release): Lưu cứng `from_location='warehouse'`, `to_location='staff'`
- `return_to_stock_for_stop`: Chỉ lưu vào `notes`, **KHÔNG** lưu `from_location`/`to_location`

---

### II. CÁC FUNCTIONS CẦN CẬP NHẬT

#### 1. `create_warehouse_transfer`

**Hiện tại (Lines 297-331):**
```sql
INSERT INTO inventory_transactions (
  ...
  from_warehouse_id,
  to_warehouse_id,
  -- THIẾU: from_location, to_location
)
```

**Cần sửa:**
```sql
-- Lấy tên warehouse
SELECT name INTO v_from_warehouse_name FROM warehouses WHERE id = p_from_warehouse_id;
SELECT name INTO v_to_warehouse_name FROM warehouses WHERE id = p_to_warehouse_id;

-- INSERT với đầy đủ location text
INSERT INTO inventory_transactions (
  ...
  from_warehouse_id,
  to_warehouse_id,
  from_location,   -- MỚI
  to_location,     -- MỚI
) VALUES (
  ...
  p_from_warehouse_id,
  p_to_warehouse_id,
  v_from_warehouse_name,   -- "Kho tầng 1"
  v_to_warehouse_name,     -- "Kho tầng 2"
)
```

---

#### 2. `confirm_receive_order` (warehouse_release)

**Hiện tại (Lines 124-142):**
```sql
INSERT INTO inventory_transactions (
  ...
  from_location,
  to_location,
) VALUES (
  ...
  'warehouse',  -- Cứng, không có tên cụ thể
  'staff',      -- Cứng, không có tên nhân viên
)
```

**Cần sửa:**
```sql
-- Lấy thông tin warehouse và user
SELECT w.name INTO v_warehouse_name 
FROM warehouses w 
WHERE w.hotel_id = v_order.hotel_id AND w.is_default = true;

SELECT full_name INTO v_staff_name FROM users WHERE id = v_actor_id;

-- INSERT với tên cụ thể
VALUES (
  ...
  v_warehouse_name,  -- "Kho chính"
  v_staff_name,      -- "Nguyễn Văn A"
)
```

---

#### 3. `return_to_stock_for_stop`

**Hiện tại (Lines 506-528):**
```sql
INSERT INTO inventory_transactions (
  ...
  -- THIẾU: from_location, to_location
  notes
) VALUES (
  ...
  'Returned to stock from room ' || v_room_order.room_number || ' (cannot access)'
)
```

**Cần sửa:**
```sql
-- Lấy default warehouse name
SELECT name INTO v_warehouse_name 
FROM warehouses 
WHERE hotel_id = v_order.hotel_id AND is_default = true;

INSERT INTO inventory_transactions (
  ...
  from_location,    -- MỚI
  to_location,      -- MỚI
  notes
) VALUES (
  ...
  'Phòng ' || v_room_order.room_number,  -- "Phòng P101"
  v_warehouse_name,                       -- "Kho chính"
  'Returned to stock (cannot access)'
)
```

---

### III. SQL MIGRATION ĐỀ XUẤT

```sql
-- =============================================
-- Phase 2: Update RPCs to save full location text
-- =============================================

-- 1. Update create_warehouse_transfer
CREATE OR REPLACE FUNCTION public.create_warehouse_transfer(...)
-- Thêm 2 biến: v_from_warehouse_name, v_to_warehouse_name
-- SELECT name từ warehouses table
-- INSERT vào from_location, to_location

-- 2. Update confirm_receive_order  
CREATE OR REPLACE FUNCTION confirm_receive_order(...)
-- Thêm biến: v_warehouse_name, v_staff_name
-- SELECT từ warehouses và users table
-- INSERT vào from_location, to_location

-- 3. Update return_to_stock_for_stop
CREATE OR REPLACE FUNCTION return_to_stock_for_stop(...)
-- Thêm biến: v_warehouse_name
-- SELECT từ warehouses table
-- INSERT from_location = room_number, to_location = warehouse_name
```

---

### IV. KẾT QUẢ SAU TRIỂN KHAI

| Function | from_location | to_location |
|----------|---------------|-------------|
| `create_warehouse_transfer` | "Kho tầng 1" | "Kho tầng 2" |
| `confirm_receive_order` | "Kho chính" | "Nguyễn Văn A" |
| `return_to_stock_for_stop` | "Phòng P101" | "Kho chính" |

---

### V. LƯU Ý QUAN TRỌNG

1. **Phase 1 đã fix hiển thị** - Migration này để đảm bảo dữ liệu mới được lưu đầy đủ
2. **Không cần migration dữ liệu cũ** - Phase 1 (COALESCE JOIN) đã handle fallback
3. **Backward compatible** - Chỉ thêm fields, không thay đổi logic nghiệp vụ
4. **Test sau migration**: Tạo transfer mới, xác nhận nhận hàng, return to stock và kiểm tra UI

---

### VI. FILES SẼ ĐƯỢC TẠO/SỬA

| File | Hành động |
|------|-----------|
| `supabase/migrations/xxx_update_rpc_location_text.sql` | **TẠO MỚI** - Chứa 3 CREATE OR REPLACE FUNCTION |
