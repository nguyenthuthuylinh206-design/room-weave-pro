## Mục tiêu
Ở trang Xuất kho > Danh sách phiếu: hiện luôn danh sách yêu cầu bổ sung đang chờ, cho phép tick chọn và tạo phiếu giao hàng ngay tại chỗ (không chuyển sang `view=from-requests` nữa). Bỏ nút "Xử lý ngay" và nút dropdown "Tạo phiếu mới" ở header — vì tab `+ Tạo phiếu mới` của hub Xuất kho đã làm việc đó.

## Phân tích nhanh

| Item | Có thể reuse | Cần refactor | Cần thêm | Rủi ro |
|---|---|---|---|---|
| `PendingSupplementsBanner` | UI card + select | Bỏ collapse mặc định, đổi action submit | Inline form chọn nhân viên + Giao ngay | Mất 2 option của trang `from-requests` cũ nếu không inline lại |
| `DistributionOrdersPage` | header + tabs | Bỏ `CreateDropdown` ở 2 chỗ (mobile + desktop), bỏ import dư | — | Người quen dropdown cũ sẽ tìm — tab "+ Tạo phiếu mới" của hub vẫn còn |
| `InventoryDashboardPage` | render path `from-requests` đang embed `CreateFromSupplementsPage` | Redirect `view=from-requests` → `view=list` | — | Bookmark cũ vẫn vào được trang Danh sách |
| `CreateFromSupplementsPage` | giữ nguyên trang standalone | — | — | Không phá vỡ URL trực tiếp `/inventory/distributions/from-supplements` |

## Thay đổi cụ thể

### A. `src/components/distribution/components/PendingSupplementsBanner.tsx`
1. `useState(false)` → `useState(true)` cho `isOpen` (mặc định mở).
2. Xoá button **"Xử lý ngay"** (lines 88–98) — chỉ giữ chevron trong trigger.
3. Thay `handleCreateDistribution` (navigate sang `view=from-requests`) bằng gọi trực tiếp `useCreateDistributionFromSupplements`:
   - `onSuccess`: toast "Đã tạo phiếu giao #...", reset `selectedIds`, invalidate queries `['distribution-routes']` + `['supplement-requests']` + `['pending-supplement-count']`.
4. Bổ sung gọn ngay trong vùng đã mở (chỉ render khi `selectedIds.length > 0`):
   - `Select` "Gán cho nhân viên" (`useOnShiftStaffList`) — tuỳ chọn, default `unassigned`.
   - `Checkbox` "Giao ngay (bỏ qua bước kho)" — chỉ enable khi đã chọn nhân viên.
5. Nút action chính (line 155) giữ chữ "Tạo phiếu từ {n} yêu cầu" nhưng chuyển sang mutation inline (kèm `isPending` disable + spinner text).

### B. `src/pages/inventory/DistributionOrdersPage.tsx`
1. Xoá `CreateDropdown` ở header **mobile** (line 195) và **desktop** (line 266).
2. Xoá hàm `CreateDropdown` (lines 311–end of file) — không còn được dùng.
3. Dọn imports không dùng: `DropdownMenu*`, `FileText`, `ChevronDown` (nếu không dùng chỗ khác), `usePendingSupplementCount` ở desktop (nhưng vẫn còn dùng ở mobile để quyết định render banner — giữ).
4. EmptyState của tab `todo`/`all` vẫn giữ nút "Tạo phiếu mới" inline (gọi `switchView('manual')`) — đây là CTA giúp tạo nhanh, không bị user yêu cầu xoá.

### C. `src/pages/inventory/InventoryDashboardPage.tsx`
1. Trong `useEffect` legacy redirect (line 139), thêm nhánh: nếu `view === 'from-requests'` → set `view=list` để hợp nhất.
2. Bỏ nhánh `outboundView === 'from-requests' ? <CreateFromSupplementsPage embedded /> : <DistributionOrdersPage />` — luôn render `DistributionOrdersPage`.
3. Có thể xoá `lazy` import `CreateFromSupplementsPage` ở hub (vẫn còn route standalone `/inventory/distributions/from-supplements` import độc lập từ App.tsx).

## Versioning
- `src/lib/app-version.ts`: `1.1.13` → `1.1.14`.
- `public/changelog.json`: thêm entry mô tả 3 thay đổi.

## Memory
- Cập nhật `mem://ux/outbound-consolidation-v1`: chốt rằng flow tạo phiếu từ yêu cầu bổ sung giờ inline trong banner, không còn sub-view `from-requests`.

## Test cases (manual)
- [ ] Vào `/inventory?tab=operations&sub=outbound&view=list` khi có >0 yêu cầu → banner mở sẵn, không thấy nút "Xử lý ngay", không thấy nút "Tạo phiếu mới" ở header.
- [ ] Tick 1+ yêu cầu → hiện block chọn nhân viên + checkbox "Giao ngay" + nút "Tạo phiếu từ {n} yêu cầu".
- [ ] Nhấn nút → toast thành công, banner reset selection, danh sách phiếu refresh, KHÔNG đổi URL.
- [ ] Pending = 0 → banner ẩn hoàn toàn (như cũ).
- [ ] URL legacy `?view=from-requests` → tự redirect về `?view=list`.
- [ ] Route standalone `/inventory/distributions/from-supplements` vẫn hoạt động (trang `CreateFromSupplementsPage` không embedded).

## Rollback
- Revert 3 file trên là đủ; không có migration DB.
