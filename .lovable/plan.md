## Vấn đề

Hệ thống hiện có:
- Status `no_show` trong enum + RPC `transition_booking_status` cho transition `confirmed → no_show`
- Filter "Quá hạn checkout" cho khách đang ở quá ngày trả phòng
- Hook `useBookingFlagTransition` hỗ trợ flag `no_show`

Nhưng **thiếu hoàn toàn** xử lý khách **quá giờ check-in chưa đến** (booking `confirmed`, đã qua `check_in_date` hoặc qua `expected_check_in_time` của hôm nay mà chưa `checked_in`):
- Không có filter / tab "Quá giờ check-in" trên trang Bookings
- Không có cảnh báo visual trên dòng booking
- Không có nút thao tác nhanh (Liên hệ khách / Đánh dấu No-Show / Hủy / Dời ngày)
- Không có cron tự động đánh dấu `no_show` sau ngưỡng cấu hình
- Không có thông báo cho lễ tân khi đến ngưỡng

## A. Logic nghiệp vụ

**Định nghĩa "Quá giờ check-in" (overdue check-in):**
- `status = 'confirmed'`
- VÀ một trong các điều kiện:
  - `check_in_date < today` (đã qua ngày, chưa đến)
  - HOẶC `check_in_date = today` AND `expected_check_in_time IS NOT NULL` AND `now() > check_in_date + expected_check_in_time + grace_minutes`
- Phân loại mức độ:
  - **Cảnh báo** (amber): quá `grace_minutes` (mặc định 60p) nhưng <  `auto_no_show_hours` (mặc định 24h)
  - **Nghiêm trọng** (red): quá `auto_no_show_hours` → cron tự động đánh `no_show`

**Cấu hình per-hotel** (`hotels.settings.bookings.no_show`):
```json
{
  "grace_minutes": 60,
  "auto_no_show_hours": 24,
  "auto_mark_enabled": false,
  "notify_reception": true
}
```
Mặc định `auto_mark_enabled = false` để khách sạn opt-in (tránh phá data của tenant cũ).

**Thao tác lễ tân khi quá giờ:**
1. Liên hệ khách (nút gọi/SMS — nếu có `guest_phone`)
2. Dời ngày check-in (mở dialog đổi `check_in_date` + giữ phòng)
3. Đánh dấu No-Show (gọi `transition_booking_status` → `no_show`, giải phóng phòng, giữ deposit theo policy)
4. Hủy booking (transition → `cancelled`, hoàn deposit theo policy)

## B. Schema / migration

**Migration 1.0.25**:

1. Thêm view `v_overdue_checkins` (read-only) tính realtime danh sách booking quá giờ — đỡ phải compute ở client mọi nơi:
   ```sql
   CREATE OR REPLACE VIEW public.v_overdue_checkins AS
   SELECT b.*,
          EXTRACT(EPOCH FROM (now() - (b.check_in_date::timestamptz + COALESCE(b.expected_check_in_time, '14:00')::time)))/3600 AS hours_overdue
   FROM room_bookings b
   WHERE b.status = 'confirmed'
     AND (
       b.check_in_date < current_date
       OR (b.check_in_date = current_date
           AND b.expected_check_in_time IS NOT NULL
           AND now() > (b.check_in_date + b.expected_check_in_time)::timestamptz)
     );
   ```
   RLS: view kế thừa RLS từ `room_bookings` (security_invoker).

2. RPC `mark_booking_no_show(_booking_id, _reason, _refund_deposit)`:
   - Validate booking ở trạng thái `confirmed` và thực sự overdue
   - Gọi `transition_booking_status(_booking_id, 'no_show', _reason)`
   - Nếu `_refund_deposit = false` → giữ `deposit_amount` làm phí no-show, ghi `booking_payments` type `no_show_fee`
   - Audit log

3. RPC `reschedule_booking_checkin(_booking_id, _new_check_in_date, _new_check_out_date, _reason)`:
   - Validate không conflict với booking khác trên cùng phòng
   - Update dates + audit log
   - Giữ nguyên status `confirmed`

4. Cron `auto-mark-no-show` (Edge Function chạy mỗi 30 phút):
   - Quét `v_overdue_checkins` với `hours_overdue > hotel.settings.bookings.no_show.auto_no_show_hours`
   - Chỉ chạy với hotel có `auto_mark_enabled = true`
   - Gọi `mark_booking_no_show` cho từng booking
   - Log vào `audit_log` và gửi notification cho reception nếu `notify_reception = true`

## C. Hooks / RPC client

- `useOverdueCheckins(hotelId)` — query view, realtime subscribe `room_bookings`
- `useOverdueCheckinsCount()` — badge số cho tab
- `useMarkBookingNoShow()` — mutation gọi RPC `mark_booking_no_show`
- `useRescheduleBookingCheckin()` — mutation gọi RPC `reschedule_booking_checkin`

## D. UI

**Trang `/bookings`** (desktop + mobile):
1. Thêm option `overdue_checkin` vào dropdown Status filter ("Quá giờ check-in") với badge đếm số
2. Khi filter active: highlight dòng booking bằng `border-l-2 border-amber-500` / `border-red-500` theo mức độ
3. Cột "Trạng thái": hiển thị chip "Quá X giờ" cạnh "Đã đặt" (text-amber-600 / text-red-600, không dùng background)
4. Cột "Thao tác": thay vì nút "Check-in", hiển thị dropdown menu:
   - Check-in (vẫn cho phép nếu khách đến muộn)
   - Liên hệ khách (mở tel: / sms:)
   - Dời ngày check-in → mở `RescheduleCheckinDialog`
   - Đánh dấu No-Show → mở `MarkNoShowDialog`

**`MarkNoShowDialog`**:
- Hiển thị thông tin booking + deposit
- Radio: "Giữ deposit làm phí no-show" / "Hoàn deposit"
- Textarea lý do (required)
- Nút "Xác nhận No-Show" (variant destructive)

**`RescheduleCheckinDialog`**:
- DatePicker check-in mới + check-out mới (giữ số đêm)
- Real-time check conflict
- Textarea lý do

**Trang `/settings/bookings`** (hoặc tab trong Hotel Settings):
- Card "Quá giờ check-in":
  - Slider `grace_minutes` (0–240)
  - Slider `auto_no_show_hours` (6–72)
  - Toggle `auto_mark_enabled`
  - Toggle `notify_reception`

**Dashboard widget** (Reception + Owner):
- KPI card "Khách quá giờ check-in: X" với link → `/bookings?filter=overdue_checkin`

## E. Permission

- View overdue: bất kỳ user có `view_bookings`
- `mark_booking_no_show`: cần `manage_bookings`
- `reschedule_booking_checkin`: cần `manage_bookings`
- Settings: chỉ `tenant_owner` + `manager`

## F. Test

`supabase/tests/overdue_checkin.sql`:
1. Booking `confirmed`, `check_in_date = yesterday` → có trong view, `hours_overdue > 24`
2. Booking `confirmed`, hôm nay, `expected_check_in_time = '14:00'`, giờ test = 15:30 → có trong view, `hours_overdue ≈ 1.5`
3. Booking đã `checked_in` → KHÔNG có trong view
4. `mark_booking_no_show` với `_refund_deposit = false` → tạo `booking_payments` type `no_show_fee`, status → `no_show`
5. `mark_booking_no_show` cho booking chưa overdue → raise `NOT_OVERDUE`
6. `reschedule_booking_checkin` với date conflict → raise `BOOKING_CONFLICT`
7. Cross-tenant call → raise `PERMISSION_DENIED`

Unit test FE (`useOverdueCheckins.test.ts`): mock view data + assert count.

## G. Rollout

1. Migration 1.0.25 deploy (view + 2 RPC + cron)
2. Default `auto_mark_enabled = false` cho mọi hotel hiện có
3. FE deploy: filter + dialogs + settings + dashboard widget
4. Bump `APP_VERSION`, changelog "1.0.25 – Xử lý khách quá giờ check-in (No-Show)"
5. Thêm memory `mem://features/bookings/no-show-handling-v1`
6. Document tại `docs/architecture/03-flows/booking-lifecycle.md` (cập nhật mục No-Show)
7. **Rollback**: drop view + 2 RPC + disable cron; FE filter ẩn qua feature flag

## Files dự kiến tạo/sửa

**Tạo:**
- `supabase/migrations/2026xxxx_no_show_handling.sql`
- `supabase/functions/auto-mark-no-show/index.ts`
- `src/hooks/useOverdueCheckins.ts`
- `src/hooks/useMarkBookingNoShow.ts`
- `src/hooks/useRescheduleBookingCheckin.ts`
- `src/components/bookings/MarkNoShowDialog.tsx`
- `src/components/bookings/RescheduleCheckinDialog.tsx`
- `src/components/bookings/OverdueCheckinBadge.tsx`
- `src/components/settings/NoShowSettingsCard.tsx`
- `supabase/tests/overdue_checkin.sql`
- `.lovable/memory/features/bookings/no-show-handling-v1.md`

**Sửa:**
- `src/pages/bookings/BookingsPage.tsx` (filter + actions menu)
- `src/pages/bookings/MobileBookingsPage.tsx` (filter + actions)
- `src/pages/Dashboard.tsx` / `HousekeepingStaffDashboard.tsx` (widget)
- `src/pages/settings/BusinessConfigurationPage.tsx` (cấu hình)
- `src/lib/app-version.ts`, `public/changelog.json`, `.lovable/memory/index.md`
- `docs/architecture/03-flows/booking-lifecycle.md`, `docs/architecture/05-state-machines/booking-status.md`
