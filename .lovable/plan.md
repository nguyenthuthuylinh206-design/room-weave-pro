
Mình đã rà soát lại và kết luận: chức năng Kho & Tài sản không hẳn “chưa có”, nhưng đang bị 3 nhóm lỗi nên người dùng có cảm giác thiếu rất nhiều.

1. Kết quả kiểm tra nhanh
- Nhập kho / Xuất kho / Chuyển kho / Kiểm kê: route và page đều đang tồn tại.
- Vấn đề chính là:
  - nhiều lối vào đã bị ẩn sau khi gộp menu,
  - một số CTA vẫn trỏ sang route cũ hoặc route sai,
  - mobile còn thiếu/không khớp với logic desktop.

2. Các lỗi quan trọng đã xác định
- Route cũ/sai:
  - `EmptyTransactions.tsx` vẫn đi tới `/inventory/inbound` và `/inventory/outbound` (hiện bị redirect về danh sách giao dịch, không mở form).
  - `EmptyAdjustments.tsx` vẫn đi tới `/inventory/adjustments/create` (route không tồn tại, route đúng là `/inventory/adjustments/new`).
  - `PostApprovalActions.tsx` vẫn điều hướng tới `/inventory/inbound` nên luồng “bổ sung sau kiểm kê” dễ bị gãy.
  - `contextualHelp.ts` và `helpGuides.ts` vẫn dùng route cũ `/inventory/inbound` / `/inventory/outbound`.
- Mobile inbound có nguy cơ hỏng thật:
  - `MobileInboundForm.tsx` submit thiếu `to_warehouse_id`, trong khi hook/RPC nhập kho đang cần kho đích.
- Thiếu điểm truy cập chức năng:
  - `ItemsPage.tsx` và `MobileItemsPage.tsx` chưa có lối vào rõ cho `Danh mục`.
  - mobile items chưa có Import / Export / Quản lý danh mục / Quản lý kho.
  - dashboard `/inventory` chưa đóng vai trò “hub” đủ tốt cho toàn bộ Kho & Tài sản.
- Thiết kế gộp menu chưa khớp thực tế:
  - kế hoạch trước nói “Tài sản = dashboard + list”, nhưng hiện `/inventory` vẫn là dashboard riêng, `/items` là list riêng.
  - sidebar rút gọn nhưng chưa bù lại bằng action hub đủ đầy.

3. Kế hoạch sửa
Giai đoạn 1 — Khôi phục chức năng cốt lõi
- Quét và sửa toàn bộ link cũ/sai sang route mới:
  - `/inventory/inbound/new`
  - `/inventory/outbound/new`
  - `/inventory/adjustments/new`
- Sửa luồng “bổ sung từ kiểm kê” để mở đúng form nhập kho và giữ được state prefill.
- Sửa `MobileInboundForm` để gửi đúng `to_warehouse_id` như desktop/quick entry.

Giai đoạn 2 — Làm lại “hub” Kho & Tài sản
- Giữ menu gọn, nhưng bổ sung đầy đủ action trong chính module:
  - tại `/inventory`: thêm nhóm thao tác rõ ràng cho Nhập kho, Xuất kho, Chuyển kho, Kiểm kê, Phiếu giao hàng, Tài sản, Danh mục, Kho.
  - tại `/items`: thêm action truy cập Danh mục, Import, Export, Quản lý kho.
- Mobile:
  - thêm menu “Thêm” hoặc action sheet trên `MobileItemsPage` cho các chức năng đang thiếu.
  - giữ FAB/dashboard actions nhưng bổ sung link đến các trang quản trị liên quan.

Giai đoạn 3 — Đồng bộ điều hướng desktop/mobile
- Đồng bộ `Sidebar`, `MobileSidebar`, `MorePage`, `MobileNav` để người dùng luôn tìm được:
  - Tài sản
  - Giao dịch kho
  - Kiểm kê
  - Phiếu giao hàng
  - Danh mục
  - Quản lý kho
- Áp dụng logic hiện/ẩn `Quản lý kho` theo số lượng kho thực tế nếu muốn đúng với spec trước đó.

4. File sẽ cần chỉnh
- Điều hướng & entry points:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/MobileSidebar.tsx`
  - `src/components/layout/MobileNav.tsx`
  - `src/pages/mobile/MorePage.tsx`
- Kho & giao dịch:
  - `src/pages/inventory/InventoryDashboardPage.tsx`
  - `src/pages/inventory/TransactionListPage.tsx`
  - `src/components/inventory/CompactActionBar.tsx`
  - `src/components/inventory/MobileInventoryDashboard.tsx`
  - `src/components/inventory/EmptyTransactions.tsx`
  - `src/components/inventory/EmptyAdjustments.tsx`
  - `src/components/inventory/adjustments/PostApprovalActions.tsx`
  - `src/components/inventory/MobileInboundForm.tsx`
- Tài sản:
  - `src/pages/items/ItemsPage.tsx`
  - `src/components/items/MobileItemsPage.tsx`
- Nội dung trợ giúp:
  - `src/data/contextualHelp.ts`
  - `src/data/helpGuides.ts`

5. Cách triển khai mình đề xuất
- Không mở lại sidebar 12 mục như cũ.
- Giữ sidebar gọn.
- Khôi phục đầy đủ chức năng bằng:
  - sửa route hỏng,
  - bổ sung action hub rõ ràng,
  - đưa các trang “đang tồn tại nhưng bị mất lối vào” quay lại đúng chỗ.

6. Kết quả sau khi sửa
Người dùng sẽ nhìn thấy và dùng được đầy đủ:
- Nhập kho
- Xuất kho
- Chuyển kho
- Kiểm kê
- Phiếu giao hàng
- Tài sản
- Danh mục
- Quản lý kho
- Import/Export tài sản

7. Chi tiết kỹ thuật quan trọng
- Không cần thay backend; logic CRUD/RPC chính đã có sẵn.
- Trọng tâm là sửa điều hướng, entry points, mobile form contract, và sweep route cũ trên toàn repo.
- Đây là một đợt “khôi phục khả năng sử dụng” hơn là xây mới từ đầu.
