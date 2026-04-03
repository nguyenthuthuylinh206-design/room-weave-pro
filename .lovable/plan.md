

## Bắt buộc tạo kho trước khi thêm tài sản

### Vấn đề
Hiện tại user có thể tạo tài sản mà chưa có kho nào. Tài sản tạo ra sẽ không có nơi lưu trữ, gây lỗi logic.

### Giải pháp
Thêm kiểm tra warehouse ở tất cả các điểm vào trang tạo tài sản. Nếu chưa có kho → hiện thông báo yêu cầu tạo kho trước.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/pages/items/ItemFormPage.tsx` | Import `useWarehouses`, kiểm tra nếu `warehouses.length === 0` thì hiển thị Alert với link đến trang tạo kho (`/settings/warehouses`) thay vì form |
| 2 | `src/pages/items/ItemsPage.tsx` | Kiểm tra warehouse trước khi cho nhấn "Thêm tài sản mới" — nếu chưa có kho thì hiện toast cảnh báo và redirect đến trang kho |
| 3 | `src/components/items/MobileItemsPage.tsx` | Tương tự — kiểm tra warehouse cho nút "Thêm tài sản" trên mobile |

### Chi tiết
- Dùng `useWarehouses()` hook đã có sẵn
- Khi chưa có kho: hiện Alert trong `ItemFormPage` với nội dung "Vui lòng tạo kho hàng trước khi thêm tài sản" + nút "Tạo kho hàng"
- Các nút "Thêm tài sản" ở danh sách vẫn navigate bình thường, validation nằm ở `ItemFormPage` (1 điểm kiểm tra duy nhất)

