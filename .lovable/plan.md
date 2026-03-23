

## Kiểm tra các mục Kho & Tài sản — Vấn đề phát hiện

Sau khi gộp sidebar từ 12 xuống 5, có **3 vấn đề** cần sửa:

### Vấn đề 1: Kiểm kê (Adjustments) mất lối vào

Đã xóa mục "Kiểm kê" khỏi sidebar nhưng **không thêm vào trang Giao dịch kho**. Trang `/inventory/adjustments` vẫn tồn tại và hoạt động, nhưng user không có cách nào truy cập từ navigation chính.

Các nơi vẫn link tới `/inventory/adjustments`:
- `MobileSecondaryActions.tsx` (dashboard mobile)
- `CompactActionBar.tsx` (dashboard desktop)
- `MobileInventoryFAB.tsx` (FAB tạo mới)
- Báo cáo kiểm kê

**Cần sửa**: Thêm nút/link "Kiểm kê" vào trang `TransactionListPage` (hoặc thêm lại vào sidebar).

### Vấn đề 2: Trang Giao dịch kho thiếu action buttons

`TransactionListPage.tsx` chỉ có 2 nút: "Quay lại" + "Xuất Excel". Không có nút tạo giao dịch mới (Nhập/Xuất/Chuyển/Kiểm kê).

Trước đây, mỗi loại có menu riêng trong sidebar → user biết vào đâu. Giờ gộp hết vào 1 trang nhưng **không thêm action buttons** → user không biết cách tạo giao dịch mới từ trang này.

**Cần sửa**: Thêm dropdown button "Tạo mới" với 4 options: Nhập kho, Xuất kho, Chuyển kho, Kiểm kê.

### Vấn đề 3: Filter loại giao dịch thiếu "transfer"

Dropdown filter `transaction_type` chỉ có: Tất cả | Nhập | Xuất | Điều chỉnh. **Thiếu "Chuyển kho" (transfer)** — một trong 4 loại giao dịch chính.

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `src/pages/inventory/TransactionListPage.tsx` | (1) Thêm dropdown "Tạo mới" với 4 options: Nhập (`/inventory/inbound/new`), Xuất (`/inventory/outbound/new`), Chuyển (`/inventory/transfer/new`), Kiểm kê (`/inventory/adjustments/new`). (2) Thêm "transfer" vào filter dropdown. (3) Thêm link "Xem danh sách kiểm kê" dẫn tới `/inventory/adjustments` |

