## Mục tiêu

Tab `/reports/financial?tab=insights` hiện tại chỉ tính lãi gộp = doanh thu − (purchase + laundry + maintenance) — chưa đúng nghiệp vụ khách sạn. Nâng cấp lên **Operations Insights v2** theo chuẩn USALI rút gọn, có chi phí nhân sự, KPI chuẩn ngành, so sánh PoP + YoY + budget, và AI advisor nâng cao.

## A. Kiến trúc & nghiệp vụ

### KPI bổ sung (chuẩn ngành KS)
- **Doanh thu**: TRevPAR (tổng DT/phòng/ngày), RevPAR, ADR
- **Hiệu quả**: GOP, GOPPAR (GOP/phòng/ngày), NOI, Profit Margin
- **Chi phí**: CostPOR (chi phí/đêm phòng bán), Labor Cost Ratio (lương/DT), Cost Ratio theo bộ phận
- **So sánh 3 chiều**: kỳ này vs kỳ trước liền kề (PoP), vs cùng kỳ năm trước (YoY), vs budget/target

### P&L USALI rút gọn (4 khối)
```
Revenue       │ Room | F&B | Service & Extra | Other
Departmental  │ Cost của từng bộ phận (laundry, F&B cost, amenities)
              │ Labor cost phân bổ theo bộ phận (HK / FO / F&B / Maint)
Undistributed │ Maintenance, Utilities (nếu có), Admin
GOP / NOI     │ Tổng hợp + biên
```

### Chi phí nhân sự
Tính từ `shift_history` × lương theo giờ của user trong kỳ. Không có table salary → thêm 2 cột vào `users`: `hourly_wage_vnd`, `monthly_salary_vnd` (ưu tiên hourly, fallback monthly chia 26×8). Phân bổ vào bộ phận qua `users.position.department`.

### Budget/Target
Bảng mới `financial_targets` theo (tenant, hotel, month, metric) cho phép owner đặt mục tiêu: occupancy, revpar, gop, labor_ratio. Hiển thị actual vs target với % hoàn thành.

## B. Schema / Migration

```sql
-- 1. Lương nhân viên
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hourly_wage_vnd numeric(12,2),
  ADD COLUMN IF NOT EXISTS monthly_salary_vnd numeric(12,2);
GRANT UPDATE (hourly_wage_vnd, monthly_salary_vnd) ON public.users TO authenticated;

-- 2. Budget/Target
CREATE TABLE public.financial_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  period_month date NOT NULL,           -- YYYY-MM-01
  metric text NOT NULL,                 -- 'occupancy'|'revpar'|'gop'|'labor_ratio'|'net_revenue'
  target_value numeric(14,2) NOT NULL,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, hotel_id, period_month, metric)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_targets TO authenticated;
GRANT ALL ON public.financial_targets TO service_role;
ALTER TABLE public.financial_targets ENABLE ROW LEVEL SECURITY;
-- Policies: owner/manager xem & sửa, staff không
```

### RPC mới
- `get_operations_pnl(tenant, hotel, start, end)` → P&L USALI 4 khối + KPI tổng hợp + labor cost theo department (server side cho consistent + perf)
- `get_labor_cost(tenant, hotel, start, end)` → tổng lương theo bộ phận từ shift_history × users.wage

## C. UI

Refactor `OperationsInsightsTab.tsx` thành 4 sub-section:

```
┌─────────────────────────────────────────────┐
│ Header: kỳ + so sánh PoP/YoY/Budget toggle │
├─────────────────────────────────────────────┤
│ 1. KPI Hero (6 ô)                          │
│    GOP | GOPPAR | RevPAR | Occupancy       │
│    ADR | Labor Ratio                       │
│    mỗi ô: actual | PoP Δ | YoY Δ | Target  │
├─────────────────────────────────────────────┤
│ 2. P&L USALI (bảng 4 khối)                 │
│    Revenue / Departmental / Undist / GOP   │
│    Cột: Kỳ này | Kỳ trước | YoY | Budget   │
├─────────────────────────────────────────────┤
│ 3. Cost Breakdown by Department            │
│    Bar/Donut: HK | FO | F&B | Laundry |    │
│    Maint | Admin — bao gồm labor đã phân bổ│
├─────────────────────────────────────────────┤
│ 4. AI Advisor + Rule Findings (như cũ)     │
│    + Target gap analysis tự động           │
└─────────────────────────────────────────────┘
```

Dialog mới `SetTargetsDialog` (owner only) để đặt budget tháng.

### Component mới
- `src/components/reports/insights/PnLTable.tsx`
- `src/components/reports/insights/CostBreakdownChart.tsx`
- `src/components/reports/insights/KpiHeroCardV2.tsx` (thêm Target & YoY)
- `src/components/reports/insights/SetTargetsDialog.tsx`

### Hook mới
- `useOperationsPnL(dateRange)` — gọi RPC `get_operations_pnl`
- `useYoYCompare(dateRange)` — fetch cùng kỳ năm trước
- `useFinancialTargets(month)` — CRUD targets
- Mở rộng `useOperationsInsights` để nhận labor + targets

### Mở rộng AI advisor
- `operationsAdvisor.ts`: thêm 6 rules
  - R11 Labor ratio > 35% → cảnh báo
  - R12 GOPPAR thấp hơn target > 20%
  - R13 YoY revenue giảm > 15%
  - R14 Cost ratio bộ phận lệch chuẩn
  - R15 Occupancy đạt target nhưng RevPAR không → ADR thấp
  - R16 F&B cost ratio quá cao
- Edge function `operations-advisor`: thêm context labor + targets + YoY vào prompt; nâng model lên `google/gemini-2.5-pro` cho phân tích sâu, giữ fallback rule khi 402/429

### Benchmark mở rộng
Thêm vào `industryBenchmarks.ts`:
- `laborRatio`: { excellent: 25, good: 30, fair: 35, poor: 45 } (%) — inverse
- `gopMargin`: { poor: 15, fair: 25, good: 35, excellent: 45 } (%)
- `goppar`: { poor: 200_000, fair: 400_000, good: 700_000, excellent: 1_000_000 }

## D. Permission
- Xem tab: `view_reports` (như hiện tại)
- Đặt target: `tenant_owner` hoặc `manage_reports`
- Sửa lương user: `tenant_owner` only — UI vào `/settings/users` (nằm ngoài scope tab này, sẽ thêm field vào form user)

## E. Test
- `operationsAdvisor.test.ts`: thêm test cho R11-R16, labor cost integration
- `useOperationsPnL.test.ts`: mock RPC, verify khớp công thức USALI
- SQL test cho `get_operations_pnl`: snapshot fixture booking + shift → assert GOP đúng
- E2E: tạo target → render gap analysis đúng

## F. Rollout

1. **Phase 1 (migration)**: thêm cột wage + bảng targets + 2 RPC. Backfill `hourly_wage_vnd` = null → labor cost = 0 cho tenant chưa cấu hình (an toàn).
2. **Phase 2 (UI)**: render PnLTable + KPI v2 với labor=0 nếu chưa setup → banner "Cấu hình lương để xem chi phí nhân sự đầy đủ".
3. **Phase 3 (targets)**: bật SetTargetsDialog cho owner.
4. **Phase 4 (AI v2)**: deploy edge function nâng cấp với context mới.

Feature flag `settings.reports.insights_v2 = true` (mặc định bật, có thể tắt nếu lỗi).

## G. Rủi ro
- **Phân bổ labor sai** nếu `users.position.department` null → fallback gom vào "Khác", có cảnh báo
- **Performance**: `get_operations_pnl` chạy nặng (join shift + bookings + costs) → index sẵn có, cache 5 phút client + materialized view nếu cần
- **YoY thiếu data** với hotel mới < 1 năm → hide cột YoY, show "—"
- **AI cost tăng** do prompt dài hơn → giữ rule fallback, monitor 402

## Files dự kiến
**Tạo mới**: migration SQL, 4 components, 3 hooks, 1 edge function update, test files
**Sửa**: `operationsAdvisor.ts`, `industryBenchmarks.ts`, `OperationsInsightsTab.tsx`, `useOperationsInsights.ts`, `supabase/functions/operations-advisor/index.ts`, form sửa user (thêm field lương)

## Bước tiếp theo
Sau khi duyệt plan, sẽ chia làm 4 PR theo phase. Phase 1 (migration) cần duyệt riêng trước khi tiếp Phase 2.
