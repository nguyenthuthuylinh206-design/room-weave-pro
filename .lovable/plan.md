## Mục tiêu

Trang `/rooms/:id` hiện vẫn còn quá nhiều "card chữ", thiếu tính dashboard thật sự, và phải scroll. Bản v3 sẽ là **Trang vận hành 1 màn hình** (no scroll ở viewport 1234×895), chia làm 3 vùng cố định, dữ liệu được trực quan hóa bằng số lớn + chart nhỏ, mọi danh sách dài đều scroll **bên trong panel** chứ không scroll trang.

## Wireframe v3 — Ops Console 1-screen

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← P101  [Đang ở]  Deluxe • Tầng 1 • 28m² • Giường Queen • View Sea        │
│                                       [Sửa] [Yêu cầu CV] [Reset] [Kiểm tra]│
├────────────────────────────────────────────────────────────────────────────┤
│ ⚠ Banner cảnh báo (chỉ khi có) — cleaning hoặc đơn giao pending           │
└────────────────────────────────────────────────────────────────────────────┘

╔════════════ ROW 1 — 3 PANEL HERO (cao ~320px) ═════════════════════════════╗
║ ┌─ KHÁCH & BOOKING (4/12) ─┐ ┌─ TÌNH TRẠNG TÀI SẢN (4/12) ┐ ┌─ HIỆU SUẤT 30N (4/12)┐
║ │ Nguyễn Văn A     [Đang ở]│ │     ╭───╮  Đồ dùng         │ │  12.500.000 ₫        │
║ │ 0901 234 567             │ │    ╱ 92% ╲ ▓ 24 đủ         │ │  Doanh thu tháng     │
║ │                          │ │    ╲     ╱ ▓ 2 thiếu       │ │  ▁▂▃▅▇▆▄▃▅▇▆▄ spark │
║ │ CI 09/05 08:30           │ │     ╰───╯ ▓ 1 hỏng         │ │                      │
║ │ CO 11/05 12:00           │ │                            │ │  ┌────┬────┬────┐    │
║ │ Còn 2 đêm                │ │ 🚚 1 đơn giao chờ          │ │  │ 78%│1.2M│ 92 │    │
║ │                          │ │    [Xem]                   │ │  │ Occ│ ADR│Heal│    │
║ │ Tổng:    1.700.000 ₫     │ │                            │ │  └────┴────┴────┘    │
║ │ Đã trả:  1.200.000 ₫     │ │ Lần check gần nhất         │ │                      │
║ │ Còn nợ:    500.000 ₫ 🔴 │ │ 09/05 • Lan • 4.5/5        │ │  18 lượt khách / 30N │
║ │                          │ │ [4 ảnh thumbnail]          │ │  Avg stay: 1.6 đêm   │
║ │ [Xem booking]            │ │                            │ │                      │
║ └──────────────────────────┘ └────────────────────────────┘ └──────────────────────┘
╚════════════════════════════════════════════════════════════════════════════╝

╔════════════ ROW 2 — 2 PANEL CHÍNH (cao ~360px, scroll nội bộ) ═════════════╗
║ ┌─ ĐỒ DÙNG (7/12) ─────────────────────┐ ┌─ DÒNG THỜI GIAN (5/12) ────────┐
║ │ Tabs: [Thiếu(2)] [Tiêu chuẩn(24)] [Khác(3)]   [Áp dụng] [In] │ │ Bộ lọc: [Tất cả ▾]          │
║ │ ──────────────────────────────────── │ │ ─────────────────────────── │
║ │ ▌ Khăn tắm        24/26   2 thiếu 🔴│ │ ● 09/05 14:20 — Kiểm tra   │
║ │ ▌ Dầu gội         12/12       Đủ ✔ │ │   Lan • 4.5/5 • 4 ảnh       │
║ │ ▌ Ga giường        2/2        Đủ ✔ │ │ ● 09/05 11:00 — Giao đồ     │
║ │ … (scroll trong panel)               │ │   2× Khăn tắm — đã nhận     │
║ │                                      │ │ ● 08/05 09:15 — Check-in    │
║ │                                      │ │   Nguyễn Văn A              │
║ │                                      │ │ ● 07/05 16:40 — Check-out   │
║ │                                      │ │   Trần Văn B                │
║ │                                      │ │ … (scroll trong panel)      │
║ └──────────────────────────────────────┘ └─────────────────────────────┘
╚════════════════════════════════════════════════════════════════════════════╝
```

Tổng chiều cao: header 56 + banner (optional, ẩn được) + Row1 320 + gap 12 + Row2 360 + padding ≈ 780-820px → vừa khít 895px viewport, không cần scroll trang.

## Quyết định thiết kế then chốt

1. **No-scroll page**: container ngoài cùng `h-[calc(100vh-var(--header))] overflow-hidden`. Chỉ list items + timeline có `overflow-y-auto` bên trong panel.
2. **Charts thật, không "ô số khô"**:
   - Panel "Tình trạng tài sản": **donut chart** (recharts `ReusablePieChart`) ở giữa, lõi hiển thị `92%` đồ dùng đạt chuẩn, legend bên phải tách 3 trạng thái (Đủ / Thiếu / Hỏng).
   - Panel "Hiệu suất 30N": **sparkline doanh thu** (`ReusableLineChart` mini, không trục) phía trên, 3 ô KPI Occupancy / ADR / Health score phía dưới.
3. **Gộp lịch sử kiểm tra + giao đồ + check-in/out** thành 1 **timeline thống nhất** (panel phải Row 2). Mỗi event có chấm màu theo loại + filter dropdown. Bỏ 2 panel rời rạc cũ — đây là gốc rễ vấn đề "chưa trực quan".
4. **Bỏ block "Thông tin phòng" 6 cột** — nhồi vào 1 dòng subtitle dưới header (Loại • Tầng • Diện tích • Giường • View). Tiện nghi & ghi chú ẩn trong tooltip/popover khi hover trên subtitle, không chiếm chiều cao chính.
5. **Tabs cho danh sách đồ dùng** (Thiếu / Tiêu chuẩn / Khác) → cho phép tập trung vào "Thiếu" mặc định, đỡ choáng.
6. **Khách & Booking** đầy đủ tài chính (Tổng / Đã trả / Còn nợ tô đỏ khi >0) thay vì chỉ tên + ngày — dữ liệu đã có sẵn trong `RoomBooking`.

## File sẽ sửa / thêm

**Sửa**
- `src/pages/rooms/RoomDetailPage.tsx` — thay layout sang grid 12 cột, 2 row cố định chiều cao, container no-scroll.

**Thêm mới**
- `src/components/rooms/detail/PanelGuestBooking.tsx` — Row1 col1, dùng `useRoomBooking`. Hiển thị tài chính + countdown đêm còn lại.
- `src/components/rooms/detail/PanelAssetStatus.tsx` — Row1 col2, donut chart + lần check gần nhất + ảnh thumbnails + badge đơn giao pending.
- `src/components/rooms/detail/PanelPerformance.tsx` — Row1 col3, dùng hook mới `useRoomPerformance(roomId, 30)` (query bookings 30 ngày: doanh thu, ADR = revenue/nights, occupancy = nights/30, sparkline daily revenue).
- `src/components/rooms/detail/PanelItems.tsx` — Row2 col1, wrap `RoomItemsList` với tabs Thiếu/Tiêu chuẩn/Khác, header gọn.
- `src/components/rooms/detail/PanelTimeline.tsx` — Row2 col2, gộp `recent_checks` + `useRoomDistributionHistory` + (tùy) `room_status_history` thành 1 mảng event sort theo time desc, render timeline 1 cột với chấm màu + filter.
- `src/components/rooms/detail/RoomMetaSubtitle.tsx` — dòng meta dưới header + popover Tiện nghi/Ghi chú.
- `src/hooks/useRoomPerformance.ts` — RPC hoặc query trực tiếp `bookings` filter `room_id`, khoảng 30 ngày, tenant_id eq, trả về `{ totalRevenue, occupancyRate, adr, dailyRevenue: {date, revenue}[], guestCount, avgStay }`.

**Không đụng**
- `MobileRoomDetailPage` (mobile giữ nguyên).
- Logic check, RPC, schema.

## Migration / DB

- Không cần migration. Hook `useRoomPerformance` chỉ SELECT từ `bookings` (đã có RLS + tenant_id). Bao gồm `tenant_id` filter bắt buộc.

## Test cases

- Phòng đang có khách → Panel Guest hiển thị tài chính, Còn nợ đỏ khi >0.
- Phòng trống → Panel Guest hiển thị "Phòng sẵn sàng" + nút Tạo booking, các panel khác vẫn render.
- Phòng chưa có items → Panel Items hiển thị empty + nút Áp dụng tiêu chuẩn.
- Phòng chưa có check nào trong 30N → Panel Performance hiển thị 0 + skeleton sparkline.
- Viewport 1234×895 (hiện tại): không xuất hiện scrollbar dọc trang.
- Viewport 1366×768 (laptop nhỏ phổ biến VN): vẫn fit, panel scale theo, danh sách scroll nội bộ.
- Viewport ≥1536: max-w-7xl, panel rộng ra cân đối.
- Tablet/Mobile: bypass — render `MobileRoomDetailPage` như cũ.

## Rollout

- 1 page rewrite + 6 component mới + 1 hook mới + 0 migration → low risk.
- Không feature flag — thay trực tiếp vì layout cũ user đã từ chối.
- Mobile path không bị ảnh hưởng.
