
# Kế hoạch hợp nhất & dọn dẹp báo cáo

Dựa trên phản hồi:
1. **Xoá** tab `revenue` cũ trong Finance — gộp hẳn vào Room Revenue
2. **Embed** dashboard `/housekeeping/qc` vào tab Housekeeping Hub
3. **Xoá** `ReportsDashboardPage` cũ (không giữ legacy)

---

## A. Kiến trúc mới

### Finance Hub (`/reports/finance`) — 3 tab
```
├── room-revenue  (default)  ← RoomRevenueReportPage embedded
├── cash-flow                 ← CashFlowReportPage embedded
└── costs                     ← FinancialReportPage (P&L) embedded
```
→ **Xoá** `RevenueReportPage` khỏi hub (logic doanh thu đã có trong Room Revenue).

### Operations Hub (`/reports/operations`) — 2 tab
```
├── kpi      ← OperationsReportPage
└── rooms    ← RoomsReportPage
```
→ **Xoá** tab `damages` (chuyển sang Inventory Hub).

### Inventory Hub (`/reports/inventory-hub`) — 5 tab
```
├── stock        ← InventoryReportPage
├── outbound     ← OutboundReportPage
├── audit        ← StockAuditReportPage
├── maintenance  ← MaintenanceReportPage
└── damages      ← DamagesReportPage  (MỚI, chuyển từ Operations)
```

### Housekeeping Hub (`/reports/housekeeping`) — 2 tab
```
├── qc        ← QCDashboardPage embedded  (MỚI, default)
└── laundry   ← LaundryReportPage
```

---

## B. Routing & Redirects

`src/App.tsx`:
- **Giữ** route tab-based: `/reports/finance`, `/reports/operations`, `/reports/inventory-hub`, `/reports/housekeeping`
- **Redirect** các route standalone về tab tương ứng:
  - `/reports/room-revenue` → `/reports/finance?tab=room-revenue`
  - `/reports/cash-flow`    → `/reports/finance?tab=cash-flow`
  - `/reports/revenue`      → `/reports/finance?tab=room-revenue` (xoá page cũ)
  - `/reports/financial`    → `/reports/finance?tab=costs`
  - `/reports/damages`      → `/reports/inventory-hub?tab=damages`
- **Xoá** route `/reports` (ReportsDashboardPage) → redirect về `/reports/finance` (entry point mặc định cho Owner). MobileReportsDashboard giữ riêng cho mobile (vẫn cần landing list).

> Lưu ý: `ReportsDashboardPage` chỉ dùng cho desktop landing. Mobile dùng `MobileReportsDashboard` (giữ nguyên — vẫn là landing list trên mobile). Sẽ thay desktop landing bằng redirect tới Finance Hub.

---

## C. Component changes

### Thêm prop `embedded` (ẩn PageHeader khi nằm trong tab)
- `RoomRevenueReportPage.tsx` — thêm `embedded?: boolean`, ẩn `<header>` khi true
- `CashFlowReportPage.tsx` — tương tự
- `QCDashboardPage` (`src/pages/housekeeping/QCDashboardPage.tsx` hoặc tương đương) — thêm `embedded?: boolean`

### Cập nhật Hub files
- `FinanceHubPage.tsx` — đổi tabs thành `[room-revenue, cash-flow, costs]`, dùng `render: () => <Component period embedded />`. Xoá `FinanceKpiStrip` (đã có KPI trong Room Revenue) — hoặc giữ nếu hữu ích.
- `OperationsHubPage.tsx` — xoá tab `damages`
- `InventoryHubPage.tsx` — thêm tab `damages`
- `HousekeepingHubPage.tsx` — thêm tab `qc` (default)

### Xoá files
- `src/pages/reports/ReportsDashboardPage.tsx` (desktop landing cũ)
- `src/pages/reports/RevenueReportPage.tsx` — **KHÔNG xoá file** (vẫn export component dùng được nơi khác nếu có). Chỉ bỏ khỏi catalog & hub. *(Cần verify trước khi xoá.)*

### `src/lib/reportsCatalog.ts`
- Bỏ entry `room-revenue` & `cash-flow` standalone, hoặc đổi `path` về tab URL.
- Bỏ entry `revenue` (cũ).
- Đảm bảo Finance section chỉ có 1 entry: Finance Hub.
- Đảm bảo `damages` nằm trong Inventory section.

---

## D. Permission
Không đổi — tất cả vẫn dùng `view_reports`. Catalog filter theo role/department giữ nguyên.

---

## E. Test
- Smoke: load 4 hub, switch tab, đảm bảo không lỗi.
- Redirect: các URL cũ vẫn vào đúng tab.
- `reportsCatalog.test.ts` — update assertions cho danh sách mới.

---

## F. Rollout
1. Migration nhẹ: chỉ thay đổi FE, không đụng DB.
2. Bump version `1.0.54` + entry `changelog.json`.
3. QA checklist:
   - [ ] `/reports/room-revenue` redirect đúng
   - [ ] `/reports/cash-flow` redirect đúng
   - [ ] `/reports/damages` redirect đúng
   - [ ] Tab QC trong Housekeeping load đúng dashboard
   - [ ] Catalog mobile không vỡ
   - [ ] Sidebar nav vẫn trỏ đúng

---

## File dự kiến sửa/xoá

**Sửa:**
- `src/App.tsx` (routes + redirects)
- `src/lib/reportsCatalog.ts`
- `src/pages/reports/hub/FinanceHubPage.tsx`
- `src/pages/reports/hub/OperationsHubPage.tsx`
- `src/pages/reports/hub/InventoryHubPage.tsx`
- `src/pages/reports/hub/HousekeepingHubPage.tsx`
- `src/pages/reports/RoomRevenueReportPage.tsx` (thêm `embedded`)
- `src/pages/reports/CashFlowReportPage.tsx` (thêm `embedded`)
- QCDashboardPage (thêm `embedded`) — cần verify path
- `src/lib/app-version.ts` → `1.0.54`
- `public/changelog.json`
- `src/lib/reportsCatalog.test.ts`

**Xoá:**
- `src/pages/reports/ReportsDashboardPage.tsx`

**Phần còn thiếu / giả định:**
- Giả định `QCDashboardPage` có sẵn ở `/housekeeping/qc` và export một component có thể embed. Sẽ verify khi build và refactor tách shell nếu cần.
- `MobileReportsDashboard` giữ nguyên cho mobile landing — không bị ảnh hưởng.
