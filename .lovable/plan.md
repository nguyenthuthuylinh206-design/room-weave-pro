# Hoàn thiện Room Check Lean Submission

## Mục tiêu
Sau khi fix `started_at`, RPC chạy được nhưng còn 3 vấn đề logic + 1 a11y. Plan này dọn sạch để Lean flow production-ready.

## A. Logic fix trong `submit_room_check_lean` RPC

### A1. Insert summary fields vào row room_checks
Hiện INSERT bỏ qua: `summary_issue_count`, `summary_ok_count`, `minibar_count`, `items_complete`.
→ Bổ sung vào INSERT (dòng 191–205) các cột này, gán trực tiếp từ `v_issue_count`, `v_ok_count`, `v_minibar_count`, và `items_complete = (v_issue_count = 0)`.

### A2. Tính `v_minibar_count` thật
Đếm số entry trong `_items_consumed` có `extra->>'minibar' = 'true'` HOẶC `ui_action LIKE 'minibar.%'`.
Dùng SQL: `SELECT count(*) FROM jsonb_array_elements(_items_consumed) e WHERE (e->'extra'->>'minibar')::boolean OR e->>'ui_action' LIKE 'minibar.%'`.

### A3. Tính `v_ok_count` thật
Lấy tổng `standard_quantity` (hoặc `count(*)`) từ `room_items` của `_room_id`, trừ đi số item xuất hiện trong các bucket primary_issue (distinct theo `item_id`).
→ Cần quyết định: đếm theo "số dòng item OK" hay "tổng quantity OK"? Đề xuất **số dòng item OK** vì phù hợp UI hiển thị "X/Y mục OK".

### A4. Trả về summary đúng trong jsonb response
Sau khi đã tính, response `summary_ok_count` / `summary_issue_count` / `summary_minibar_count` sẽ tự đúng (đã có sẵn).

## B. Backfill dữ liệu cũ (optional)

Set `started_at = checked_at` cho 3 room_checks cũ có `started_at IS NULL` để thống nhất (tránh UI nào join/sort trên `started_at` bị lệch). Migration 1 dòng:
`UPDATE room_checks SET started_at = checked_at WHERE started_at IS NULL`.

## C. UI/A11y fix

### C1. Thêm `SheetDescription` cho các Sheet thiếu mô tả
Console cảnh báo `Missing Description or aria-describedby for DialogContent`. Cần audit các Sheet trong Lean flow:
- `LeanReportIssueSheet`
- `ResumeDraftSheet`
- `QuickPathConfirmSheet`
→ Thêm `<SheetDescription>` (có thể `sr-only` nếu không muốn hiển thị) sau `SheetTitle`.

## D. Test cases sau fix

| # | Kịch bản | Expected |
|---|---|---|
| 1 | Lean submit với 2 issues + 1 minibar | room_checks row có `summary_issue_count=2`, `minibar_count=1`, `items_complete=false` |
| 2 | Lean submit không issue (qua đường thường, không Quick Path) | `items_complete=true`, `summary_ok_count = số room_items` |
| 3 | Trang /review hiển thị summary số đúng | Match với row vừa tạo |
| 4 | Console không còn warning Description | Pass a11y check |

## E. File dự kiến chỉnh

- **Migration mới**: tái định nghĩa `submit_room_check_lean` (CREATE OR REPLACE) + backfill `started_at` cho row cũ.
- **UI**: 3 file Sheet trong `src/pages/rooms/lean/` hoặc `src/components/room-check/lean/` — thêm `SheetDescription`.

## F. Rollback

- Migration: giữ migration cũ `20260507135524`, chỉ cần CREATE OR REPLACE lại function bản trước nếu cần revert.
- UI: trivial revert SheetDescription.

## G. Phần KHÔNG làm trong plan này

- Sprint 5 (Lean Distribution / Replenish variant) — đã agree để sau pilot.
- Refactor outbox fanout — đang chạy ổn.

## Câu hỏi xác nhận

Trước khi triển khai, cần bạn chốt:
1. **`v_ok_count` đếm theo "số dòng item OK" hay "tổng quantity OK"?** Đề xuất: số dòng item.
2. **Có backfill `started_at` cho 3 row cũ không?** Đề xuất: có (an toàn, không phá gì).
