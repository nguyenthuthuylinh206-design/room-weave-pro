## Mục tiêu

Bổ sung một view thứ 4 cho trang **/rooms**: "Sơ đồ phòng" — lưới phòng theo tầng giống mẫu tham chiếu. Mỗi ô phòng tô màu đậm theo trạng thái (xanh = trống, đỏ = đang ở, vàng = chờ dọn, xanh dương = sắp đến…), hiển thị **số phòng + tên khách + chip thời lượng** ("Hôm qua", "2 tuần", "5 giờ"). Cập nhật realtime để lễ tân biết ngay phòng nào sắp check-out, phòng nào vừa check-in.

Giữ nguyên 3 view cũ (Lưới / Danh sách / Lịch phòng dạng tape). Không thay thế gì.

## A. Kiến trúc / logic nghiệp vụ

- Thêm tab mới `map` (label: "Sơ đồ phòng") vào `RoomsPage`, đặt sau tab "Lịch phòng".
- Sửa lại tab `floor` hiện đang trỏ sang `RoomTapeChart` → đổi label cho rõ "Lịch phòng (tape chart)", còn tab `map` mới sẽ hiển thị floor-plan thật sự.
- Floor-plan group by **tầng** (parse từ `floor_number` hoặc 2 chữ số đầu của `room_number`), sort tầng giảm dần.
- Mỗi ô phòng resolve trạng thái hiển thị từ 2 nguồn:
  1. `rooms.status` (FSM v2) → màu nền chính
  2. Booking hiện tại / sắp tới (nếu có) → tên khách + chip thời lượng
- **Quy ước thời lượng**:
  - Phòng `occupied`: tính từ `actual_check_in_at` → hiển thị "Hôm qua", "2 ngày", "5 giờ", "2 tuần" tuỳ độ dài (dùng `date-fns/formatDistanceToNowStrict` locale vi, rút gọn).
  - Phòng `reserved` / có booking sắp tới trong 24h: chip "Sắp đến · 2 giờ".
  - Phòng `cleaning`/`maintenance`: chip "Từ {time}".
- Click ô phòng:
  - Có booking đang ở / sắp đến → mở `TapeChartBookingSheet` (đã có) với booking đó.
  - Không có booking và phòng `available` → mở `RoomBookingDialog` tạo booking nhanh.
  - Trạng thái khác → điều hướng `/rooms/:id` chi tiết phòng.
- Realtime: subscribe `postgres_changes` trên `rooms`, `room_bookings`, `housekeeping_tasks` (lọc theo `hotel_id`) → invalidate query `['floor-plan-live', hotelId]`.

## B. Schema / migration

Không đổi schema. Thêm 1 RPC mới `get_floor_plan_live(p_hotel_id uuid)` (SECURITY DEFINER, có check tenant qua `hotels.tenant_id = current_tenant_id()`). Trả về JSON:

```json
{
  "<floor>": [
    {
      "id": "uuid", "room_number": "201", "room_type": "deluxe", "status": "occupied",
      "current_booking": {
        "id": "uuid", "guest_name": "...", "guest_count": 2,
        "check_in_at": "...", "check_out_at": "...",
        "booking_source": "walk_in", "is_group": false
      },
      "next_booking": { ... } | null
    }
  ]
}
```

- Join `rooms LEFT JOIN room_bookings` lấy booking active (status `checked_in`) hoặc sắp tới gần nhất (status `confirmed`, check_in trong 24h).
- Migration kèm `GRANT EXECUTE ON FUNCTION public.get_floor_plan_live(uuid) TO authenticated`.

Rollback: `DROP FUNCTION public.get_floor_plan_live(uuid)`.

## C. API / hooks

- Hook mới `src/hooks/useFloorPlanLive.ts`:
  - Query key `['floor-plan-live', hotelId]`, gọi RPC `get_floor_plan_live`.
  - `staleTime: 30_000`, không refetchInterval (đã có realtime).
  - Trả về `{ data, isLoading }` + tiện ích `totals` (đếm theo status).
- Hook mới `src/hooks/useFloorPlanRealtime.ts`: subscribe channel `floor-plan:${hotelId}` lắng nghe 3 bảng trên → `queryClient.invalidateQueries(['floor-plan-live', hotelId])` (debounce 400ms).

## D. UI screens / components

- **Mới**: `src/components/rooms/RoomFloorMapView.tsx` (~250 dòng).
  - Header tóm tắt: badge cho từng trạng thái với số đếm — "Còn trống (14)", "Đang ở (20)", "Chờ dọn (3)", "Bảo trì (1)"… (text-color semantic theo Enterprise SaaS rule, không nền pastel).
  - Hàng filter loại phòng (Standard / Deluxe / Superior / Suite) — multi-select chip, dùng để dim ô không khớp.
  - Mỗi tầng: panel `border rounded-lg`, header `Tầng N · X phòng`.
  - Grid responsive: `grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12 gap-1.5`.
  - Ô phòng kích thước cố định ~`h-20`, padding `p-1.5`, gồm:
    - Dòng 1: **số phòng** (font-bold text-base) + chip thời lượng góc trên phải (`text-[9px] bg-white/25 rounded px-1`).
    - Dòng 2: `(N) TÊN KHÁCH` truncate, text-[10px], font-medium.
    - Viền trái 3px theo màu **loại phòng** (Standard=blue, Deluxe=cyan, Superior=violet, Suite=amber).
    - Nền theo trạng thái, dùng cùng palette với tape chart (đã đậm 500 + text-white ở patch v1.0.92):
      - `available` → emerald-500
      - `occupied` → red-500
      - `reserved` (booking sắp đến) → orange-500
      - `cleaning` → amber-500
      - `inspection` → sky-500
      - `maintenance` / `out_of_order` → slate-500 + pattern sọc
      - `dnd` → indigo-500
  - Tooltip hover: tên khách đầy đủ, giờ check-in/out, SĐT, tổng tiền, còn nợ.
  - Empty floor → skeleton; không có phòng nào → empty state có CTA "Thêm phòng".

- **Sửa**: `src/pages/rooms/RoomsPage.tsx`
  - Đổi enum `ViewMode = 'grid' | 'list' | 'floor' | 'map'`.
  - Thêm `<TabsTrigger value="map">Sơ đồ phòng</TabsTrigger>` ngay sau tab floor.
  - Render `<RoomFloorMapView />` khi `viewMode === 'map'`.
  - Đổi label tab `floor` từ "Sơ đồ" → "Lịch phòng" để tránh nhầm.

- **Tái sử dụng**:
  - `TapeChartBookingSheet` cho click vào phòng có booking.
  - `RoomBookingDialog` cho click vào phòng trống.
  - `getRoomStatusMeta` mở rộng map nền đậm (thêm key `solidBg`, `solidText`).

## E. Permission / role rules

- View `map` hiển thị cho mọi role có quyền `view_rooms` (giống các tab khác).
- Click tạo booking nhanh chỉ enable nếu `hasPermission('manage_bookings')`; nếu không có quyền → click chỉ mở chi tiết phòng.
- Lọc theo `hotelId` của `HotelContext` (tenant isolation 3 lớp đã có).
- RPC `get_floor_plan_live` validate `tenant_id` ở server.

## F. Test cases

1. Hotel có 30 phòng 5 tầng → tab "Sơ đồ phòng" hiển thị 5 panel, mỗi panel đúng số phòng.
2. Phòng đang `checked_in` → ô màu đỏ, hiển thị tên khách + chip "2 ngày" (date-fns vi).
3. Phòng có booking confirmed check-in trong 3h tới → ô màu cam, chip "Sắp đến · 3 giờ".
4. Sau khi check-in 1 phòng từ tab khác → tab Sơ đồ tự đổi sang màu đỏ trong < 2s (realtime).
5. Click ô phòng đang ở → mở `TapeChartBookingSheet` đúng booking.
6. Click ô phòng trống → mở `RoomBookingDialog` với roomId pre-filled.
7. Lọc loại "Deluxe" → các ô không phải Deluxe bị mờ (`opacity-30`).
8. Hotel chưa có phòng → empty state, không gọi RPC.
9. Tenant A không thấy phòng tenant B (RLS + RPC tenant check).
10. Mobile 390px: grid `grid-cols-3`, ô vẫn đọc được số phòng + tên rút gọn.

## G. Rollout notes

- Bump `APP_VERSION` → `1.0.93`, thêm entry changelog "Thêm view Sơ đồ phòng theo thời gian thực".
- Không feature flag — view mới là tab phụ, không ảnh hưởng flow cũ.
- Migration RPC chạy trước khi deploy frontend (đã backward compatible vì `useFloorPlan` cũ vẫn còn).
- QA checklist:
  - [ ] 4 tabs đều render được, switch tab không lag
  - [ ] Realtime: 2 tab cùng mở, action ở tab A phản ánh ở tab B < 3s
  - [ ] Mobile portrait iPhone SE: không tràn ngang
  - [ ] Dark mode: màu đậm vẫn tương phản
- Rollback: ẩn `<TabsTrigger value="map">` và `DROP FUNCTION get_floor_plan_live`.

## Phần còn thiếu (sẽ làm sau)

- Drag-and-drop booking giữa các phòng trên sơ đồ (đã có ở tape chart, port sang map ở phase 2).
- In sơ đồ PDF cho ca trực đêm.
- Hiển thị icon nhỏ "có yêu cầu dịch vụ chưa xử lý" trên ô phòng.
