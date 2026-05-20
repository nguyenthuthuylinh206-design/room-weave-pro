## Vấn đề đã xác định

Hiện hệ thống đang có 3 lớp trạng thái bị lệch nhau:

1. **Dữ liệu thật trong database** đang dùng bộ trạng thái mới kiểu:
   - `vacant_clean`, `vacant_dirty`, `occupied_clean`, ...
   - Hiện có: 77 phòng `vacant_clean`, 14 phòng `vacant_dirty`, 2 phòng `occupied_clean`.

2. **RPC check-in/check-out cũ** vẫn dùng bộ trạng thái cũ:
   - `perform_checkin` chỉ cho check-in khi phòng là `vacant`, `cleaning`, `check_out`, `reserved`.
   - Vì vậy phòng `vacant_clean` nhìn ngoài UI là “Trống – đã dọn” nhưng RPC lại báo không hợp lệ.
   - `perform_checkout` vẫn set phòng về `check_out`, trong khi luồng mới muốn `vacant_dirty`.

3. **Frontend còn nhiều nơi hardcode trạng thái cũ**:
   - Thống kê phòng đếm `vacant`, `occupied`, `cleaning` nên số liệu sai hoặc bằng 0.
   - Bộ lọc phòng còn filter theo status cũ nên không khớp dữ liệu thật.
   - Floor plan, mobile room page, bulk action, room select, booking check-in validation còn lẫn cũ/mới.

Kết luận: lỗi không phải do một phòng riêng lẻ, mà do **state machine phòng đang bị chia đôi** giữa legacy và v2.

```text
Hiện tại:
UI mới hiển thị vacant_clean
        ↓
perform_checkin cũ chỉ hiểu vacant
        ↓
Check-in bị chặn dù phòng đang sẵn sàng
```

## Mục tiêu triển khai

Đưa toàn bộ hệ thống về **một nguồn trạng thái phòng duy nhất**:

```text
vacant_clean       = Trống – đã dọn, cho phép check-in
vacant_inspected   = Trống – đã QC, cho phép check-in
vacant_dirty       = Trống – chưa dọn, không check-in thường
occupied_clean     = Đang ở – đã dọn
occupied_dirty     = Đang ở – cần dọn
dnd                = Không làm phiền
service_refused    = Khách từ chối dọn
sleep_out          = Khách ngủ ngoài
skipper            = Khách bỏ trốn
out_of_order       = Phòng hỏng
out_of_service     = Tạm ngừng
```

## Những gì reuse được

- `src/lib/roomStatus.ts`: đã có metadata/label/màu/normalize cho status mới.
- `RoomStatusBadge`, `RoomStatusSelector`: có nền tảng tốt, chỉ cần sửa lại dropdown/logic theo status canonical.
- `transition_room_status`: đã có validate transition + audit log + permission.
- `fn_is_valid_room_transition`, `fn_can_user_transition_room`: đã phần lớn hiểu status mới.
- `useRoomChecks`: nhiều đoạn đã gọi `safeTransitionRoomStatus` với `vacant_clean`, `vacant_dirty`, `occupied_clean`.

## Những gì cần refactor

- `perform_checkin`: sửa để hiểu status mới, set phòng sang `occupied_clean`, có tenant/booking/occupancy validation chặt hơn.
- `perform_checkout`: sửa để set phòng sang `vacant_dirty` thay vì `check_out`.
- `useBookingActions`, `BookingsPage`, `RoomBookingDialog`: bỏ validation hardcode legacy, dùng helper chung.
- `useRooms/useRoomStats`: đếm theo nhóm trạng thái mới thay vì legacy.
- `RoomFilters`, `MobileRoomsPage`, `RoomFloorPlan`, `RoomSelect`, bulk action: bỏ `vacant/occupied/cleaning/check_in/check_out/maintenance` khỏi UI vận hành chính.
- `roomFormSchema`: default/status enum phải theo trạng thái mới.

## Những gì cần thêm mới

- Helper frontend dùng chung:
  - `canRoomCheckIn(status)`
  - `isRoomOccupied(status)`
  - `isRoomBlockedForSale(status)`
  - `isRoomDirty(status)`
  - `getRoomStatusGroup(status)`
- Bộ filter theo nhóm dễ hiểu cho vận hành:
  - Tất cả
  - Sẵn sàng
  - Đang ở
  - Cần dọn
  - Không khả dụng
  - Đặc biệt
- Unit tests cho mapping/permission/check-in eligibility.
- Migration sửa RPC để backend là nguồn quyết định cuối cùng.

## Rủi ro migration

- Đây là thay đổi nghiệp vụ lõi, ảnh hưởng trực tiếp check-in/check-out.
- Cần staged rollout:
  1. Sửa RPC giữ backward compatibility với status cũ nếu còn dữ liệu cũ.
  2. Backfill dữ liệu legacy nếu phát hiện còn `vacant`, `occupied`, `cleaning`, `check_out`, `maintenance`.
  3. Frontend chỉ hiển thị trạng thái mới.
- Không đổi tên bảng/cột, không xóa dữ liệu lịch sử.
- Không update trực tiếp `rooms.status` từ client; mọi chuyển trạng thái vẫn qua RPC/audit.

---

# Kế hoạch triển khai

## A. Kiến trúc / logic nghiệp vụ

Chuẩn hóa flow phòng như sau:

```text
Tạo phòng
  → vacant_clean

Check-in booking
  vacant_clean / vacant_inspected / reserved
  → occupied_clean

Checkout booking
  occupied_clean / occupied_dirty / dnd / service_refused / sleep_out
  → vacant_dirty

Housekeeping dọn xong
  vacant_dirty
  → vacant_clean

QC pass
  vacant_clean
  → vacant_inspected

Bảo trì / khóa phòng
  any allowed status
  → out_of_service / out_of_order
  → vacant_clean / vacant_dirty khi mở lại
```

Nguyên tắc:
- Check-in thường chỉ cho `vacant_clean`, `vacant_inspected`, `reserved`.
- `vacant_dirty` không cho check-in thường; nếu cần override thì chỉ manager/owner dùng `force` có audit.
- Checkout luôn đưa phòng về `vacant_dirty` để housekeeping xử lý.
- UI chỉ hiển thị tiếng Việt, không còn `Check In/Check Out` như room status.

## B. Schema / migration

Thêm migration sửa function, không tạo bảng mới:

1. Cập nhật `perform_checkin`:
   - Lock room row.
   - Validate tenant/booking cùng phòng.
   - Chặn nếu có booking khác đang `checked_in`.
   - Cho phép từ `vacant_clean`, `vacant_inspected`, `reserved`.
   - Có thể tạm chấp nhận legacy `vacant` để compatibility.
   - Update booking `checked_in`.
   - Update room `occupied_clean`.
   - Ghi audit hoặc gọi helper transition nếu phù hợp.

2. Cập nhật `perform_checkout`:
   - Update booking `checked_out` như hiện tại.
   - Update room `vacant_dirty` thay vì `check_out`.
   - Ghi audit trạng thái phòng.

3. Backfill dữ liệu legacy nếu còn:
   - `vacant` → `vacant_clean`
   - `occupied` → `occupied_clean`
   - `cleaning`, `check_out` → `vacant_dirty`
   - `maintenance` → `out_of_service`

4. Đảm bảo `rooms.status` vẫn chỉ được ghi qua RPC/SECURITY DEFINER, không mở quyền update trực tiếp.

## C. API / RPC / server actions

- Sửa RPC:
  - `perform_checkin`
  - `perform_checkout`
  - nếu cần: thêm helper `public.fn_normalize_room_status(_status text)` ở database để RPC cùng hiểu alias.

- Kiểm tra lại:
  - `transition_room_status`
  - `fn_is_valid_room_transition`
  - `fn_can_user_transition_room`
  - `get_rooms_filtered`
  - `get_floor_plan`

- Chuẩn hóa error code tiếng Việt:
  - `ROOM_NOT_READY_FOR_CHECKIN`
  - `ROOM_DIRTY_NEEDS_CLEANING`
  - `ROOM_OCCUPIED`
  - `ROOM_BLOCKED_FOR_MAINTENANCE`
  - `BOOKING_NOT_VALID`

## D. UI screens / components

Sửa các nơi đang hardcode status cũ:

- `src/lib/roomStatus.ts`
  - Thêm helper eligibility/group.
  - Dùng làm nguồn duy nhất cho label/status.

- `src/types/rooms.types.ts`
  - Giữ legacy alias nếu cần tương thích, nhưng UI chính dùng `RoomStatusV2`.

- `src/hooks/useRooms.ts`
  - `useRoomStats` đếm theo nhóm mới.
  - `useMarkRoomReady` sửa gọi `transition_task_status` đúng signature `_reason` thay vì `_note` nếu đang lỗi.

- `src/hooks/useBookingActions.ts`
  - Cập nhật error mapping.
  - Sau check-in invalidate đủ `rooms`, `room-stats`, `floor-plan`, `booking-detail`, `today-checkins`.

- `src/pages/bookings/BookingsPage.tsx`
  - Bỏ validation cũ `occupied/maintenance/out_of_order`.
  - Dùng `canRoomCheckIn` để cảnh báo trước; RPC vẫn là nguồn quyết định cuối.

- `src/components/rooms/RoomBookingDialog.tsx`
  - Đồng bộ logic check-in như BookingsPage.

- `src/components/rooms/RoomFilters.tsx`
  - Filter theo status mới hoặc group mới.

- `src/components/rooms/MobileRoomsPage.tsx`
  - Thống kê/filter/status chips theo status mới.

- `src/components/rooms/RoomFloorPlan.tsx`
  - Dùng `getRoomStatusMeta`, không hardcode legacy icon/config.

- `src/components/shared/RoomSelect.tsx`
  - Dùng `RoomStatusBadge` thay vì tự map legacy.

- `src/components/rooms/RoomBulkActionsBar.tsx`
- `src/components/rooms/MobileRoomBulkActionsBar.tsx`
  - Chỉ cho bulk chuyển sang status mới.
  - Không còn `check_in/check_out` như trạng thái phòng.

- `src/lib/validations/rooms.schemas.ts`
  - Schema tạo/sửa phòng default `vacant_clean`.

- `src/i18n/locales/vi/rooms.json`
  - Thêm label status mới.
  - Giữ label cũ chỉ cho fallback, không dùng trong UI chính.

## E. Permission / role rules

- Staff lễ tân:
  - Check-in: `vacant_clean/vacant_inspected/reserved → occupied_clean`.
  - Checkout: `occupied_* / dnd / service_refused / sleep_out → vacant_dirty`.

- Housekeeping staff:
  - `vacant_dirty → vacant_clean`.
  - `occupied_dirty → occupied_clean`.
  - Đánh dấu `dnd`, `service_refused` khi phù hợp.

- Manager/Owner:
  - Được chuyển `out_of_service`, `out_of_order`.
  - Được QC `vacant_clean → vacant_inspected`.
  - Được override với `_force = true` nếu thật sự cần, có audit.

## F. Test cases

Thêm/sửa test cho logic quan trọng:

1. Unit test frontend:
   - `canRoomCheckIn('vacant_clean') = true`
   - `canRoomCheckIn('vacant_inspected') = true`
   - `canRoomCheckIn('vacant_dirty') = false`
   - `isRoomOccupied('occupied_clean'/'occupied_dirty'/'dnd') = true`
   - Legacy alias normalize đúng.

2. RPC smoke tests:
   - Check-in phòng `vacant_clean` thành công → room `occupied_clean`, booking `checked_in`.
   - Check-in phòng `vacant_dirty` bị chặn với lỗi dễ hiểu.
   - Checkout booking `checked_in` thành công → room `vacant_dirty`.
   - Có booking khác đang ở thì check-in bị chặn.

3. UI regression:
   - Room stats đếm đúng 77 sẵn sàng / 14 cần dọn / 2 đang ở theo dữ liệu hiện tại.
   - Filter “Sẵn sàng” hiển thị `vacant_clean` + `vacant_inspected`.
   - Nút check-in trên `/bookings` không còn báo `vacant_clean` không hợp lệ.

## G. Rollout notes

- Bước 1: Migration sửa RPC + compatibility alias.
- Bước 2: Refactor helper frontend và các màn chính.
- Bước 3: Backfill status legacy nếu có.
- Bước 4: QA trực tiếp các flow:
  - Tạo booking → check-in.
  - Checkout → phòng sang “Trống – chưa dọn”.
  - Housekeeping hoàn tất → phòng sang “Trống – đã dọn”.
  - Floor plan/mobile stats/filter đồng bộ.
- Bước 5: Bump version/changelog theo quy ước release.

## Rollback plan

Nếu có lỗi sau triển khai:
- Rollback function `perform_checkin`/`perform_checkout` về bản cũ từ migration trước.
- Frontend vẫn có legacy normalize nên không trắng màn.
- Không mất dữ liệu booking/room vì không đổi schema lớn.
- Nếu cần, có thể map tạm:
  - `occupied_clean` → `occupied`
  - `vacant_dirty` → `cleaning`
  - `vacant_clean` → `vacant`

## File dự kiến sửa

- `src/lib/roomStatus.ts`
- `src/types/rooms.types.ts`
- `src/hooks/useRooms.ts`
- `src/hooks/useBookingActions.ts`
- `src/hooks/useAvailableRooms.ts`
- `src/pages/bookings/BookingsPage.tsx`
- `src/components/rooms/RoomBookingDialog.tsx`
- `src/components/rooms/RoomFilters.tsx`
- `src/components/rooms/MobileRoomsPage.tsx`
- `src/components/rooms/RoomFloorPlan.tsx`
- `src/components/shared/RoomSelect.tsx`
- `src/components/rooms/RoomBulkActionsBar.tsx`
- `src/components/rooms/MobileRoomBulkActionsBar.tsx`
- `src/lib/validations/rooms.schemas.ts`
- `src/i18n/locales/vi/rooms.json`
- `src/lib/app-version.ts`
- `public/changelog.json`

## Migration dự kiến thêm

- Migration cập nhật:
  - `perform_checkin`
  - `perform_checkout`
  - optional `fn_normalize_room_status`
  - optional backfill status legacy nếu còn dữ liệu cũ

## Test dự kiến viết

- Test helper status trong `src/lib/roomStatus.test.ts`.
- Test RPC hoặc SQL smoke test cho check-in/check-out nếu harness hiện tại cho phép.

## Phần còn thiếu / cần kiểm tra trong lúc triển khai

- Kiểm tra chính xác các constraint/quyền column-level hiện tại của `rooms.status` trước khi viết migration.
- Kiểm tra có trigger audit riêng cho `rooms` hay chỉ dùng `audit_log` hiện tại.
- Kiểm tra các màn dashboard/report khác ngoài `/rooms` và `/bookings` có đang đếm status cũ không.
- Sau khi sửa cần test thực tế trên preview với một booking/phòng cụ thể.