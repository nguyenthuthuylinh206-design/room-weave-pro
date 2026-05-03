# Plan: Tạo tài liệu logic Room Check ↔ Kho ↔ Giặt là

## Mục tiêu
Tạo 1 file `docs/room-check-vs-inventory-laundry.md` mô tả **chính xác hành vi hiện tại** của hệ thống — không phải spec mới — phục vụ:
- Onboard kỹ sư mới vào module rooms/inventory/laundry.
- Cơ sở để debug khi kho lệch sau khi check phòng.
- Tham chiếu khi mở rộng RPC `submit_room_check_lean` ở phase sau.

## File sẽ tạo
- **`docs/room-check-vs-inventory-laundry.md`** (~9 KB, ~250 dòng)

## Cấu trúc nội dung (8 phần)

1. **Sơ đồ tổng** — ASCII diagram: Room Check → room_items / items / warehouse_stock / auto-create requests / laundry batch.
2. **Phân loại đồ (Item Types)** — bảng 4 type (`linen`, `consumable`, `equipment`, `furniture`) + thuộc tính `is_chargeable` + heuristic minibar; bảng 6 bucket JSONB của `room_checks`.
3. **5 loại Room Check** — `checkin`/`daily`/`periodic`/`checkout`/`maintenance`: bảng "có trừ kho không, có tạo request không" + mô tả từng nút bấm trên flow Lean (Overview/Inspection/Review) và flow Classic (`processCheckoutCheck`/`processDailyCheck`).
4. **3 RPC nghiệp vụ chính**:
   - `atomic_item_to_laundry` / `atomic_item_lost` / `atomic_item_consumed` — bảng tác động lên `items` và `warehouse_stock` (default warehouse).
   - `submit_room_check_lean` — **gap quan trọng**: chỉ insert + audit, KHÔNG side-effect kho/giặt/bảo trì.
   - `perform_quick_room_check` + `add_laundry_to_draft_batch`.
5. **Auto-create requests** (chỉ classic checkout): bảng điều kiện → bảng request được tạo (`laundry_requests` / `supplement_requests` / `maintenance_requests`) + map damage_level→priority + notification gửi role manager.
6. **Vòng đời Laundry Batch**: state machine `draft → delivered → washing → ready → received` + trigger `laundry_batch_items_update_inventory` (INSERT trừ stock + ↑wash_cycles; UPDATE cộng stock theo `quantity_returned`/lost/damaged) + cảnh báo double-deduct.
7. **Pitfalls**: Lean RPC chưa side-effect kho, warehouse mặc định bắt buộc, `quantity_in_stock` floor 0, daily không tạo `inventory_transactions`, default `chargeToGuest` per-bucket, photo policy chỉ áp Lean, conflict detection.
8. **Bảng quyết định nhanh**: 8 tình huống vận hành × bucket × trừ items.qty × trừ warehouse_stock × request được tạo.

Phụ lục: tham chiếu file TS (`useRoomChecks.ts`, `useRoomCheckLean.ts`, `roomCheckLeanErrors.ts`, `LeanReportIssueSheet.tsx`) và migration (`20260503023425_*`, `20260308055642_*`, `20251108025001_*`, `20260204154606_*`, `20251230035831_*`).

## Nguyên tắc viết
- Tiếng Việt, dùng đúng thuật ngữ project (Khách vãng lai, Thuế GTGT...).
- Không phải spec — mô tả **state hiện tại** từ code đã đọc.
- Mỗi claim đều trỏ về file/migration cụ thể.
- Không thêm mã giả, dùng bảng + ASCII diagram.

## Sau khi duyệt plan
Khi chuyển sang build mode, tôi sẽ ghi đúng 1 file `docs/room-check-vs-inventory-laundry.md` với toàn bộ nội dung đã soạn sẵn (đã viết xong khi exploration). Không thay đổi code, không migration, không test.
