## Mục tiêu

1. **Hiển thị context booking trên card phòng `occupied`** — giờ checkout + tên khách, để HK Manager biết ưu tiên phòng nào sắp trả.
2. **Mặc định collapse section "Bình thường"** — giảm clutter, đẩy "Khẩn"/"Theo dõi" lên đầu màn hình.

---

## A. Logic / Kiến trúc

### A1. Booking context
- Tạo hook mới `useActiveRoomBookings(hotelId)` query `room_bookings` lấy các booking đang `checked_in` (status `in_house`/`checked_in`) cho hotel đang chọn, trả về `Map<room_id, { guest_name, expected_check_out_time, check_out_date, guest_count }>`.
- Cache 30s, realtime subscribe `room_bookings` để invalidate khi check-in/checkout.
- Truyền map xuống `RoomGrid` qua hook (gọi trực tiếp trong `RoomGrid` để tránh prop drilling).
- Với phòng có trạng thái thuộc nhóm "occupied" (`occupied`, `occupied_clean`, `occupied_dirty`, `dnd`, `sleep_out`, `service_refused`), dòng "Việc cần làm" (Line 3) **thay** bằng:
  - `Trả 12:00 · Nguyễn Văn A` (font medium, text-foreground)
  - Nếu cách giờ checkout ≤ 2h: thêm icon đồng hồ + text-orange-600 "Sắp trả phòng"
  - Nếu đã quá giờ checkout: text-red-600 "Quá giờ trả X phút"

### A2. Collapse "Bình thường"
- Thêm `useState<boolean>` `normalCollapsed`, default `true`.
- Persist trạng thái collapse vào `localStorage` (`rooms.grid.normalCollapsed:<hotelId>`) để Manager mở/đóng theo thói quen.
- Khi `collapsed=true`: chỉ render header section với badge count + nút "Mở rộng" (chevron). Không render grid card.
- Khi `expanded`: render đầy đủ như hiện tại + nút "Thu gọn".
- Section header click toàn bộ để toggle (tăng tap target).

## B. Schema / migration

- **Không cần migration**. `room_bookings` đã có sẵn `expected_check_out_time`, `check_out_date`, `guest_name`, `status`.
- Query: `status IN ('in_house','checked_in')` và `room_id IN (...)` lọc theo `hotel_id` + `tenant_id`.

## C. API / RPC

- Không thêm RPC. Dùng PostgREST select trực tiếp.
- Index hiện có trên `room_bookings(room_id, status)` đủ cho query này (verify trong rollout).

## D. UI changes

### D1. `src/hooks/useActiveRoomBookings.ts` (NEW)
```ts
export function useActiveRoomBookings(hotelId?: string | null): UseQueryResult<Map<string, ActiveBooking>>
```
- Filter `tenant_id` + `hotel_id` + `status IN ('in_house','checked_in')`.
- Realtime channel subscribe `room_bookings` (filter theo hotel).

### D2. `src/components/rooms/RoomGrid.tsx`
- Gọi `useActiveRoomBookings(selectedHotel?.id)`.
- Hàm `isOccupiedStatus(status)` để xác định nhóm phòng có khách.
- Trong `renderCard`, khi phòng `occupied` và có booking → render line booking thay block missing/laundry/last-check (giữ pendingCount/laundry vì vẫn hữu ích).
- Thêm logic countdown: dùng `expected_check_out_time` + `check_out_date` → tính phút còn lại / phút quá hạn (recompute mỗi phút qua `setInterval` ở component cha hoặc dựa vào re-render tự nhiên).
- Section "Bình thường": tách `renderSection` thành component nội bộ `<CollapsibleSection>` nhận `collapsibleKey`, hoặc inline logic. Header thành `<button>` toàn-width có chevron, click toggle.

### D3. i18n (`vi/rooms.json`) — thêm:
- `grid.checkoutAt`: "Trả {{time}}"
- `grid.checkoutSoon`: "Sắp trả phòng"
- `grid.checkoutOverdue`: "Quá giờ trả {{minutes}} phút"
- `grid.expandSection`: "Mở rộng"
- `grid.collapseSection`: "Thu gọn"

### D4. Realtime invalidate
- Khi `room_bookings` thay đổi → `queryClient.invalidateQueries({ queryKey: ['active-room-bookings', hotelId] })`.

## E. Permission / role

- Mọi role thấy Grid (Owner/Manager/HK Manager) đều thấy booking context — không có vấn đề bảo mật (tên khách + giờ trả đã hiển thị trong các module khác).
- Persist `normalCollapsed` theo `hotelId`, không theo user (preference theo workflow KS, không cá nhân).

## F. Test cases

1. Phòng `occupied_clean` có booking → card hiện `Trả 12:00 · Nguyễn Văn A`, ẩn block missing/last-check.
2. Phòng `occupied` không có booking active (data lệch) → fallback hiện "Đang có khách" + dòng `last_check`.
3. Hiện 11:00, checkout 12:00 → hiện "Sắp trả phòng" màu orange.
4. Hiện 13:00, checkout 12:00 → hiện "Quá giờ trả 60 phút" màu đỏ + đẩy phòng lên section "Khẩn" (cập nhật `calcRoomPriority`).
5. Section "Bình thường" mặc định collapsed lần đầu vào trang.
6. Click header section → expand, render cards. Reload trang → trạng thái vẫn collapsed/expanded như lần cuối.
7. Đổi hotel → preference collapsed reset theo hotel mới.
8. Check-in/checkout realtime → card update tự động trong < 2 giây.

## G. Rollout notes

- **Version bump**: `1.1.46` + `app-version.ts` + entry `public/changelog.json`.
- Files dự kiến:
  - **NEW** `src/hooks/useActiveRoomBookings.ts`
  - `src/components/rooms/RoomGrid.tsx` (gắn hook + line booking + collapsible section)
  - `src/lib/roomPriority.ts` (thêm scoring: quá giờ trả → urgent, sắp trả ≤30min → warning)
  - `src/i18n/locales/vi/rooms.json`
  - `src/lib/app-version.ts`, `public/changelog.json`
- **Rollback**: revert files trên, preference collapse nằm `localStorage` không ảnh hưởng dữ liệu.
- **Không scope**: chưa áp lên Mobile Rooms Page (sẽ làm phase sau cùng `MobileRoomsPage`).
