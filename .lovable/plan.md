# Thống nhất luồng Check-in / Checkout

## Vấn đề hiện tại

Trong `ReceptionQuickDialog` (mở khi click ô phòng ở `/rooms?view=map`):
- Nút **Checkout** → `navigate('/bookings/:id?action=checkout')` — chỉ điều hướng, KHÔNG có dialog xác nhận, KHÔNG tính phụ thu trễ giờ, KHÔNG xử lý group booking, KHÔNG kiểm tra quá hạn. URL `?action=checkout` thậm chí không được handle ở trang chi tiết.
- Nút **Checkin nhanh** → `navigate('/bookings/new?roomId=...&mode=checkin')` — mở wizard tạo booking mới chứ không phải check-in booking đã đặt trước.

Trong khi đó `BookingsPage` có luồng đầy đủ:
- `handleCheckInClick`: validate ngày, trạng thái phòng → dialog xác nhận có điều chỉnh phụ thu sớm → `perform_checkin` RPC.
- `handleCheckOutClick`: detect group booking → `GroupCheckoutDialog`; detect quá hạn → `ExtendBookingDialog`; tính chi phí (late/overtime/damage/service) → `CheckoutSummaryDialog` → `perform_checkout`.

## Mục tiêu

Mọi điểm trigger Check-in/Checkout trong app dùng **cùng một logic** và **cùng dialog**.

## Cách làm

### A. Kiến trúc

Trích logic từ `BookingsPage` thành **`BookingCheckoutProvider`** (Context + hook `useBookingCheckoutFlow`) đặt ở `src/contexts/BookingCheckoutContext.tsx`. Provider:
- Sở hữu toàn bộ state: `actionBooking`, `showCheckinConfirm`, `showCheckoutSummary`, `showExtendDialog`, `showGroupCheckoutDialog`, `showGroupPaymentDialog`, `checkoutCostBreakdown`, `checkoutDamageItems`, `checkoutServiceDetails`, `suggestedEarlyCharge`, `minimizedCheckouts`, `selectedGroupId`.
- Render toàn bộ dialog: `CheckinConfirmDialog`, `CheckoutSummaryDialog`, `ExtendBookingDialog`, `GroupCheckoutDialog`, `GroupPaymentDialog`, `MinimizedCheckoutWidget`.
- Expose 2 hàm chính: `triggerCheckIn(booking)`, `triggerCheckOut(booking)` — gói nguyên logic `handleCheckInClick` / `handleCheckOutClick` hiện có (gồm validate, group detect, overdue detect, fetch chi phí, mở dialog tương ứng).
- Lắng nghe `groupCounts` qua hook nội bộ để biết booking nào là group.

Mount provider ở `src/App.tsx` (bên trong `HotelProvider` và `RequireShiftProvider`) để dùng được ở mọi route.

### B. Refactor BookingsPage

- Xoá toàn bộ state/handler/dialog liên quan checkout/checkin trong `BookingsPage.tsx` (~600 dòng).
- Bookings table gọi `triggerCheckIn` / `triggerCheckOut` từ hook thay vì local handler.
- Giữ nguyên các side-effect khác (filter, danh sách, group payment manual).

### C. Cập nhật ReceptionQuickDialog

Trong block `isOccupied && bk`:
- Nút **Checkout** → lấy full booking object qua `useQuery(['booking-detail', bk.id])` (đã có pattern), rồi gọi `triggerCheckOut(booking)`.
- Trong block trống:
  - Nếu phòng có booking sắp đến hôm nay (`detail.upcomingBooking`) → nút **Check-in** gọi `triggerCheckIn(upcomingBooking)`.
  - Nếu không có booking pending → giữ nút **Đặt phòng** (walk-in) như cũ.
- Đóng dialog `ReceptionQuickDialog` trước khi trigger để tránh dialog chồng dialog.

### D. Các điểm trigger khác cần kiểm tra & migrate

- `RoomTable` actions dropdown — hiện chưa có checkout/checkin, không cần đổi.
- `MobileRoomDetailPage` — đang `navigate('/rooms/:id/check?type=checkout')`, đó là luồng Room Check chứ không phải booking checkout → giữ nguyên.
- `useBookingActions.handleCheckIn` (đang dùng trong 1 chỗ duy nhất ở chính hook) — đánh dấu deprecated, route qua provider mới.

### E. Permission / role

Provider tôn trọng `useRequireShift().guard()` (đang được `useBookingActions` dùng) để chặn staff không vào ca trước khi gọi RPC.

### F. Test cases

1. Click ô phòng đang có khách (single booking) trên sơ đồ → Checkout → mở `CheckoutSummaryDialog` với cost breakdown giống hệt khi vào từ BookingsPage.
2. Click ô phòng đang có khách thuộc group booking (>1 phòng) → Checkout → mở `GroupCheckoutDialog`.
3. Click ô phòng quá hạn → Checkout → mở `ExtendBookingDialog` (đề nghị gia hạn hoặc checkout luôn).
4. Click ô phòng trống có booking đến hôm nay → Check-in → mở `CheckinConfirmDialog` với phụ thu sớm tính đúng.
5. Click ô phòng trống không có booking → chỉ thấy nút "Đặt phòng" (walk-in).
6. Booking hourly/monthly: kiểm tra không bị tính phụ thu daily sai.
7. Minimize checkout từ ReceptionQuickDialog → widget hiện ở góc → restore vẫn ra đúng dialog.

### G. Rollout

- Compatibility: provider mới + xoá code cũ trong cùng 1 PR, vì 2 entry point đều đi qua provider.
- Bump `APP_VERSION` lên `1.1.35` + thêm entry `public/changelog.json`.
- Không có thay đổi schema/DB.

## File sẽ tạo / sửa

**Tạo:**
- `src/contexts/BookingCheckoutContext.tsx` — Provider + hook + tất cả dialog.

**Sửa:**
- `src/App.tsx` — wrap provider.
- `src/pages/bookings/BookingsPage.tsx` — xoá state/handler/dialog, gọi hook.
- `src/components/rooms/ReceptionQuickDialog.tsx` — thay 2 nút Checkout/Checkin bằng trigger từ hook.
- `src/lib/app-version.ts`, `public/changelog.json` — bump version.

## Còn thiếu / giả định

- Giả định `ReceptionQuickDialog.detail` đã chứa đủ field booking cần cho checkout (room_price, deposit_amount, hourly_*, monthly_*, hotel_id, tenant_id…). Nếu thiếu sẽ fetch bổ sung qua `useQuery(['booking-detail', bk.id])` trước khi gọi trigger.
- Chưa xử lý check-in cho danh sách nhiều booking pending cùng phòng cùng ngày (hiếm) — sẽ chọn booking gần nhất theo `check_in_date`.
