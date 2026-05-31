## Mục tiêu

Đem nguyên trang **Thiết lập giá** của Deal Hotel Hub (calendar grid theo ngày × gói giá, multi-select, copy/paste/fill, bulk edit, quản lý gói giá) sang dự án này, gắn vào **hạng phòng (`room_types`)** thay vì từng phòng vật lý, và tuân thủ tenant isolation 3 lớp.

## A. Phân tích & ánh xạ

**Mô hình Deal Hotel Hub → dự án này**
- `rooms` (hạng phòng) → `room_types`
- `room_units` (phòng vật lý) → `rooms`
- Chưa có: `rate_plans`, `rate_plan_daily_prices`, `room_type_availability` → tạo mới
- Giữ nguyên: `room_type_rates` (default rate 4 trục) và `seasonal_rate_overrides` — vẫn dùng làm **fallback** khi chưa có daily override

**Reuse**
- Trang `PricingV2Page` hiện có (giá mặc định 4 trục) → giữ nguyên, đổi tên route thành tab "Giá mặc định"
- `useRoomTypes`, `HotelContext`, design tokens Navy Trust + Sora/Manrope đã có

**Refactor**
- `App.tsx`: route `/settings/pricing` chuyển thành layout 3 tab: **Lịch giá theo ngày** (mới) · **Giá mặc định** (PricingV2 cũ) · **Quy tắc mùa** (SeasonalRules cũ)
- Sidebar settings: thêm mục "Lịch giá theo ngày" trỏ vào tab mặc định mới

**Rủi ro migration**
- 3 bảng hoàn toàn mới, không động dữ liệu cũ → an toàn
- Cần thống nhất nguồn giá khi đặt phòng: thứ tự ưu tiên `rate_plan_daily_prices` → `rate_plans` → `seasonal_rate_overrides` → `room_type_rates`. Phase này **chỉ build UI quản lý**, chưa wire vào booking engine (giữ tương thích ngược).

## B. Schema / Migration

3 bảng mới + RPC, đều có `tenant_id` + RLS + GRANT.

```sql
-- 1. rate_plans (gói giá, gắn vào hạng phòng)
CREATE TABLE public.rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2),
  sale_price numeric(12,2),
  sale_start_date date,
  sale_end_date date,
  inclusions text[] NOT NULL DEFAULT '{}',   -- breakfast | parking | ...
  policies text[] NOT NULL DEFAULT '{}',     -- non_refundable | free_cancellation | ...
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. rate_plan_daily_prices (override giá theo từng ngày)
CREATE TABLE public.rate_plan_daily_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rate_plan_id uuid NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric(12,2),
  sale_price numeric(12,2),
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rate_plan_id, date)
);

-- 3. room_type_availability (số phòng để bán + đóng/mở bán theo ngày, ở cấp hạng phòng)
CREATE TABLE public.room_type_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_qty int NOT NULL DEFAULT 0,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, date)
);
```

- GRANT: SELECT/INSERT/UPDATE/DELETE cho `authenticated`, ALL cho `service_role` (không cho `anon`).
- RLS: `tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())` — pattern y hệt `room_type_rates`.
- Index: `(tenant_id, room_type_id)`, `(rate_plan_id, date)`, `(room_type_id, date)`.
- Trigger `update_updated_at_column` cho cả 3.
- RPC `bulk_upsert_daily_prices(rate_plan_id, dates[], price, sale_price, is_closed)` và `bulk_upsert_rt_availability(room_type_id, dates[], qty, is_closed)` để batch update atomic.

## C. Files port từ Deal Hotel Hub (adapt)

| Source (Deal Hotel Hub) | Target (project) | Adapt |
|---|---|---|
| `src/pages/dashboard/Pricing.tsx` | `src/pages/settings/PricingDailyPage.tsx` | dùng `room_types` + `useHotelContext`, bỏ outlet context |
| `src/components/dashboard/BulkPricingPanel.tsx` | `src/components/pricing/BulkPricingPanel.tsx` | room_id → room_type_id |
| `src/components/dashboard/RatePlanManagerByRoom.tsx` | `src/components/pricing/RatePlanManager.tsx` | room_id → room_type_id |
| `src/components/dashboard/InlineCellEditors.tsx` | `src/components/pricing/InlineCellEditors.tsx` | room_id → room_type_id |
| `src/components/dashboard/pricing/useGridSelection.ts` | `src/components/pricing/grid/useGridSelection.ts` | nguyên |
| `src/components/dashboard/pricing/SelectionToolbar.tsx` | `src/components/pricing/grid/SelectionToolbar.tsx` | nguyên |
| `src/components/dashboard/pricing/bulkApply.ts` | `src/components/pricing/grid/bulkApply.ts` | room_id → room_type_id + tenant_id |
| `src/lib/rate-plan-constants.ts` | `src/lib/pricing/rate-plan-constants.ts` | nguyên |

**Hooks mới** (`src/hooks/`):
- `useRatePlans(roomTypeId)`
- `useUpsertRatePlan` / `useDeleteRatePlan`
- `useDailyPrices(roomTypeId, fromDate, toDate)`
- `useRoomTypeAvailability(roomTypeId, fromDate, toDate)`

## D. UI / Layout

**Route gộp `/settings/pricing` thành Tabs:**
```
[Lịch giá theo ngày] [Giá mặc định] [Quy tắc mùa]
```
Default tab = "Lịch giá theo ngày" (chính là chức năng port từ Deal Hotel Hub).

**Lịch giá theo ngày** — đúng UI gốc:
- Header: chọn hạng phòng + preset 7/14/30 ngày + date navigator + nút "Hôm nay"
- Hàng động: `Trạng thái` · `Phòng để bán` · 1 hàng cho mỗi gói giá
- Cell: click mở popover sửa, drag chọn range, fill-handle, copy/paste, toolbar nổi "Áp dụng cho N ngày"
- Style: Navy Trust + Sora numbers, đúng quy tắc minimalist (không icon trong tabs, semantic colors).

**Quản lý gói giá** (dialog từ nút "Quản lý gói giá"): thêm/sửa/xóa rate plan, set name/price/sale/inclusions/policies.

**Bulk edit** (dialog từ nút "Chỉnh sửa đồng loạt"): chọn plan + khoảng ngày + áp price/sale/đóng bán.

## E. Permission / Role

- Tab "Lịch giá theo ngày" cần permission `settings` (giống `/settings/pricing` hiện tại).
- Owner/Manager: full CRUD. Staff: chỉ view (RLS không chặn, nhưng UI ẩn nút sửa nếu thiếu `manage_settings`).
- Wrap mutation bằng `useGuardedMutation` để Require-Shift-Gate vẫn áp với Manager khi cần.

## F. Test cases

1. Tạo gói giá "Standard" cho hạng phòng A, giá 800k → hiển thị ở grid.
2. Sửa giá 1 ô ngày Thứ 7 thành 1.2tr → cell hiện override, hôm khác giữ 800k.
3. Drag chọn 5 ngày → toolbar hiện "5 ngày" → bấm "Áp giá 900k" → 5 ngày cập nhật, ngày khác không đổi.
4. Copy 1 ô, paste vào 7 ô khác → tile theo index.
5. Đóng bán 1 ngày → row Trạng thái = "Đóng", các plan của ngày đó disabled.
6. Đổi `Phòng để bán` của 1 ngày = 0 → hiển thị "Hết".
7. Reset 1 range → các ô về fallback (default price của plan).
8. Tenant B không thấy gói/giá của tenant A (RLS).
9. Kiểm tra responsive: laptop ≥1024 hiển thị 14 ngày, scroll ngang vẫn sticky cột trái.

## G. Rollout

1. Run migration tạo 3 bảng + RPC.
2. Deploy code (route mặc định `/settings/pricing` → tab "Lịch giá theo ngày").
3. Booking engine **không đổi** ở phase này — daily price chưa wire vào tính tiền đặt phòng (phase sau). Note rõ trong release notes.
4. Bump `APP_VERSION` 1.1.23, thêm entry `public/changelog.json`.
5. Memo: `mem://features/pricing/daily-grid-v1`.

**Rollback**: drop 3 bảng + revert `App.tsx` route, các trang `PricingV2Page`/`SeasonalRulesPage` không bị ảnh hưởng.
