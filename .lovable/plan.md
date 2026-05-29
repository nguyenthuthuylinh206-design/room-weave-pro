
# Nâng cấp Reception Quick Dialog — popup vận hành đầy đủ

## Mục tiêu
Biến popup hiện tại (chỉ hiện vài dòng cơ bản) thành **trung tâm điều phối phòng 1-click**: lễ tân không cần rời sơ đồ phòng để xem booking/CCCD/tài chính/operations và thực hiện các thao tác phổ biến nhất.

## Cấu trúc mới (1 popup, 3 tab + sticky footer)

```text
┌──────────────────────────────────────────┐
│ Phòng P102      Đang ở – đã dọn   [···] │  ← Header có menu Đổi trạng thái
│ Deluxe · King · Tầng 1 · 28m²           │
├──────────────────────────────────────────┤
│ [Tổng quan] [Tài chính] [Vận hành]      │  ← Tabs
├──────────────────────────────────────────┤
│ (nội dung tab)                          │
├──────────────────────────────────────────┤
│ [Gia hạn] [Chuyển phòng] [Chi tiết →]   │  ← Sticky footer (đổi theo trạng thái)
└──────────────────────────────────────────┘
```

### Tab 1 — Tổng quan
**Phòng đang có khách:**
- Khách: tên, SĐT (tap-to-call), email, số khách lớn/trẻ em, **VIP tag** (nếu có), quốc tịch
- CCCD/Passport: số giấy tờ + thumbnail ảnh (mở lightbox), nút "Xem CRM" → mở guest detail
- Booking meta: mã booking, nguồn (Walk-in/OTA/Direct), check-in thực tế, đêm đã ở / còn lại
- Checkout countdown card (giữ nguyên design hiện tại)
- Lịch sử: 2 lần lưu trú gần nhất tại hệ thống (tên ks + ngày)

**Phòng trống:**
- Giá đa kênh: card 3 cột Đêm / Giờ / Tháng + dòng nhỏ "Hôm nay là cuối tuần (+20%)" nếu match holiday/weekend
- Tiện nghi: chip list từ `rooms.amenities` jsonb (View biển, Ban công, Bồn tắm, Smoking, Wifi...)
- Mini-calendar 7 ngày: ô xanh = trống, ô đỏ = đã đặt (hover hiện tên khách)
- Booking gần nhất: tên + ngày + nguồn
- Banner cam "Sắp có khách lúc X" nếu next_booking < 24h (giữ)

### Tab 2 — Tài chính (chỉ hiện khi có booking)
```text
Tiền phòng              1.600.000 ₫
Dịch vụ thêm              250.000 ₫   (3 mục)
Minibar                    80.000 ₫   (2 mục)
Phụ thu sớm/muộn          100.000 ₫
─────────────────────────────────────
Tạm tính                1.930.000 ₫
Thuế GTGT (10%)           193.000 ₫
─────────────────────────────────────
Tổng tiền               2.123.000 ₫
Đã cọc                   -500.000 ₫
Đã thanh toán          -1.000.000 ₫
─────────────────────────────────────
CÒN PHẢI THU             623.000 ₫   ← đỏ nếu > 0
Trạng thái: Đã cọc · Chờ thanh toán
```
- Mở rộng từng nhóm (services/minibar) để xem item list
- Link nhỏ "Mở hoá đơn đầy đủ →" → `/bookings/:id?tab=invoice`

### Tab 3 — Vận hành
- **Task đang mở**: list ngắn (HK + Maintenance) — title, priority dot, người được giao, "Xem →"
- **Lần dọn cuối**: thời gian + nhân viên + điểm QC
- **Minibar cần bổ sung**: nếu có item dưới chuẩn → list + nút "Tạo distribution order"
- **Audit gần nhất**: 3 transition cuối của phòng (đã có hook `useRoomAuditLog`)

## Sticky footer actions (đổi theo trạng thái)

**Phòng có khách:**
- `[Gia hạn]` → mở `ExtendStayDialog` (đã có)
- `[Chuyển phòng]` → mở `MoveRoomDialog` (mới — chọn phòng cùng loại đang trống)
- `[Chi tiết booking →]` (giữ)

**Phòng trống:**
- `[Đặt phòng]` (primary) + `[Checkin nhanh]` (giữ)
- `[Tạo task]` → mở `QuickTaskDialog` chọn HK / Maintenance

**Menu `[···]` ở header (mọi trạng thái):**
- Đổi trạng thái: DND / OOS / Bảo trì / Gỡ về sạch (gọi `transition_room_status` RPC, đã có)
- Tạo task HK
- Tạo task Maintenance
- Xem lịch sử phòng (audit log)

## Technical

### Files mới
- `src/components/rooms/ReceptionQuickDialog.tsx` (refactor lớn — tách tabs)
- `src/components/rooms/reception-quick/OverviewTab.tsx`
- `src/components/rooms/reception-quick/FinanceTab.tsx`
- `src/components/rooms/reception-quick/OperationsTab.tsx`
- `src/components/rooms/reception-quick/QuickStatusMenu.tsx` (dropdown header)
- `src/components/rooms/reception-quick/MoveRoomDialog.tsx`
- `src/components/rooms/reception-quick/QuickTaskDialog.tsx`
- `src/hooks/useReceptionRoomDetail.ts` — 1 query gộp:
  - `rooms` (amenities, view, bed, max_guests, floor, base/hourly/monthly price)
  - `room_bookings` join `guests` (CCCD, VIP)
  - `service_charges` + `minibar_consumption` của booking hiện tại
  - `housekeeping_tasks` + `maintenance_requests` open
  - 2 lần lưu trú gần nhất của guest (qua phone)
  - Lịch 7 ngày tới (reuse `useRoomAvailability` nếu có)

### Reuse
- `useRoomAuditLog`, `transition_room_status` RPC
- `ExtendStayDialog` đã có ở `/bookings`
- `getRoomStatusMeta`, `formatCurrency`, `useGuestByPhone`

### Refactor
- Tách logic countdown & badge ra `lib/receptionFormat.ts` để reuse
- Đổi `max-w-sm` → `max-w-lg` (desktop) / fullscreen sheet (mobile <768)

### Mới (RPC nhỏ, optional)
- `get_room_reception_snapshot(p_room_id uuid)` — gộp toàn bộ query trên thành 1 RPC (giảm 5 round trip). Nếu không, dùng `Promise.all` ở client.

## Permission
- Tab Tài chính: ẩn nếu user không có `bookings.view_finance`
- Action Gia hạn/Chuyển phòng: cần `bookings.update`
- Đổi trạng thái DND/OOS: cần `rooms.update`
- Tạo task: cần `housekeeping.create` hoặc `maintenance.create`

## Mobile
- < 640px: dùng `Sheet` (bottom-up) thay `Dialog`, tabs scroll ngang
- Tap target ≥ 44px, footer sticky bám đáy

## QA checklist
- Phòng vacant_clean → hiện giá + amenities + lịch 7 ngày
- Phòng occupied có deposit + partial paid → financial tab tính đúng "còn phải thu"
- Phòng có 2 HK task open → operations tab hiện 2 row
- Tap `tel:` mở dialer trên iOS
- Đổi DND → realtime invalidate floor-plan + đóng popup
- Chuyển phòng: chỉ list phòng cùng loại, trạng thái sellable
- Không có permission finance → tab Tài chính không render

## Rollout
- Feature flag tạm thời `settings.reception.quick_dialog_v2` (default ON cho test hotel, sau 1 tuần bật toàn hệ thống)
- Bump version 1.0.98 + changelog
