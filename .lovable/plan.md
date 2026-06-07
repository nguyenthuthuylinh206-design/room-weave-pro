## Kế hoạch sửa lỗi xác nhận đặt phòng

### Vấn đề tìm thấy
- Khi bấm **Xác nhận đặt phòng** cho đặt phòng theo giờ, app gọi RPC `validate_hourly_booking`.
- RPC hiện có câu SQL `SELECT COUNT(*), MIN(id)` trên cột `id` kiểu UUID.
- PostgreSQL không hỗ trợ `MIN(uuid)`, nên trả lỗi: `function min(uuid) does not exist`.
- Dòng `MIN(id)` thực tế không được dùng trong logic, vì sau đó RPC đã query riêng booking bị trùng bằng `LIMIT 1`.

### Reuse
- Giữ nguyên frontend `useBookingForm.ts` vì đã gọi đúng RPC và hiển thị lỗi đúng chỗ.
- Giữ nguyên cấu trúc RPC trả về JSONB `{ valid, message, conflict }` để không ảnh hưởng UI.

### Refactor / sửa
- Tạo migration cập nhật lại `public.validate_hourly_booking`.
- Thay đoạn `SELECT COUNT(*), MIN(id)` bằng `SELECT COUNT(*)`.
- Có thể thêm `ORDER BY hourly_start_time ASC` cho query lấy conflict để thông báo ổn định hơn.

### Thêm mới
- Migration SQL sửa RPC.
- Không cần thêm bảng/cột mới.
- Không cần sửa RLS vì đây là sửa function hiện có.

### Rủi ro migration
- Rủi ro thấp: chỉ thay thân function, không đổi tham số, không đổi kiểu trả về.
- Nếu có booking trùng thật, RPC vẫn trả thông báo trùng lịch như trước.

### Kiểm tra sau khi triển khai
- Xác nhận tạo booking theo giờ không còn toast `function min(uuid) does not exist`.
- Trường hợp phòng rảnh: qua được bước validate và tiếp tục tạo booking.
- Trường hợp phòng đã có booking trùng: vẫn hiển thị cảnh báo trùng lịch bằng tiếng Việt.

### File dự kiến thay đổi
- Thêm migration trong `supabase/migrations/...fix_validate_hourly_booking_uuid_min.sql`.
- Không sửa frontend nếu không phát hiện lỗi phụ sau khi migration chạy.