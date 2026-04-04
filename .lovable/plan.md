

## Bổ sung thông tin đầy đủ vào Chi tiết công việc

### Hiện tại đang hiển thị
1. Số phòng + Tầng
2. Loại công việc
3. Mức độ ưu tiên
4. Người giao việc
5. Thời gian tạo (relative)
6. Deadline (nếu có)
7. Thời gian đang thực hiện (nếu in_progress)
8. Tên khách (nếu có booking)
9. Đồ dùng cần xác nhận (delivery task)
10. Ghi chú/mô tả

### Thông tin cần bổ sung

| # | Thông tin | Nguồn dữ liệu | Lý do |
|---|-----------|----------------|-------|
| 1 | **Loại phòng** (VIP, Standard...) | `task.room.room_type` | Nhân viên biết chuẩn bị đồ dùng phù hợp |
| 2 | **Trạng thái công việc** | `task.status` → STATUS_LABELS | Xác nhận rõ task đang ở bước nào |
| 3 | **Ngày checkout khách** | `task.booking.check_out_date` | Biết deadline thực tế của phòng |
| 4 | **Ghi chú riêng** (`notes`) | `task.notes` | Hiện chỉ hiện `description`, chưa hiện `notes` |
| 5 | **Thời gian tạo chính xác** | `task.created_at` format đầy đủ | Thay vì chỉ "7 phút trước", thêm giờ cụ thể |

### Thay đổi cụ thể

**File: `src/components/housekeeping/TaskDetailDialog.tsx`**

- Thêm dòng **Loại phòng** ngay dưới "Tầng" trong block Room Info
- Thêm dòng **Trạng thái** (badge: Chờ xử lý / Đang thực hiện) vào đầu task details
- Thêm **Ngày checkout** bên dưới tên khách (nếu có booking)
- Hiển thị **giờ cụ thể** (HH:mm) bên cạnh thời gian relative
- Hiển thị block **Ghi chú** từ `task.notes` (tách biệt với `task.description`)
- Giữ nguyên toàn bộ logic action buttons và modals

### Layout sau khi sửa
```text
┌──────────────────────────────┐
│ Chi tiết công việc           │
├──────────────────────────────┤
│ 📍 Phòng P.101              │
│    Tầng 1 · Standard        │
├──────────────────────────────┤
│ Trạng thái:  Chờ xử lý      │
│ Loại:        Dọn phòng       │
│ Ưu tiên:     🟡 Trung bình  │
│ Người giao:  Nguyễn Thành    │
│ Khách:       Trần Văn A      │
│   └ Checkout: 05/04/2026     │
│ Giao lúc:    14:30 (7p trước)│
│ Deadline:    15:00           │
│ Đang làm:    ⏱ 5 phút       │
├──────────────────────────────┤
│ Mô tả: Dọn phòng sau CO     │
│ Ghi chú: Khách yêu cầu...   │
├──────────────────────────────┤
│       [ Bắt đầu thực hiện ] │
└──────────────────────────────┘
```

