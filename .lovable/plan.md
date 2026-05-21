## Vấn đề

Ở trang `/staff` (StaffCard), chấm xanh / xám cạnh tên đang lấy **trực tiếp từ cột `staff_status.status`** (`available | busy | break | offline`) qua `<StaffStatusBadge status={staff.status} />`. Cột này chỉ đổi khi nhân viên (hoặc app) **chủ động ghi** — không tự reset khi mất heartbeat, không tự reset khi ca treo, không sync với `last_seen_at`.

Hệ quả thấy trong ảnh user gửi:
- "NV Linh" — chấm xanh nhưng dòng dưới ghi "Hoạt động khoảng 1 tháng trước" → thực tế offline lâu, vẫn xanh.
- "Quản Lý 2", "oboto", "Nhân Viên Buồng Tâm" — tất cả xanh dù có thể chưa vào ca hoặc đã offline.
- Badge "Đang trong ca" ở `StaffCard` cũng dùng logic cũ riêng (`shift_start_at` + `shift_end_at`), **không** áp `MAX_SHIFT_HOURS = 16`, lệch với `staffPresence.ts` đã chuẩn hoá ở các dropdown giao việc và `/staff-management`.

Tức là: hai nơi (dropdown giao việc đã chuẩn hoá ở sprint trước **vs** trang `/staff` này) đang dùng **2 định nghĩa khác nhau** cho cùng khái niệm "đang on / trong ca".

## Mục tiêu

Trang `/staff` (StaffCard, StaffList, StaffStatsCards, StaffDetailSheet) dùng **cùng** `getPresenceState()` / `isOnShift()` từ `src/lib/staffPresence.ts` — single source of truth duy nhất với mọi nơi khác. Không thêm logic mới, chỉ replace.

## Thay đổi

### A. Logic / dữ liệu
1. `useStaffStatus.ts`: bổ sung trường tính sẵn `presence_state: StaffPresenceState` cho mỗi `StaffWithStatus`, derive từ `getPresenceState({ shift_start_at, shift_end_at, status, last_seen_at })`. Không đổi schema, không migration.
2. `useStaffStatusStats`: đếm theo `presence_state` thay vì `status` thô — 4 nhóm hiển thị: **Sẵn sàng** (on_shift_available), **Đang bận** (on_shift_busy), **Mất kết nối** (on_shift_offline), **Ngoài ca** (shift_stale + not_on_shift gộp). Giữ tổng `total`.

### B. UI
1. **`StaffCard.tsx`**:
   - Bỏ tính `isOnShift` local; dùng `isOnShift(staff)` từ `@/lib/staffPresence`.
   - Chấm cạnh tên: thay `<StaffStatusBadge status={staff.status} />` → chấm 2x2 với màu lấy từ `PRESENCE_DOT_COLOR[staff.presence_state]`, tooltip = `PRESENCE_LABEL[...]`.
   - Badge "Đang trong ca" chỉ hiện khi `presence_state ∈ {available, busy}`; nếu `on_shift_offline` thì badge đổi label "Trong ca · mất kết nối" màu xám.
   - Dòng "Hoạt động X trước" hiện khi `presence_state ∈ {on_shift_offline, not_on_shift, shift_stale}` và có `last_seen_at` — không chỉ riêng `status==='offline'` như hiện tại (đây là nguyên nhân chính khiến NV Linh sai).
   - `shift_stale` thêm cảnh báo nhỏ "Ca quá 16 giờ — sẽ tự đóng" (chỉ Manager/Owner thấy — đã có `canManageTasks` ở page cha, truyền xuống làm prop optional).
2. **`StaffList.tsx`**: sort theo `PRESENCE_SORT_ORDER` (available → busy → offline-heartbeat → stale → not_on_shift), không sort theo `status` thô nữa. Filter cards click cũng map sang presence_state tương ứng.
3. **`StaffStatsCards.tsx`**: 4 ô = Sẵn sàng / Đang bận / Mất kết nối / Ngoài ca. Click filter set `filterPresenceState` (đổi prop `filterStatus` → `filterPresenceState` ở `StaffList`).
4. **`StaffDetailSheet.tsx`**: dùng cùng badge/label từ `staffPresence.ts`, hiển thị thêm dòng `last_seen_at` tương đối và `shift_start_at` (đã bao lâu).

### C. Compat
- Giữ `StaffStatusBadge` cho nơi nào còn dùng raw status (vd UI cho chính nhân viên chọn trạng thái của mình). Không xóa file.
- Không đổi schema, không migration, không edge function.

### D. Test
- Unit `useStaffStatusStats.test.ts`: 6 case — available + heartbeat tốt; available + heartbeat 1h; busy đang ca; shift quá 16h; chưa vào ca; status='offline'.
- Snapshot `StaffCard.test.tsx`: render đúng dot + badge cho 4 presence state.

### E. Rollout
1. Sửa hook + 4 component, không ảnh hưởng dropdown giao việc (đã dùng `staffPresence.ts` từ sprint trước).
2. Bump `APP_VERSION` + entry changelog "Đồng bộ chấm trạng thái nhân sự ở trang Quản lý nhân sự".
3. Không cần migration / không cần thông báo người dùng.

## Files dự kiến sửa
- `src/hooks/useStaffStatus.ts` (thêm `presence_state`, đổi `useStaffStatusStats`)
- `src/components/staff/StaffCard.tsx`
- `src/components/staff/StaffList.tsx`
- `src/components/staff/StaffStatsCards.tsx`
- `src/components/staff/StaffDetailSheet.tsx`
- `src/lib/app-version.ts`, `public/changelog.json`
- Mới: `src/components/staff/StaffCard.test.tsx`, `src/hooks/useStaffStatus.test.ts`

## Rủi ro
- Một số nhân viên đang được nhìn thấy "xanh" sẽ chuyển "xám/mất kết nối" sau khi deploy → đúng nghiệp vụ nhưng có thể gây bất ngờ. Đã có dòng "Hoạt động X trước" giải thích.
- Không có rủi ro dữ liệu (chỉ thay cách hiển thị).
