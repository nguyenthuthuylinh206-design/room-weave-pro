# Đợt C — Inventory Intelligence (FIFO + Reorder)

Biến dữ liệu Đợt B (FIFO batch, asset_group, Lean tiêu hao) thành **quyết định mua hàng tự động** + **cảnh báo realtime**. Không phá flow cũ — chỉ cộng thêm lớp intelligence trên `items` / `inventory_transactions` / `purchase_orders` đã có.

---

## 1. Phân tích codebase hiện trạng

### Reuse được (không cần đụng vào)

- `items.reorder_point` (đã có cột `integer`) — dùng làm `min_qty` mặc định.
- `items.quantity_in_stock` — nguồn stock hiện tại.
- `inventory_transactions` — đã ghi đủ `transaction_type` (in/out/adjustment), `transaction_date`, `quantity` → đủ để tính consumption rolling.
- `purchase_orders` + `purchase_order_items` — đã có `status`, `vendor_id`, `expected_delivery_date` → tính `quantity_on_order` từ PO `status IN ('approved','partial')`.
- `vendors` — gom suggestion theo vendor.
- `useInventoryDashboard`, `useWarehouseStock`, `useInventoryTransactions` — query patterns chuẩn, reuse.
- `log_state_transition` (Đợt A) — audit khi approve/ignore suggestion.
- `useTenantChannel` — realtime broadcast cảnh báo.
- Sidebar group "Kho" — chỉ thêm 3 entry con.

### Cần refactor nhẹ

- `items.reorder_point` đang là `integer` → giữ nguyên, chỉ bổ sung `reorder_max_qty`, `lead_time_days`, `is_perishable`, `last_outbound_at`, `preferred_vendor_id` (tất cả nullable, không breaking).
- `useDashboardStats` — thêm field `low_stock_count`, `dead_stock_value` (compute từ snapshot mới).
- Notification settings (`NotificationSettingsPage`) — thêm toggle "Cảnh báo sắp hết hàng".

### Thêm mới (toàn bộ)

- 2 bảng: `reorder_suggestions`, `consumption_snapshots`.
- 4 RPC atomic.
- 2 cron job (daily snapshot, daily reorder scan).
- 3 page UI: `/inventory/reorder`, `/inventory/dead-stock`, `/inventory/analytics`.
- 1 mobile bottom sheet: `RestockAlertSheet`.
- Sidebar badge + Dashboard widget.

### Rủi ro migration

- **Backfill `last_outbound_at**` (1 lần) trên hàng triệu rows `inventory_transactions` của tenant lớn → chia batch theo `tenant_id`, chạy off-peak.
- **Cron snapshot nặng** nếu nhiều hotel × nhiều item → giới hạn item `is_active=true` + index `(tenant_id, hotel_id, item_id)`.
- **Không** thay đổi RLS hiện có — bảng mới copy pattern `tenant_id + hotel_id` chuẩn.
- Feature flag mặc định OFF → an toàn rollout từng tenant.

---

## 2. Phase C1 — Xương sống (build 1)

Mục tiêu: chạy được reorder suggestion end-to-end. Sau C1 manager đã có thể duyệt suggestion → tạo PO.

### A. Logic nghiệp vụ

- **Reorder trigger** (daily 06:00):
  - Với mỗi item active × hotel:
    - `effective_stock = quantity_in_stock + quantity_on_order`
    - Nếu `effective_stock < reorder_point` AND chưa có suggestion `status='pending'` → tạo mới.
    - `suggested_qty = max(reorder_max_qty - effective_stock, reorder_point * 2 - effective_stock)`.
- **Approve flow**: chọn N suggestions → gom theo `preferred_vendor_id` → mỗi vendor 1 PO draft.
- **Ignore**: ghi `ignored_by`, `ignored_reason`, không trigger lại trong 7 ngày cùng item × hotel.

### B. Schema / Migration

```sql
ALTER TABLE items
  ADD COLUMN reorder_max_qty integer,
  ADD COLUMN lead_time_days integer DEFAULT 7,
  ADD COLUMN is_perishable boolean DEFAULT false,
  ADD COLUMN last_outbound_at timestamptz,
  ADD COLUMN preferred_vendor_id uuid REFERENCES vendors(id);

CREATE TABLE reorder_suggestions (
  id uuid PK DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  current_stock numeric NOT NULL,
  on_order_qty numeric NOT NULL DEFAULT 0,
  suggested_qty numeric NOT NULL,
  reason text NOT NULL,            -- 'below_min' | 'expiring' | 'manual'
  status text NOT NULL DEFAULT 'pending',  -- pending|approved|ignored|converted
  ignored_reason text,
  ignored_until date,
  converted_po_id uuid REFERENCES purchase_orders(id),
  created_by uuid, approved_by uuid, ignored_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_reorder_pending ON reorder_suggestions(tenant_id, hotel_id, status) WHERE status='pending';
CREATE UNIQUE INDEX uniq_pending_per_item ON reorder_suggestions(tenant_id, hotel_id, item_id) WHERE status='pending';

-- RLS chuẩn 3-lớp (tenant_id + hotel_id + role)
```

### C. RPC / Server actions

- `compute_reorder_suggestions(_tenant_id, _hotel_id default null)` — SECURITY DEFINER, idempotent (UPSERT), trả `{created, skipped}`.
- `approve_reorder_suggestions(_ids uuid[])` — atomic: gom theo vendor → tạo `purchase_orders` draft + items → update suggestion `status='converted'`, `converted_po_id`. Audit qua `log_state_transition`. Trả `{po_ids[]}`.
- `ignore_reorder_suggestion(_id, _reason, _ignore_days default 7)`.
- Trigger `tr_update_last_outbound_at` trên `inventory_transactions` AFTER INSERT khi `transaction_type='out'`.

### D. UI screens

- `**/inventory/reorder**` (desktop + mobile responsive):
  - Bảng: item | hotel | tồn hiện tại | đang đặt | đề xuất | vendor | reason | actions.
  - Filter: hotel, vendor, reason.
  - Bulk select → button "Duyệt & tạo PO" → modal preview gom theo vendor → confirm.
  - Per-row: "Bỏ qua" → input lý do + số ngày.
  - Empty state: "Không có đề xuất nào — kho đang đủ."
- **Item detail page** — thêm tab "Reorder settings": `reorder_point`, `reorder_max_qty`, `lead_time_days`, `preferred_vendor_id`.
- **Sidebar badge**: số suggestion `pending` (realtime channel).

### E. Permission rules

- `view_reorder_suggestions`: HK lead, Manager, Owner, Super Admin.
- `approve_reorder_suggestions`: Manager, Owner.
- `manage_reorder_settings`: Owner.
- Staff: không thấy menu.
- All Hotels mode: chặn `approve` (chỉ cho phép khi có hotel context cụ thể) — copy pattern `all-hotels-mode-guards-v1`.

### F. Test cases (`supabase/tests/reorder_suggestions.sql`)

1. Trigger sinh khi `qty < reorder_point` và không có pending.
2. Idempotent: chạy 2 lần không duplicate.
3. Tôn trọng `ignored_until`.
4. Approve gom đúng theo vendor (3 suggestions, 2 vendor → 2 PO).
5. RLS: hotel A không thấy của hotel B.
6. `last_outbound_at` cập nhật sau outbound.
7. Conversion audit log có record.

### G. Cron

```sql
-- pg_cron, dùng supabase--insert
SELECT cron.schedule(
  'reorder-suggestions-daily',
  '0 23 * * *',  -- 06:00 VN
  $$ SELECT public.compute_reorder_suggestions(tenant_id) FROM tenants WHERE subscription_status='active'; $$
);
```

### H. Rollout C1

- Migration → backfill `last_outbound_at` (script chia batch tenant).
- Feature flag `settings.inventory.intelligence_enabled` (tenant-level, default OFF).
- Bật cho 1 tenant pilot → quan sát 7 ngày → bật mass.

---

## 3. Phase C2 — Analytics + UX (build 2)

Mục tiêu: từ "biết phải mua gì" → "hiểu vì sao & tránh lãng phí".

### A. Logic nghiệp vụ

- **Consumption snapshot** (cron 1h): rolling 7d / 30d / 90d per item × hotel, tính `avg_daily_consumption`, `stock_days_remaining`.
- **Dead stock**: `last_outbound_at IS NULL OR < now() - 90d` AND `quantity_in_stock > 0` → tổng giá trị bằng `quantity * unit_cost`.
- **Batch expiry** (cho item `is_perishable=true`): join `laundry_batches`/`item_batches` → cảnh báo `expiry_date - now() < 30d`.
- **Auto-recompute reorder** dùng `avg_daily_consumption × lead_time_days × safety_factor (1.3)` thay vì `reorder_point` cố định (opt-in per item).

### B. Schema

```sql
CREATE TABLE consumption_snapshots (
  id uuid PK,
  tenant_id, hotel_id, item_id,
  snapshot_date date NOT NULL,
  qty_consumed_7d numeric,
  qty_consumed_30d numeric,
  qty_consumed_90d numeric,
  avg_daily numeric,
  stock_days_remaining numeric,  -- NULL nếu avg_daily=0
  created_at timestamptz,
  UNIQUE(tenant_id, hotel_id, item_id, snapshot_date)
);
CREATE INDEX idx_snap_date ON consumption_snapshots(tenant_id, snapshot_date DESC);
```

### C. RPC

- `refresh_consumption_snapshots(_tenant_id)` — UPSERT theo `snapshot_date=current_date`.
- `get_dead_stock_report(_tenant_id, _hotel_id, _days default 90)`.
- `get_consumption_trend(_item_id, _days default 90)` — trả series cho chart.

### D. UI screens

- `**/inventory/dead-stock**`:
  - Bảng: item | hotel | tồn | giá trị | ngày cuối xuất | tuổi (days).
  - Filter: asset_group, age (>30/>60/>90/>180).
  - Bulk action: "Đề xuất chuyển kho", "Đề xuất giảm giá", "Đánh dấu thanh lý" (tạo `inventory_transaction` adjustment).
  - Tổng giá trị dead stock ở header.
- `**/inventory/analytics**`:
  - Cards: Total stock value | Dead stock value | Items below min | Items expiring 30d.
  - Chart 1: Consumption trend 90d theo asset_group (stacked area).
  - Chart 2: Top 10 items tiêu hao tuần qua.
  - Chart 3: Stock days remaining distribution (histogram).
  - Export CSV.
- **Dashboard widget** (Owner home):
  - "5 items sắp hết" — link `/inventory/reorder`.
  - "Dead stock: 12.500.000 ₫" — link `/inventory/dead-stock`.
- **Mobile `RestockAlertSheet**` (bottom sheet):
  - Trigger: Staff vào `/my-tasks` thấy badge đỏ nếu phòng họ đang dọn có item hết.
  - Nội dung: list item thiếu + nút "Yêu cầu cấp phát" → tạo `room_supplement_request`.
- **Item detail "Analytics" tab**:
  - Mini chart consumption 90d.
  - Auto-suggested `reorder_point` mới (tính từ avg_daily).
  - Toggle "Áp dụng auto-reorder".

### E. Notification

- Trong `NotificationSettingsPage` thêm 3 toggle:
  - "Cảnh báo sắp hết hàng" (suggestion mới).
  - "Cảnh báo dead stock hàng tuần" (digest).
  - "Cảnh báo lô sắp hết hạn".
- Channel: in-app (luôn), email/telegram (opt-in) — dùng pipeline notification có sẵn.

### F. Test cases (`supabase/tests/inventory_intelligence_c2.sql`)

1. Snapshot tính đúng rolling 30d, ignore `transaction_type='adjustment'`.
2. Dead stock loại trừ item `is_active=false`.
3. `stock_days_remaining = NULL` khi `avg_daily=0`.
4. Auto-reorder dùng `avg × lead_time × 1.3` làm `min_qty`.
5. Expiry alert chỉ trigger với `is_perishable=true`.
6. Snapshot idempotent same-day.

### G. Cron

```sql
SELECT cron.schedule('consumption-snapshots-hourly', '0 * * * *',
  $$ SELECT public.refresh_consumption_snapshots(tenant_id) FROM tenants WHERE subscription_status='active'; $$);

SELECT cron.schedule('dead-stock-weekly-digest', '0 1 * * 1',  -- T2 08:00 VN
  $$ SELECT net.http_post(url:='.../functions/v1/dead-stock-digest', ...); $$);
```

### H. Rollout C2

- Migration + cron → chạy ngầm 3 ngày tích snapshot trước khi mở UI.
- Bật analytics page cho tenant đã bật C1 (kế thừa flag).
- Dead stock digest gửi cho Owner only.

---

## 4. Files dự kiến

```text
supabase/migrations/
  ├─ 20260506_c1_reorder_schema.sql
  ├─ 20260506_c1_reorder_rpc.sql
  ├─ 20260506_c1_backfill_last_outbound.sql
  ├─ 20260507_c2_consumption_schema.sql
  └─ 20260507_c2_analytics_rpc.sql

supabase/functions/
  ├─ dead-stock-digest/index.ts        (C2)
  └─ (cron schedule via SQL insert)

supabase/tests/
  ├─ reorder_suggestions.sql           (C1)
  └─ inventory_intelligence_c2.sql     (C2)

src/hooks/
  ├─ useReorderSuggestions.ts          (C1)
  ├─ useApproveReorder.ts              (C1)
  ├─ useDeadStockReport.ts             (C2)
  ├─ useConsumptionAnalytics.ts        (C2)
  └─ useInventoryAlerts.ts             (C2, realtime)

src/pages/inventory/
  ├─ ReorderSuggestionsPage.tsx        (C1)
  ├─ DeadStockPage.tsx                 (C2)
  └─ InventoryAnalyticsPage.tsx        (C2)

src/components/inventory/
  ├─ ReorderTable.tsx                  (C1)
  ├─ ApproveReorderDialog.tsx          (C1, gom theo vendor)
  ├─ IgnoreSuggestionDialog.tsx        (C1)
  ├─ ReorderSettingsTab.tsx            (C1, item detail)
  ├─ DeadStockTable.tsx                (C2)
  ├─ ConsumptionTrendChart.tsx         (C2)
  └─ RestockAlertSheet.tsx             (C2, mobile)

src/components/dashboard/
  └─ InventoryAlertsWidget.tsx         (C2)

src/components/layout/Sidebar.tsx      (cập nhật badge + entries)
src/i18n/locales/{vi,en}/inventory.json
```

---

## 5. KPI đo lường sau Đợt C

- Số lần "hết hàng đột xuất" (out-of-stock events) giảm ≥ 60% sau 30 ngày.
- Giá trị dead stock giảm ≥ 20% sau 60 ngày.
- Số PO khẩn cấp (`expected_delivery_date - order_date < lead_time`) giảm ≥ 40%.
- 80%+ suggestion được duyệt trong 24h (không bị bỏ quên).

---

## 6. Câu hỏi cần xác nhận trước khi build C1

1. **Trigger cron**:  realtime ngay khi outbound
2. **Auto-create PO draft** : PO draft, status `draft`, vẫn cần approve PO 
3. **Default `lead_time_days**` = 7 ngày 
4. **Feature flag**: bật mass cho tất cả tenant

Sau khi duyệt plan + trả lời 4 câu trên → tôi vào build C1 ngay.