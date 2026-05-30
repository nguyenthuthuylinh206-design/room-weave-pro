# Gọn menu Kho & Tài sản — Hub 1 trang

## Mục tiêu
Sidebar mục **Kho & Tài sản** hiện có **15 mục con** chia 5 nhóm → gây rối. Gom hết vào **1 mục duy nhất** trỏ về `/inventory`. Tại đây là **hub có tab** chứa toàn bộ chức năng, không phá vỡ các route hiện có.

## A. Thay đổi sidebar

`src/components/layout/Sidebar.tsx` (dòng 107–130): rút children xuống còn **1 mục**:

```
Kho & Tài sản  →  /inventory   (badge: tổng các badge con)
```

Bỏ toàn bộ 14 mục con. Vẫn giữ `inventoryTotal` badge gộp (adjustments + distributions + reorderSuggestions + supplements) để Owner/Manager thấy việc cần làm ngay từ sidebar.

Các route con (`/inventory/transactions`, `/items`, `/inventory/inbound/new`, …) **giữ nguyên** — chỉ ẩn khỏi sidebar, vẫn truy cập được qua hub và deep-link cũ.

## B. Refactor `InventoryDashboardPage.tsx` thành Hub

Cấu trúc trang mới (giữ desktop & mobile portrait first):

```text
┌──────────────────────────────────────────────────────┐
│  Kho & Tài sản                       [+ Thao tác ▾]  │  ← header + menu nhanh (Nhập / Xuất / Chuyển / Kiểm kê)
├──────────────────────────────────────────────────────┤
│  KPI cards: Tổng SKU · Giá trị tồn · Cần đặt · Ứ đọng│
├──────────────────────────────────────────────────────┤
│  [Tổng quan] [Tài sản] [Xuất nhập] [Phân tích] [Cài đặt] │  ← Tabs (shadcn)
├──────────────────────────────────────────────────────┤
│  <Nội dung tab>                                      │
└──────────────────────────────────────────────────────┘
```

### Mapping 5 tab

| Tab | Nội dung (component reuse) |
|---|---|
| **Tổng quan** | Widget hiện tại của `InventoryDashboardPage` + bảng giao dịch gần đây (lấy từ `TransactionListPage`, giới hạn 10 dòng + nút "Xem tất cả") |
| **Tài sản** | Embed `ItemsListPage` (kèm filter Danh mục); nút "Thêm tài sản" → `/items/new`; link "Danh mục" → `/items/categories` |
| **Xuất nhập** | Sub-tabs: Nhập · Xuất · Chuyển · Kiểm kê · Phiếu giao · Đề xuất nhập (mỗi sub-tab embed component list tương ứng + nút tạo mới) |
| **Phân tích** | Sub-tabs: Tiêu thụ (`InventoryAnalyticsPage`) · Tồn ứ đọng (`DeadStockPage`) |
| **Cài đặt** | Bổ sung đồ (`/supplements`) · Quản lý kho (`/settings/warehouses`) — embed dạng card link hoặc embed list |

Tab + sub-tab đồng bộ qua URL query `?tab=...&sub=...` để giữ deep-link, back/forward hoạt động, và sidebar badge có thể link thẳng vào sub-tab cụ thể (vd `/inventory?tab=xuat-nhap&sub=distribution`).

### Mobile

- Trên mobile: tab chính dùng horizontal scroll (giống `MobileSecondaryActions` đã có).
- Menu "Thao tác" header → dropdown gồm 4 hành động chính (Nhập / Xuất / Chuyển / Kiểm kê), thay vì 4 nút riêng.
- `MobileSecondaryActions` cũ trên `/inventory` → loại bỏ vì đã có tab.

## C. Tương thích & rollout

1. **Route cũ giữ nguyên** — không xoá page. Khi user vào `/inventory/transactions` vẫn ra trang full như cũ (để bookmark/QR cũ không vỡ).
2. Trong các trang "list" có embed lại ở hub, dùng prop `embedded?: boolean` để ẩn header trùng khi nhúng trong tab.
3. **Permission**: mỗi tab tự ẩn nếu user không có quyền (vd staff không thấy "Cài đặt"). Dùng `usePermissions()` như sidebar.
4. **Badge sidebar**: chỉ còn 1 badge gộp. Click vào sidebar → mở hub ở tab "Tổng quan" nếu có việc cần làm, hoặc tab tương ứng nếu chỉ 1 loại việc.
5. **Mobile bottom nav**: nếu "Kho" đang có trong bottom nav thì giữ — vẫn trỏ `/inventory`.
6. **Bỏ memory cũ** (nếu có) tham chiếu cấu trúc menu Kho 15 mục — sẽ thêm memory mới `inventory-hub-consolidation-v1`.

## D. Việc cụ thể

| # | File | Hành động |
|---|---|---|
| 1 | `src/components/layout/Sidebar.tsx` | Rút children mục `inventory` xuống 0, để href trực tiếp `/inventory` |
| 2 | `src/pages/inventory/InventoryDashboardPage.tsx` | Refactor thành hub với Tabs + sub-Tabs + URL sync |
| 3 | `src/pages/inventory/*ListPage.tsx`, `TransactionListPage.tsx`, `DistributionOrdersPage.tsx`, `DeadStockPage.tsx`, `InventoryAnalyticsPage.tsx`, `AdjustmentListPage.tsx`, `ReorderSuggestionsPage.tsx` | Thêm prop `embedded?: boolean` để ẩn page header khi nhúng |
| 4 | `src/pages/items/ItemsListPage.tsx` (nếu có) | Tương tự — thêm `embedded` |
| 5 | `src/components/inventory/MobileSecondaryActions.tsx` | Có thể giữ làm "Thao tác nhanh" trong tab Tổng quan, hoặc xoá |
| 6 | Mobile bottom nav (nếu có entry "Kho con") | Cleanup |
| 7 | `src/lib/app-version.ts` + `public/changelog.json` + `CacheBuster.tsx` | Bump `1.1.5` |
| 8 | `.lovable/memory/ux/inventory-hub-consolidation-v1.md` + cập nhật `mem://index.md` | Ghi convention mới |

## E. Risk & rollback

- **Risk**: trang `/inventory` sẽ nặng hơn do nhiều list được mount → giải pháp: **lazy-load mỗi tab** (chỉ render khi active), dùng `React.lazy` cho từng sub-component.
- **Risk**: user quen click sidebar 1 lần → giờ phải click tab. Mitigation: deep-link từ badge + menu "Thao tác" header.
- **Rollback**: revert đúng 2 file (`Sidebar.tsx` + `InventoryDashboardPage.tsx`); các route cũ không bị xoá nên không cần migrate dữ liệu.

## F. QA checklist (sau khi build)

- [ ] Sidebar chỉ còn 1 dòng "Kho & Tài sản"
- [ ] `/inventory` mở ra hub có 5 tab; URL có `?tab=`
- [ ] Reload trang giữ đúng tab/sub-tab
- [ ] Deep-link `/inventory/transactions`, `/items/new`, `/inventory/distributions/:id` vẫn vào trang full (không qua hub)
- [ ] Badge sidebar gộp đúng tổng việc
- [ ] Mobile portrait: tab scroll ngang ok, nút "Thao tác" thumb-zone
- [ ] Staff role không thấy tab "Cài đặt"
- [ ] Lazy-load: chỉ tab active gọi query

Bạn duyệt thì mình build luôn.
