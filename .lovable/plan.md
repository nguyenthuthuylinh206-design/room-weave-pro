## Vấn đề
Trong `RescheduleCheckinDialog`, nhân viên không biết phòng đó còn trống ngày nào — chỉ chọn ngày mới rồi submit, nếu trùng booking khác mới bị RPC `reschedule_booking_checkin` báo `BOOKING_CONFLICT`. Trải nghiệm phải đoán mò.

## Giải pháp
Thêm dải lịch trực quan + validate inline ngay trong dialog: tải tất cả booking của đúng `room_id` trong cửa sổ 60 ngày tới (loại trừ chính booking đang dời), highlight ngày bận, chặn submit nếu khoảng chọn chồng lịch, và gợi ý khoảng trống gần nhất đủ số đêm.

## Phạm vi

### A. Logic
- Khoảng overlap: `existing.check_in_date < new.check_out_date AND existing.check_out_date > new.check_in_date`, chỉ tính status `confirmed | checked_in`, **loại** chính `bookingId` đang dời.
- Cửa sổ mặc định: hôm nay → +60 ngày (đủ dùng cho thao tác dời lịch tay).

### B. Schema / Migration
Không cần. Dùng query `room_bookings` hiện có (đã có index `room_id`, `check_in_date`).

### C. Hook mới
`src/hooks/useRoomAvailabilityWindow.ts`
- Input: `{ roomId, fromDate, toDate, excludeBookingId? }`
- Query key: `['room-availability', roomId, fromDate, toDate, excludeBookingId]`
- Trả về: `{ bookedRanges: Array<{ checkIn: string; checkOut: string; bookingId: string }>, isDateBooked(date), isRangeFree(in,out), findNextFreeWindow(nights) }`
- Filter `tenant_id` bắt buộc + realtime subscribe `room_bookings` cho `room_id` này → `invalidateQueries`.

### D. UI (`RescheduleCheckinDialog.tsx`)
Thêm 3 khối, không đổi flow submit:
1. **Dải lịch 30 ngày kế tiếp** dạng grid 7 cột (giống mini-calendar):
   - Ô trống: nền `bg-muted`, chữ `text-foreground`.
   - Ô bận: nền `bg-red-50`, chữ `text-red-600`, hover tooltip "Đã đặt".
   - Ô nằm trong khoảng đang chọn (`newIn` → `newOut - 1`): viền `ring-2 ring-primary`.
   - Click ô trống = set `newIn` = ngày đó (giữ logic auto-tính `newOut` theo số đêm).
   - Có nút "Xem 30 ngày tiếp" để mở rộng cửa sổ.
2. **Inline conflict banner**: nếu `isRangeFree(newIn, newOut) === false` → text đỏ "Khoảng này trùng lịch khác, vui lòng chọn ngày trống.", disable nút Xác nhận.
3. **Gợi ý**: nếu trùng, hiện chip "Khoảng trống gần nhất: dd/MM → dd/MM" (click = set luôn).

### E. Permission
Không đổi. Chỉ dùng `view_bookings` (đã có khi mở dialog này).

### F. Test cases
- Phòng hoàn toàn trống → toàn bộ ô xám, mọi range hợp lệ.
- Phòng có booking 10–12/02 → ô 10, 11 đỏ; chọn 10/02 1 đêm → banner đỏ + disable.
- Booking đang dời chính nó nằm 04–05/02 → 04/02 KHÔNG hiển thị đỏ (đã loại trừ).
- Click "Khoảng trống gần nhất" với 1 đêm khi 10–12/02 bận → set 09/02 hoặc 12/02 tuỳ vị trí hiện tại.
- Realtime: booking khác tạo mới ở phòng này trong lúc dialog mở → ô tự chuyển đỏ.

### G. Rollout
- Không breaking, không cần feature flag.
- Bump `APP_VERSION` 1.0.25 → **1.0.26**, thêm entry `public/changelog.json`: "Lịch phòng trống ngay trong dialog dời ngày check-in".
- Memory: thêm `mem://features/bookings/reschedule-availability-picker-v1` mô tả pattern này (sẽ tái dùng cho dialog đổi phòng tương lai).

## File dự kiến
- **Tạo**: `src/hooks/useRoomAvailabilityWindow.ts`, `src/components/bookings/RoomAvailabilityStrip.tsx`, `.lovable/memory/features/bookings/reschedule-availability-picker-v1.md`
- **Sửa**: `src/components/bookings/RescheduleCheckinDialog.tsx`, `src/lib/app-version.ts`, `public/changelog.json`, `mem://index.md`

## Phần CHƯA làm trong vòng này
- Đổi sang **phòng khác** ngay trong dialog dời lịch (cần thêm hook `useAvailableRoomsForRange` + xử lý đổi `room_id` trong RPC). Tách thành 1.0.27.
- Picker dạng full month calendar (tháng/năm điều hướng) — bản này chỉ strip 30-60 ngày.

Bạn duyệt thì triển khai luôn?
