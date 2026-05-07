
# Đợt B+C — Smart ReportIssueSheet + Multi-Issue + Side-Effect Engine

Triển khai §6–§11 spec trên codebase hiện tại. Chia 4 phase để rollout an toàn, **mỗi phase tự chạy độc lập**, không breaking trước khi phase sau hoàn tất.

---

## Phase B1 — Chuẩn hoá L1 + Sub-reason ENUM (UI-only, không đụng schema)

### Reuse
- `LeanReportIssueSheet` (đã đọc `assetGroup`, đã có 2 tầng).
- `BUCKET_MAP` + `resolveBucket` (mapping action → bucket).
- `getL1Options`.

### Refactor
- **`src/lib/issueBucketMapping.ts`** — viết lại `L1_BY_GROUP` theo đúng matrix §6.3 (4 options/group), thêm `subReasons?: SubReason[]` (enum list) thay `subReasonRequired: boolean`.
- Mỗi `SubReason = { key, label, derivedActionKey?, extra? }`.
- `BUCKET_MAP` mở rộng để cover các sub-reason mới: `linen.damaged_dirty + dirty_unprocessable`, `linen.damaged_dirty + torn`, `linen.lost_unknown + missing`, `consumable_free.suspicious_take`, `equipment_large.intermittent`, `electronic_accessory.battery_replacement`, `furniture.needs_replacement`, `bathroom_hardware.intermittent`, v.v.

### Add
- **`SubReasonPicker`** component mới — list radio lớn 56px, nằm sau khi chọn L1, trước stepper.
- `LeanIssueResult.subReasonKey: string` (replace `subReason: string` free-text).
- Photo policy mở rộng: nếu sub-reason có `extra.photo_required = true` thì bắt buộc.

### Risk
- Backward compat: `LeanIssue.subReason` (free-text) đang lưu trong localStorage draft 24h. → Migration nhẹ ở `useLeanDraft.ts`: nếu thấy `subReason` cũ mà không có `subReasonKey` → bỏ qua, log warn.

### Files
- `src/lib/issueBucketMapping.ts` (rewrite L1 matrix)
- `src/components/rooms/lean/SubReasonPicker.tsx` (new)
- `src/components/rooms/lean/LeanReportIssueSheet.tsx` (thay Textarea bằng Picker)
- `src/pages/rooms/LeanInspectionPage.tsx` (truyền/lưu `subReasonKey`)
- `src/hooks/useLeanDraft.ts` (drop legacy field on hydrate)

### Tests
- Unit: `getL1Options(group).length === 4` cho mọi group.
- Unit: `resolveBucket('linen.damaged_dirty.dirty_unprocessable')` → `sent_to_laundry + quality_issue`.
- Snapshot UI: mỗi group render đúng 4 option.

---

## Phase B2 — Multi-issue per item + primary/derived + constraint §8.3

### Refactor (UI state)
- `LeanInspectionPage.issues: Record<itemId, LeanIssue[]>` (mảng thay vì 1 record).
- Sheet cho phép "Thêm sự cố khác" sau khi save 1 issue → mở lại L1 cho cùng item.
- Hiển thị mỗi issue trong UI riêng biệt (badge + qty + sub-reason + nút sửa/xoá).

### Add: client-side validator
- `validateIssuesPerItem(itemId, issues, expectedQty)`:
  - `sumPrimary = sum(qty WHERE issueRole==='primary_issue')`
  - Nếu `sumPrimary > expectedQty` → block submit, toast: "Tổng số lượng sự cố chính vượt số đồ chuẩn (N). Vui lòng kiểm tra lại."
- Derived action không tính vào constraint.

### Submit payload
- `submit_room_check_lean` hiện nhận buckets dạng `[{item_id, quantity, ...}]`.
- Vẫn dùng cùng RPC, **gom theo bucket nhưng giữ `issue_role` trong từng entry** (jsonb).
- RPC sẽ chỉ validate `sum(primary by item) ≤ standard` — bổ sung trong Phase B3.

### Files
- `src/pages/rooms/LeanInspectionPage.tsx` (state + render multi)
- `src/components/rooms/lean/IssueListForItem.tsx` (new — list các issue đã ghi)
- `src/lib/leanIssueValidator.ts` (new)
- `src/hooks/useLeanDraft.ts` (shape mới: `issues: Record<itemId, LeanIssue[]>`, migrate từ object → array)

### Tests
- Validator: 4 khăn → 2 send_laundry + 1 lost + 1 damaged = OK; thêm 1 lost nữa = fail.
- Derived action không bị tính vào constraint.

---

## Phase C1 — Schema mới: `room_check_issues` + `outbox_events`

### Migration
```sql
CREATE TABLE room_check_issues (
  id uuid PK,
  room_check_id uuid FK room_checks,
  tenant_id uuid, hotel_id uuid, room_id uuid, item_id uuid,
  asset_group asset_group,
  ui_action_key text,         -- e.g. 'linen.damaged_dirty'
  sub_reason_key text,        -- e.g. 'dirty_unprocessable'
  bucket text,                -- items_damaged | items_lost | …
  issue_role text CHECK IN ('primary_issue','derived_action'),
  quantity int CHECK > 0,
  photos text[],
  notes text,
  needs_review bool DEFAULT false,
  charge_status charge_status DEFAULT 'not_applicable',
  extra jsonb DEFAULT '{}'::jsonb,
  created_by uuid, created_at timestamptz DEFAULT now()
);

CREATE TABLE outbox_events (
  id uuid PK,
  tenant_id uuid, hotel_id uuid,
  source_table text, source_id uuid,
  event_type text,            -- create_laundry_request | create_supplement_request | …
  payload jsonb,
  status text DEFAULT 'pending',  -- pending|processing|done|failed|dead
  attempts int DEFAULT 0,
  last_error text,
  scheduled_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON outbox_events (status, scheduled_at) WHERE status IN ('pending','failed');
```
+ RLS tenant isolation, indexes, audit triggers.

### RPC update
- `submit_room_check_lean` v2:
  - Insert `room_checks` (giữ jsonb summary cho dashboard cũ — compatibility).
  - **Insert N rows vào `room_check_issues`** (1/issue).
  - Validate constraint §8.3 server-side (raise `primary_quantity_exceeds_standard:item_id`).
  - **Enqueue `outbox_events`** theo bucket: `sent_to_laundry → create_laundry_request`, `replaced → create_supplement_request`, `damaged + create_maintenance → create_maintenance_request`, `consumed + charge_to_guest → create_pending_minibar_charge`.
  - Atomic — fail thì rollback cả checks + issues + outbox.

### Compat layer
- `room_checks.items_*` jsonb vẫn populate (đọc cũ vẫn chạy).
- View `room_check_issues_legacy` để Step 3 review/Step success render từ bảng mới.

### Files
- `supabase/migrations/<ts>_room_check_issues_outbox.sql`
- `src/types/roomCheck.types.ts` (+ types mới)
- `src/hooks/useRoomCheckLean.ts` (đọc lỗi mới)

### Tests
- `supabase/tests/room_check_issues.sql`: insert đúng N rows, constraint primary, outbox enqueue.

---

## Phase C2 — Side-effect Workers (edge functions, cron 1 phút)

### Add
- **`supabase/functions/process-room-check-outbox/index.ts`** — pull `pending` events, dispatch theo `event_type`:
  - `create_laundry_request` → insert `laundry_requests` (chưa trừ stock).
  - `create_supplement_request` → insert `supplement_requests`.
  - `create_maintenance_request` → insert `maintenance_requests` với priority theo asset_group/extra.
  - `create_pending_minibar_charge` → insert pending charge với `charge_status='pending_fo_confirm'`.
- Idempotency: dùng `outbox_events.id` làm `idempotency_key`.
- Retry: max 5 attempts với backoff, sau đó `dead`.
- Cron config trong `supabase/config.toml`.

### UI cho FO confirm
- Trang `/reception/pending-charges` (existing? check) — nếu chưa, tạo bảng list `room_check_issues WHERE charge_status='pending_fo_confirm'` với 2 nút Confirm/Reject → update `charge_status` + log audit.

### Tests
- Edge function unit: mỗi event_type sinh đúng 1 record bảng tương ứng.
- Idempotency: chạy 2 lần cùng event → chỉ 1 record.

---

## Phase C3 — Staff không thấy giá + charge_status hoàn thiện

### Refactor
- `LeanInspectionPage` query: dùng **`room_check_staff_items_view`** thay vì select trực tiếp `items.unit_price`.
- Bỏ field `unit_price` khỏi `EnrichedItem` cho role staff.
- Owner/manager view (Step 3 review) vẫn xem giá qua query khác.

### Files
- `src/pages/rooms/LeanInspectionPage.tsx`
- `src/hooks/useRoomItems.ts` (thêm variant `forStaff: boolean`)

---

## Permission / Role rules
- Staff: tạo `room_check_issues`, không update `charge_status`, không xem giá.
- Manager/Owner: review issues `needs_review=true`, set `charge_status`, reopen room check.
- FO: confirm/reject minibar pending charges.

## Rollout
1. **B1** (1-2 ngày) — UI thuần, có thể release ngay.
2. **B2** (1-2 ngày) — multi-issue, vẫn ghi vào jsonb cũ.
3. **C1** (2-3 ngày) — schema + RPC v2, chạy song song jsonb cho compat. Feature flag `settings.room_check.use_issue_table = false` (default) → bật từng hotel.
4. **C2** (2-3 ngày) — outbox + workers, bật khi C1 ổn định.
5. **C3** (1 ngày) — siết quyền xem giá.

## Rollback
- Mỗi phase có migration `DOWN`.
- Feature flag tắt → quay về flow cũ (jsonb only) trong < 1 phút.

## Phần còn thiếu sau plan này (out of scope)
- Manager review queue UI cho `needs_review=true` (sẽ làm sau C2).
- Linen lifecycle (`batch_inventory` retire khi `lifecycle_end`) — phụ thuộc Linen Pool Bridge.
- Chain HQ aggregate report — đợi multi-hotel rollout.

---

## Câu hỏi cần xác nhận trước khi bắt đầu

1. **Phase ưu tiên**: bắt đầu **B1+B2 ngay** (UI + multi-issue, dùng schema cũ) hay làm thẳng **C1+C2** (schema mới full)?
2. **Sub-reason**: dùng **ENUM list (radio)** đúng spec §6.2, hay giữ free-text + ENUM tuỳ chọn (hybrid)?
3. **Charge confirm UI**: tạo trang `/reception/pending-charges` mới, hay nhúng vào trang Reception/Booking detail hiện có?
