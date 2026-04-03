

## Đồng bộ file mẫu và parser theo format file Excel đã upload

### Vấn đề
File mẫu hiện tại có 11 cột (Tên, Tên EN, Danh mục, Đơn vị, Đơn giá, Thương hiệu, Model, Số lượng, Ngưỡng, Điểm đặt hàng, Mô tả) — không khớp với file Excel thực tế của user có 9 cột: `Mã SP | Tên sản phẩm | Danh mục | Đơn vị | Đơn giá | Tồn kho | Tồn tối thiểu | Tình trạng | Ghi chú`.

### Giải pháp
Cập nhật cả template download và parser upload theo đúng format file đã upload.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/lib/importUtils.ts` | Cập nhật `ItemImportRow`, `downloadItemsTemplate()`, `parseItemsExcel()` |

### Chi tiết

**Cấu trúc cột mới (9 cột):**

| Cột | Header | Bắt buộc |
|-----|--------|----------|
| A | Mã SP | Không |
| B | Tên sản phẩm (*) | Có |
| C | Danh mục | Không |
| D | Đơn vị (*) | Có |
| E | Đơn giá | Không |
| F | Tồn kho (*) | Có |
| G | Tồn tối thiểu | Không |
| H | Tình trạng | Không (bỏ qua khi import) |
| I | Ghi chú | Không |

**1. Template download** — Dữ liệu mẫu lấy từ file upload (3-5 dòng ví dụ đại diện các danh mục: Đồ vải, Tiêu hao, Thiết bị, Nội thất, Nhà hàng, Đồng phục).

**2. Parser upload** — Mapping cột mới:
- `row[0]` → `sku` (Mã SP, thêm vào `ItemImportRow`)
- `row[1]` → `name`
- `row[2]` → `category_name`
- `row[3]` → `unit`
- `row[4]` → `unit_price`
- `row[5]` → `quantity_total`
- `row[6]` → `minimum_stock`
- `row[7]` → bỏ qua (Tình trạng — tự tính)
- `row[8]` → `description` (Ghi chú)

**3. Bỏ các cột không có trong file mẫu:** `name_en`, `brand`, `model`, `reorder_point`

**4. Cập nhật hướng dẫn** trong sheet "Hướng dẫn" cho khớp cấu trúc mới.

