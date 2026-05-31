## Mục tiêu
Cập nhật toàn bộ flow **Đặt phòng** để không còn lấy `rooms.base_price/hourly_price/monthly_price` làm giá cũ. Logic mới chỉ còn 3 loại:

| Loại đặt | Giá dùng trong booking | Quy tắc |
|---|---|---|
| Giá đêm | `room_type_rates.daily_rate` + seasonal/daily override theo ngày đặt | Linh hoạt |
| Giá giờ | `room_type_rates.hourly_rate` + block giờ đầu nếu có | Cố định |
| Giá tháng | `room_type_rates.monthly_rate` | Cố định |

Nếu loại phòng chưa có `room_type_rates`: hiển thị `—` và nút **Cấu hình giá**, không fallback sang giá cũ.

## Những gì reuse
- Reuse `useAvailableRooms` làm nguồn danh sách phòng trống.
- Reuse `calculate_booking_price` RPC để tính giá chính xác theo khoảng ngày/giờ khi chọn phòng.
- Reuse `resolve_daily_prices_bulk` cho giá đêm theo từng ngày, để daily booking nhiều đêm không chỉ lấy “giá hôm nay”.
- Reuse `priceBreakdown` đang lưu vào `room_bookings.price_breakdown`.
- Reuse UI wizard hiện tại: `RoomSelectionStep`, `PaymentStep`, `ReviewStep`.

## Cần refactor
1. `useAvailableRooms.ts`
   - Bỏ đọc `base_price`, `hourly_price`, `monthly_price` từ `rooms` cho booking.
   - Join/resolve sang `room_types` và `room_type_rates` theo `tenant_id + hotel_id + room_type`.
   - Thêm field giá mới vào `AvailableRoom`: `room_type_id`, `nightly_price`, `hourly_rate`, `hourly_first_block_*`, `monthly_rate`, `pricing_configured`.

2. `useBookingForm.ts`
   - `toggleRoomSelection` không tự tính từ giá cũ nữa.
   - Khi chọn phòng, tự gọi pricing resolver/RPC để set `customPrice` đúng theo booking type.
   - Daily booking: tính theo `calculate_booking_price` hoặc resolved daily range; lưu `customPrice` là đơn giá trung bình/đêm và `priceBreakdown` là tổng đúng.
   - Hourly booking: dùng fixed hourly/block từ `room_type_rates`, không chia `base_price / 4`.
   - Monthly booking: dùng fixed monthly, không nhân `base_price * 25`.
   - Validation step 2 chỉ hợp lệ khi phòng đã cấu hình giá và `customPrice > 0`.

3. `RoomSelectionStep.tsx`
   - Grid phòng hiển thị giá mới theo loại đặt:
     - Giá đêm: giá đêm đã resolve cho ngày check-in/period.
     - Giá giờ: giá cố định theo giờ hoặc block đầu.
     - Giá tháng: giá cố định theo tháng.
   - Nếu chưa cấu hình: hiển thị `—` + nút/link **Cấu hình giá**.
   - Khi chọn phòng đang thiếu giá: không cho chọn hoặc toast yêu cầu cấu hình giá.
   - Nút “Áp dụng giá theo bảng” có thể giữ lại như refresh/recalculate, nhưng không còn là bước bắt buộc để sửa giá cũ.

4. `PaymentStep.tsx` và `ReviewStep.tsx`
   - Hiển thị breakdown đúng nguồn giá mới.
   - Đổi nhãn “Theo ngày” thành “Theo đêm” cho thống nhất nghiệp vụ.
   - Không để người dùng hiểu giá phòng đang lấy từ trường legacy.

## Schema / migration
Thêm migration patch RPC `calculate_booking_price`:
- Seasonal/daily override chỉ áp cho `p_booking_type = 'daily'`.
- `hourly` và `monthly` chỉ đọc fixed rate, không áp seasonal.
- Daily tính theo từng ngày trong khoảng đặt để nhận override/seasonal từng ngày, thay vì nhân giá ngày check-in cho toàn bộ booking.
- Giữ `overnight_rate` trong DB để tương thích schema cũ nhưng không expose ở UI.
- Không tạo bảng mới.
- Không đụng `rooms.status` hoặc các cột FSM.

## API / RPC
- Patch `calculate_booking_price` để trả về JSON breakdown rõ hơn:
  - `base`
  - `units`
  - `booking_type`
  - `daily_lines` cho đặt theo đêm nếu nhiều ngày
  - `subtotal`
  - `total`
  - `early_checkin_charge`
  - `late_checkout_charge`
- Frontend gọi RPC này ngay khi chọn phòng và khi bấm “Áp dụng giá theo bảng”.

## UI screens / components
- `RoomSelectionStep`: giá mới, fallback `—`, nút **Cấu hình giá**.
- `PaymentStep`: tổng tiền và danh sách giá phòng theo giá mới.
- `ReviewStep`: xác nhận giá theo “đêm/giờ/tháng”.

## Permission / role rules
- Không thêm quyền mới.
- Nút **Cấu hình giá** trỏ về `/settings/pricing?tab=default`; người không có quyền settings vẫn bị route/permission hiện tại chặn.

## Test cases
Sẽ thêm/cập nhật test logic ở `src/lib/pricing.test.ts` hoặc test helper mới nếu phù hợp:
1. Daily 1 đêm lấy giá theo `room_type_rates.daily_rate`.
2. Daily nhiều đêm cộng theo từng ngày, ngày có override/seasonal dùng giá linh hoạt.
3. Hourly dùng `hourly_rate`/first block, không fallback từ `base_price`.
4. Monthly dùng `monthly_rate`, không fallback từ `base_price`.
5. Missing `room_type_rates` làm booking không hợp lệ và UI hiển thị `—`.

## Rollout notes
- Đây là compatibility rollout: schema cũ vẫn tồn tại, nhưng booking mới không dùng giá cũ nữa.
- Các phòng/loại phòng chưa có `room_type_rates` sẽ cần vào **Cấu hình giá** trước khi đặt.
- Sau khi implement sẽ bump version/changelog theo quy ước release.

## Rollback checklist
- Revert migration patch `calculate_booking_price` về version trước.
- Revert các file booking wizard và `useAvailableRooms`.
- Giữ nguyên dữ liệu `room_type_rates`, không cần rollback data.