
## Kế hoạch: Xử lý xung đột khi nhiều nhân viên kiểm tra cùng phòng

### I. VẤN ĐỀ PHÁT HIỆN

**Dữ liệu thực tế:**
- 9 room_check_sessions đang "treo", có session treo từ **2 tháng trước**
- 3 checkout_inspection_requests pending/in_progress, có request treo **308 giờ**
- Không có cơ chế tự động dọn dẹp session hết hạn

**Các trường hợp xung đột:**
1. NV A đang kiểm tra daily, Manager yêu cầu checkout cùng phòng
2. NV quên hoàn thành session, phòng bị "khóa" vĩnh viễn
3. Checkout inspection gán cho NV A nhưng NV B cố kiểm tra
4. Session cũ treo, không ai kiểm tra được phòng

### II. GIẢI PHÁP

#### Bước 1: Auto-cleanup sessions hết hạn (Database Trigger/Cron)

Tạo function tự động xóa sessions quá 2 giờ:

```sql
-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_check_sessions()
RETURNS void AS $$
BEGIN
  -- Xóa sessions quá 2 giờ
  DELETE FROM room_check_sessions
  WHERE started_at < NOW() - INTERVAL '2 hours';
  
  -- Cập nhật checkout inspections quá 4 giờ về pending
  UPDATE checkout_inspection_requests
  SET status = 'pending', started_at = NULL
  WHERE status = 'in_progress'
    AND started_at < NOW() - INTERVAL '4 hours';
END;
$$ LANGUAGE plpgsql;
```

#### Bước 2: Chạy cleanup định kỳ (pg_cron hoặc Edge Function)

Option 1: **Edge Function scheduled** chạy mỗi 30 phút
Option 2: **Manual cleanup button** cho Manager trong Settings

#### Bước 3: Cải thiện UI hiển thị conflict

**StaffRoomCheckView.tsx:**
- Hiển thị rõ ràng ai đang kiểm tra phòng
- Thêm tooltip với thời gian session bắt đầu
- Badge "Đang KT" → "Đang KT bởi [Tên] (2h)"

**RoomCheckPage.tsx:**
- Dialog hỏi có muốn "take over" session cũ (chỉ Manager)
- Hiển thị warning nếu session đã quá 1 giờ

#### Bước 4: Manager Override (Take Over)

Cho phép Manager/Admin "take over" session của NV khác khi cần thiết:

```typescript
const takeOverSession = async (roomId: string) => {
  // 1. Xóa session cũ
  await supabase
    .from('room_check_sessions')
    .delete()
    .eq('room_id', roomId)
  
  // 2. Tạo session mới cho manager
  await createSession(roomId, checkType, userName, tenantId)
}
```

#### Bước 5: Ưu tiên Checkout over Daily

Khi có checkout inspection request:
- Auto-cancel session daily của NV khác
- Notify NV bị cancel: "Phòng X được ưu tiên checkout, session của bạn đã bị hủy"

#### Bước 6: Backfill - Dọn dẹp dữ liệu cũ ngay

Chạy migration để xóa sessions và inspections quá cũ:

```sql
-- Xóa sessions quá 24 giờ
DELETE FROM room_check_sessions 
WHERE started_at < NOW() - INTERVAL '24 hours';

-- Reset inspections quá 24 giờ về pending
UPDATE checkout_inspection_requests
SET status = 'pending', started_at = NULL
WHERE status = 'in_progress'
  AND started_at < NOW() - INTERVAL '24 hours';
```

### III. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `supabase/migrations/...` | Function cleanup + backfill data |
| `src/hooks/useRoomCheckSession.ts` | Thêm `takeOverSession()` method |
| `src/pages/rooms/RoomCheckPage.tsx` | Dialog take over cho Manager |
| `src/components/rooms/StaffRoomCheckView.tsx` | Hiển thị chi tiết session conflict |
| `supabase/functions/cleanup-sessions/index.ts` | Edge function chạy định kỳ (optional) |

### IV. KẾT QUẢ MONG ĐỢI

1. **Sessions tự động dọn dẹp** sau 2 giờ không hoạt động
2. **Manager có thể override** session của NV khi cần thiết
3. **Checkout được ưu tiên** hơn daily check
4. **UI hiển thị rõ ràng** ai đang làm gì, từ bao lâu
5. **Không còn phòng bị "khóa"** do session treo
Bổ sung : Sau 40p cần thông báo cho saff phụ trách và quản lý tránh trường hợp để quên chưa hoàn thành công việc 
