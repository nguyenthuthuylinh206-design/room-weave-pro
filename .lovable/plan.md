## Batch 3 — Kho & Tài sản: phát hiện và đề xuất fix

Sau khi rà soát code + dữ liệu thực tế trên DB, có **3 bug logic ẩn** + **2 cải thiện nhỏ**. Đều khu trú trong `useInventoryHubBadges` + `useStockoutItems` + Todo/KPI hub, không đụng nghiệp vụ RPC.

### A. Bug đã xác minh trên DB

#### A1. `adjustmentsPending` luôn = 0 (bug filter status sai)
- `useInventoryHubBadges` lọc `stock_adjustments.status = 'pending'`.
- Thực tế DB chỉ có: `draft`, `in_progress`, `approved`, `completed`. **Không có giá trị `pending`.**
- Hậu quả: TodoCard mục "X phiếu kiểm kê đang xử lý" **không bao giờ hiển thị**, dù DB hiện đang có 1 `in_progress` + 1 `approved` + 3 `draft`.
- **Fix**: đổi sang `.in('status', ['draft','in_progress','approved'])`. `draft` = chưa hoàn thành nhưng cần chốt; `approved` = chờ completed.

#### A2. `distributionsPending` bỏ sót `released` (bug filter status)
- Hiện tại lọc `['pending','approved']`. Nhưng enum thực tế là: `pending | in_progress | released | completed | cancelled`. **Không có `approved`** → cả "approved" là noise.
- `released` = đã xuất kho chờ phòng confirm — cần đếm để manager thấy.
- **Fix**: đổi sang `.in('status', ['pending','released'])`. Tương ứng cập nhật memory ghi chú "Cần xử lý" badge.

#### A3. `useStockoutItems` cap 200 → có thể bỏ sót `outOfStockCount`
- Dùng `useLowStockItems(200)` để đếm `quantity_in_stock = 0`. Tenant có >200 món low stock sẽ thiếu.
- **Fix**: thêm helper riêng `useOutOfStockCount()` query `items` với `head:true` (đếm chuẩn không cần fetch rows):
  ```ts
  supabase.from('items').select('id', { count:'exact', head:true })
    .eq('tenant_id', tenantId).eq('quantity_in_stock', 0)
    .eq('is_active', true)
    [+ hotel filter]
  ```
- `useStockoutItems.outOfStockCount` sẽ ưu tiên giá trị này nếu có, fallback về tính từ snapshots.

### B. Cải thiện nhỏ (UX/perf)

#### B1. Thiếu realtime cho `reorder_suggestions` table khi count
- TodoCard "đề xuất đặt hàng chờ duyệt" cần realtime — hiện đã có subscription trong `useInventoryHubBadges` (✓ pass). Nhưng `useReorderSuggestions` (trang riêng) không invalidate khi thêm. Sẽ kiểm tra và bổ sung nếu thiếu.

#### B2. `CombinedStockAlerts` tile "Sắp hết <7d" navigate sang `analytics?sub=consumption`
- Nên trỏ tới `operations?sub=reorder` (cùng đích với TodoCard) để hành động được ngay thay vì chỉ xem chart.

#### B3. KPI tile "Đã hết hàng" click sang `analytics?sub=consumption`
- Tương tự B2 — nên trỏ `/items?filter=out-of-stock` để thấy ngay danh sách item cần xử lý. (Phải kiểm tra `/items` có support filter này chưa; nếu chưa thì giữ nguyên hoặc dùng `?filter=low-stock`.)

### C. Files dự kiến chỉnh

- `src/hooks/useInventoryHubBadges.ts` — fix A1, A2 + cập nhật comment.
- `src/hooks/useStockoutItems.ts` — thêm gọi `useOutOfStockCount`; outOfStockCount lấy từ count chuẩn.
- `src/hooks/useOutOfStockCount.ts` (mới, ~30 dòng) — head-only count, có realtime cho `items` UPDATE.
- `src/components/inventory/hub/CombinedStockAlerts.tsx` — B2.
- `src/components/inventory/hub/InventoryKpiGrid.tsx` — B3 (sau khi xác nhận route).
- `src/hooks/useReorderSuggestions.ts` — kiểm tra & thêm realtime invalidate nếu thiếu.
- `src/lib/app-version.ts` + `public/changelog.json` — bump 1.1.84.

### D. Test / QA checklist

1. Tạo `stock_adjustment` draft → TodoCard hiện "1 phiếu kiểm kê đang xử lý" trong <2s.
2. Approve adjustment → vẫn count; complete → biến mất.
3. Tạo `distribution_order` pending → badge "Cần xử lý" +1; chuyển sang `released` → vẫn còn; `completed` → biến mất.
4. Manual set `items.quantity_in_stock = 0` → KPI "Đã hết hàng" cập nhật realtime (không cần F5).
5. Tenant test với >200 low stock items → `outOfStockCount` vẫn đúng.

### E. Không đụng

- RPC, schema, RLS, permission.
- Distribution/laundry/adjustment business flow.
- Mobile layout (TodoCard mobile đã hưởng cùng hook).

### F. Rollback

Tất cả thay đổi hook là **client-side only**. Rollback = revert commit. Không migration.

### G. Phần còn lại sau Batch 3 (đề xuất sau)

- `useWarehouses` còn `select('*')` — cân nhắc whitelist (security finding gợi ý).
- `useLowStockItems` không có realtime — nếu cần dữ liệu sống hoàn toàn cho `CombinedStockAlerts`, có thể subscribe `items` UPDATE.
- Tách RPC `get_inventory_dashboard_stats` ra để client gọi song song với badges (đang trùng work).

---

Bạn duyệt thì mình chuyển sang build và áp dụng cả 3 fix bug + 2 UX polish trên.
