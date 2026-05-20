## Vấn đề

Logic "đang trong ca" (`isCurrentlyOnShift`) hiện tại **chỉ dựa vào `shift_start_at` / `shift_end_at`** trong bảng `staff_status`, dẫn đến hai loại sai lệch đã thấy ngay trong dữ liệu thực:

1. **Ca treo (false positive)** — Có user `shift_start_at = 2026-02-05` nhưng `shift_end_at = null` → vẫn được coi là "đang trong ca" suốt 3,5 tháng. Người này có thể đã nghỉ từ lâu nhưng vẫn xuất hiện ở dropdown giao việc kiểm tra phòng, giao task housekeeping, distribution, group checkout…
2. **Đang làm nhưng không thấy (false negative)** — User `last_seen_at` hôm nay nhưng chưa bấm "Vào ca" (`shift_start_at = null`) → bị loại khỏi dropdown dù đang online.
3. **Trường `status` (available / busy / break / offline) bị bỏ qua hoàn toàn** ở dropdown giao việc, nhưng lại được hiển thị ở trang Quản lý nhân sự. Hai nơi không cùng định nghĩa "đang trong ca".

## Mục tiêu

Một **định nghĩa "đang trong ca" duy nhất**, dùng chung cho:
- Dropdown giao việc (CheckoutInspectionSection, AssignTaskDialog, BulkCreateTaskDialog, DistributionForm, GroupCheckoutDialog, ApproveSupplementDialog, InspectionStatusCard, CleaningRequestBanner, GroupCheckoutRoomCard…)
- Trang Quản lý nhân sự (`/staff-management`, `OnShiftStaffPanel`, `ShiftStatusBanner`).
- Cron tự đóng ca treo.

## A. Logic nghiệp vụ thống nhất

Một nhân viên được coi là **"đang trong ca"** khi **tất cả** đúng:

1. `shift_start_at` không null **và** (`shift_end_at` null hoặc `shift_end_at < shift_start_at`).
2. `shift_start_at` **trong vòng ≤ 16 giờ** (max ca làm) — quá 16h coi như ca treo, không tính.
3. `status` ≠ `'offline'`.
4. Tuỳ chọn (mặc định bật): `last_seen_at` trong vòng ≤ 30 phút — nếu không thì là "ngoại tuyến" (đã đăng ký ca nhưng mất kết nối lâu).

Trạng thái hiển thị ở dropdown chia 3 nhóm rõ ràng (cùng định nghĩa với trang Quản lý nhân sự):

- **Sẵn sàng** — đủ 4 điều kiện trên, `status = 'available'`.
- **Đang bận / nghỉ giải lao** — đủ 1-3, `status ∈ {'busy','break'}` → vẫn chọn được, có badge cảnh báo.
- **Ngoại tuyến (heartbeat quá hạn)** — đủ 1-3 nhưng `last_seen_at` quá 30 phút → disable hoặc tách nhóm cuối.

Người không thoả điều kiện 1-2 (ca treo / chưa vào ca) **không xuất hiện**.

## B. Schema / migration

1. **Cron tự đóng ca treo**: bổ sung cron `auto_close_stale_shifts` chạy mỗi giờ — set `shift_end_at = now()`, `status = 'offline'` cho mọi `staff_status` có `shift_start_at < now() - interval '16 hours'` và `shift_end_at` null. Ghi vào `audit_log` với reason `'auto_close_stale_shift'`.
2. Không thay đổi cấu trúc bảng. Không cột mới.

## C. Code dùng chung

1. **`src/lib/staffPresence.ts`** (mới) — single source of truth:
   - Hằng số `MAX_SHIFT_HOURS = 16`, `OFFLINE_THRESHOLD_MIN = 30`.
   - `getPresenceState(status): 'on_shift_available' | 'on_shift_busy' | 'on_shift_offline' | 'shift_stale' | 'not_on_shift'`.
   - `isOnShift(status)` (bao gồm điều kiện 1+2+3), `isAvailableNow(status)` (đủ 4).
   - Label tiếng Việt + màu semantic cho từng state.
2. **`src/hooks/useShiftManagement.ts`**:
   - Thay `isCurrentlyOnShift` → re-export từ `staffPresence.ts` (compat layer, không breaking).
3. **`src/hooks/useOnShiftStaffList.ts` + `useOnShiftStaffListAll.ts`**:
   - Dùng `isOnShift` mới (loại ca treo, loại offline status).
   - Trả về thêm `presence_state` cho mỗi staff để UI render badge.
   - Sort: available → busy/break → offline-heartbeat.

## D. UI

1. **`CheckoutInspectionSection.tsx`** (chỗ user đang chọn):
   - Group dropdown theo nhóm: "Sẵn sàng", "Đang bận", "Ngoại tuyến (>30 phút)".
   - Badge nhỏ bên cạnh tên: chấm xanh / vàng / xám.
   - Đổi label `(đang trong ca)` → `(đang trong ca, đã loại ca treo & ngoại tuyến lâu)` tooltip; label chính giữ ngắn.
   - Hiển thị `last_seen_at` tương đối ("vừa xong", "5 phút trước") khi không phải available.
2. **Tất cả dialog giao việc khác** (AssignTaskDialog, BulkCreateTaskDialog, DistributionForm, GroupCheckoutDialog, ApproveSupplementDialog, InspectionStatusCard, CleaningRequestBanner, GroupCheckoutRoomCard): áp cùng component `<StaffPicker>` mới → tái sử dụng nhóm + badge.
3. **Trang `/staff-management` (`OnShiftStaffPanel`, `ShiftStatusBanner`)**: dùng cùng `getPresenceState`, hiển thị thêm cảnh báo "Ca quá 16 giờ — sẽ tự đóng" để Manager biết.

## E. Permission

Không thay đổi. Vẫn dùng `useHotelStaffList`/`useOnShiftStaffList` đã tôn trọng `user_hotels` + RLS theo `tenant_id`.

## F. Test

- Unit `staffPresence.test.ts`: 8 case (chưa vào ca / vừa vào ca / ca 17h / shift_end_at < start / status offline / status busy / heartbeat quá 30' / available healthy).
- Component test `CheckoutInspectionSection`: render đúng group, disable đúng item ngoại tuyến.
- SQL test cron `auto_close_stale_shifts`: insert row 20h trước → chạy cron → assert đã đóng + audit log.

## G. Rollout

1. Bật migration cron (không phá dữ liệu — chỉ đóng ca treo).
2. Chạy 1 lần thủ công để dọn ngay dữ liệu sai hiện tại (4 user có ca treo > 16h).
3. Deploy code: hook + UI cùng release; vì compat layer giữ tên `isCurrentlyOnShift`, không component nào vỡ.
4. Bump `APP_VERSION` + thêm entry changelog.
5. Theo dõi audit log `auto_close_stale_shift` 1 tuần.

## Rủi ro

- Nhân viên đang dùng app nhưng quên bấm "Vào ca" sẽ vẫn không hiện → cần thêm banner nhắc ở `ShiftStatusBanner` (đã có) và đảm bảo flow "Vào ca" rõ ràng. Không thay đổi flow trong phạm vi này.
- Threshold 16h / 30 phút là giả định hợp lý cho khách sạn 2–4 sao VN; cho phép Owner chỉnh sau qua `tenants.settings.shift` (mở rộng tương lai, không build trong sprint này).
