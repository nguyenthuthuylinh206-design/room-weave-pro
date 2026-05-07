## Mục tiêu

Sửa triệt để lỗi `audit_log_action_check` trên mọi flow (Lean submit, Quick check, Reopen, Undo, Booking/Task transition, Tenant read-only, Cron grace) bằng **một migration duy nhất**.

## Phân tích

`public.audit_log` có CHECK chỉ cho phép 5 action: `insert | update | delete | state_change | qc_action`. Hiện toàn bộ hệ thống state machine v2 + room check Lean đều truyền action mô tả nghiệp vụ (`lean_submit`, `quick_submit`, `reopen`, `booking_transition`, `cron`, `rpc`, …). Mọi RPC này đều rollback ngay tại bước audit.

### Inventory action đang dùng (đã grep từ pg_proc)

- `lean_submit`, `quick_submit`, `reopen`, `undo_quick`
- `booking_transition`, `task_transition` / `task_qc_*`
- `room_status_transition` (state machine v2)
- `rpc`, `cron`, `forced`, `auto`

### Lỗi phụ phát hiện kèm

`undo_quick_room_check` đang gọi `log_state_transition` **sai thứ tự tham số** (thiếu `tenant_id`, `hotel_id`, đẩy `'room_check'` vào vị trí `tenant_id`). Sẽ sửa luôn để khi constraint mở rộng vẫn không bị lỗi UUID cast.

## Giải pháp

### Bước 1 — Mở rộng CHECK constraint (chiến lược chính)

Thay vì sửa 10+ RPC, chuẩn hoá CHECK theo **whitelist mở rộng + namespace bằng dấu `.` cho tương lai**:

```sql
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_check;

ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
CHECK (
  action ~ '^[a-z][a-z0-9_.]{1,63}$'
);
```

Lý do: dùng pattern (regex) thay vì enum cứng → mọi action snake_case hợp lệ đều OK, không cần sửa RPC mỗi lần thêm flow mới. Vẫn chặn được giá trị rác / SQL injection / chuỗi rỗng. Đây là pattern Supabase dùng cho audit log generic.

### Bước 2 — Sửa `undo_quick_room_check` truyền đúng arg

```
log_state_transition(
  v_tenant_id, v_hotel_id, 'room_checks', _check_id,
  'undo_quick', v_check.status, 'undone', _reason,
  jsonb_build_object('room_id', v_check.room_id, 'check_mode', v_check.check_mode)
)
```

(cần SELECT thêm `tenant_id, hotel_id` từ `room_checks` vào biến cục bộ).

### Bước 3 — Backfill / không cần

Audit log không có row "lỗi" tồn đọng (transaction đã rollback). Không cần backfill.

### F. Test cases

1. Submit Lean (1 issue damaged) → `audit_log` có row action=`lean_submit`.
2. Quick Path → row action=`quick_submit`.
3. Reopen room check → action=`reopen`.
4. Undo quick check → action=`undo_quick`, `tenant_id` đúng (không null).
5. Transition booking confirmed→checked_in → action=`booking_transition`.
6. Cron grace period → action=`cron`.
7. Insert action rác `'INVALID ACTION!'` → bị reject bởi regex.

### G. Rollout & rollback

- **Forward-only**, chỉ thay 1 CHECK + 1 function. Không khoá bảng lâu (CHECK validate constant time vì action ngắn).
- Rollback: `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT … CHECK (action IN (5 giá trị cũ))` — nhưng sẽ vỡ Lean flow, chỉ làm khi rollback toàn bộ Sprint State Machine v2.

## File sẽ thay đổi

- `supabase/migrations/<ts>_relax_audit_log_action_and_fix_undo.sql` (mới)
- Không thay đổi UI / TS code.

## Phần CHƯA làm trong plan này

- Không refactor 10+ RPC để chuẩn hoá tên action (tốn thời gian, ít lợi ích — pattern regex đã đủ an toàn).
- Không thêm enum DB type cho action (rigid, mỗi sprint phải migration).
