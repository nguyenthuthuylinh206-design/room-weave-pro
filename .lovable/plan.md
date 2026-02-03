

## Phân tích & Kế hoạch Cải thiện Logic Ca làm việc

### TRẠNG THÁI HIỆN TẠI

| Component | Status | Chi tiết |
|-----------|--------|----------|
| Bảng `shift_history` | ✅ OK | Đã tạo đúng cấu trúc |
| Trigger log history | ✅ OK | Enabled và hoạt động |
| RLS Policies | ✅ OK | Đã cấu hình đúng |
| useShiftHistory hook | ✅ OK | Query đúng |
| UI Components | ✅ OK | Hiển thị đúng |

**Lý do bảng trống:** Chưa có nhân viên nào hoàn thành ca làm việc (ấn "Kết thúc ca") kể từ khi tính năng được deploy.

---

### VẤN ĐỀ TIỀM ẨN CẦN SỬA

#### Vấn đề 1: Trigger không log hotel_id chính xác

**Trigger hiện tại:**
```sql
hotel_id,
...
NEW.current_location,  -- ❌ current_location là TEXT, không phải UUID
```

**Vấn đề:** 
- `current_location` trong `staff_status` là kiểu `TEXT` (ví dụ: "Phòng 101", "Sảnh chính")
- `hotel_id` trong `shift_history` là kiểu `UUID`
- Điều này sẽ gây lỗi khi trigger chạy nếu `current_location` không phải là UUID hợp lệ

**Giải pháp:** Lấy `hotel_id` từ bảng `users` thay vì dùng `current_location`:
```sql
(SELECT hotel_id FROM users WHERE id = NEW.user_id),
```

---

#### Vấn đề 2: Không invalidate cache shift-history sau check-out

**File:** `useShiftManagement.ts` - `useShiftCheckOut`

**Hiện tại:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['my-staff-status'] })
  queryClient.invalidateQueries({ queryKey: ['staff-status'] })
  // ❌ Thiếu invalidate shift-history
}
```

**Giải pháp:** Thêm invalidate để UI cập nhật realtime:
```typescript
queryClient.invalidateQueries({ queryKey: ['shift-history'] })
```

---

#### Vấn đề 3: Không xử lý edge case khi check-in liên tiếp

**Kịch bản lỗi:**
1. Nhân viên check-in lúc 8:00 (`shift_start_at = 8:00`)
2. Quên check-out, về nhà
3. Hôm sau check-in lại lúc 8:00 (`shift_start_at = 8:00 mới` → ghi đè)
4. **Kết quả:** Ca hôm trước KHÔNG được ghi vào history (vì không bao giờ update `shift_end_at`)

**Giải pháp:** Trong `useShiftCheckIn`, kiểm tra nếu đang có ca chưa kết thúc, tự động kết thúc ca cũ trước:
```typescript
// Nếu có shift_start_at > shift_end_at, gọi check-out trước
if (existingStatus?.shift_start_at && 
    (!existingStatus.shift_end_at || 
     new Date(existingStatus.shift_start_at) > new Date(existingStatus.shift_end_at))) {
  // Auto check-out ca cũ
}
```

---

### KẾ HOẠCH SỬA LỖI

#### Bước 1: Sửa Trigger (Database Migration)

Cập nhật trigger để lấy đúng `hotel_id`:
```sql
CREATE OR REPLACE FUNCTION public.log_shift_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  IF NEW.shift_end_at IS NOT NULL 
     AND OLD.shift_end_at IS DISTINCT FROM NEW.shift_end_at
     AND NEW.shift_start_at IS NOT NULL
     AND NEW.shift_end_at > NEW.shift_start_at
  THEN
    -- Lấy hotel_id từ bảng users
    SELECT hotel_id INTO v_hotel_id 
    FROM public.users 
    WHERE id = NEW.user_id;

    INSERT INTO public.shift_history (
      tenant_id, user_id, hotel_id, start_at, end_at, notes
    ) VALUES (
      NEW.tenant_id,
      NEW.user_id,
      v_hotel_id,  -- Sửa: dùng hotel_id từ users
      NEW.shift_start_at,
      NEW.shift_end_at,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
```

#### Bước 2: Invalidate cache sau check-out

**File:** `src/hooks/useShiftManagement.ts`

Thêm vào `onSuccess` của `useShiftCheckOut`:
```typescript
queryClient.invalidateQueries({ queryKey: ['shift-history'] })
```

#### Bước 3: Xử lý ca cũ chưa đóng (Enhancement)

**File:** `src/hooks/useShiftManagement.ts`

Trong `useShiftCheckIn`, thêm logic:
1. Kiểm tra nếu đang có ca cũ chưa kết thúc
2. Tự động set `shift_end_at` = thời điểm hiện tại cho ca cũ (trigger sẽ log)
3. Sau đó mới tạo ca mới

---

### FILES CẦN SỬA

| Thứ tự | File | Thay đổi |
|--------|------|----------|
| 1 | Database Migration | Sửa trigger lấy đúng hotel_id |
| 2 | `src/hooks/useShiftManagement.ts` | Thêm invalidate cache + xử lý ca cũ |

---

### KẾT QUẢ MONG ĐỢI

1. **Trigger hoạt động đúng** - không lỗi khi log hotel_id
2. **UI cập nhật realtime** sau khi check-out
3. **Không mất dữ liệu ca** khi nhân viên quên check-out

