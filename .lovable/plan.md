
# Tape Chart v2 — Danh sách nâng cấp đầy đủ

Đánh giá v1 hiện tại (đã chạy): hiển thị bar theo phòng × ngày, KPI cơ bản, click bar mở booking, click cell trống tạo booking, realtime invalidate. Còn thiếu rất nhiều thứ so với một PMS tape chart thật. Dưới đây là toàn bộ hạng mục cần nâng cấp, chia theo nhóm ưu tiên.

---

## A. Nghiệp vụ buồng phòng còn thiếu (CRITICAL)

1. **Half-day rendering theo giờ thực** — hiện đang vẽ nửa cell cứng. Cần dùng `expected_check_in_time` / `expected_check_out_time` (mặc định 14:00 / 12:00) để bar bắt đầu/kết thúc đúng giờ → tránh trùng "ảo" giữa khách check-out sáng và khách check-in chiều cùng phòng cùng ngày.
2. **Phát hiện & cảnh báo overbooking / xung đột** — 2 booking đè lên cùng phòng cùng khoảng giờ phải hiển thị viền đỏ + icon cảnh báo + stack 2 hàng trong cùng row.
3. **Trạng thái phòng v2 đầy đủ** — hiện chỉ chặn `out_of_order` / `out_of_service`. Cần render rõ: `dirty`, `cleaning`, `inspected`, `dnd`, `maintenance`, `blocked` với pattern/màu riêng trên cell hôm nay.
4. **Block phòng (Room Block / OOO / OOS) theo khoảng ngày** — bảng `room_blocks` (mới) để chặn phòng theo range (bảo trì, VIP hold, sửa chữa), render như bar xám sọc, không cho tạo booking lên.
5. **Group booking visualization** — booking cùng `booking_group_id` cần border-left dày cùng màu + badge nhóm + click 1 bar highlight toàn bộ nhóm.
6. **Phân biệt walk-in / OTA / direct** — badge nhỏ ở góc bar (WI / BK / AG / DR…) theo `booking_source`.
7. **VIP / repeat guest / khách có ghi chú đặc biệt** — icon ngôi sao/cờ ở đầu bar.
8. **Trạng thái thanh toán chi tiết** — hiện chỉ "đủ / nợ". Cần: chưa cọc, đã cọc một phần, đã cọc đủ, đã thanh toán, còn nợ sau trả → 5 trạng thái màu/icon riêng.
9. **Multi-room booking** — 1 booking có nhiều phòng phải vẽ trên nhiều row với cùng màu/cùng group highlight.
10. **No-show & cancelled** — hiện RPC chỉ lấy 3 status. Thêm `no_show`, `cancelled` (tùy filter bật/tắt) để lễ tân không tưởng nhầm phòng trống.

## B. Tương tác lễ tân (HIGH)

11. **Drag-to-move booking** — kéo bar sang phòng khác / đổi ngày, gọi RPC `move_booking(booking_id, new_room_id, new_check_in, new_check_out)` có validate xung đột + audit log.
12. **Drag edge để extend/shorten** — kéo cạnh phải/trái để gia hạn hoặc rút ngắn, RPC `resize_booking`.
13. **Drag-to-create** — kéo chuột trên các cell trống để tạo booking nhanh, mở dialog pre-filled.
14. **Right-click context menu trên bar** — Check-in, Check-out, Đổi phòng, Gia hạn, Thu tiền, In hóa đơn, Hủy, Xem chi tiết.
15. **Hover preview giàu thông tin** — thay tooltip hiện tại bằng popover có: ảnh khách, ID đã scan, dịch vụ thêm, minibar, ghi chú nội bộ.
16. **Quick action trên bar** — nút mini Check-in / Check-out hiện khi hover nếu đúng ngày.
17. **Bottom-sheet booking detail (mobile)** — thay vì navigate sang `/bookings/:id`, mở sheet inline để không mất context tape chart.

## C. Bộ lọc & view (HIGH)

18. **Filter theo loại phòng, tầng, trạng thái phòng, nguồn booking, có nợ, VIP**.
19. **Search nhanh** theo tên khách / SĐT / số phòng / mã booking → highlight bar.
20. **View 1 ngày / 1 tuần / 2 tuần / 1 tháng** (hiện 3/7/14) + presets "Tuần này", "Cuối tuần", "Tháng này".
21. **Jump-to-date picker** thay vì chỉ next/prev.
22. **Group by**: theo Tầng (hiện có), theo Loại phòng, theo Khu/Block, theo Trạng thái sạch/dơ.
23. **Sticky "Hôm nay" indicator** — đường kẻ dọc đỏ ở cột ngày hiện tại, kéo dài toàn bảng.
24. **Now line** (giờ hiện tại) — đường dọc mảnh chạy theo giờ trong cell hôm nay khi view nhỏ.

## D. KPI & sidebar nghiệp vụ (MEDIUM)

25. **KPI mở rộng theo ngày đang xem** (không chỉ hôm nay): Arrivals/Departures/Stayover/Available cho mỗi ngày → hàng tổng kết ở dưới header date.
26. **Occupancy %, ADR, RevPAR theo ngày** — hàng metrics dưới header date.
27. **Pickup pace** — so với cùng kỳ tuần trước.
28. **Sidebar "Cần làm hôm nay"** — danh sách arrivals chưa check-in, departures chưa check-out, phòng dơ chưa làm, booking còn nợ.

## E. Hiệu năng & kỹ thuật (HIGH)

29. **Virtualization theo row** (react-window) — khách sạn 100+ phòng × 14 ngày hiện sẽ lag.
30. **Tách query**: rooms cache dài, bookings range ngắn → giảm payload realtime.
31. **Optimistic update** khi drag/move để UI không nhấp nháy chờ RPC.
32. **Index DB**: `room_bookings(hotel_id, check_in_date, check_out_date)` GIST range index để query nhanh.
33. **Realtime hiện tại invalidate quá rộng** (mọi event invalidate toàn bộ key) → patch trực tiếp cache theo payload.
34. **Memo `buildRoomLayouts` per room** — hiện đang gọi cho từng booking riêng lẻ trong loop.
35. **Mobile horizontal swipe gesture** — vuốt trái/phải để next/prev ngày.

## F. Migration / Schema cần thêm

```sql
-- room_blocks
CREATE TABLE public.room_blocks (
  id uuid pk, tenant_id, hotel_id, room_id,
  start_date date, end_date date,
  reason text, block_type text, -- ooo/oos/vip_hold/maintenance
  created_by, created_at
);
-- index GIST cho range
-- RPC: move_booking, resize_booking, create_room_block
-- get_tape_chart v2: trả thêm room_blocks[], group_info, payment_state enum, has_conflict
```

## G. Permission

- `view_tape_chart` (mặc định = view_rooms + view_bookings).
- `move_booking`, `resize_booking`, `create_room_block` → manager+ only; staff chỉ click để chuyển sang flow chuẩn.
- All Hotels mode: tape chart disable (đã có guard chung), hiển thị empty state riêng.

## H. UX nhỏ nhưng đáng giá

36. **Tô nền cell ngày lễ VN** (lấy từ bảng `holidays` nếu có) để dự báo cao điểm.
37. **Hover row highlight toàn dòng + cột ngày** (crosshair) để dễ đọc khi nhiều phòng.
38. **Print / Export PDF** view tape chart hiện tại cho ca trực.
39. **Lưu preference người dùng**: view ngày, group by, filter cuối cùng → localStorage per user.
40. **Color-blind mode** — dùng pattern (sọc, chấm) phụ trợ màu.

## I. Test cases tối thiểu

- Booking check-in 14:00 và check-out 12:00 cùng ngày cùng phòng → không bị coi là conflict.
- Drag move sang phòng đang có booking → block + toast lỗi tiếng Việt.
- Group booking 5 phòng → click 1 bar highlight cả 5.
- Room block phủ 3 ngày → cell trống bị chặn tạo booking.
- 200 phòng × 14 ngày: scroll 60fps, initial render < 800ms.
- Realtime: 2 thiết bị, tạo booking ở máy A → máy B thấy bar trong < 2s không full reload.

## J. Rollout

- **Phase 2a (1-2 ngày)**: Half-day theo giờ thực, status v2 đầy đủ, payment 5-state, conflict detection, group highlight, sidebar "Cần làm", filter cơ bản, now-line, jump-to-date, bottom-sheet detail mobile, virtualization.
- **Phase 2b**: room_blocks (schema + UI), drag-move/resize/create với RPC + audit, context menu, multi-room booking render.
- **Phase 2c**: KPI nâng cao (ADR/RevPAR/pickup), export PDF, holidays, preference lưu trữ, color-blind mode.

Mỗi phase tự bump `APP_VERSION` + `CURRENT_VERSION` + changelog theo convention dự án.

---

Nói "triển khai Phase 2a" để mình bắt đầu code phần ưu tiên nhất (nghiệp vụ + tương tác lễ tân + hiệu năng).
