

## Nhập đầy đủ 150 sản phẩm vào file mẫu + sheet Tổng hợp

### Mục tiêu
Cập nhật file mẫu tải xuống chứa đầy đủ 150 sản phẩm từ file gốc, kèm sheet "Tổng hợp" thống kê. Khách chỉ cần thêm/xoá sản phẩm rồi upload, không phải nhập từ đầu.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/lib/importUtils.ts` | Cập nhật `downloadItemsTemplate()` — nhập đầy đủ 150 dòng dữ liệu + thay sheet "Hướng dẫn" bằng sheet "Tổng hợp" |

### Chi tiết

**1. Dữ liệu mẫu** — Hardcode toàn bộ 150 sản phẩm theo đúng file gốc:
- Đồ vải: 21 mặt hàng (DV-001 → DV-021)
- Tiêu hao: 42 mặt hàng (TH-001 → TH-042)
- Thiết bị: 28 mặt hàng (TB-001 → TB-028)
- Nội thất: 31 mặt hàng (NT-001 → NT-031)
- Nhà hàng: 22 mặt hàng (NH-001 → NH-022)
- Đồng phục: 6 mặt hàng (DP-001 → DP-006)

Tình trạng tất cả: `✓ OK`

**2. Sheet "Tổng hợp"** (thay thế "Hướng dẫn"):
- Tiêu đề: "TỔNG HỢP HÀNG HÓA THEO DANH MỤC"
- Bảng: Danh mục | Số mặt hàng | Tổng giá trị tồn kho | Số mặt hàng cần đặt
- 6 dòng danh mục + dòng TỔNG CỘNG

**3. Column widths** giữ nguyên như hiện tại.

**4. Parser (`parseItemsExcel`) không thay đổi** — cấu trúc 9 cột giữ nguyên.

