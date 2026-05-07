## Mục tiêu

Sửa lỗi `room_check_issue_outbox_issue_id_fkey` khiến `submit_room_check_lean` thất bại ngay khi INSERT primary issue đầu tiên.

## Phân tích

**Nguyên nhân chính:**
- Trigger `trg_rci_outbox_fanout` đang gắn **BEFORE INSERT** trên `room_check_issues`.
- Trong trigger, ta INSERT vào `room_check_issue_outbox(issue_id = NEW.id)`.
- FK constraint `room_check_issue_outbox.issue_id → room_check_issues.id` được kiểm tra ngay tại thời điểm INSERT outbox — nhưng row gốc trong `room_check_issues` chưa nằm trong bảng (BEFORE trigger chạy trước khi row được ghi). → FK violation.

**Nguyên nhân phụ — 2 trigger trùng chức năng:**
- `trg_rci_outbox_fanout` (BEFORE INSERT) — bản mới: có `payload`, `idempotency_key`, set `charge_status`, phân loại job_kind chi tiết (`inventory_lost`, `inventory_damaged`, `charge_guest`, `maintenance`, `supplement_request`...).
- `trg_enqueue_rci_jobs` (AFTER INSERT) — bản cũ: job_kind thô (`asset_lifecycle`, `charge_workflow`, `laundry`).
- Hai trigger ghi cùng outbox → tạo job_kind không thống nhất, gây nhiễu cho consumer.

## Giải pháp

### B. Migration

1. **Drop** trigger cũ `trg_enqueue_rci_jobs` và function `enqueue_room_check_issue_jobs()` (đã bị bản fanout mới thay thế).
2. **Drop & recreate** trigger `trg_rci_outbox_fanout` chuyển từ `BEFORE INSERT` sang `AFTER INSERT`.
   - Lưu ý: function hiện tại có gán `NEW.charge_status := ...` ở đầu — phần này phải tách ra một trigger BEFORE INSERT riêng (vì AFTER trigger không sửa được NEW).
3. **Tách** logic thành 2 function:
   - `trg_rci_set_charge_status()` — BEFORE INSERT, chỉ set `NEW.charge_status`.
   - `trg_rci_fanout_outbox()` — AFTER INSERT, làm phần insert outbox (giữ nguyên logic hiện tại từ dòng "IF NEW.issue_role = 'derived_action' THEN RETURN NEW" trở đi, đổi `RETURN NEW` thành `RETURN NULL` cho AFTER trigger).

### F. Test cases

1. Submit Lean với 1 item damaged primary_issue (`asset_group=furniture`) → kỳ vọng:
   - 1 row `room_check_issues`
   - 2 outbox rows: `inventory_damaged` + `maintenance`
2. Submit Lean với items_consumed `charge_to_guest=true` → 2 outbox: `inventory_consumed` + `charge_guest`.
3. Submit Lean với items_lost + `extra.create_supplement=true` → outbox: `inventory_lost` + `supplement_request`.
4. Submit Lean với derived_action → KHÔNG tạo outbox.
5. Resubmit cùng issue (giả lập) → ON CONFLICT (issue_id, job_kind) DO NOTHING không lỗi.
6. `charge_status` được set đúng: `pending_fo_confirm` khi `charge_to_guest=true`.

### G. Rollout notes

- Migration **forward-only an toàn**: chỉ thay trigger, không đổi schema bảng/FK.
- Rollback: tái tạo lại trigger BEFORE + function cũ từ định nghĩa hiện tại (đã lưu trong `.lovable/docs/sprint-qa-rollback.md` — sẽ append).
- Không cần backfill: outbox cũ vẫn dùng được, FK đã đúng cho row đã tồn tại.
- Tác động: chấm dứt FK violation, đồng thời loại bỏ job_kind trùng lặp từ trigger cũ.

## File sẽ thay đổi

- `supabase/migrations/<timestamp>_fix_rci_outbox_fanout_after_insert.sql` (mới)
- `.lovable/docs/sprint-qa-rollback.md` (append rollback snippet)

Không có thay đổi UI.
