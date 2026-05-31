## Mục tiêu
Mỗi ô phòng trong Sơ đồ phòng (`/rooms?view=map`) hiện chỉ có số phòng + chấm màu + nhãn loại/tên rút gọn — không đủ để lễ tân ra quyết định nhanh. Cần:

1. Hiển thị ngay ở **giữa ô**: tên khách, số người ở, số đêm còn lại, giá phòng/đêm.
2. **Góc trên-trái**: badge ngắn nhãn trạng thái phòng (Sạch / Bẩn / DND / OOO / Còn trống…).
3. Đổi bảng màu từ pastel nhạt sang **tông đậm có độ tương phản cao** (chữ trắng trên nền màu) để lễ tân nhìn từ xa.

Giữ nguyên: KPI bar, filter, group ring nhóm khách, badge đỏ "việc cần làm" góc phải-trên, hover quick actions, tooltip, click → ReceptionQuickDialog.

## Phạm vi file
Sửa duy nhất `src/components/rooms/RoomFloorMapView.tsx` (frontend/UI only). Không đụng RPC, hook `useFloorPlanLive`, schema.

## A. Logic nghiệp vụ hiển thị
Với mỗi `room` (FloorPlanRoom):

- **Nhãn trạng thái ngắn** (góc trên-trái): suy từ `getBucket(room)` + một số case đặc biệt
  - `sellable` → "Trống"
  - `due_out` → "Sắp trả"
  - `dirty` → "Bẩn" (hoặc "Cần dọn" nếu `occupied_dirty`)
  - `occupied` → "Đang ở"
  - `blocked` → cụ thể hơn: `out_of_order` → "OOO", `out_of_service` → "OOS", `dnd` → "DND", `skipper` → "Bỏ trốn"

- **Trung tâm ô**:
  - Nếu có `current_booking`:
    - Dòng 1: Tên khách (lấy 2 từ cuối, truncate)
    - Dòng 2: `{guest_count} khách · còn {nights} đêm` — `nights` = ceil((check_out_date - today) / 1 ngày), nếu ≤ 0 → "Trả hôm nay"
    - Dòng 3 (nếu countdown < 24h): countdown `{hrs}h` hoặc "Trễ"
  - Nếu không có booking nhưng có `next_booking`:
    - Dòng 1: "Sắp đến: {tên rút gọn}"
    - Dòng 2: thời gian đến (`formatArriveIn`)
  - Nếu trống không booking:
    - Dòng 1: loại phòng (uppercase)
    - Dòng 2: giá phòng/đêm (lấy từ `current_booking?.total_amount` không có → cần thêm field giá vào ô. Phiên bản đầu chỉ hiện loại phòng nếu không có giá; **giả định: hook hiện chưa trả giá phòng theo loại** — ghi rõ TODO mở rộng RPC `get_floor_plan_live` ở vòng sau)

## B. Thiết kế thị giác (tông đậm, không pastel)

Đổi `BUCKET_META` sang biến thể "solid":

```text
sellable  → bg-emerald-600  text-white
due_out   → bg-amber-600    text-white  (ô chớp viền cam khi hrs < 2)
dirty     → bg-rose-600     text-white
occupied  → bg-sky-700      text-white
blocked   → bg-slate-700    text-white
```

- Chữ chính dùng `text-white`, chữ phụ `text-white/80`.
- Badge trạng thái góc trên-trái: `bg-white/15 text-white text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 backdrop-blur`.
- Badge "việc cần làm" giữ nguyên `bg-red-500` ring trắng (đã nổi sẵn).
- Hover quick actions giữ nguyên (Unlock, History) — nền tối nhẹ để vẫn nhìn được.
- Group ring nhóm khách: giữ `ring-2 ring-offset-1`, đổi sang các tông `ring-{fuchsia|cyan|lime|rose|violet|teal|yellow}-300` (sáng hơn để nổi trên nền đậm).
- Khi `dim` (filter loại phòng không khớp): `opacity-40`.

## C. Layout ô (giữ height đang có từ `useFloorMapCellSize`)

```text
┌────────────────────────────┐
│ [STATUS]            [n]    │  ← góc trên-trái: badge status, góc trên-phải: badge tasks
│                            │
│      102                   │  ← số phòng to (text-white)
│   Nguyễn Văn A             │  ← tên khách (truncate)
│   2 khách · còn 2 đêm      │  ← guest_count + nights
│                            │
│         8h ← (nếu due_out) │  ← countdown
└────────────────────────────┘
```

- Số phòng: dùng `cellSize.classes.numberCls` nhưng đổi `text-foreground` → `text-white`.
- Bỏ chấm tròn lớn ở giữa (đã thay bằng nền đậm + badge text).
- Nội dung dòng đáy auto co theo height ô (ẩn bớt khi ô nhỏ — `h < 90` chỉ hiển thị số phòng + status badge + tên khách).

## D. Helper mới (cùng file)

```ts
function getStatusBadgeLabel(room: FloorPlanRoom): string
function getNightsLeft(bk: FloorPlanBooking): number   // số đêm còn lại
function getShortName(name: string): string             // 2 từ cuối
```

## E. Test thủ công (QA checklist)
1. Phòng trống sạch không booking → nền emerald đậm, badge "Trống", giữa hiển thị loại phòng.
2. Phòng có khách đang ở → nền sky đậm, badge "Đang ở", giữa hiển thị tên + "2 khách · còn 3 đêm".
3. Phòng checkout hôm nay với countdown < 24h → nền amber đậm, badge "Sắp trả", có countdown.
4. Phòng OOO/OOS/DND → nền slate đậm, badge chính xác, không có thông tin khách.
5. Phòng nhóm (group_id chung > 1 phòng) → vẫn có ring nhóm rõ trên nền đậm.
6. Hover hiện quick actions không bị che bởi nền tối.
7. Tooltip vẫn hiển thị đầy đủ (không sửa `RoomTooltip`).
8. Cell size `sm/md/lg`: thông tin tự ẩn/hiện gọn gàng, không tràn.

## F. Rollout
- Chỉ thay đổi UI, không cần migration / không cần bump APP_VERSION (theo memory: chỉ bump khi publish — chờ khi user publish).
- Có thể rollback bằng cách revert duy nhất file `RoomFloorMapView.tsx`.

## G. Phần còn thiếu / lần sau
- Giá phòng/đêm hiện chưa có trong `get_floor_plan_live` → cần mở rộng RPC trả về `room_price_daily` để ô trống hiển thị giá. Sẽ làm ở vòng sau khi user xác nhận.
- Có thể thêm icon nhỏ cho nguồn OTA (Booking/Agoda) ở badge góc-phải-dưới — chờ user yêu cầu.
