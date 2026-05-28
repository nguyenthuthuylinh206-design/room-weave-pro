## Mục tiêu

Thay tab "Sơ đồ tầng" hiện tại (chỉ là ô vuông tĩnh) thành **Tape Chart** chuẩn PMS dành cho lễ tân: xem toàn bộ phòng × ngày trên 1 màn hình, biết ngay phòng nào đang có khách, ai đang ở, ai sắp đến, ai sắp đi, phòng nào trống có thể bán.

Giữ nguyên 2 tab "Lưới" và "Danh sách" (đang dùng chung cho HK / chủ ks / nhân viên).

## Phân tích codebase

**Reuse**
- `useFloorPlan` để lấy danh sách phòng theo tầng (đã có grouping).
- `useRooms` để lấy `RoomWithStats` (status, missing_items, laundry).
- Bảng `room_bookings` đã đầy đủ cột cần: `room_id`, `guest_name`, `guest_count`, `check_in_date`, `check_out_date`, `expected_check_in_time`, `expected_check_out_time`, `status`, `payment_status`, `actual_check_in`, `actual_check_out`, `booking_source`.
- `getRoomStatusMeta`, `ROOM_STATUS_V2_LIST` cho màu/nhãn trạng thái.
- `RoomFloorPlan.tsx` sẽ được thay nội dung (giữ tên file, không phá route).

**Refactor**
- `RoomFloorPlan.tsx` → biến thành `RoomTapeChart.tsx` mới; component cũ đổi tên `RoomFloorPlanLegacy.tsx` để giữ làm fallback nếu cần.
- Trong `RoomsPage` label tab "Sơ đồ tầng" đổi thành "**Tape chart**" (đổi key i18n `rooms.json` / `en/rooms.json`).

**Thêm mới**
- RPC `get_tape_chart(p_hotel_id uuid, p_start_date date, p_days int)` → trả jsonb gồm:
  - `rooms`: danh sách phòng (id, number, floor, type, base_price, status hiện tại, missing_items, items_in_laundry).
  - `bookings`: các booking giao với cửa sổ [start, start+days), mỗi booking gồm room_id, guest_name, guest_count, check_in_date, check_out_date, expected times, status, payment_status, source, actual_check_in/out, booking_group_id, total_amount, amount_paid.
  - Filter: `tenant_id = current tenant`, `hotel_id = p_hotel_id`, `status in ('confirmed','checked_in','checked_out')`, `check_in_date < window_end AND check_out_date > window_start`.
- Hook `useTapeChart(startDate, days)` → react-query, realtime invalidate khi `room_bookings`/`rooms` thay đổi.
- Component `RoomTapeChart`:
  - Sticky header: chọn ngày bắt đầu (input + nút "Hôm nay"), chọn cửa sổ (3 / 7 / 14 ngày — desktop 14, tablet 7, mobile 3).
  - Sticky cột trái: số phòng + loại + chấm trạng thái.
  - Lưới chính: mỗi cell = 1 ngày × 1 phòng, render bar booking phủ từ ngày check-in đến ngày check-out (rounded, màu theo `status` + `payment_status`).
  - Trên bar hiển thị `guest_name • {n} kh` khi đủ chỗ, tooltip có giờ vào/ra, nguồn (OTA/Walk-in), số nợ.
  - Click bar → mở Sheet booking detail (dùng `BookingDetailSheet` nếu có, hoặc navigate `/bookings/:id`).
  - Click cell trống → mở dialog "Tạo đặt phòng" với prefill room_id + check_in_date.
  - Cột "Hôm nay" highlight nền nhẹ.
  - Nhóm theo tầng, sticky sub-header "Tầng 1 (7 phòng)".
- Legend gọn: 4 nhãn (Đã xác nhận / Đang ở / Đã trả / Cần thu) + 1 nhãn "OOO/OOS" cho phòng không bán được.
- KPI row trên cùng: Occupancy hôm nay, Arrivals hôm nay, Departures hôm nay, Còn trống bán được.

## Mobile portrait (390px)

- Tape chart full timeline khó dùng dọc → mobile mặc định mở view "**Hôm nay & ngày mai**" (cửa sổ 2 ngày): mỗi phòng 1 dòng, 2 cột, bar booking compact.
- Swipe ngang để duyệt thêm ngày, swipe dọc để duyệt tầng.
- Tap bar → bottom sheet booking detail.

## Schema / migration

```sql
create or replace function public.get_tape_chart(
  p_hotel_id uuid,
  p_start_date date,
  p_days int default 14
) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tenant uuid := (select tenant_id from hotels where id = p_hotel_id);
  v_end date := p_start_date + p_days;
  v_rooms jsonb;
  v_bookings jsonb;
begin
  -- permission: caller phải là member của tenant
  if not exists (
    select 1 from user_tenants where user_id = auth.uid() and tenant_id = v_tenant
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'room_number', r.room_number, 'floor', r.floor,
    'room_type', r.room_type, 'status', r.status, 'base_price', r.base_price
  ) order by r.floor desc, r.room_number), '[]')
  into v_rooms
  from rooms r where r.hotel_id = p_hotel_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'room_id', b.room_id,
    'guest_name', b.guest_name, 'guest_count', b.guest_count,
    'check_in_date', b.check_in_date, 'check_out_date', b.check_out_date,
    'expected_check_in_time', b.expected_check_in_time,
    'expected_check_out_time', b.expected_check_out_time,
    'actual_check_in', b.actual_check_in, 'actual_check_out', b.actual_check_out,
    'status', b.status, 'payment_status', b.payment_status,
    'booking_source', b.booking_source, 'booking_group_id', b.booking_group_id,
    'total_amount', b.total_amount, 'amount_paid', b.amount_paid,
    'deposit_amount', b.deposit_amount
  )), '[]')
  into v_bookings
  from room_bookings b
  where b.hotel_id = p_hotel_id
    and b.status in ('confirmed','checked_in','checked_out')
    and b.check_in_date < v_end
    and b.check_out_date > p_start_date;

  return jsonb_build_object(
    'start_date', p_start_date, 'days', p_days,
    'rooms', v_rooms, 'bookings', v_bookings
  );
end $$;

grant execute on function public.get_tape_chart(uuid, date, int) to authenticated;
```

Không thay đổi bảng, không cần rollback dữ liệu, chỉ drop function khi cần.

## File sẽ tạo/sửa

**Thêm**
- `supabase/migrations/xxxx_get_tape_chart.sql`
- `src/hooks/useTapeChart.ts`
- `src/components/rooms/tape-chart/RoomTapeChart.tsx`
- `src/components/rooms/tape-chart/TapeChartHeader.tsx` (date picker + window selector + KPI)
- `src/components/rooms/tape-chart/TapeChartRow.tsx` (1 phòng × N ngày)
- `src/components/rooms/tape-chart/BookingBar.tsx` (bar booking, màu, tooltip)
- `src/components/rooms/tape-chart/TapeChartLegend.tsx`
- `src/components/rooms/tape-chart/MobileTapeChart.tsx` (2-day compact)

**Sửa**
- `src/pages/rooms/RoomsPage.tsx`: tab "Sơ đồ tầng" → render `RoomTapeChart` thay `RoomFloorPlan`. Đổi label tab thành "Tape chart".
- `src/i18n/locales/vi/rooms.json`, `en/rooms.json`: thêm khoá tape chart, đổi label tab.
- `src/lib/app-version.ts` → `1.0.80`, `public/changelog.json` thêm entry.

**Đổi tên**
- `src/components/rooms/RoomFloorPlan.tsx` → giữ nguyên file, không xoá, không gọi từ Page (dự phòng).

## Permission / role

- Tape chart yêu cầu `view_rooms` + `view_bookings`. Nếu user thiếu `view_bookings` → ẩn bar, chỉ hiện status phòng (như sơ đồ cũ).
- Click cell trống tạo booking yêu cầu `create_bookings`.

## Test cases

- RPC trả đúng dữ liệu khi: 0 booking, booking phủ toàn cửa sổ, booking đa đêm, booking 1 đêm, group booking cùng booking_group_id.
- Phòng OOO/OOS hiển thị nền xám diagonal, không cho click tạo booking.
- Realtime: tạo booking mới ở tab khác → tape chart tự refresh.
- Mobile 390px: render 2 ngày, swipe sang phải lên 4–5 ngày.
- Permission staff không có view_bookings: chỉ thấy trạng thái phòng, không thấy tên khách.
- Tenant isolation: user tenant A gọi với hotel_id tenant B → raise forbidden.

## Rollout

- Behind feature flag `settings.rooms.tape_chart_enabled` (default true). Nếu lỗi: tắt flag → fallback `RoomFloorPlan` cũ.
- Không breaking change; bảng cũ không bị xoá.

## Còn thiếu / giả định

- Giả định khách sạn có cột `floor` trên bảng `rooms` (đã có theo i18n key `floorPlan.floor`).
- Giả định `BookingDetailSheet` đã tồn tại; nếu không, sẽ navigate sang `/bookings/:id`.
- Chưa làm "drag to extend/move booking" (cần atomic RPC + conflict check) — đề xuất phase sau.
- Chưa làm "khoá phòng trong khoảng" (block) — phase sau, cần bảng `room_blocks`.
