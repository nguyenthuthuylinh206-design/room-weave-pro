

User hỏi: phần "giao việc" đã cập nhật realtime danh sách nhân viên đang trong ca chưa?

Cần kiểm tra:
1. Component nào dùng để giao việc (AssignTaskDialog?)
2. Hook nào lấy danh sách nhân viên on-shift (useOnShiftStaffList - đã thấy)
3. Có realtime subscription cho `staff_status` để invalidate khi shift thay đổi không?

Từ context đã có:
- `useOnShiftStaffList` query staff_status với `staleTime: 2 * 60 * 1000` (2 phút) → KHÔNG có realtime
- Memory `staff-presence-and-heartbeat-logic` nói heartbeat 5 phút

Cần xem AssignTaskDialog và các nơi dùng useOnShiftStaffList để confirm.

