

## Kiểm tra trang Báo cáo — Kết quả

### Tổng quan: 9 trang báo cáo + 1 Dashboard

Tất cả các trang đều có routing đúng, có mobile responsive (dùng `useBreakpoint`), và kết nối đúng data hooks. Không có lỗi runtime trong console (chỉ có PWA ServiceWorker warning — không ảnh hưởng).

### Vấn đề phát hiện

#### 1. **Operations Report hiển thị toàn số 0** (Trung bình)
- Trang `/reports/operations` dùng `useInventoryReport` hook nhưng chỉ lấy `transaction_summary` — data từ API trả về tất cả = 0 (inbound_count: 0, outbound_count: 0, total_transactions: 0)
- Tab **Stocktake** và **Efficiency**: Toàn placeholder data cứng = 0, không có query thực tế
- `topMovingItems` gán `inbound: 0, outbound: 0` cứng — comment ghi "Would need separate query"
- **Kết luận**: Trang này gần như "dummy" — cần kết nối data thực hoặc ẩn đi

#### 2. **ReportsPage cũ vẫn tồn tại** (Nhỏ)
- `ReportsPage.tsx` là trang cũ, không được dùng trong routing (đã thay bằng `ReportsDashboardPage`)
- Có thể gây nhầm lẫn khi maintain, nên xóa

#### 3. **ReportsDashboardPage thiếu Outbound Report** (Nhỏ)
- Dashboard liệt kê 9 loại báo cáo nhưng **thiếu "Báo cáo Xuất kho"** (outbound)
- Route `/reports/outbound` tồn tại và hoạt động, nhưng không có entry trong dashboard

#### 4. **Export buttons không hoạt động ở Operations Report** (Nhỏ)
- Nút PDF và Excel không có `onClick` handler — chỉ disable khi `isExporting`

#### 5. **DamagesReportPage dùng `useIsMobile` thay vì `useBreakpoint`** (Rất nhỏ)
- Không nhất quán với các trang khác dùng `useBreakpoint`, nhưng không gây bug

### Đánh giá tổng thể

| Trang | Data thực | Mobile | Export | Đánh giá |
|-------|-----------|--------|--------|----------|
| Dashboard | ✅ | ✅ | N/A | OK |
| Inventory | ✅ | ✅ | ✅ | OK |
| Financial | ✅ | ✅ | ✅ | OK |
| Operations | ❌ Placeholder | ✅ | ❌ | Cần fix |
| Laundry | ✅ | ✅ | ✅ | OK |
| Rooms | ✅ | ✅ | ✅ | OK |
| Maintenance | ✅ | ✅ | ✅ | OK |
| Revenue | ✅ | ✅ | ✅ | OK |
| Damages | ✅ | ✅ | ✅ | OK |
| Stock Audit | ✅ | ✅ | ✅ | OK |
| Outbound | ✅ | ❌ Thiếu mobile | ✅ | Cần fix |

### Kế hoạch fix

#### Bước 1: Fix Operations Report — kết nối data thực
- Tab Transactions: Tạo query lấy transaction data thực từ `inventory_transactions` (đã có table), hiển thị trend theo tháng thay vì 1 data point
- Tab Stocktake: Kết nối với `stock_adjustments` table
- Tab Efficiency: Tính từ data thực (avg processing time từ transactions, error rate từ adjustments)
- Fix export buttons

#### Bước 2: Thêm Outbound Report vào Dashboard
- Thêm entry "Báo cáo Xuất kho" vào `reportCategories` trong `ReportsDashboardPage` và `MobileReportsDashboard`

#### Bước 3: Xóa ReportsPage.tsx cũ
- File không được dùng, chỉ gây nhầm lẫn

#### Bước 4: Tạo mobile view cho Outbound Report
- Hiện tại OutboundReportPage không check `isMobile` → cần thêm mobile component

