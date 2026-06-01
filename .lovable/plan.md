# Thêm slider cỡ chữ + lưu vĩnh viễn cho Sơ đồ phòng

## Mục tiêu
1. Thêm thanh kéo riêng để chỉnh **cỡ chữ** trong ô phòng (độc lập với chiều cao ô).
2. Nút **Lưu** ghi vào cả `localStorage` (per-hotel) và DB (`hotels.settings.floor_map_cell_size`) để mọi thiết bị/lần đăng nhập đều giữ nguyên.

## A. Thay đổi hook `useFloorMapCellSize.ts`
- Thêm field mới vào `CellSizeState`: `fontScale: number` (0.8 – 1.4, step 0.05, default 1.0).
- `classes.numberCls/bodyCls/captionCls/badgeCls` hiện tính theo `height` → đổi sang tính theo `effectiveHeight = height * fontScale` (giữ tương thích, nhưng cho phép user phóng to chữ mà không cần ô to hơn).
- Thêm setter `setFontScale(v)`.
- Đọc state ưu tiên: **DB (hotel settings) → localStorage → default**.
- Khi user kéo slider: chỉ update state + localStorage (như cũ). Khi bấm **Lưu**: ghi DB.

## B. UI `RoomFloorMapView.tsx` – Popover kích thước
Thêm mục thứ 3 trong popover, dưới slider "Số cột":
```text
Cỡ chữ               [ 100% ]
[────●─────────────]   80% – 140%
```
- Nút **Lưu** hiện tại chỉ ghi localStorage → đổi thành: ghi localStorage + gọi mutation cập nhật `hotels.settings.floor_map_cell_size = { height, cols, fontScale, preset }`.
- Toast: "Đã lưu cho khách sạn {tên} – áp dụng trên mọi thiết bị".
- Nút **Đặt lại** vẫn về preset `md` + fontScale 1.0.

## C. Persistence DB
- Dùng cột `hotels.settings` JSONB sẵn có.
- Key: `settings.floor_map_cell_size = { preset, height, cols, fontScale }`.
- Hook mới `useFloorMapCellSizeSync(hotelId)`: load 1 lần khi mount, fallback localStorage nếu DB rỗng.
- Mutation `updateHotelFloorMapCellSize(hotelId, value)`: `UPDATE hotels SET settings = jsonb_set(settings, '{floor_map_cell_size}', $1) WHERE id = $2 AND tenant_id = $3`.
- Không cần migration (cột `settings` đã tồn tại).

## D. Permission
- Chỉ Owner/Hotel Manager mới có quyền lưu vào DB (ảnh hưởng cả hotel). Staff vẫn lưu được localStorage cá nhân nhưng nút "Lưu" sẽ hiển thị tooltip "Chỉ quản lý mới lưu được cho toàn khách sạn" — vẫn cho lưu local.

## E. Files dự kiến sửa
- `src/hooks/useFloorMapCellSize.ts` – thêm `fontScale` + load từ DB
- `src/hooks/useFloorMapCellSizeSync.ts` – **mới**, query + mutation hotel settings
- `src/components/rooms/RoomFloorMapView.tsx` – thêm slider Cỡ chữ + cập nhật nút Lưu
- `src/lib/app-version.ts` + `public/changelog.json` – bump version

## F. Test
- Kéo slider cỡ chữ → chữ trong ô đổi ngay, ô không đổi cao.
- Bấm Lưu → reload trang → đăng nhập trên máy khác cùng hotel → vẫn giữ kích thước.
- Đổi hotel → load đúng setting của hotel đó.
