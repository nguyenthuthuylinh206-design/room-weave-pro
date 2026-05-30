---
name: Outbound Hub Consolidation v1
description: Trang Xuất kho (/inventory?tab=operations&sub=outbound) gộp Danh sách phiếu + Tạo thủ công + Từ yêu cầu bổ sung thành 3 tab nội bộ sync URL ?view=list|manual|from-requests
type: design
---

## Cấu trúc
- Sidebar Kho: gỡ mục "Phiếu giao hàng" — gộp vào "Xuất kho" (giữ badge `distributionsPending`).
- Top tab `sub=outbound` render Tabs nội bộ 3 view:
  - `list` (default) → `DistributionOrdersPage`
  - `manual` → `OutboundPage` (form xuất kho)
  - `from-requests` → `CreateFromSupplementsPage embedded`

## Legacy redirect
- `?tab=operations&sub=distributions` → `?sub=outbound&view=list` (useEffect trong `InventoryDashboardPage`).
- Route standalone `/inventory/distributions/from-supplements` vẫn chạy (CreateFromSupplementsPage không embedded).

## Embedded contract
- `CreateFromSupplementsPage` nhận prop `embedded?: boolean`:
  - Ẩn PageHeader + nút Back + nút Hủy ở footer.
  - On success: setSearchParams `view=list` thay vì navigate route detail.

## Form thủ công loại room_assign
- Render `<DistributionForm form={distributionForm} />` inline, không còn nút "Mở phiếu giao hàng" nhảy tab.
