## Bối cảnh
File ảnh hưởng: `src/components/rooms/RoomGrid.tsx` (đang render card phòng ở `/rooms?view=grid`).
Vấn đề hiện tại:
1. **Pill trạng thái** (`RoomStatusSelector`) đặt cùng hàng với số phòng + checkbox → chiếm chỗ, dễ vỡ layout khi tên trạng thái dài (`Trống – chưa dọn`), trông mất thẩm mỹ.
2. Click vào card đi thẳng `/rooms/:id` → mất 1 lượt navigate chỉ để xem nhanh thông tin.
3. Không có nút phân biệt "xem nhanh" vs "xem chi tiết" rõ ràng.

## Thay đổi

### 1. Gọn lại trạng thái phòng trong card
- Bỏ pill `RoomStatusSelector` lớn khỏi hàng tiêu đề.
- Hàng tiêu đề chỉ còn: chấm màu trạng thái (đã có) + số phòng + checkbox bulk-select (giữ ở góc phải).
- Tên trạng thái hiển thị dưới dạng **text nhỏ semantic-color** ngay cạnh số phòng (vd `P104 · Trống – chưa dọn` màu amber-600), theo memory "Enterprise SaaS Minimalist" (không dùng nền badge, chỉ dùng màu chữ).
- Vẫn cho phép đổi trạng thái nhanh: chuyển `RoomStatusSelector` xuống footer dưới dạng nút icon nhỏ (DropdownMenu trigger 32×32) bên cạnh dropdown "Giao việc", hoặc đưa vào **Quick View popup** (xem mục 2). → Chọn phương án "đưa vào Quick View" để giảm noise trên grid.

### 2. Quick View Popup khi click vào ô phòng
- Tạo component mới `src/components/rooms/RoomQuickViewDialog.tsx` (Dialog từ shadcn, nội dung 1 cột, max-width sm).
- Click vào **bất kỳ vùng nào của card** (trừ checkbox, footer button) → mở Quick View thay vì điều hướng.
- Nội dung Quick View (đọc-only, không gọi RPC nặng — tái dùng dữ liệu `entry` đã có trong RoomGrid):
  - Header: chấm trạng thái + số phòng + tên trạng thái (semantic color) + `RoomStatusSelector` để đổi nhanh.
  - Khối "Cần xử lý": `priority.reason` (nếu có) với màu urgent/warning.
  - Khối "Đặt phòng": nếu `booking` → tên khách, SĐT (nếu có), giờ trả, countdown — dùng lại `BookingLine` hoặc render trực tiếp.
  - Khối "Vật tư": missing (after_clean/restock), items_in_laundry, pendingCount.
  - Khối "Lần kiểm gần nhất": text từ `formatDistanceToNow` + score nếu có.
  - Khối "Thông tin phòng": loại • khách • giường • m².
  - Footer 2 nút full-width:
    - **Kiểm tra phòng** (primary) → `/rooms/:id/check` (reuse logic session resume).
    - **Xem chi tiết phòng** (outline) → `/rooms/:id` — chỉ hiện khi `canViewRoomDetail`.
    - (Tuỳ chọn) `canCreateTask` → nút Giao việc thứ 3.

### 3. Footer card sau khi bỏ status pill
- Nút "Kiểm tra" giữ nguyên (flex-1).
- Bỏ nút "Giao việc" rời ở footer? → **Giữ** để giảm số click cho dept manager (vẫn đúng nguyên tắc "thao tác nhanh"), nhưng có thể nhỏ lại (h-8 w-8). Nếu thấy chật sẽ chuyển hẳn vào Quick View ở bước sau.
- Hành vi click:
  - Click card body → mở Quick View.
  - Click "Kiểm tra" → đi thẳng tới `/rooms/:id/check` (giữ nguyên).
  - Click "Giao việc" → mở `CreateTaskDialog` (giữ nguyên).
  - Long-press / Cmd+click card → đi thẳng `/rooms/:id` (tùy chọn, không bắt buộc cho v1).

### 4. Mobile (`MobileRoomsPage` / `MobileRoomsDashboard`)
- Out of scope cho lần này — chỉ áp dụng grid desktop/tablet (`RoomGrid.tsx`). Mobile đã có flow riêng. Sẽ ghi chú vào memory để follow-up sau.

## Kỹ thuật

```text
src/components/rooms/RoomGrid.tsx          (edit)
  - hàng tiêu đề: bỏ RoomStatusSelector, thêm status text màu semantic
  - onClick card: mở Quick View thay vì navigate
  - thêm state quickViewRoom + render <RoomQuickViewDialog/>

src/components/rooms/RoomQuickViewDialog.tsx   (new)
  - props: entry (room + priority + booking + pendingCount + session) | null
  - 2 nút footer: Kiểm tra (navigate /check), Xem chi tiết (navigate /:id)

src/lib/roomStatus.ts                      (no change, reuse getRoomStatusMeta nếu cần)
src/i18n/locales/vi/rooms.json             (thêm key quickView.* nếu cần)
```

Không có thay đổi schema / migration / RPC. Không đổi logic priority. Chỉ là UI/UX presentation.

## Test
- Vitest snapshot không bắt buộc — chỉ smoke render `RoomQuickViewDialog` với một entry mock (urgent + có booking).
- Manual QA: desktop 1280/1440, tablet 768, kiểm tra urgent/warning/normal section + room có/không booking + staff không có quyền `manage_rooms` (ẩn nút Xem chi tiết).

## Rollout
- Thay đổi thuần frontend, không cần feature flag.
- Bump `APP_VERSION` + `CURRENT_VERSION` + changelog entry "Gọn card phòng + Quick View popup".
- Rollback: revert PR.

## Memory cần cập nhật sau khi build
- Thêm memory `design/rooms-grid-quick-view-v1` mô tả contract của Quick View (click card → popup, 2 CTA).
