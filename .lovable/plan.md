## Mục tiêu
Khôi phục Hub Kho đúng như menu cũ trong ảnh: đủ 15 mục, không mất `Phiếu giao hàng`, `Đề xuất nhập hàng`, `Bổ sung đồ`, `Quản lý kho`, đồng thời giữ sidebar gọn chỉ còn 1 lối vào `/inventory`.

## Những gì có thể reuse
- Reuse các trang đã có: `TransactionListPage`, `ItemsPage`, `CategoriesPage`, `InboundPage`, `OutboundPage`, `TransferPage`, `AdjustmentListPage`, `DistributionOrdersPage`, `ReorderSuggestionsPage`, `DeadStockPage`, `InventoryAnalyticsPage`, `SupplementsPage`, `WarehouseListPage`, `ItemFormPage`.
- Reuse route cũ trong `App.tsx` để các URL trực tiếp như `/inventory/distributions`, `/inventory/reorder`, `/supplements`, `/settings/warehouses` vẫn chạy.
- Reuse permission hiện tại qua `PermissionRoute`, không đổi schema/backend.

## Cần refactor
- `InventoryDashboardPage.tsx` hiện gom sai theo tab ngang: người dùng nhìn ở `Tổng quan` sẽ không thấy ngay các mục như menu cũ, gây cảm giác thiếu.
- Thêm một danh sách điều hướng dạng sidebar/submenu ngay trong Hub, chia đúng nhóm như ảnh:
  - Tổng quan: Bảng điều khiển, Giao dịch kho
  - Sản phẩm: Danh sách tài sản, Danh mục, Thêm tài sản mới
  - Xuất nhập kho: Nhập kho, Xuất kho, Chuyển kho, Kiểm kê, Phiếu giao hàng, Đề xuất nhập hàng
  - Phân tích: Tồn kho ứ đọng, Phân tích tiêu thụ
  - Thiết lập: Bổ sung đồ, Quản lý kho
- Mỗi mục trong submenu sẽ map vào `?tab=&sub=` của Hub, ví dụ:
  - `Phiếu giao hàng` → `/inventory?tab=operations&sub=distributions`
  - `Đề xuất nhập hàng` → `/inventory?tab=operations&sub=reorder`
  - `Bổ sung đồ` → `/inventory?tab=settings&sub=supplements`
  - `Quản lý kho` → `/inventory?tab=settings&sub=warehouses`

## Cần thêm mới
- Thêm component cấu hình điều hướng nội bộ cho Hub Kho, ưu tiên dữ liệu/config thay vì hardcode rải rác.
- Thêm fallback normalize URL để nếu user vào URL cũ thì điều hướng/hub vẫn mở đúng mục:
  - `/inventory/transactions` tương ứng `Giao dịch kho`
  - `/inventory/distributions` tương ứng `Phiếu giao hàng`
  - `/inventory/reorder` tương ứng `Đề xuất nhập hàng`
  - `/supplements` tương ứng `Bổ sung đồ`
  - `/settings/warehouses` tương ứng `Quản lý kho`
- Sửa label cho đúng menu cũ: dùng đầy đủ `Phiếu giao hàng`, `Đề xuất nhập hàng`, không rút gọn gây hiểu nhầm.

## Rủi ro migration
- Không có migration DB.
- Rủi ro chính là form nhúng như `InboundPage`, `OutboundPage`, `TransferPage`, `ItemFormPage` sau khi submit đang `navigate('/inventory/transactions')` hoặc `navigate(-1)`, có thể quay về route cũ thay vì tab Hub. Sẽ giữ tương thích trước, nếu cần sẽ chỉnh tiếp thành quay về `?tab=operations&sub=transactions` trong lượt sau.

## Kiến trúc / logic nghiệp vụ
- Hub Kho là 1 trang điều phối, không thay đổi nghiệp vụ kho.
- Danh mục menu được khai báo 1 nơi, render ra navigation và nội dung tương ứng.
- Giữ quyền theo module hiện có; mục Thiết lập chỉ hiện theo quyền quản lý như hiện tại.

## Schema / migration
- Không thêm bảng/cột/RPC.
- Không có migration.

## API / RPC / server actions
- Không đổi API/RPC.
- Các trang con tiếp tục gọi hook/RPC hiện có.

## UI screens / components
- Cập nhật `InventoryDashboardPage.tsx`:
  - Desktop: layout 2 cột, trái là menu Hub đúng ảnh, phải là nội dung mục đang chọn.
  - Mobile: menu dạng scroll/section compact, không mất mục.
  - Giữ tab logic nội bộ nhưng không để người dùng phải đoán tab con bị ẩn.
- Cập nhật version/changelog theo quy ước release.

## Permission / role rules
- Không nới quyền.
- Staff vẫn chỉ thao tác theo permission hiện tại.
- Thiết lập (`Bổ sung đồ`, `Quản lý kho`) vẫn theo điều kiện role/quyền hiện tại.

## Test cases
- Mở `/inventory` thấy đủ 15 mục trong Hub.
- Click `Phiếu giao hàng` mở danh sách phiếu giao hàng.
- Click `Đề xuất nhập hàng` mở đúng trang đề xuất nhập.
- Click `Bổ sung đồ`, `Quản lý kho` mở đúng nội dung khi có quyền.
- Reload URL `?tab=operations&sub=distributions` vẫn giữ đúng mục.
- Mobile portrait: menu không tràn mất mục, có thể scroll ngang/dọc ổn.

## Rollout notes
- Đây là sửa frontend/navigation, không ảnh hưởng dữ liệu.
- Nếu sau khi nhúng form phát sinh lỗi điều hướng submit, bước tiếp theo là thêm prop `embedded` cho các form để submit quay về tab Hub thay vì route cũ.