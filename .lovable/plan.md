## Vấn đề
Nút "Mở phiếu booking" hiện `navigate('/bookings/:id')` → lễ tân phải bấm Back để quay về tape chart, mất thao tác.

## Giải pháp
Mở `BookingDetailPage` **trong popup overlay** ngay trên tape chart, không rời trang.

### Cách làm (ít rủi ro, reuse code)
1. **Refactor `BookingDetailPage`** chấp nhận id qua prop, không bắt buộc qua URL:
   - Đổi signature: `BookingDetailPage({ idProp?, embedded?, onClose? })`.
   - Nếu `idProp` có → dùng nó thay `useParams().id`.
   - Nếu `embedded === true` → ẩn nút "Quay lại" (ArrowLeft) ở header, vì đã có nút đóng dialog.
   - Khi navigate đi nơi khác trong page (vd. mở guest profile) → vẫn gọi `navigate(...)` bình thường, và gọi `onClose?.()` trước để dialog tự đóng.
   - Route `/bookings/:id` giữ nguyên (full page mode) — chỉ thêm overload.

2. **Tạo `BookingDetailDialog`** (`src/components/bookings/BookingDetailDialog.tsx`):
   - Dùng shadcn `Dialog` với `DialogContent` size lớn: `max-w-5xl w-[95vw] h-[92vh] p-0 flex flex-col`.
   - Header dialog tối giản: title "Phiếu booking" + nút đóng (X mặc định của Dialog).
   - Body scroll-y chứa `<BookingDetailPage idProp={bookingId} embedded onClose={() => onOpenChange(false)} />`.

3. **Sửa `TapeChartBookingSheet`**:
   - Thay button "Mở phiếu booking" (cả ở quick-actions và footer CTA khi không có flow check-in/out) — thay `goDetail` (navigate) bằng `setDetailOpen(true)`.
   - Render `<BookingDetailDialog bookingId={booking.id} open={detailOpen} onOpenChange={setDetailOpen} />` ở cuối SheetContent.
   - **Giữ navigate** cho 2 CTA emphasized "Tiếp tục nhận phòng" / "Thu tiền & trả phòng" vì các flow này là wizard nhiều bước, dialog lồng dialog không ổn. Hoặc cũng mở dialog rồi user thao tác trong đó — quyết định: mở dialog luôn cho nhất quán, vì BookingDetailPage đã có sẵn các action bar trong đó.
   - Nhóm đặt phòng: click 1 booking khác trong nhóm → cũng mở dialog với id mới thay vì navigate.

## A. Logic
- Không đổi schema, RPC, query.
- BookingDetailPage hiện tại đã tự fetch theo id → chỉ cần đổi nguồn id.

## D. Files
- **Sửa** `src/pages/bookings/BookingDetailPage.tsx`:
  - Thêm props `{ idProp?: string; embedded?: boolean; onClose?: () => void }`.
  - `const id = idProp ?? useParams().id`.
  - Ẩn `<Button ArrowLeft>Quay lại` khi `embedded`.
- **Tạo** `src/components/bookings/BookingDetailDialog.tsx`.
- **Sửa** `src/components/rooms/TapeChartBookingSheet.tsx`:
  - State `detailOpen`, thay `goDetail` → `openDetail`.
  - Render dialog ở dưới.
  - Bỏ `onOpenChange(false)` để sheet không tự đóng khi mở dialog — hoặc đóng sheet rồi mở dialog (cleaner, ít tầng z-index): đóng sheet → mở dialog → khi dialog đóng quay lại tape chart bình thường.
- **Bump** `app-version.ts` → `1.0.91`, `public/changelog.json` thêm entry.

## E. Permission
Giữ nguyên — `BookingDetailPage` đã nằm trong `PermissionRoute module="bookings"`, khi embedded ta dựa vào quyền của trang gọi nó (RoomsPage), nhưng nội dung sensitive đã được RLS check + chính BookingDetailPage cũng filter theo `selectedHotel`.

## F. Test cases
- Click "Mở phiếu booking" từ sheet → dialog mở, không đổi URL.
- Đóng dialog → trở về tape chart, sheet đã đóng, vị trí scroll giữ nguyên.
- Truy cập trực tiếp `/bookings/:id` → vẫn hiển thị full page như cũ (regression).
- Mobile (390px): dialog full screen do `w-[95vw] h-[92vh]`.
- Click action trong dialog (vd. mở guest profile) → gọi onClose rồi navigate.

## G. Rollout
- Thay đổi UI thuần, không migration. Rollback bằng revert.
- Bump version cho PWA cache buster.

## Phần KHÔNG làm
- Không sửa nội dung `BookingDetailPage` ngoài việc nhận prop.
- Không lồng dialog trong dialog cho các flow check-in wizard — các flow đó đã có dialog riêng (`RoomBookingDialog`, `BookingPaymentDialog`) bên trong page và sẽ hoạt động bình thường trong embedded mode.
