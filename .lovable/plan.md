

## Làm gọn TaskCard trên mobile

### Hiện tại
TaskCard đang chiếm **4 khối** (header + details + time + actions) = ~120px mỗi task. Quá nhiều thông tin không cần thiết khi nhân viên đang di chuyển: description, tên khách, người yêu cầu, icon loại task...

### Thiết kế mới
Mỗi task chỉ **1 hàng duy nhất**, cao ~48-52px:

```text
┌─────────────────────────────────────────────┐
│ 🔴 P.101  Dọn phòng  ·  2 phút  [Bắt đầu] │
│ 🟡 P.203  KT checkout ·  5 phút  [Tiếp ▸]  │
│ 🟢 P.305  Check-in    · 12 phút  [✓]       │
└─────────────────────────────────────────────┘
```

- **Trái**: Chấm màu priority (đỏ=gấp, cam=cao, vàng=TB, xám=thấp) + số phòng in đậm
- **Giữa**: Loại task (rút gọn) + thời gian (tạo/đang làm)
- **Phải**: 1 nút duy nhất tùy trạng thái

### Thay đổi cụ thể

**File: `src/components/housekeeping/TaskCard.tsx`**
- Thay layout card nhiều khối bằng layout `flex items-center` 1 hàng
- Bỏ: icon box, badge priority dạng text, description, tên khách, người yêu cầu, delivery items preview
- Giữ: số phòng (font-bold), loại task (text-xs), thời gian relative, chấm màu priority
- Nút action: gộp thành 1 nút nhỏ `size="sm"` bên phải
- Hàng urgent: thêm `bg-red-50/60` nhẹ + border đỏ
- Hàng in_progress: `bg-blue-50/60` + hiện thời gian đang chạy
- Giữ nguyên toàn bộ logic xử lý (handleStart, handleComplete, handleContinue, modals)

### Kết quả
- Mỗi task ~48px thay vì ~120px → nhìn được gấp 2-3x số task trên màn hình
- Nhân viên chỉ cần nhìn: phòng nào, làm gì, gấp không, bấm 1 nút

