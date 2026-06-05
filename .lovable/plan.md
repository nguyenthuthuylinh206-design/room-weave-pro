## Audit module Kho (`/inventory`) — phát hiện & đề xuất

Sau khi rà soát Hub, widgets, mobile dashboard và hooks chính, đây là các vấn đề **đáng sửa nhất** kèm đề xuất triển khai. Chia theo mức độ ưu tiên.

---

### A. LỖI LOGIC (số liệu sai — ưu tiên P0)

**A1. KPI "Sắp hết (7 ngày)" bị thổi phồng**
- `useLatestConsumptionSnapshots(500)` trả **nhiều dòng/item** (mỗi ngày 1 snapshot), sort `snapshot_date DESC`, limit 500.
- `InventoryTodoCard.forecastSoonOut` và `InventoryKpiGrid` đếm `.filter(s => s.stock_days_remaining < 7).length` → **đếm trùng** cùng item nhiều ngày.
- Chỉ `CombinedStockAlerts` có dedup latest-per-item (Map + so sánh `snapshot_date`).
- **Fix**: extract helper `useStockoutItems(thresholdDays)` trả Map latest-per-item và `count`. Dùng chung cho 3 widget + `InventoryForecastWidget`.

**A2. Forecast widget show duplicates**
- `InventoryForecastWidget` slice 8 dòng đầu sau filter — nếu item A có 5 snapshot trong tuần thì 5 dòng A xuất hiện, đẩy item khác ra ngoài top 8.
- **Fix**: dedup latest-per-item trước khi sort/slice.

**A3. Limit 500 có thể cắt cụt**
- Tenant nhiều item + nhiều ngày → 500 dòng có thể không phủ toàn bộ item.
- **Fix**: hoặc thêm RPC `get_latest_consumption_snapshots()` (DISTINCT ON item_id ORDER BY snapshot_date DESC) để chỉ trả latest, hoặc tăng limit + dedup ở client. Ưu tiên RPC: giảm payload + chuẩn xác.

**A4. `distributionsPending` đếm cả `in_progress`**
- Trong `useInventoryHubBadges`, badge gồm `pending + approved + in_progress`.
- TodoCard label: "phiếu xuất kho cần xử lý" — `in_progress` là **đang được xử lý**, không phải cần xử lý.
- **Fix**: chỉ đếm `pending + approved` cho "cần xử lý"; tách metric riêng cho `in_progress` nếu cần hiển thị.

---

### B. UI/UX TRÙNG LẶP (ưu tiên P1)

**B1. 3 widget cùng nói "sắp hết 7 ngày"**
Trên Overview tab desktop:
- TodoCard hàng "X món sắp hết trong 7 ngày"
- KpiGrid tile "Sắp hết (7 ngày): N"
- CombinedStockAlerts tile "Sắp hết <7d: M"
→ 3 con số (có thể khác nhau vì bug A1) cho cùng 1 khái niệm.
- **Fix**: giữ "sắp hết" ở **1 chỗ** (TodoCard — action-first). KpiGrid bỏ tile "Sắp hết", thay bằng KPI khác (vd. tốc độ tiêu thụ TB, số phiếu tuần qua). CombinedStockAlerts đổi tile thành "Item đã hết" (stock = 0) để bổ trợ chứ không trùng.

**B2. Mobile dashboard tách rời, mất feature mới**
- `MobileInventoryDashboard` không render `InventoryTodoCard`, `InventoryKpiGrid`, `CombinedStockAlerts`.
- Mobile users vẫn thấy UI cũ: `MobileInventoryHero` + `RestockAlertSheet` + `MobileLowStockSection`.
- **Fix**: tái dùng `InventoryTodoCard` ở mobile (đã responsive `min-h-[56px]`, full-width). Loại bỏ `MobileLowStockSection` + `RestockAlertSheet` riêng, dùng `CombinedStockAlerts` (đặt full-width, không grid 3 cột — đổi sang stacked trên `<md`).

**B3. Label badge mobile sai ngữ nghĩa**
- Mobile "Cảnh báo tồn kho" button: badge số dùng `useReorderPendingCount` (số đề xuất đặt hàng), không phải số item low-stock thực.
- **Fix**: dùng `lowStock` từ `useInventoryHubBadges` cho đúng label.

---

### C. DỌN LEGACY / DEAD CODE (P1)

**C1. Components song song chưa xóa**
- `LowStockAlert.tsx`, `InventoryAlertsWidget.tsx`, `RestockAlertSheet.tsx` — file vẫn tồn tại; `CombinedStockAlerts.tsx` được giới thiệu là "thay 2 widget cũ".
- `RestockAlertSheet` vẫn được mobile dùng nửa vời.
- **Fix**: sau khi B2 chuyển mobile sang Combined, xóa hẳn `LowStockAlert.tsx`, `InventoryAlertsWidget.tsx`, `RestockAlertSheet.tsx`, `MobileLowStockSection.tsx`.

**C2. console.error leak**
- `src/components/inventory/MobileOutboundForm.tsx:387` có `console.error('Submit error:', err)` — để debug nhưng vẫn còn.
- **Fix**: thay bằng toast hoặc bỏ.

---

### D. PERFORMANCE & DATA (P2)

**D1. Realtime invalidate thiếu `items`**
- `useInventoryHubBadges` chỉ subscribe `reorder_suggestions`, `distribution_orders`, `stock_adjustments`. **Không** subscribe `items.quantity_in_stock` → KPI `lowStock` stale khi xuất/nhập trực tiếp.
- **Fix**: thêm channel `items` filter `tenant_id=eq.X`, throttle invalidate 2s.

**D2. 4 lần `useLatestConsumptionSnapshots(500)`**
- React Query dedupe theo key, nhưng mỗi widget reimplement logic dedup → tốn render + dễ lệch nhau.
- **Fix**: extract `useStockoutItems()` ở `/hooks` trả `{ items: Map, criticalCount, soonOutCount }` — dùng chung.

**D3. `useInventoryTransactions` dùng `p_limit/p_offset` cũ**
- Sau Sprint A3+B, convention mới là `p_page/p_page_size/p_search` (đã làm cho `get_laundry_batches_filtered`).
- **Fix**: optional — chuẩn hóa RPC `get_inventory_transactions_filtered` về pattern mới. Cần migration + caller update; nếu sợ phá vỡ thì hoãn.

---

### E. FLOW/ROUTING (P3)

**E1. Phiếu trực tiếp (Inbound/Outbound/Adjustment) bypass Hub**
- `/inventory/inbound/new`, `/outbound/new`, `/adjustments/new` mở page độc lập, không vào trong `InventoryHubPage` → mất tabs/breadcrumb context. Riêng `/distributions/new` đã redirect về Hub.
- **Fix**: thống nhất — hoặc tất cả mở fullscreen modal-route (drawer), hoặc tất cả vào trong Hub. Hub-first đồng nhất với Hub v3 task-first.

**E2. `CombinedStockAlerts` navigate `/items?filter=low-stock`**
- Cần verify ItemsPage hỗ trợ query param `filter=low-stock`.

---

### Mục tiêu deliverable đợt sửa này

Chia 2 batch để rollout an toàn:

**Batch 1 (P0 + P1 chính)** — fix logic + dọn trùng widget
1. Tạo `src/hooks/useStockoutItems.ts` — dedup latest-per-item, trả count theo threshold.
2. Sửa `InventoryTodoCard`, `InventoryKpiGrid`, `CombinedStockAlerts`, `InventoryForecastWidget` dùng hook mới.
3. Sửa `useInventoryHubBadges`: tách `distributionsPending` → chỉ `pending+approved`.
4. Mobile dashboard: render `InventoryTodoCard` + `CombinedStockAlerts` (stacked). Sửa badge mobile dùng `lowStock`.
5. Xóa `LowStockAlert`, `InventoryAlertsWidget`, `RestockAlertSheet`, `MobileLowStockSection`.
6. Bỏ `console.error` ở `MobileOutboundForm`.

**Batch 2 (P2 — sau khi batch 1 ổn)**
7. RPC `get_latest_consumption_snapshots()` để chuẩn xác và giảm payload.
8. Realtime subscribe `items` cho badges hub.
9. (Optional) chuẩn hóa `get_inventory_transactions_filtered` về pattern page/page_size.

### Test & QA
- Snapshot integration test cho `useStockoutItems` (mock multi-day snapshots, assert dedup đúng).
- Manual: bật mobile viewport 390px — kiểm TodoCard + CombinedStockAlerts render OK, badge "Cảnh báo tồn kho" hiển thị đúng số low-stock.
- Manual: tạo 1 phiếu distribution trạng thái `in_progress` → badge "phiếu cần xử lý" KHÔNG tăng (sau fix A4).
- Bump `APP_VERSION` + changelog cho mỗi batch.

### Rủi ro
- Xóa `RestockAlertSheet` đang bind ở Mobile có thể vỡ deep-link nếu nơi khác dùng (`rg "RestockAlertSheet"` đã liệt kê chỉ 1 chỗ — an toàn).
- Đổi `distributionsPending` business meaning cần thông báo cho team vận hành.

---

Bạn duyệt batch nào trước? Mặc định mình sẽ làm **Batch 1** nếu OK.
