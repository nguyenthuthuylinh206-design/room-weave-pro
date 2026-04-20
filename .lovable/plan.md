

## Vấn đề

Trên dashboard task của nhân viên (`TaskCard`, `StaffTaskRow`, `TaskDetailDialog`):

- Khi task ở trạng thái **"Đang làm"**, có **2 nút**: `[Tiếp]` (mở trang kiểm tra) và `[✓]` (đánh dấu hoàn thành ngay).
- Nút `[✓]` gọi thẳng `updateStatus({ status: 'completed' })` → task chuyển thành "Hoàn thành" mà **không cần kiểm tra thực tế**, không có `room_check_id`, không lưu báo cáo nào.
- Hiện chỉ task `cleaning` mới mở dialog xác nhận. Các task `checkout_inspection`, `checkin_prep`, `amenity_request` đều có thể tích hoàn thành chỉ bằng 1 click → **sai nghiệp vụ, có thể gian lận**.

Trong khi đó, `RoomCheckPage` đã có sẵn logic auto-complete task khi nhân viên submit kiểm tra thật (dòng 895-937). Nghĩa là **chỉ cần buộc nhân viên đi qua trang kiểm tra**, task sẽ tự đánh dấu hoàn thành đúng quy trình.

## Hướng sửa

### 1. Bỏ nút "✓" (hoàn thành nhanh) cho task cần kiểm tra

Với các task type sau, **CHỈ hiển thị nút `[Tiếp tục kiểm tra →]`**, KHÔNG có nút check xanh:
- `checkout_inspection`
- `checkin_prep`
- `amenity_request`

Nhân viên muốn hoàn thành → bắt buộc bấm "Tiếp tục" → mở `/rooms/:id/check?type=...` → submit kiểm tra thật → task tự động chuyển sang `completed` (logic đã có sẵn ở `RoomCheckPage`).

### 2. Giữ nguyên cho các task không cần kiểm tra

- `cleaning`: Giữ dialog `CleaningCompleteDialog` (đã có lựa chọn "Mở phòng ngay" / "Kiểm tra nhanh trước") — đây là dọn phòng đơn thuần, không bắt buộc kiểm tra.
- `delivery_confirmation`: Giữ flow hiện tại — mở `DeliveryConfirmationModal` để nhân viên tick xác nhận từng món.
- `other`: Giữ nút `[✓]` hoàn thành nhanh (task tự do, không gắn với quy trình).

### 3. Đổi label nút "Tiếp" cho rõ nghĩa

Khi task ở `in_progress` và là loại bắt buộc kiểm tra → nút duy nhất hiện text **"Tiếp tục kiểm tra"** (thay vì chỉ "Tiếp") để nhân viên hiểu phải vào trang kiểm tra mới hoàn thành được.

### 4. Hệ quả

- Task `checkout_inspection` / `checkin_prep` / `amenity_request` chỉ có thể chuyển `completed` qua đường duy nhất: submit room check → tự động complete kèm `room_check_id` (audit trail rõ ràng).
- Quản lý có thể tra ngược: mỗi task completed → có check thực sự với danh sách items, ảnh, ghi chú.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/housekeeping/TaskCard.tsx` | Trong nhánh `isInProgress`: ẩn nút check xanh khi `task_type ∈ {checkout_inspection, checkin_prep, amenity_request}`. Đổi label nút "Tiếp" → "Tiếp tục kiểm tra" cho các loại này. Bỏ `handleComplete` khỏi luồng các loại bắt buộc kiểm tra (nhưng giữ cho cleaning/delivery/other). |
| `src/components/housekeeping/StaffTaskRow.tsx` | Áp dụng cùng logic: ẩn nút check xanh cho các task type bắt buộc kiểm tra; đổi label "Tiếp" thành "Tiếp tục kiểm tra". |
| `src/components/housekeeping/TaskDetailDialog.tsx` | Trong khu vực action footer: ẩn nút "Hoàn thành" khi task ở `in_progress` và thuộc các loại bắt buộc kiểm tra. Chỉ giữ nút "Tiếp tục kiểm tra". |

Không sửa hook, không migration, không ảnh hưởng `RoomCheckPage` (logic auto-complete đã đúng và sẽ tiếp tục hoạt động).

