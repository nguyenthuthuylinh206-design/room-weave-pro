## Mục tiêu

Nâng cấp `/inventory` (Hub Kho & Tài sản) thành **trung tâm điều hành kho production-ready** theo chuẩn Enterprise SaaS minimalist, không thay kiến trúc, chỉ refactor UI/UX + thêm widget + tối ưu nav.

---

## A. Kiến trúc / nghiệp vụ

### Reuse
- `useInventoryDashboard`, `useConsumptionAnalytics`, `useDeadStockReport`, `useReorderSuggestions`
- Tất cả 15 trang con + routing `?tab=&sub=` hiện có
- `consumption_snapshots` (đã có cron hourly) → dùng cho widget dự báo

### Refactor
- `InventoryOverviewSection.tsx`: bỏ Hero card lớn + 4 StatCard rời, thay bằng grid KPI compact dạng "border rounded-lg + text-xs label + text-2xl value" theo Enterprise SaaS standards
- `InventoryDashboardPage.tsx`: thêm thanh search nhanh + breadcrumb + sticky sub-nav header trên cùng

### Thêm mới
- `InventoryKpiGrid.tsx` — 6 KPI: Tổng giá trị, Số SKU, Sắp hết (<7 ngày dự báo từ snapshots), Cần đặt lại, Tồn ứ đọng ≥90d, Giao dịch hôm nay. Mỗi card click → điều hướng đúng tab/sub
- `InventoryTopConsumedWidget.tsx` — Top 5 items tiêu hao 30 ngày qua (dùng `useConsumptionAnalytics`)
- `InventoryForecastWidget.tsx` — Dự báo hết hàng <7 ngày (dùng snapshots `days_until_stockout`)
- `InventoryHotelBreakdown.tsx` — Giá trị/SKU theo hotel (chỉ hiện khi `availableHotels.length > 1` và đang ở chế độ All Hotels)
- `InventoryQuickSearch.tsx` — Combobox `cmd-k` style: gõ tên item → preview tồn kho + jump sang Items page
- `useInventoryHubShortcuts.ts` — Keyboard: `g o`=Tổng quan, `g i`=Nhập, `g x`=Xuất, `g k`=Kiểm kê, `/`=focus search

### Điều hướng
- Sidebar trái: giữ 5 nhóm, thêm **badge số** cạnh mục (Đề xuất nhập: count, Phiếu giao: pending, Cảnh báo: low_stock_count)
- Sticky TabsList trên cùng (top-0) khi scroll
- Breadcrumb: `Kho › {Nhóm} › {Mục}` ở mobile/desktop
- Mobile: thay TabsList ngang bằng Sheet menu (nút "Menu kho ▾") để 15 mục không tràn

---

## B. Schema / migration

**Không cần migration.** Dùng lại `consumption_snapshots`, `inventory_dashboard` view hiện có.

## C. API / RPC

**Không thêm RPC.** Chỉ thêm 1 hook tổng hợp `useInventoryHubBadges()` đếm: reorder pending, distribution pending, low stock — gọi song song qua React Query.

---

## D. UI screens / components (mới + sửa)

```
src/components/inventory/hub/
  ├─ InventoryKpiGrid.tsx           [mới]
  ├─ InventoryTopConsumedWidget.tsx [mới]
  ├─ InventoryForecastWidget.tsx    [mới]
  ├─ InventoryHotelBreakdown.tsx    [mới]
  ├─ InventoryQuickSearch.tsx       [mới]
  └─ InventoryHubBreadcrumb.tsx     [mới]

src/hooks/
  ├─ useInventoryHubBadges.ts       [mới]
  └─ useInventoryHubShortcuts.ts    [mới]

src/components/inventory/InventoryOverviewSection.tsx [refactor]
src/pages/inventory/InventoryDashboardPage.tsx        [refactor: search + breadcrumb + sticky + badges + mobile sheet]
src/components/inventory/MobileInventoryDashboard.tsx [refactor nhẹ: dùng cùng KpiGrid]
```

### Layout Tổng quan mới
```text
┌────────────────────────────────────────────────────┐
│ [Search nhanh kho...]              [+ Thao tác ▾] │
├────────────────────────────────────────────────────┤
│ KPI Grid (6 cards compact, clickable)              │
├──────────────────┬─────────────────────────────────┤
│ Biểu đồ giá trị  │ Dự báo hết hàng <7 ngày        │
│ (6 tháng)        │ ─ item · còn X ngày · [Đặt]    │
├──────────────────┼─────────────────────────────────┤
│ Top tiêu hao 30d │ Cảnh báo & Giao dịch gần đây   │
└──────────────────┴─────────────────────────────────┘
[Hotel Breakdown - chỉ All Hotels]
```

---

## E. Permission

- Search/KPI: mọi role có `view_inventory`
- Badge "Quản lý kho": chỉ manager+
- Hotel Breakdown: chỉ owner/super_admin ở All Hotels mode (theo memory `all-hotels-mode-guards-v1`)
- Shortcut `g k` (kiểm kê): ẩn nếu không có `manage_inventory`

---

## F. Test cases

1. KPI "Cần đặt lại" click → mở `?tab=operations&sub=reorder`
2. KPI "Tồn ứ đọng" click → `?tab=analytics&sub=dead-stock`
3. Search gõ "khăn" → hiển thị items match, Enter → nhảy `/inventory?tab=assets&sub=items&q=khăn`
4. Badge `Đề xuất nhập (3)` realtime update khi có suggestion mới
5. Mobile 390px: menu 15 mục mở Sheet, không tràn TabsList
6. All Hotels mode: Hotel Breakdown hiện, single hotel mode: ẩn
7. Shortcut `/` focus search, `g i` nhảy tab nhập kho
8. Sticky sub-nav: scroll xuống vẫn thấy TabsList
9. Forecast widget: item có `days_until_stockout < 7` hiện đỏ
10. Tenant isolation: query badges đều `.eq('tenant_id', tenantId)`

---

## G. Rollout notes

- **Không breaking**: URL `?tab=&sub=` giữ nguyên, tất cả route con không đổi
- Bump `APP_VERSION` → `1.1.8`, `CURRENT_VERSION` CacheBuster, thêm entry `public/changelog.json`
- Feature flag không cần (UI thuần)
- Rollback: revert 8 file mới + 3 file sửa
- Memory cập nhật: thêm `mem://design/inventory-hub-v2-layout`

---

## Phần còn thiếu / giả định

- **Giả định**: `consumption_snapshots` đã có cột `days_until_stockout` (theo memory C2) — nếu chưa, fallback tính client-side từ `avg_daily_consumption`
- **Giả định**: chấp nhận giữ kiến trúc tabs hiện tại, không chuyển sang routed pages
- Bỏ qua: i18n key mới (dùng tiếng Việt hardcode theo Vietnamese-first)
