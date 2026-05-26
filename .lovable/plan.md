# Sprint B2 — Trang `/reports` Tổng quan điều hành

Mục tiêu: thay trang `/reports` hiện tại (danh sách section + QuickReport) bằng **một màn hình chủ/quản lý nhìn 10 giây biết tình hình**, theo plan B đã duyệt.

---

## Thành phẩm

### A. Layout trang `/reports` mới (`OverviewHubPage`)

Một trang, không tab, gồm 4 khối xếp dọc:

1. **Header rút gọn** + `<PeriodPresetChips>` (mặc định "Tháng này").
2. **Dải 6 KPI tổng** (dùng `<KpiScorecardStrip>` đã có ở B1):
   - Doanh thu thuần • Lợi nhuận • Công suất phòng • RevPAR • Chi phí vận hành • Còn nợ
   - Mỗi tile có Δ% so kỳ trước (logic giống Finance Hub).
   - Click tile → drilldown sang hub liên quan kèm `?period=` được preserve (ví dụ Doanh thu → `/reports/finance?tab=revenue&period=this_month`).
3. **`<RevenueVsCostChart>`** — biểu đồ kết hợp Doanh thu (cột) vs Chi phí (line) 30 ngày gần nhất. Reuse data có sẵn từ `useRevenueReport` monthly trends + `useFinancialReport` monthly_trend (đã có sau B1 Sprint trước).
4. **`<AlertList>` "Cần chú ý"** — 3–8 dòng cảnh báo gom từ 4 nguồn dưới. Mỗi dòng: icon dot semantic • mô tả 1 dòng • link "Xem ngay" sang trang xử lý.

Phía dưới (mặc định **thu gọn**, mobile ẩn) giữ lại **section grid 4 hub** để user vẫn navigate được — nhưng đóng vai trò phụ, không phải nội dung chính. Quyền lọc cho department_manager giữ nguyên (reuse `useAccessibleReports`).

### B. Component mới

- `src/components/reports/AlertList.tsx` — list compact, mỗi item: `tone (warning|danger|info)` • title • description • CTA. Empty state: "Mọi thứ ổn ✓".
- `src/components/reports/RevenueVsCostChart.tsx` — Recharts ComposedChart 30 ngày. Theme tokens, height 220, có legend rút gọn.
- `src/components/reports/OverviewKpiStrip.tsx` — strip 6 KPI tổng (tách khỏi FinanceKpiStrip vì mix nguồn data).

### C. Hook gom alert

`src/hooks/useOverviewAlerts.ts` — 1 hook duy nhất chạy 4 query song song, return mảng `Alert[]`:

| Nguồn | Điều kiện | Severity |
|---|---|---|
| `room_bookings` | `status='checked_in'` AND `check_out_date < now()` | danger |
| `get_low_stock_items` RPC | `quantity_in_stock <= reorder_point` | warning |
| `maintenance_requests` | `priority='urgent'` AND `status IN ('waiting','pending','in_progress')` | danger |
| `laundry_batches` | `expected_return_date < now()` AND `status NOT IN ('stocked','received')` | warning |

Mỗi query `.eq('tenant_id', tenantId)`, filter theo `selectedHotel` nếu không All-Hotels. Cap mỗi nguồn ở 3 item; tổng strip cap ở 8.

### D. Hook gom KPI tổng

`src/hooks/useOverviewKpiStrip.ts` — gom data từ:
- `useRevenueReport('custom', {start,end})` → netRevenue + paidRevenue (đã có previous trong hook).
- `useFinancialReport({start,end})` current + previous → totalCost.
- Lợi nhuận = netRevenue − totalCost; delta tự tính.
- Công suất + RevPAR + room nights: tạm tính client-side từ `room_bookings` đã checked_out trong kỳ ÷ (`rooms.count` × `days`) — KHÔNG tạo RPC mới ở sprint này (RPC `get_operations_kpi` để B3 làm gọn).
- Còn nợ: từ `currentPeriod.pendingRevenue` (đã có ở useRevenueReport).

### E. Routing

- `path: "reports"` → trỏ sang `OverviewHubPage` mới (thay vì `ReportsDashboardPage` cũ).
- Giữ `ReportsDashboardPage` cũ tạm thời ở `/reports/legacy` (tham chiếu rollback 1 release).

### F. Bump version

- `APP_VERSION` → 1.0.50
- changelog entry "Tổng quan điều hành: 6 KPI + biểu đồ doanh thu vs chi phí + danh sách Cần chú ý".

---

## Files dự kiến

**Tạo mới:**
- `src/pages/reports/hub/OverviewHubPage.tsx`
- `src/components/reports/AlertList.tsx`
- `src/components/reports/RevenueVsCostChart.tsx`
- `src/components/reports/OverviewKpiStrip.tsx`
- `src/hooks/useOverviewAlerts.ts`
- `src/hooks/useOverviewKpiStrip.ts`

**Sửa:**
- `src/App.tsx` — route `/reports` trỏ sang OverviewHubPage; thêm `/reports/legacy` (giữ trang cũ).
- `src/lib/app-version.ts` + `public/changelog.json`.

**Không đụng:**
- 4 hub đã có (B1) — giữ nguyên.
- Hook + RPC hiện tại — không sửa.

---

## Không thuộc B2 (để B3/B4)

- Áp KpiStrip cho Operations/Housekeeping/Inventory Hub.
- RPC `get_operations_kpi` gộp (sprint này tạm tính client).
- Drilldown preserve `?period=` ở mọi hub (làm ở B4 khi refactor section).
- Mobile polish riêng cho OverviewHubPage — sprint này responsive cơ bản (2 cột mobile, 6 cột desktop) là đủ.
- Xoá hẳn `ReportsDashboardPage` cũ — chờ 1 release để rollback an toàn.

---

## QA checklist sau khi build

- [ ] `/reports` mở thấy 6 KPI có Δ% so kỳ trước.
- [ ] Đổi chip kỳ → cả 6 KPI + chart + alert refetch đúng.
- [ ] Click KPI Doanh thu → sang `/reports/finance?tab=revenue`.
- [ ] AlertList rỗng khi không có cảnh báo (hiển thị "Mọi thứ ổn").
- [ ] Department manager vẫn vào được `/reports` nhưng chỉ thấy section hub được cấp.
- [ ] Mobile 414px: KPI 2 cột, chart cuộn ngang ổn.

**OK bắt đầu build B2?**