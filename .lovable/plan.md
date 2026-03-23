

## Kết quả kiểm tra giới hạn phòng trial

### Đã hoạt động đúng
- Gói `free_trial` có `max_rooms = 50`
- Function `check_tenant_can_add` so sánh `current_rooms_count` với `max_rooms` → chặn khi đạt 50
- UI tạo phòng đơn lẻ (RoomFormPage + MobileRoomFormPage) kiểm tra quota trước khi cho tạo
- Tenant trial hiện tại: 1 tenant có 20 phòng (còn 30 slot), 2 tenant có 0 phòng

### Lỗ hổng phát hiện: Bulk Import không kiểm tra quota

`useBulkCreateRooms.ts` insert phòng trực tiếp vào database **mà không gọi `check_tenant_can_add`** → có thể import Excel 100+ phòng vượt giới hạn 50.

### Sửa

| File | Thay đổi |
|------|----------|
| `src/hooks/useBulkCreateRooms.ts` | Thêm kiểm tra quota trước khi bắt đầu import: gọi `check_tenant_can_add('room')`, tính số phòng hiện tại + số phòng import, chặn nếu vượt `max_rooms` |

**Chi tiết**: Trước vòng lặp insert, query `tenant_usage.current_rooms_count` + `subscription_plans.max_rooms`. Nếu `current_rooms_count + rooms.length > max_rooms` → throw error ngay, không import phòng nào.

