

## Thêm formatting màu sắc cho file mẫu Excel

### Vấn đề
File mẫu tải về hiện tại không có màu sắc, font chữ, border — trông rất thô so với file gốc (header xanh đậm, chữ trắng, có border, số format đẹp).

### Giải pháp
Thư viện `xlsx` (SheetJS community) **không hỗ trợ styling** (màu nền, font color, border). Cần chuyển sang dùng **ExcelJS** — thư viện hỗ trợ đầy đủ formatting và chạy được trong browser.

### Thay đổi

| # | Thao tác | Mô tả |
|---|----------|-------|
| 1 | Cài `exceljs` + `file-saver` | Thư viện Excel có hỗ trợ styling + lưu file |
| 2 | `src/lib/importUtils.ts` | Viết lại `downloadItemsTemplate()` dùng ExcelJS với formatting đầy đủ |

### Chi tiết formatting (theo đúng file gốc):

**Header row:**
- Background: Xanh đậm (`4472C4`)
- Font: Trắng, bold, size 11
- Border: Thin, all sides
- Alignment: Center

**Data rows:**
- Font: Size 11, Calibri
- Border: Thin, all sides
- Alternate row: Xanh nhạt nhẹ (`D6E4F0`) xen kẽ trắng
- Cột "Đơn giá": Number format `#,##0` (có dấu phẩy)
- Cột "Tồn kho", "Tồn tối thiểu": Number format `#,##0`
- Cột "Tình trạng": Chữ xanh lá (`✓ OK`)

**Sheet Tổng hợp:**
- Header bold, background xanh
- Dòng "TỔNG CỘNG": Bold
- Number format cho cột giá trị

**Column widths** giữ nguyên như hiện tại.

**Parser (`parseItemsExcel`) không thay đổi** — vẫn dùng `xlsx` để đọc file.

