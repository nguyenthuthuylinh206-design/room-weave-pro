

## Kiểm tra tổng thể "Kho & Tài sản" — Các vấn đề còn thiếu

### Tổng hợp vấn đề phát hiện

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| 1 | **Mobile TransactionListPage thiếu nút "Tạo mới"** | `TransactionListPage.tsx` mobile view (line 104-200) | Nghiêm trọng — mobile user không tạo được giao dịch |
| 2 | **Mobile TransactionListPage thiếu nút "Kiểm kê"** | Cùng file, mobile view | Nghiêm trọng — không truy cập được danh sách kiểm kê |
| 3 | **MobileFilterSheet thiếu "Chuyển kho" (transfer)** | `MobileFilterSheet.tsx` line 112-117 | Filter chỉ có: Nhập/Xuất/Điều chỉnh, thiếu "Chuyển kho" |
| 4 | **MobileFilterSheet dùng sai value "adjustment"** | `MobileFilterSheet.tsx` line 116 | Desktop dùng `adjust`, mobile dùng `adjustment` — không khớp |
| 5 | **MobileInventoryFAB thiếu "Chuyển kho"** | `MobileInventoryFAB.tsx` | FAB chỉ có: Nhập/Xuất/Kiểm kê/Scan, thiếu Chuyển kho |
| 6 | **MobileTransactionCard type thiếu "transfer"** | `TransactionListPage.tsx` line 165 | Type cast chỉ có `'in' | 'out' | 'adjustment'`, thiếu `'transfer'` |
| 7 | **Owner MobileSidebar thiếu mục Kho & Tài sản** | `MobileSidebar.tsx` line 98-128 | Owner menu không có link nào đến inventory/items |

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `TransactionListPage.tsx` | (1) Thêm FAB hoặc header dropdown "Tạo mới" cho mobile view với 4 options. (2) Thêm nút "Kiểm kê" trên mobile. (3) Sửa type cast thêm `'transfer'` |
| `MobileFilterSheet.tsx` | (1) Thêm `<SelectItem value="transfer">Chuyển kho</SelectItem>`. (2) Sửa `adjustment` → `adjust` cho khớp với desktop |
| `MobileInventoryFAB.tsx` | Thêm action "Chuyển kho" navigate đến `/inventory/transfer/new` |
| `MobileSidebar.tsx` | Thêm mục "Kho & Tài sản" vào owner menu section (giống manager đã có) |

