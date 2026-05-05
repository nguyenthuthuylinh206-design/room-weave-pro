# Kế hoạch triển khai 3 Đợt — Decision v1.2 Final Cleanup

> Đợt nào cũng có: **Mục tiêu → Migration → RPC/Backend → UI → Test → Pilot → Rollback**
> Ngôn ngữ đời thường, không thuật ngữ chuyên ngành.

---

## Bối cảnh

Hệ thống Kiểm phòng (Lean v1) đang chạy ổn. Tài liệu Decision v1.2 muốn **làm sạch nghiệp vụ phía sau** mà KHÔNG đập đi xây lại UI. Chia 3 đợt để giảm rủi ro:

| Đợt | Tên | Thời gian | Rủi ro |
|---|---|---|---|
| **A** | Nền móng an toàn | 2 tuần | 🟢 Thấp |
| **B** | Smart Sheet + Sửa luồng giặt | 3 tuần | 🟡 Trung bình |
| **C** | Workflow tính tiền + Vai trò mới | 3 tuần | 🟠 Cần pilot |
| ~~D~~ | ~~Outbox Pattern~~ | Hoãn | Quá đắt cho hiện tại |

Tổng: ~8 tuần. Mỗi đợt rollout xong thì pilot 7 ngày trước khi qua đợt sau.

---

# 🟢 ĐỢT A — Nền móng an toàn (2 tuần)

**Mục tiêu**: Chuẩn bị schema và quyền cho 2 đợt sau, **không thay đổi gì người dùng cảm nhận được**.

## A.1. Migration — Phân nhóm tài sản 9 nhóm

**File**: `supabase/migrations/<timestamp>_a1_asset_group.sql`

```sql
-- 1. Enum 9 nhóm nghiệp vụ
CREATE TYPE public.asset_group AS ENUM (
  'linen', 'consumable_free', 'minibar', 'stationery',
  'equipment_large', 'electronic_accessory', 'furniture',
  'glassware', 'bathroom_hardware'
);

-- 2. Cột mới trên items (nullable trước, sẽ backfill)
ALTER TABLE public.items
  ADD COLUMN asset_group public.asset_group,
  ADD COLUMN migration_review_required boolean DEFAULT false;

CREATE INDEX idx_items_asset_group ON public.items(tenant_id, hotel_id, asset_group)
  WHERE asset_group IS NOT NULL;
```

## A.2. RPC — Dry-run mapping mặc định

**File**: cùng migration

```sql
CREATE OR REPLACE FUNCTION public.preview_asset_group_mapping(_tenant_id uuid, _hotel_id uuid)
RETURNS TABLE(item_id uuid, item_name text, item_type text, current_group asset_group,
              suggested_group asset_group, confidence text, needs_review boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Tenant guard
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tenant_id = _tenant_id) THEN
    RAISE EXCEPTION 'forbidden_tenant';
  END IF;

  RETURN QUERY
  SELECT i.id, i.name, i.item_type::text, i.asset_group,
    CASE
      WHEN i.item_type = 'linen' THEN 'linen'::asset_group
      WHEN i.item_type = 'furniture' THEN 'furniture'::asset_group
      WHEN i.item_type = 'consumable' AND i.is_chargeable THEN 'minibar'::asset_group
      WHEN i.item_type = 'consumable' AND NOT i.is_chargeable THEN 'consumable_free'::asset_group
      WHEN i.item_type = 'equipment' AND i.unit_price >= 1000000 THEN 'equipment_large'::asset_group
      WHEN i.item_type = 'equipment' THEN 'electronic_accessory'::asset_group
      ELSE NULL  -- ambiguous → cần review
    END,
    CASE WHEN i.item_type IN ('linen','furniture') THEN 'high'
         WHEN i.item_type = 'consumable' THEN 'medium'
         ELSE 'low' END,
    i.item_type NOT IN ('linen','furniture','consumable')
  FROM items i
  WHERE i.tenant_id = _tenant_id
    AND (_hotel_id IS NULL OR i.hotel_id = _hotel_id);
END $$;

-- RPC apply (chỉ Manager/Owner)
CREATE OR REPLACE FUNCTION public.apply_asset_group_mapping(_tenant_id uuid, _hotel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _affected int; _flagged int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'tenant_owner')
     AND NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'forbidden_role';
  END IF;

  WITH preview AS (SELECT * FROM public.preview_asset_group_mapping(_tenant_id, _hotel_id))
  UPDATE items i SET
    asset_group = p.suggested_group,
    migration_review_required = p.needs_review
  FROM preview p
  WHERE i.id = p.item_id AND p.suggested_group IS NOT NULL;

  GET DIAGNOSTICS _affected = ROW_COUNT;
  SELECT COUNT(*) INTO _flagged FROM items
   WHERE tenant_id = _tenant_id AND migration_review_required = true;

  RETURN jsonb_build_object('affected', _affected, 'review_required', _flagged);
END $$;
```

## A.3. Migration — Bảng cấu hình khách sạn có lịch sử

**File**: `supabase/migrations/<timestamp>_a3_hotel_policy.sql`

```sql
CREATE TABLE public.hotel_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  policy_value jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

CREATE UNIQUE INDEX uq_hotel_policy_active_key
  ON hotel_policy(tenant_id, hotel_id, policy_key) WHERE is_active = true;

CREATE TABLE public.hotel_policy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, hotel_id uuid NOT NULL,
  policy_key text NOT NULL,
  old_value jsonb, new_value jsonb,
  old_version int, new_version int,
  changed_by uuid, changed_role text,
  changed_at timestamptz DEFAULT now(),
  change_reason text
);

-- RLS
ALTER TABLE hotel_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_policy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY hp_select ON hotel_policy FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY hp_modify ON hotel_policy FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'tenant_owner') OR has_role(auth.uid(), 'manager'));
-- (history tương tự, chỉ select)

-- Trigger ghi history
CREATE OR REPLACE FUNCTION trg_hotel_policy_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.policy_value IS DISTINCT FROM NEW.policy_value THEN
    INSERT INTO hotel_policy_history(tenant_id, hotel_id, policy_key,
      old_value, new_value, old_version, new_version, changed_by, changed_at)
    VALUES (NEW.tenant_id, NEW.hotel_id, NEW.policy_key,
      OLD.policy_value, NEW.policy_value, OLD.version, NEW.version, auth.uid(), now());
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER hotel_policy_versioning
  BEFORE UPDATE ON hotel_policy FOR EACH ROW EXECUTE FUNCTION trg_hotel_policy_history();
```

**8 key seed mặc định** (insert sau khi migration approve):
- `minibar_expiry_warning_days` = 7
- `laundry_compensation_after_days` = 30
- `quick_path_undo_ttl_minutes` = 5
- `draft_ttl_hours` = 24
- `photo_required_by_issue_type` = `{damaged_lost: true, missing_replace: false, consumed_chargeable: false}`
- `charge_policy_by_asset_group` = `{}`
- `max_wash_cycles_by_linen_category` = `{}`
- `minibar_fo_reject_notify_manager` = true

## A.4. Migration — Charge status enum + idempotency hash

```sql
CREATE TYPE public.charge_status AS ENUM (
  'not_applicable','not_chargeable','pending_manager_review',
  'pending_fo_confirm','fo_rejected','chargeable_confirmed','chargeable_rejected'
);

-- Idempotency cho inventory_transactions (chuẩn bị, chưa enforce)
ALTER TABLE inventory_transactions
  ADD COLUMN idempotency_key_raw text,
  ADD COLUMN idempotency_key_hash text;

CREATE UNIQUE INDEX uq_inv_tx_idempotency
  ON inventory_transactions(tenant_id, idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;
```

## A.5. View staff-safe — ẩn giá tiền/wash_cycles/stock

```sql
CREATE OR REPLACE VIEW public.room_check_staff_items_view
WITH (security_invoker = true) AS
SELECT
  ri.id AS room_item_id,
  ri.room_id,
  ri.item_id,
  i.name AS display_name,
  i.item_type,
  i.asset_group,
  ri.standard_quantity AS room_quantity_expected,
  i.tenant_id, i.hotel_id,
  -- KHÔNG trả về: unit_price, current_wash_cycles, max_wash_cycles,
  -- quantity_in_stock, charge_price, is_chargeable
  CASE
    WHEN i.item_type = 'linen' AND i.current_wash_cycles >= i.max_wash_cycles
      THEN 'replace_needed' ELSE 'ok'
  END AS badge_label
FROM room_items ri
JOIN items i ON i.id = ri.item_id;
```

## A.6. UI nhỏ (chỉ cho Manager)

- **`src/pages/settings/AssetGroupMigrationPage.tsx`** mới — trang preview + apply mapping. Nút "Chạy thử", "Áp dụng", export CSV danh sách flagged review.
- **`src/hooks/useAssetGroupMapping.ts`** — gọi 2 RPC trên.
- Thêm vào sidebar Settings: "Phân loại tài sản (mới)".

## A.7. Test

```sql
-- supabase/tests/asset_group_migration.sql
-- 1. preview trả đúng số dòng
-- 2. apply không đụng item của tenant khác
-- 3. apply yêu cầu role Manager/Owner
-- 4. ambiguous item bị flag review_required=true
-- 5. hotel_policy update tăng version + ghi history
```

## A.8. Pilot & Rollback A

- **Pilot**: chạy preview trên 2 tenant test → review CSV → apply.
- **Rollback**: `DROP TABLE hotel_policy; DROP COLUMN asset_group, migration_review_required FROM items;` Không mất dữ liệu nghiệp vụ.

## A.9. Files thay đổi tổng kết Đợt A

**Migration**: 4 file
**Code mới**:
- `src/pages/settings/AssetGroupMigrationPage.tsx`
- `src/hooks/useAssetGroupMapping.ts`
- `src/hooks/useHotelPolicy.ts` (CRUD policy + history viewer)
- `src/components/settings/HotelPolicyHistoryDrawer.tsx`
**Test**: `supabase/tests/asset_group_migration.sql`, `hotel_policy.sql`

---

# 🟡 ĐỢT B — Smart Sheet + Sửa luồng giặt (3 tuần)

**Mục tiêu**: Người dùng cảm nhận được — sheet báo sự cố thông minh hơn, kho không còn lệch khi gửi giặt.

## B.1. Refactor `LeanReportIssueSheet` đọc `asset_group`

**File**: `src/components/rooms/LeanReportIssueSheet.tsx`

Hiện tại: 3 lựa chọn cố định (missing/damaged/lost).
Thay bằng: đọc `item.asset_group` → render variant tương ứng.

```tsx
// src/components/rooms/issue-sheets/index.ts — registry pattern
export const ISSUE_SHEET_VARIANTS: Record<AssetGroup, IssueSheetVariant> = {
  linen: LinenIssueVariant,
  consumable_free: ConsumableFreeVariant,
  minibar: MinibarVariant,
  stationery: StationeryVariant,
  equipment_large: EquipmentLargeVariant,
  electronic_accessory: ElectronicAccessoryVariant,
  furniture: FurnitureVariant,
  glassware: GlasswareVariant,
  bathroom_hardware: BathroomHardwareVariant,
}
```

Mỗi variant trả về **tối đa 4 primary options + sub-reason** theo bảng §6.3 của Decision doc.

**File mới** (9 variant):
- `src/components/rooms/issue-sheets/LinenIssueVariant.tsx`
- `src/components/rooms/issue-sheets/MinibarVariant.tsx`
- ... (7 còn lại)
- `src/components/rooms/issue-sheets/SubReasonStep.tsx` — bước 2 cho sub-reason
- `src/components/rooms/issue-sheets/UnknownCauseOption.tsx` — option "Chưa rõ nguyên nhân" có ở mọi variant

**Mapping UI → bucket** (constant): `src/lib/issueBucketMapping.ts`
```ts
export const BUCKET_MAP: Record<string, IssueBucket> = {
  'linen.send_laundry': 'sent_to_laundry',
  'linen.dirty_unrecoverable': 'sent_to_laundry', // + quality_issue=true
  'linen.lifecycle_end': 'damaged', // + retire_reason=lifecycle
  'linen.need_more': 'replaced',
  // ... toàn bộ 30+ mapping
}
```

## B.2. Migration — Mở rộng jsonb để lưu `issue_role` + `needs_review` + `sub_reason`

```sql
-- KHÔNG tạo bảng mới. Mở rộng schema jsonb hiện tại.
-- Mỗi entry trong items_missing/damaged/lost/consumed/replaced/sent_to_laundry
-- chấp nhận thêm field:
--   issue_role: 'primary_issue' | 'derived_action'
--   needs_review: boolean
--   sub_reason: text
--   ui_action: text (vd 'linen.send_laundry')
--   asset_group: text (snapshot tại thời điểm submit)

-- Validation trigger
CREATE OR REPLACE FUNCTION validate_room_check_issue_entries()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _b text; _arr jsonb; _e jsonb;
BEGIN
  FOR _b IN SELECT unnest(ARRAY['items_missing','items_damaged','items_lost',
                                'items_consumed','items_replaced','items_sent_to_laundry'])
  LOOP
    _arr := to_jsonb(NEW)->_b;
    IF _arr IS NULL OR jsonb_typeof(_arr) != 'array' THEN CONTINUE; END IF;
    FOR _e IN SELECT * FROM jsonb_array_elements(_arr) LOOP
      IF (_e->>'quantity')::int <= 0 THEN
        RAISE EXCEPTION 'invalid_quantity:%', _b;
      END IF;
      IF _e->>'issue_role' IS NULL THEN
        RAISE EXCEPTION 'missing_issue_role:%', _b;
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_room_check_entries
  BEFORE INSERT OR UPDATE ON room_checks
  FOR EACH ROW EXECUTE FUNCTION validate_room_check_issue_entries();
```

## B.3. Migration — Linen Pool Bridge (chống trừ kho 2 lần)

**Đây là phần quan trọng nhất Đợt B.**

```sql
-- 1. Sửa atomic_item_to_laundry: KHÔNG còn trừ quantity_in_stock,
--    chỉ tăng quantity_in_laundry tạm thời và tạo laundry_request.
CREATE OR REPLACE FUNCTION public.atomic_item_to_laundry(...)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- BỎ: UPDATE items SET quantity_in_stock = quantity_in_stock - _qty
  -- GIỮ: tạo laundry_request với status='pending'
  -- GHI CHÚ: stock chỉ trừ khi laundry_batch chuyển sang 'delivered'
  ...
END $$;

-- 2. Mở rộng laundry_status enum
ALTER TYPE laundry_status ADD VALUE IF NOT EXISTS 'partially_received';
ALTER TYPE laundry_status ADD VALUE IF NOT EXISTS 'compensation_needed';
ALTER TYPE laundry_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE laundry_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 3. Snapshot policy vào batch khi tạo
ALTER TABLE laundry_batches
  ADD COLUMN policy_snapshot jsonb,
  ADD COLUMN partially_received_at timestamptz;

-- 4. RPC mới — chỉ điểm trừ kho duy nhất
CREATE OR REPLACE FUNCTION public.atomic_laundry_batch_delivered(_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Idempotent qua status check
  IF (SELECT status FROM laundry_batches WHERE id = _batch_id) = 'delivered' THEN
    RETURN jsonb_build_object('already', true);
  END IF;

  -- Trừ quantity_in_stock + cộng quantity_in_laundry
  UPDATE items i SET
    quantity_in_stock = GREATEST(quantity_in_stock - lbi.quantity_sent, 0),
    quantity_in_laundry = quantity_in_laundry + lbi.quantity_sent
  FROM laundry_batch_items lbi
  WHERE lbi.batch_id = _batch_id AND lbi.item_id = i.id;

  -- Snapshot policy
  UPDATE laundry_batches SET
    status = 'delivered',
    policy_snapshot = (SELECT policy_value FROM hotel_policy
                       WHERE policy_key = 'laundry_compensation_after_days'
                         AND hotel_id = laundry_batches.hotel_id
                         AND is_active = true),
    delivered_at = now()
  WHERE id = _batch_id;

  -- Audit
  PERFORM log_state_transition('laundry_batches', _batch_id, 'delivered', ...);
  RETURN jsonb_build_object('ok', true);
END $$;

-- 5. RPC partial receive + compensation
CREATE FUNCTION atomic_laundry_batch_partially_received(_batch_id, _items jsonb) ...
CREATE FUNCTION atomic_laundry_batch_compensation(_batch_id) ...
```

### Backfill mẻ đang dở

```sql
-- Script chạy 1 lần sau migration
-- Mọi batch đang ở 'delivered' nhưng được tạo trước migration
-- → đã trừ stock ở atomic_item_to_laundry → đánh dấu policy_snapshot
UPDATE laundry_batches
SET policy_snapshot = jsonb_build_object('compensation_after_days', 30,
                                          'legacy_double_deduct_handled', true)
WHERE status IN ('delivered','washing','ready') AND policy_snapshot IS NULL;
```

## B.4. Migration — Batch inventory cho linen FIFO

```sql
CREATE TABLE public.batch_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, hotel_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id),
  batch_code text NOT NULL,
  quantity_initial int NOT NULL CHECK (quantity_initial > 0),
  quantity_available int NOT NULL,
  wash_cycles int NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL,
  retired_at timestamptz,
  created_by uuid, created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_batch_inv_fifo ON batch_inventory(tenant_id, hotel_id, item_id, received_at)
  WHERE retired_at IS NULL;

-- RLS theo tenant
ALTER TABLE batch_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_tenant ON batch_inventory FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RPC tạo lô mới (reset wash_cycles)
CREATE FUNCTION create_new_linen_batch(_item_id, _quantity, _batch_code) ...
-- RPC FIFO allocate khi gửi giặt
CREATE FUNCTION allocate_linen_fifo(_item_id, _quantity) RETURNS jsonb ...
```

## B.5. Edge function — Cron compensation

**File mới**: `supabase/functions/laundry-compensation-cron/index.ts`

```typescript
// Chạy mỗi 6h
// SELECT batch WHERE status = 'partially_received'
//   AND now() - partially_received_at >= (policy_snapshot->>'compensation_after_days')::int * interval '1 day'
// → set status = 'compensation_needed', notify Manager, log_state_transition
```

Cấu hình `supabase/config.toml` thêm function block + cron schedule.

## B.6. UI Quản lý Giặt

**File mới/sửa**:
- `src/pages/laundry/LaundryBatchDetailPage.tsx` — thêm nút "Đã giao vendor" gọi `atomic_laundry_batch_delivered`. Cảnh báo "Sau khi giao KHÔNG hủy được — dùng compensation thay thế".
- `src/pages/laundry/LaundryCompensationPage.tsx` (mới) — danh sách batch đang chờ đền bù + nút settle.
- `src/components/laundry/PartialReceiveDialog.tsx` (mới) — nhận thiếu, ghi rõ số lượng từng item.
- `src/pages/laundry/NewLinenBatchPage.tsx` (mới) — flow nhập lô khăn mới.

## B.7. Hotel policy management UI

**File mới**:
- `src/pages/settings/HotelPolicyPage.tsx` — list 8 key, edit từng key có lý do thay đổi (text required).
- `src/components/settings/PolicyHistoryDrawer.tsx` — xem lịch sử + diff old/new.

## B.8. Test

```sql
-- supabase/tests/linen_pool_bridge.sql
-- 1. atomic_item_to_laundry KHÔNG trừ quantity_in_stock
-- 2. atomic_laundry_batch_delivered trừ stock đúng 1 lần (gọi 2 lần lần 2 no-op)
-- 3. atomic_laundry_batch_received cộng stock + tăng wash_cycles
-- 4. partial receive → compensation_needed sau N ngày
-- 5. cancel sau delivered bị reject

-- supabase/tests/batch_inventory_fifo.sql
-- 1. Tạo lô mới wash_cycles=0
-- 2. Allocate FIFO ưu tiên received_at cũ nhất
-- 3. Lô retired không được allocate

-- supabase/tests/issue_validation.sql
-- 1. Trigger reject quantity<=0
-- 2. Trigger reject thiếu issue_role
```

## B.9. Pilot & Rollback B

- **Pilot**: bật cho 1 hotel test 7 ngày. Theo dõi:
  - Số liệu `quantity_in_stock` của linen — không bị âm
  - Mọi mẻ giặt mới có `policy_snapshot`
- **Rollback**: revert RPC `atomic_item_to_laundry` về version cũ (có giữ trong git). Backfill ngược: cộng lại stock cho batch chưa delivered.

## B.10. Files Đợt B

**Migration**: 4 file (asset_group_apply, linen_pool_bridge, batch_inventory, validation_trigger)
**Edge function**: 1 (laundry-compensation-cron)
**UI mới**: ~15 file (9 issue variant + 6 trang/dialog)
**UI sửa**: `LeanReportIssueSheet.tsx`, `LaundryBatchDetailPage.tsx`, sidebar
**Test**: 3 file SQL + 1 vitest cho mapping

---

# 🟠 ĐỢT C — Workflow tính tiền + 2 vai trò mới (3 tuần)

**Mục tiêu**: Tách trách nhiệm Lễ tân (FO) và Thủ kho (Storekeeper) ra khỏi quản lý chung. Workflow charge minibar có FO confirm + Manager override.

## C.1. Migration — 2 role mới

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'storekeeper';

-- KHÔNG thêm 'supervisor' — gộp với manager để giảm phức tạp.
```

**RLS rewrite** — đụng vào ~15 bảng:
- `bookings`, `invoices`, `payments` → thêm policy cho FO (chỉ confirm/reject minibar charge)
- `warehouse_stock`, `inventory_transactions`, `supplement_requests` → thêm policy Storekeeper
- `room_checks` → FO không được tạo room check (ngăn vượt quyền)

## C.2. Migration — Bảng minibar charge pending

```sql
CREATE TABLE public.minibar_pending_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, hotel_id uuid NOT NULL,
  room_check_id uuid NOT NULL REFERENCES room_checks(id),
  booking_id uuid REFERENCES bookings(id),
  item_id uuid NOT NULL REFERENCES items(id),
  quantity int NOT NULL,
  unit_price numeric NOT NULL,
  total_amount numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  charge_status public.charge_status NOT NULL DEFAULT 'pending_fo_confirm',
  fo_action_by uuid, fo_action_at timestamptz, fo_reject_reason text,
  manager_override_by uuid, manager_override_at timestamptz, manager_override_reason text,
  invoice_line_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE minibar_pending_charges ENABLE ROW LEVEL SECURITY;
-- FO/Manager xem được, Staff không xem
CREATE POLICY mpc_select ON minibar_pending_charges FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['fo','manager','tenant_owner','super_admin']));

CREATE INDEX idx_mpc_pending ON minibar_pending_charges(hotel_id, charge_status)
  WHERE charge_status IN ('pending_fo_confirm','fo_rejected');
```

## C.3. RPC — FO confirm/reject + Manager override

```sql
CREATE FUNCTION fo_confirm_minibar_charge(_charge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'fo') AND NOT has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'forbidden_role';
  END IF;
  -- Tạo invoice line, set status = chargeable_confirmed
  ...
END $$;

CREATE FUNCTION fo_reject_minibar_charge(_charge_id uuid, _reason text)
RETURNS jsonb ... -- _reason bắt buộc, notify Manager nếu policy = true

CREATE FUNCTION manager_override_fo_reject(_charge_id uuid, _override_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF coalesce(trim(_override_reason),'') = '' THEN
    RAISE EXCEPTION 'override_reason_required';  -- AC SEC-09 / CM-07A
  END IF;
  IF NOT has_role(auth.uid(), 'manager')
     AND NOT has_role(auth.uid(), 'tenant_owner') THEN
    RAISE EXCEPTION 'forbidden_role';
  END IF;
  -- Update charge_status = chargeable_confirmed, ghi override_reason, audit
  ...
END $$;
```

## C.4. Sửa `submit_room_check_lean` — auto-tạo pending charge

Khi submit có entry `items_consumed` với asset_group=`minibar` và `charge_to_guest=true`:
- Insert vào `minibar_pending_charges` với `charge_status = 'pending_fo_confirm'`
- Notify FO qua bảng `notifications` hoặc realtime channel

## C.5. Migration — Manager review queue

```sql
-- Materialized concept dùng VIEW (không cần bảng riêng)
CREATE OR REPLACE VIEW manager_review_queue AS
SELECT 'minibar_reject' AS source, mpc.id AS ref_id, mpc.tenant_id, mpc.hotel_id,
       mpc.created_at, 'FO từ chối charge minibar' AS title
FROM minibar_pending_charges mpc
WHERE mpc.charge_status = 'fo_rejected'
UNION ALL
SELECT 'room_check_review' AS source, rc.id, rc.tenant_id, rc.hotel_id,
       rc.checked_at, 'Cần xem xét sự cố phòng' AS title
FROM room_checks rc
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(coalesce(rc.items_missing,'[]'::jsonb) ||
                                     coalesce(rc.items_lost,'[]'::jsonb))
  WHERE value->>'needs_review' = 'true'
);
```

## C.6. Auto-tạo maintenance/supplement request

Trigger hoặc bổ sung trong `submit_room_check_lean`:

```sql
-- Trigger AFTER INSERT room_checks
CREATE FUNCTION trg_auto_create_followup_requests()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Damaged equipment/furniture → maintenance_requests
  INSERT INTO maintenance_requests(...)
  SELECT ... FROM jsonb_array_elements(NEW.items_damaged) e
  JOIN items i ON i.id = (e->>'item_id')::uuid
  WHERE i.asset_group IN ('equipment_large','furniture','bathroom_hardware');

  -- Replaced/missing → supplement_requests (chờ Storekeeper fulfill)
  INSERT INTO supplement_requests(...)
  SELECT ... FROM (jsonb_array_elements(NEW.items_replaced) UNION ALL ...) ;

  RETURN NEW;
END $$;
```

## C.7. UI — 3 trang mới + cập nhật nav

**File mới**:
- `src/pages/fo/MinibarPendingPage.tsx` — danh sách charge chờ. Mỗi dòng: phòng, khách, item, số lượng, giá → 2 nút "Xác nhận" / "Từ chối (kèm lý do)".
- `src/pages/manager/ReviewQueuePage.tsx` — list từ view `manager_review_queue`. Lọc theo source. Action: override (kèm lý do) hoặc đồng ý.
- `src/pages/storekeeper/SupplementFulfillPage.tsx` — list supplement_requests. Action: "Đã xuất kho" → trừ `warehouse_stock`.

**File sửa**:
- `src/components/layout/MobileBottomNav.tsx` — thêm tab cho FO ("Minibar"), Storekeeper ("Bổ sung").
- `src/lib/permissions.ts` — thêm permission cho 2 role mới.
- `src/hooks/useEffectivePermissions.ts` — map role → module access.
- `src/components/rooms/issue-sheets/MinibarVariant.tsx` (Đợt B) — xác nhận entry consumed → flag tạo pending charge.

## C.8. Notifications

- Realtime channel `minibar-fo-{hotel_id}` cho FO khi có pending mới.
- Realtime channel `manager-review-{hotel_id}` cho Manager khi có FO reject.
- Push notification (đã có `usePushNotifications`).

## C.9. Test

```sql
-- supabase/tests/minibar_charge_flow.sql
-- 1. submit room check minibar consumed → tạo pending_fo_confirm
-- 2. FO confirm → tạo invoice line
-- 3. FO reject thiếu reason → bị reject
-- 4. FO reject → notify Manager
-- 5. Manager override thiếu reason → bị reject (CM-07A / SEC-09)
-- 6. Manager override có reason → status = chargeable_confirmed + audit
-- 7. Staff KHÔNG select được minibar_pending_charges
-- 8. Storekeeper KHÔNG submit room_check được
-- 9. FO KHÔNG submit room_check được

-- supabase/tests/role_rls.sql — cross-tenant cho fo + storekeeper
```

## C.10. Pilot & Rollback C

- **Pilot**: 1 hotel pilot 7-14 ngày với 1 FO + 1 Storekeeper được gán role thật.
- **Onboarding**: video 2 phút cho FO + Storekeeper.
- **Rollback**: feature flag `hotel_policy.charge_workflow_enabled = false` → bypass pending charge, dùng logic cũ.

## C.11. Files Đợt C

**Migration**: 4 file (roles, minibar_pending, charge_rpcs, auto_followup_triggers)
**UI mới**: 3 trang + 2 dialog
**UI sửa**: nav, permissions, MinibarVariant
**Edge function**: 1 (notify FO realtime — có thể dùng realtime channel sẵn có)
**Test**: 3 file SQL

---

# Tổng kết & Quyết định

## Files thay đổi tổng (3 đợt)

| Loại | Đợt A | Đợt B | Đợt C | Tổng |
|---|---|---|---|---|
| Migration SQL | 4 | 4 | 4 | **12** |
| Edge function | 0 | 1 | 0 | **1** |
| UI mới | 4 | 15 | 5 | **24** |
| UI sửa | 1 | 4 | 4 | **9** |
| Test SQL | 2 | 3 | 3 | **8** |

## Thứ tự tôi sẽ làm

1. **Bắt đầu Đợt A.1 → A.2** (migration `asset_group` + RPC preview/apply) — đợi bạn duyệt migration.
2. Code UI A.6 (`AssetGroupMigrationPage`) — bạn chạy preview thực tế trên data.
3. Đợt A.3 → A.4 → A.5 — nền móng còn lại.
4. Pilot A 3 ngày → qua B.
5. ... tương tự đến hết.

## Memory sẽ ghi lại

Sau mỗi đợt thành công, tôi update `mem://` với:
- `mem://features/inventory/asset-group-system-v1` (Đợt A)
- `mem://features/laundry/linen-pool-bridge-v1` (Đợt B)
- `mem://features/charge/fo-manager-escalation-v1` (Đợt C)

## Câu hỏi cần xác nhận trước khi bắt đầu code

1. **Bắt đầu ngay từ Đợt A.1** (migration `asset_group`) — bạn approve migration sẽ chạy trên DB?
2. **Vai trò FO và Storekeeper ở Đợt C**: khách sạn của bạn có thật sự có 2 vị trí này, hay 1 người kiêm? (Nếu 1 người kiêm, tôi sẽ cho phép gán cùng user 2 role.)
3. **Đợt B Linen Pool Bridge** sẽ thay đổi cách `quantity_in_stock` cập nhật — bạn có cần tôi viết script audit so sánh trước/sau migration không? (Khuyến nghị: có.)

Sau khi bạn xác nhận, tôi bắt đầu Đợt A.
