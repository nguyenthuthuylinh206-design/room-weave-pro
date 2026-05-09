## Mục tiêu
Verify trên DB production rằng 4 flow Room Check (Lean submit, Quick, Reopen, Undo) chạy thông suốt, không còn lỗi `audit_log_action_check` và `log_state_transition` truyền đúng tham số.

## Cách làm — script SQL test idempotent

Dùng `supabase--read_query` + `supabase--insert` (không cần migration) để chạy kịch bản test trên 1 phòng test thật, sau đó cleanup.

### Bước 0 — Chuẩn bị (read-only)
- Pick 1 tenant + hotel + room đang `available` ít hoạt động (qua `supabase--read_query`).
- Snapshot `count(*)` của `audit_log` và `room_checks` cho room đó.

### Bước 1 — Quick submit
```sql
SELECT public.perform_quick_room_check(
  _room_id := '<room_id>', _check_type := 'daily',
  _notes := 'E2E quick test', _photos := '{}'::text[]
);
```
- Verify: `room_checks` có row mới `check_mode='quick'`, `audit_log` có action `quick_submit` (hoặc `insert` từ trigger), không lỗi.

### Bước 2 — Undo quick (trong cửa sổ 10 phút)
```sql
SELECT public.undo_quick_room_check(_check_id := '<id từ B1>', _reason := 'E2E undo test');
```
- Verify: row đó `status='undone'`, `audit_log` có action `undo_quick` với `tenant_id` đúng (không null).

### Bước 3 — Lean standard submit
```sql
SELECT public.submit_room_check_lean(
  _room_id := '<room_id>', _check_type := 'daily',
  _started_at := now() - interval '1 minute',
  _notes := 'E2E lean test',
  _photos := '{}'::text[],
  _items_missing := '[]'::jsonb, _items_damaged := '[]'::jsonb,
  _items_lost := '[]'::jsonb, _items_consumed := '[]'::jsonb,
  _items_replaced := '[]'::jsonb,
  _task_id := NULL
);
```
- Verify: row `check_mode='standard'`, `status='submitted'`, `audit_log` có `lean_submit`.

### Bước 4 — Reopen
```sql
SELECT public.reopen_room_check(_check_id := '<id từ B3>', _reason := 'E2E reopen test');
```
- Verify: row đó `status='reopened'`, notes có chứa lý do, `audit_log` có `reopen`.

### Bước 5 — Negative: action rác
```sql
INSERT INTO audit_log(tenant_id, action, entity_type, entity_id) 
VALUES ('<tid>', 'INVALID ACTION!', 'test', gen_random_uuid());
```
- Expect: bị reject bởi regex (`audit_log_action_check`).

### Bước 6 — Cleanup
- DELETE 2 row room_checks vừa tạo (qua `supabase--insert`).
- Báo cáo diff `audit_log` count + danh sách action mới.

## Lưu ý
- Cần user cấp quyền `auth.uid()` thực — RPC dùng `auth.uid()` để check role. Vì psql/SQL editor chạy với `service_role`, các check `forbidden_role`/`forbidden_tenant` có thể bypass hoặc fail tuỳ implementation. Nếu RPC fail vì auth context, sẽ test qua **edge function tạm** hoặc đề nghị user thao tác trực tiếp trên UI từng flow và ta đọc log đối chiếu.
- Nếu user chọn test qua UI: ta sẽ chỉ chạy bước 0 (chọn room) + bước 6 (đọc audit_log sau mỗi thao tác user) thay vì gọi RPC trực tiếp.

## Output cuối
Bảng tổng kết:

| Flow | RPC OK | audit_log action | tenant_id đúng | Ghi chú |
|------|--------|------------------|----------------|---------|
| Quick | ✅/❌ | quick_submit | ✅ | |
| Undo | ✅/❌ | undo_quick | ✅ | |
| Lean | ✅/❌ | lean_submit | ✅ | |
| Reopen | ✅/❌ | reopen | ✅ | |
| Negative | reject | — | — | regex chặn |

## Phần CHƯA làm
- Không sửa code/migration (chỉ test).
- Không test booking_transition / cron grace (ngoài scope user yêu cầu).
