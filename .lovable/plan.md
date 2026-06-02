## Mục tiêu

Xây **một màn duy nhất** cho Trưởng buồng phòng / Executive Housekeeper, gom 13 nhóm thông tin nghiệp vụ chuẩn KS 3–5 sao về một cockpit ở route `/housekeeping`. Reuse tối đa dữ liệu hiện có, không đụng module rời (`/laundry`, `/maintenance`, `/lost-found` vẫn giữ — đây là **trang điều hành tổng**).

---

## A. Phân tích codebase hiện tại

**Reuse được (không cần thêm DB)**
- `useUnifiedTasks` + `useHousekeepingTasks` → tasks today, by status, by assignee
- `useTaskQc` + `TasksPendingReviewPage` → phòng chờ kiểm tra, không đạt
- `useActiveRoomBookings` (mới tạo) → khách đang ở, giờ trả
- `useAllRoomCheckSessions` → ai đang kiểm phòng nào
- `usePendingRoomDistributions` → phiếu giao đồ chờ
- `useLaundryDashboard` → tồn linen / giặt / hỏng
- `useOnShiftStaffList` / `useOnShiftStaffListAll` → nhân viên đang ca + realtime
- `useShiftTimer` / `useShiftManagement` → ai đang ca, thời lượng
- `calcRoomPriority` + `getMissingDisplay` → logic phân loại đã có
- `MaintenanceDashboard` / Lost-Found query hooks

**Cần thêm mới**
- 1 hook tổng hợp `useHousekeepingKpi(hotelId)` — gom 6 KPI từ rooms + tasks + bookings
- 1 hook `useRoomsNeedingActionToday(hotelId)` — 4 bucket critical (checkout chưa dọn / thiếu đồ / QC không đạt / task khẩn)
- 1 hook `useStaffProgressToday(hotelId)` — gom task per assignee (đếm done / in_progress / todo)
- Mini floor map component dùng lại `RoomFloorMapView` ở chế độ "compact, không click chi tiết"

**Cần refactor nhẹ**
- Tách bớt logic shared từ `RoomFloorMapView` thành `RoomFloorMapMini` (read-only, KPI focused)
- Thêm route mới `/housekeeping` (hiện chỉ có sub-routes `/housekeeping/qc`, `/housekeeping/review`)

**Rủi ro migration**
- Không có. Pure-frontend aggregation, query song song, không thay schema.
- Performance: 6–8 query parallel, đều có index sẵn. Cache 30–60s + realtime invalidate cho rooms/bookings/tasks.

---

## B. Schema / migration

**Không cần migration**. Toàn bộ dữ liệu đã có trong:
- `rooms`, `room_bookings`, `housekeeping_tasks`, `room_checks`, `room_check_issues`, `staff_status`, `shift_logs`, `maintenance_requests`, `lost_found_items`, `distribution_orders`, `laundry_batches`

Tương lai (phase 4+, không trong scope ngay):
- View materialized `housekeeping_dashboard_snapshot` nếu p95 query > 500ms

---

## C. API / RPC

Không thêm RPC mới. Tất cả là SELECT từ client với `.eq('tenant_id', tenantId).eq('hotel_id', hotelId)`.

---

## D. UI / Components

### Route
- **NEW** `/housekeeping` → `HousekeepingDashboardPage`
- Permission: `module: 'rooms'` (Owner / Hotel Manager / Department Manager — không hiện cho staff; staff redirect `/my-tasks` như đã làm)

### Layout (mobile-first, 4 hàng)

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: "Quản lý buồng phòng · {{hotel}}"   [Cỡ hiển thị]  │
├─────────────────────────────────────────────────────────────┤
│ Hàng 1 — 6 KPI tiles (clickable, scroll-x trên mobile)     │
│ [Tổng] [Đang ở] [C/O hôm nay] [Cần dọn] [Bảo trì] [Thiếu] │
├─────────────────────────────────────────────────────────────┤
│ Hàng 2 — "Cần xử lý ngay" (4 cột tablet, stack mobile)     │
│ ┌─Checkout chưa dọn─┐ ┌─Thiếu đồ─┐ ┌─QC ko đạt─┐ ┌─Khẩn─┐ │
│ │ P101 11:00 · 30m  │ │ P205 ×3  │ │ P310 Lan  │ │ ...  │ │
│ └────────────────────┘ └──────────┘ └───────────┘ └──────┘ │
├─────────────────────────────────────────────────────────────┤
│ Hàng 3 — Sơ đồ phòng mini (overview, click → /rooms)       │
│ Tầng 1: ■■■■■■■  Tầng 2: ■■■■■■■  Tầng 3: ■■■■■■■        │
├─────────────────────────────────────────────────────────────┤
│ Hàng 4 — Tiến độ nhân viên (progress bar / staff)          │
│ Lan    [████████░░] 8/12 · 2 đang làm · 2 chưa làm        │
└─────────────────────────────────────────────────────────────┘
```

### Components mới

```
src/pages/housekeeping/HousekeepingDashboardPage.tsx
src/components/housekeeping/dashboard/
  ├── KpiTile.tsx               (compact tile + click filter)
  ├── KpiRow.tsx                (6 KPI, scroll-x mobile)
  ├── ActionBucket.tsx          (1 cột critical — header + list)
  ├── ActionRow.tsx             (4 bucket grid)
  ├── FloorMapMini.tsx          (compact wrap, no popups)
  └── StaffProgressRow.tsx      (mỗi nhân viên 1 progress row)
src/hooks/useHousekeepingKpi.ts
src/hooks/useRoomsNeedingActionToday.ts
src/hooks/useStaffProgressToday.ts
```

### Click behavior (deeplink)

| Tile / Item                | Click đi đâu                                    |
|----------------------------|--------------------------------------------------|
| KPI "Cần dọn"              | `/rooms?view=grid&status=vacant_dirty`           |
| KPI "Đang ở"               | `/rooms?view=grid&status=occupied`               |
| KPI "C/O hôm nay"          | `/bookings?tab=checkout-today`                   |
| KPI "Bảo trì"              | `/maintenance/requests?status=pending,in_progress` |
| KPI "Thiếu đồ"             | `/rooms?view=grid&missing=1`                     |
| Bucket "QC không đạt"      | `/housekeeping/review`                           |
| Bucket "Task khẩn"         | `/my-tasks?priority=urgent` (hoặc `/housekeeping/review`) |
| Ô phòng mini map           | `/rooms/:id` (giữ Quick Dialog nếu desktop)      |
| Staff row                  | `/staff-management/users/:id` hoặc filter `/my-tasks?assignee=:id` |

---

## E. Permission / role

- Route: `module: 'rooms'`
- **Staff**: tiếp tục redirect `/my-tasks` (đã có cơ chế)
- **Department Manager (Buồng phòng)**: full quyền cockpit
- **Hotel Manager / Owner**: full quyền + thấy across hotels khi All Hotels mode (KPI cộng dồn, sơ đồ ẩn — yêu cầu chọn 1 hotel)

---

## F. Sidebar / Navigation

- Thêm mục **"Tổng quan buồng phòng"** ở đầu nhóm Housekeeping trong sidebar (trên "Phòng", "Kiểm tra phòng", "QC")
- Bottom nav mobile (max 5): nếu role = `department_manager` của buồng phòng → tab "Tổng quan" thay `/rooms`

---

## G. Phân pha thực thi

### **Pha 1 — Cockpit MVP (làm ngay trong loop này)**
**Deliverable**: route `/housekeeping` chạy được với Hàng 1 (KPI) + Hàng 2 (Cần xử lý ngay).
- Files: KpiRow, KpiTile, ActionRow, ActionBucket, 2 hook KPI + bucket, HousekeepingDashboardPage, sidebar item, route App.tsx
- Test: 6 KPI có số đúng; click → trang con filter đúng; 4 bucket hiển thị đúng phòng/task
- Version bump **1.1.47**

### **Pha 2 — Floor Map Mini + Staff Progress (lượt kế tiếp)**
- Hàng 3 FloorMapMini (read-only, click → `/rooms/:id`)
- Hàng 4 StaffProgressRow (per-staff bar) + realtime
- Wire bottom nav cho Department Manager
- Version **1.1.48**

### **Pha 3 — Polish + End-of-Day Report (lượt sau)**
- Mini widget "Báo cáo cuối ngày" (tổng phòng dọn, top nhân viên, lỗi phát sinh)
- Nút "Xuất CSV" (reuse `/reports/housekeeping`)
- Cảnh báo Linen tồn thấp (tích hợp `useLaundryDashboard`)
- Version **1.1.49**

**Pha 1 đủ tự đứng** — nếu duyệt thì tôi build Pha 1 ngay, các pha sau triển khai trong các lượt tiếp.

---

## H. Test cases (Pha 1)

1. KPI "Tổng phòng" = `count(rooms)` theo hotel
2. KPI "Đang ở" = `count` phòng status ∈ {occupied*, dnd, sleep_out}
3. KPI "C/O hôm nay" = `count(room_bookings WHERE check_out_date = today AND status = checked_in)`
4. KPI "Cần dọn" = `count(rooms WHERE status ∈ {vacant_dirty, cleaning})`
5. KPI "Bảo trì" = `count(rooms WHERE status ∈ {out_of_order, out_of_service, maintenance})`
6. KPI "Thiếu đồ" = `count(rooms WHERE missing_items > 0 AND NOT occupied)`
7. Bucket "Checkout chưa dọn" = phòng `status = vacant_dirty` AND có booking `checked_out` hôm nay
8. Bucket "Thiếu đồ" = top 5 phòng `missing_items DESC`
9. Bucket "QC không đạt" = tasks `status = rejected` 7 ngày gần nhất
10. Bucket "Task khẩn" = tasks `priority = urgent` AND status ∈ {todo, in_progress}
11. Click KPI → URL filter đúng, route render đúng tập con
12. All Hotels mode → KPI cộng dồn, banner yêu cầu chọn hotel cho bucket
13. Realtime: thay đổi room status → KPI cập nhật < 3s

---

## I. Rollout notes Pha 1

- Files NEW:
  - `src/pages/housekeeping/HousekeepingDashboardPage.tsx`
  - `src/components/housekeeping/dashboard/{KpiTile,KpiRow,ActionBucket,ActionRow}.tsx`
  - `src/hooks/useHousekeepingKpi.ts`
  - `src/hooks/useRoomsNeedingActionToday.ts`
- Files SỬA:
  - `src/App.tsx` (lazy route + permission)
  - `src/components/layout/Sidebar*.tsx` (item mới)
  - `src/i18n/locales/vi/rooms.json` (+ `housekeeping.json` mới nếu cần)
  - `src/lib/app-version.ts` → 1.1.47
  - `public/changelog.json`
- **Rollback**: revert files, không có schema change.
- **Không scope Pha 1**: floor map mini, staff progress, end-of-day report.

---

**Câu hỏi mở nhỏ** (không chặn plan):
- Route `/housekeeping` hay `/rooms/overview`? Tôi chọn `/housekeeping` cho rõ là cockpit Bộ phận, không phải subpage của `/rooms`.
- Đồng ý phân 3 pha và build Pha 1 ngay?
