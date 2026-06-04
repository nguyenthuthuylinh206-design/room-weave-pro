# Đánh giá khu vực Phòng (sau v1.1.56) — Vấn đề còn lại

Sau 3 sprint vừa qua (1.1.54 redesign card, 1.1.55 consolidation, 1.1.56 đồng bộ Quick View Lễ tân), khu vực `/rooms` đã ổn định về tổng thể nhưng còn 12 vấn đề cụ thể chia 4 nhóm: **trùng lặp code**, **chưa nhất quán UI**, **thiếu tính năng vận hành**, **rủi ro kỹ thuật**.

---

## A. Trùng lặp code (tech debt — ảnh hưởng tốc độ phát triển sau này)

### A1. `statusDotClass` + `statusColorClass` lặp 4 nơi

Cùng 1 logic map status → màu nhưng copy-paste ở:

- `RoomGrid.tsx` (dòng 45–113)
- `RoomQuickViewDialog.tsx` (dòng 56–114)
- `MobileRoomsPage.tsx` (tương tự)
- `ReceptionQuickDialog.tsx` (vừa thêm `dotFromMeta`)

Hệ quả: muốn đổi 1 màu (vd `dnd` từ purple sang violet) phải sửa 4 file, dễ lệch. Đã có `ROOM_STATUS_META_V2` trong `src/lib/roomStatus.ts` nhưng các component không dùng đầy đủ.

**Fix**: thêm 2 helper `getRoomStatusDot(status)` / `getRoomStatusText(status)` vào `lib/roomStatus.ts`, refactor 4 file dùng chung.

### A2. 3 biến thể Room Detail

- `RoomDetailPage.tsx`
- `MobileRoomDetailPage.tsx`
- `StaffRoomDetailPage.tsx`

Cả 3 cùng hiển thị: booking hiện tại, items, history, status. Mỗi lần thêm field mới phải sửa 3 chỗ.

**Fix**: tách `RoomDetailSections/*` (BookingSection, ItemsSection, HistorySection, ChecksSection) → 3 page chỉ là wrapper khác layout (desktop/mobile/staff-restricted).

### A3. Page huyền bí `src/pages/Rooms.tsx`

Tồn tại song song với `src/pages/rooms/RoomsPage.tsx`. Cần xác minh: route nào vẫn dùng, cái nào dead code.

---

## B. Chưa nhất quán UI (lệch trải nghiệm giữa các view)

### B1. Header Quick View — vẫn chưa 100% giống nhau

Sau v1.1.56:

- `RoomQuickViewDialog`: dot 2.5x2.5 + room number bold + status text (không có chữ "Phòng")
- `ReceptionQuickDialog`: dot 2.5x2.5 + "Phòng {số}" + status text

Khác nhau ở chữ "Phòng" và kích thước/khoảng cách. Nên có 1 component `RoomQuickHeader` shared.

### B2. `RoomFloorMapView` còn 2 bảng màu cũ song song

File có cả `BUCKET_META` (5 bucket lễ tân) **và** `STATUS_STYLE` (12 status legacy, dòng 98–112) — cái thứ 2 không được dùng nữa sau khi chuyển sang bucket, là dead code.

### B3. Tape chart (`/rooms?view=floor`) chưa được đụng tới

- Vẫn dùng status colors cũ, không khớp Navy Trust palette
- Không có Quick View khi click ô — chỉ mở Booking Detail
- Mobile: chưa responsive

### B4. Nhãn tab "Lịch phòng" (`floor`) vs "Sơ đồ (Lễ tân)" (`map`) dễ nhầm

Cả 2 đều có icon Map và mô tả gần giống nhau ("dùng cho Lễ tân"). User có thể bấm nhầm.

**Fix**: đổi icon (Calendar cho floor, LayoutGrid cho map đã đúng) + đổi label "Lịch đặt phòng" vs "Sơ đồ tình trạng".

### B5. Mobile chưa có view "Sơ đồ Lễ tân"

`MobileRoomsPage` chỉ có 1 chế độ duy nhất (lưới). Lễ tân dùng tablet/iPad không thể switch sang Sơ đồ.

---

## C. Thiếu tính năng vận hành (impact nghiệp vụ)

### C1. `RoomStatusSelector` chưa support đủ 11 trạng thái v2

DB đã có: `vacant_clean, vacant_inspected, vacant_dirty, occupied_clean, occupied_dirty, dnd, service_refused, sleep_out, skipper, out_of_order, out_of_service`.
Cần audit `RoomStatusSelector` xem options + permission gate (`skipper` chỉ Owner/Manager, `dnd` chỉ Lễ tân, `out_of_order` chỉ Bảo trì).

### C2. Quick View không hiển thị "Phòng kế bên" / nhóm phòng

Khi 1 booking có 3 phòng (group), click 1 phòng không thấy 2 phòng còn lại. Group ring color đã có trên Floor Map nhưng dialog không show.

### C3. Long-press / right-click → mở RoomDetail full

Memory note (v1.1.55) đã ghi recommendation này nhưng chưa implement. Hiện chỉ có nút "Xem chi tiết phòng" trong popup → 2 clicks.

### C4. Legacy `RoomCheckPage` (replenish/delivery flow) chưa hiện đại hóa

Khi `?type=replenish` hoặc có `distribution_order_id`, RoomCheckRouter điều hướng sang `RoomCheckPage` cũ — UI cổ, không theo Lean/Navy Trust. Đây là flow Buồng phòng dùng hằng ngày.

### C5. Bulk actions thiếu "Đặt DND hàng loạt" và "Lift OOS hàng loạt"

Hiện `RoomBulkActionsBar` chỉ có Status change + Delete. Lễ tân thường set DND nhiều phòng cùng đoàn cao điểm.

---

## D. Rủi ro kỹ thuật

### D1. Performance Floor Map khi >100 phòng

`RoomFloorMapView` render tất cả room dot trong 1 grid không virtualize. Khách sạn 200 phòng + 4 KPI realtime + reception detail prefetch → có thể lag trên iPad cũ.

**Fix**: virtualize per-floor section hoặc lazy-render floor ngoài viewport.

### D2. `useFloorPlanLive` polling vs realtime

Cần verify có subscribe đúng channel `floor-plan-live` không, hay chỉ refetch theo interval. Nếu polling, mỗi lần check-in/out không cập nhật tức thì.

### D3. Memory file `mem://ux/rooms-grid-quick-view-consolidation-v1` không tồn tại trên disk

Index ghi đã tạo nhưng `.lovable/memory/ux/` không có file. Tiêu chuẩn release v1.1.55 chưa tròn — cần tạo lại hoặc xoá khỏi index để tránh nhầm lẫn.

---

## Đề xuất sprint "Rooms UX polish v2"

Chia 3 batch theo impact × effort. **Khuyến nghị làm batch 1 trước** (3–4 file, không đụng business logic).

### Batch 1 — Cleanup & Consistency (1 ngày, low risk)

- A1: extract `getRoomStatusDot/Text` vào `lib/roomStatus.ts`, refactor 4 file
- B1: tạo `RoomQuickHeader` shared component → 2 dialog cùng dùng
- B2: xoá `STATUS_STYLE` dead code trong `RoomFloorMapView`
- B4: rename tab labels "Lịch đặt phòng" / "Sơ đồ tình trạng"
- D3: tạo lại memory file đúng vị trí
- A3: xác minh + xoá `src/pages/Rooms.tsx` nếu dead

### Batch 2 — Tính năng vận hành (2–3 ngày, medium risk)

- C1: audit + bổ sung 11 trạng thái vào `RoomStatusSelector` với permission gate
- C2: hiển thị group rooms trong Quick View (cả 2 dialog)
- C3: long-press mobile / Cmd+click desktop → `/rooms/:id`
- C5: thêm bulk DND / bulk lift OOS

### Batch 3 — Heavy refactor (3–5 ngày, high impact)

- A2: tách `RoomDetailSections/*` shared cho 3 biến thể detail
- B3: refresh Tape chart theo Navy Trust + Quick View
- B5: thêm "Sơ đồ Lễ tân" cho mobile (chỉ tablet ≥768px)
- C4: hiện đại hóa `RoomCheckPage` replenish/delivery
- D1: virtualize Floor Map theo floor
- D2: verify realtime subscribe `useFloorPlanLive`

---

## Câu hỏi trước khi triển khai

1. Có muốn làm hết Batch 1 ngay luôn (1 commit, version 1.1.57)
2. Batch 3 có item nào ưu tiên hơn (Tape chart hay Detail refactor)?
3. Quy mô khách sạn lớn nhất trong tệp khách hiện tại là bao nhiêu phòng? (để quyết định D1 có gấp không) 200 phòng