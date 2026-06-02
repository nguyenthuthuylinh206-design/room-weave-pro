## Mục tiêu

1. **Bỏ giá phòng** ở card Grid (kể cả với Owner/Manager) — nhất quán với định hướng "Grid = vận hành buồng phòng", giá chỉ thuộc về Lễ tân/Booking.
2. **Đảm bảo số phòng luôn hiển thị** — hiện tại `P104`, `P103`… đôi khi bị `truncate` mất trong header card vì chia chỗ với checkbox + chấm trạng thái + `RoomStatusSelector`.
3. **Thêm control "Cỡ hiển thị"** (Nhỏ / Vừa / Lớn + slider %) cho **Lưới** và **Danh sách**, tương tự cơ chế đã có ở **Sơ đồ phòng**.

---

## A. Logic / Kiến trúc

- Tái dùng pattern của `useFloorMapCellSize` nhưng tách thành hook nhẹ hơn `useRoomViewDensity(hotelId)`:
  - state: `{ preset: 'sm'|'md'|'lg'|'custom', fontScale: 0.85–1.4, density: 'compact'|'comfortable' }`
  - persist trong `localStorage` theo key `rooms.viewDensity:<hotelId>`
  - phát ra `classes` (numberStyle, bodyStyle, captionStyle, rowPadding) để Grid + List dùng chung
  - shortcut `Ctrl/Cmd +/-/0` (giống Sơ đồ phòng)
- Không đụng đến state machine, RLS, RPC. Đây thuần UI/preference.

## B. Schema / migration

- Không cần migration. Lưu hoàn toàn ở `localStorage` (giống Sơ đồ phòng giai đoạn đầu — sau này có thể đồng bộ remote nếu cần, không nằm trong scope này).

## C. API / RPC

- Không thay đổi.

## D. UI changes

### D1. `RoomsPage.tsx` (header bar)
- Thêm `<RoomViewDensityControl />` (Popover, icon `Type` + label cỡ hiện tại) nằm **bên trái Tabs viewMode** khi `viewMode === 'grid' || viewMode === 'list'`. Khi ở `floor`/`map` thì ẩn (vì 2 view đó có control riêng).
- Trong Popover:
  - 3 nút preset: Nhỏ / Vừa / Lớn
  - Slider "Cỡ chữ" 85% – 140%
  - Nút "Đặt lại"

### D2. `RoomGrid.tsx`
- **Bỏ block giá** (lines 287-291): xoá toàn bộ `{showPrice && room.base_price …}` và biến `showPrice`, `hidesPrice`, import `formatCurrency` nếu không còn dùng.
- **Header card — đảm bảo số phòng luôn thấy**:
  - Đổi thứ tự ưu tiên: `số phòng` (không `truncate`, `shrink-0`) → chấm trạng thái → checkbox dồn về góc phải cùng `RoomStatusSelector` ở dòng riêng (`flex-wrap` khi hẹp).
  - Cấu trúc mới:
    ```
    [● P104]                     [☐] [Trạng thái▾]
    ```
    với `h3` room number `shrink-0` (bỏ `truncate`, bỏ `flex-1 min-w-0`), `RoomStatusSelector` cho phép xuống dòng (wrap container).
- Áp dụng `numberStyle / bodyStyle / captionStyle` từ `useRoomViewDensity` cho:
  - `h3` số phòng → `numberStyle`
  - dòng lý do ưu tiên + actionable info → `bodyStyle`
  - meta row → `captionStyle`
- Meta row sau khi bỏ giá: chỉ còn `loại • khách • giường • m²` (1 dòng full-width).

### D3. `RoomList.tsx` (table/list view)
- Bọc bảng với inline style `fontSize: classes.bodyStyle.fontSize`, cell padding theo `density` (`py-1.5` compact / `py-3` comfortable).
- Số phòng trong list view giữ `font-semibold` + áp `numberStyle` (cỡ vừa phải, không lớn như card).
- Bỏ cột giá nếu hiện đang hiển thị (xác nhận lại khi build — chỉ bỏ nếu có).

### D4. i18n (`vi/rooms.json`)
- Thêm:
  - `viewDensity.label`: "Cỡ hiển thị"
  - `viewDensity.small/medium/large`: "Nhỏ"/"Vừa"/"Lớn"
  - `viewDensity.fontSize`: "Cỡ chữ"
  - `viewDensity.reset`: "Đặt lại"

## E. Permission / role

- Bỏ giá áp dụng cho **tất cả role** ở Grid (kể cả Owner) → giá phòng thuộc về Lễ tân/Booking page, không lẫn vào module Buồng phòng.
- Control cỡ chữ ai cũng dùng được (chỉ là preference UI).

## F. Test cases

1. Grid view không còn hiển thị bất kỳ số tiền nào trên card.
2. Tất cả card đều thấy đầy đủ số phòng (`P101`…`P999`) ở mọi viewport ≥ 360px, không bị `…`.
3. Chọn preset "Lớn" → số phòng + body text trong card grid & list tăng kích thước, persist khi reload.
4. Shortcut `Cmd/Ctrl +`, `-`, `0` thay đổi/đặt lại cỡ chữ khi đang ở Grid/List.
5. Sang tab Sơ đồ phòng/Lịch phòng → control "Cỡ hiển thị" ẩn, control gốc của Sơ đồ phòng vẫn hoạt động độc lập.
6. Đổi hotel → preference cỡ chữ load đúng theo hotel mới.

## G. Rollout notes

- **Version bump**: `1.1.45` + entry `public/changelog.json` + `src/lib/app-version.ts` + `CURRENT_VERSION` ở `CacheBuster.tsx`.
- Files dự kiến chỉnh/tạo:
  - **NEW** `src/hooks/useRoomViewDensity.ts`
  - **NEW** `src/components/rooms/RoomViewDensityControl.tsx`
  - `src/components/rooms/RoomGrid.tsx` (bỏ giá + restructure header + áp style từ hook)
  - `src/components/rooms/RoomList.tsx` (áp style + density)
  - `src/pages/rooms/RoomsPage.tsx` (gắn control)
  - `src/i18n/locales/vi/rooms.json`
  - `src/lib/app-version.ts`, `public/changelog.json`, `src/components/CacheBuster.tsx`
- **Rollback**: revert đúng các file trên; vì preference nằm ở `localStorage`, không có rủi ro dữ liệu.
- **Không** thuộc scope: áp control cỡ chữ vào Mobile Rooms Page (sẽ làm tách lượt khác để giữ phạm vi nhỏ và test kỹ).
