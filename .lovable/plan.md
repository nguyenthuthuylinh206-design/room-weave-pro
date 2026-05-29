## Mục tiêu

Cho phép người dùng tự điều chỉnh **kích thước ô phòng** trên màn `Sơ đồ phòng` (`/rooms?view=map`), để màn hình hiển thị dày đặc (xem nhiều phòng cùng lúc) hoặc thoáng hơn (đọc rõ thông tin). Cài đặt lưu local theo từng người dùng + từng khách sạn.

## Phạm vi (chỉ frontend)

Chỉ chạm `RoomFloorMapView.tsx` và thêm 1 hook nhỏ. Không đổi RPC / schema / quyền.

## A. UX

Thêm 1 control nhỏ bên cạnh các nút thanh công cụ phía trên (gần ô Search / nút "Xoá lọc"):

- **Dropdown "Kích thước ô"** với 4 preset:
  - `Nhỏ` (Compact) — nhiều phòng/dòng, ô vuông gọn
  - `Vừa` (Default) — mặc định hiện tại
  - `Lớn` — ô cao, chữ to, dễ đọc trên TV/màn lớn
  - `Tuỳ chỉnh` — mở popover có **2 slider**: chiều cao ô (72–160px) và số cột tối đa (4–16)
- Hiển thị mức zoom hiện tại dạng chữ nhỏ: "Vừa · 12 cột".
- Phím tắt: `Ctrl/Cmd + +` / `-` để tăng/giảm preset; `0` về mặc định.

Mỗi preset map sang 2 thông số:

| Preset | Chiều cao ô (h) | Cột (xl) | Font số phòng |
|---|---|---|---|
| Nhỏ | 80px | 16 | text-sm |
| Vừa | 96px (h-24 hiện tại) | 12 | text-base |
| Lớn | 128px | 8 | text-lg |
| Tuỳ chỉnh | user chọn | user chọn | auto theo h |

Responsive: số cột chỉ áp dụng ở breakpoint `xl`; các breakpoint nhỏ hơn co lại tỉ lệ (sm = ⌈cols/2⌉, md = ⌈cols·0.6⌉, lg = ⌈cols·0.75⌉).

## B. Persist

- Key: `localStorage["rooms.floorMap.cellSize:" + hotelId]`
- Schema: `{ preset: 'sm'|'md'|'lg'|'custom', height: number, cols: number }`
- Đọc lúc mount, ghi khi đổi (debounce 300ms cho slider).
- Đổi khách sạn → reload setting theo hotel mới.

## C. Implementation

**File mới**
- `src/hooks/useFloorMapCellSize.ts` — quản lý state + persist + 4 preset, expose `{ size, setPreset, setCustom, classes }`.
  - `classes.grid` → string Tailwind cho `grid-cols-*` theo breakpoint (dùng `cn` + map cứng để tránh purge mất class)
  - `classes.cell` → `h-[Npx]` inline style (vì cao tuỳ chỉnh) + font-size class

**File sửa**
- `src/components/rooms/RoomFloorMapView.tsx`
  - Import & gọi hook
  - Thêm component `<CellSizeControl />` inline trong thanh toolbar trên cùng (cạnh search/filter)
  - Thay class cứng dòng 372: `grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12` bằng `classes.grid`
  - Thay `h-24` ở dòng 402 bằng `style={{ height: size.height }}` + class font theo size
  - Thêm key listener cho phím tắt (chỉ khi không focus input)

**Lưu ý kỹ thuật**
- Vì Tailwind cần class tĩnh, dùng **safelist map** trong hook:
  ```ts
  const COL_CLASSES: Record<number,string> = { 4:'xl:grid-cols-4', 6:'xl:grid-cols-6', 8:'xl:grid-cols-8', 10:'xl:grid-cols-10', 12:'xl:grid-cols-12', 14:'xl:grid-cols-14', 16:'xl:grid-cols-16' }
  ```
  Slider snap về các giá trị có trong map. (14/16 cần thêm vào `tailwind.config.ts` nếu chưa có.)
- Chiều cao dùng inline `style.height` để hỗ trợ giá trị bất kỳ.

## D. Test thủ công (QA checklist)

1. Đổi preset Nhỏ/Vừa/Lớn → ô phòng resize ngay, layout không vỡ.
2. Mở "Tuỳ chỉnh", kéo slider → ô resize realtime, không lag.
3. Reload trang → giữ nguyên setting.
4. Đổi sang khách sạn khác → load setting riêng của khách sạn đó.
5. Phím tắt `Ctrl +/-/0` hoạt động, không trigger khi đang gõ trong ô Search.
6. Responsive: thu nhỏ trình duyệt → grid vẫn đẹp ở `sm/md/lg`.
7. Badge "việc cần làm", ring nhóm, countdown vẫn căn chỉnh đúng ở mọi cỡ.

## E. Rollout

- Không cần feature flag — thay đổi cosmetic, fallback về preset Vừa nếu localStorage lỗi.
- Bump version `1.0.99` + thêm entry `public/changelog.json`: "Sơ đồ phòng: cho phép tuỳ chỉnh kích thước ô phòng (Nhỏ/Vừa/Lớn/Tuỳ chỉnh) + phím tắt Ctrl +/-".

## F. Phần KHÔNG làm (đề xuất sau)

- Drag-resize trực tiếp trên ô (phức tạp, ít giá trị hơn preset).
- Đồng bộ setting qua DB cho nhiều thiết bị — hiện local là đủ.
- Tuỳ chỉnh layout từng tầng riêng — để sprint sau nếu có yêu cầu.
