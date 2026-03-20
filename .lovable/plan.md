

## Tối ưu tốc độ xác nhận kiểm tra phòng

### Vấn đề
Khi bấm "Xác nhận hoàn tất", nhân viên phải chờ rất lâu vì hệ thống chạy tuần tự hơn **15 bước** trước khi chuyển trang:
- Lưu dữ liệu kiểm tra
- Tạo yêu cầu giặt, bổ sung đồ
- Cập nhật trạng thái phòng
- Gửi thông báo (in-app, push, telegram)
- Hoàn tất task housekeeping
- Xóa session

Tổng thời gian: **10-15 giây** (theo console logs).

### Giải pháp: Tách "quan trọng" vs "nền"

**Bước 1 (chờ - ~2-3s):** Chỉ chờ `createCheck.mutateAsync` hoàn tất (lưu dữ liệu chính + xử lý theo loại check).

**Bước 2 (nền - không chờ):** Đóng dialog, toast thành công, navigate ngay. Các task sau chạy fire-and-forget:
- Auto-complete housekeeping tasks
- Gửi thông báo checkout completion
- Gửi thông báo chargeable
- Delete session

### Thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/rooms/RoomCheckPage.tsx` | Tách onSubmit: chỉ await createCheck, còn lại chạy nền (Promise.allSettled không await). Đóng dialog + navigate ngay sau createCheck thành công |

### Chi tiết kỹ thuật

Trong `onSubmit`:
1. `await createCheck.mutateAsync(...)` — giữ nguyên, cần chờ
2. Ngay sau đó: `setShowSubmitDialog(false)` + toast + navigate
3. Tất cả phần auto-complete tasks, send notifications, delete session → gom vào 1 block `Promise.allSettled([...])` **không await**, chạy nền

Điều này giảm thời gian chờ từ ~15s xuống ~2-3s mà không mất dữ liệu.

