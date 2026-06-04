---
name: Rooms Grid Quick View Consolidation v1
description: /rooms desktop+mobile thống nhất pattern Quick View — card chỉ 1 nút Kiểm tra, mọi action khác qua popup; tab phân vai theo role
type: design
---

## Quy ước Card Phòng (cả desktop & mobile)

Hàng tiêu đề:
- Chấm trạng thái (semantic dot) + số phòng + nhãn trạng thái text semantic
- Bỏ pill `RoomStatusSelector` khỏi header card (gây vỡ layout & noise)

Card body:
- Lý do priority (đỏ/vàng) nếu có
- 1 dòng thông tin chính (session đang kiểm | booking countdown | missing items | restock)
- Phụ: laundry, pending distributions
- Meta row: loại • khách • giường • m²

Footer:
- **Chỉ 1 nút "Kiểm tra"** (w-full). KHÔNG còn dropdown "Giao việc" rời.
- "Giao việc", "Xem chi tiết phòng", "Đổi trạng thái" đều gom vào `RoomQuickViewDialog`.

Click vào card (không phải checkbox / nút) → mở Quick View.

## Phân vai Tab `/rooms`

| Tab | Nhãn | Vai trò chính | Default khi user chưa chọn |
|---|---|---|---|
| `grid` | Lưới (HK) | Buồng phòng / Trưởng bộ phận | department_manager, staff* |
| `list` | Danh sách | Mọi role để lọc / xuất | — |
| `floor` | Lịch phòng | Lễ tân, quản lý booking | — |
| `map` | Sơ đồ (Lễ tân) | Lễ tân tại quầy | owner, super_admin, hotel_manager |

`defaultViewByRole(role)` trong `RoomsPage.tsx` quyết định view khi URL không có `?view=` và localStorage trống. User chọn xong vẫn persist như cũ.

Subtitle dưới tab mô tả mục đích — bắt buộc giữ tiếng Việt.

*Staff bị redirect `/my-tasks` trước khi đến RoomsPage.

## Quick View Dialog

`RoomQuickViewDialog` dùng chung cho cả desktop (`RoomGrid`) và mobile (`MobileRoomsPage`).
Footer Quick View: "Kiểm tra phòng" (primary, full-width) + "Xem chi tiết phòng" (outline) + nút icon "Giao việc" (nếu có quyền).

## Files chính
- `src/components/rooms/RoomGrid.tsx` — desktop card
- `src/components/rooms/MobileRoomsPage.tsx` — mobile card (cùng pattern)
- `src/components/rooms/RoomQuickViewDialog.tsx` — popup chia sẻ
- `src/pages/rooms/RoomsPage.tsx` — tab phân vai + default view
