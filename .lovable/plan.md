# Tinh gọn Báo cáo — từ 10 trang rời rạc → 4 trang theo vai trò

## Vấn đề hiện tại

10 báo cáo (Doanh thu / Tài chính / KPI Vận hành / Hỏng-Mất / Hiệu năng phòng / Tồn kho / Kiểm kê / Xuất kho / Giặt là / Bảo trì) — nội dung chồng chéo, mỗi trang quá nhiều số, không trả lời được câu hỏi "tình hình hôm nay/tháng này tốt hay xấu?".

## Định hướng mới

**Mỗi báo cáo phải trả lời được 1 câu hỏi vận hành cụ thể trong < 10 giây.**

Gộp về **4 báo cáo** + **1 trang Tổng quan** chung. Trang nào cũng mở đầu bằng "Bảng điểm 5 chỉ số" (status + xu hướng so kỳ trước) — chi tiết drill-down phía dưới.

---

## Cấu trúc mới

### 0. `/reports` — **Tổng quan điều hành** (mặc định khi vào)
Một màn hình cho Chủ/Quản lý. Không tab, không cuộn dài.
- 6 KPI tile (so kỳ trước): Doanh thu thuần • Lợi nhuận • Công suất phòng • RevPAR • Chi phí vận hành • Khoản còn nợ
- 1 biểu đồ kết hợp: Doanh thu vs Chi phí 30 ngày
- "Cần chú ý" — danh sách 3-5 cảnh báo (booking quá hạn, kho sắp hết, ticket bảo trì gấp, lô giặt trễ)

### 1. `/reports/finance` — **Tài chính** (gộp Doanh thu + Tài chính)
Câu hỏi: *"Tháng này lời/lỗ bao nhiêu? Tiền đi đâu?"*
- Bảng điểm: Doanh thu thuần • Lợi nhuận thuần • Biên LN • Chi phí • Công nợ • Tăng trưởng MoM
- Tab "Doanh thu" (theo kênh/loại phòng/top phòng) — kế thừa từ Revenue
- Tab "Chi phí & Lợi nhuận" — kế thừa từ Financial
- Xoá: 2 trang riêng `/reports/revenue` và `/reports/financial` (redirect)

### 2. `/reports/operations` — **Vận hành phòng** (gộp KPI Vận hành + Hiệu năng phòng + Hỏng-Mất)
Câu hỏi: *"Phòng đang chạy ổn không? Có gì hỏng/mất không?"*
- Bảng điểm: Công suất • ADR • RevPAR • Số đêm phòng • Phòng cần chú ý (DND/OOS/maintenance) • Tổn thất kỳ này
- Tab "Hiệu năng phòng" (utilization theo loại phòng, top phòng doanh thu)
- Tab "Tổn thất" (hỏng/mất theo bộ phận, top item bị hỏng)
- Xoá: `/reports/rooms`, `/reports/damages` (redirect)

### 3. `/reports/housekeeping` — **Buồng phòng & Giặt là** (gộp Giặt là + thêm QC từ housekeeping)
Câu hỏi: *"Đội buồng phòng & giặt là chạy có hiệu quả không?"*
- Bảng điểm: Tasks hoàn thành • Tỷ lệ QC pass • Thời gian dọn TB • Lô giặt đang xử lý • Chi phí giặt/đêm • Vendor chậm trễ
- Tab "Buồng phòng" (task throughput, QC reject rate — dữ liệu từ `housekeeping_tasks`)
- Tab "Giặt là" (kế thừa Laundry: vendor, monthly trend, status breakdown)
- Xoá: `/reports/laundry` (redirect)

### 4. `/reports/inventory` — **Kho & Bảo trì** (gộp Tồn kho + Xuất kho + Kiểm kê + Bảo trì)
Câu hỏi: *"Kho có đủ không? Tài sản có được bảo trì không?"*
- Bảng điểm: Giá trị tồn • Item sắp hết • Vòng quay TB • Chênh lệch kiểm kê • Ticket bảo trì mở • Chi phí bảo trì
- Tab "Tồn kho" (ABC, low stock, status distribution)
- Tab "Xuất / Kiểm kê" (gộp Outbound + Stock Audit)
- Tab "Bảo trì" (ticket throughput, chi phí, MTTR)
- Xoá: `/reports/stock-audit`, `/reports/outbound`, `/reports/maintenance` (redirect)

---

## Component dùng chung (mới)

- **`<KpiScorecard>`** — 1 tile chuẩn: nhãn • giá trị lớn • delta vs kỳ trước (mũi tên + %) • màu semantic (xanh tốt / đỏ xấu / xám trung tính). Đây là "ngôn ngữ" đánh giá nhanh chung cho mọi báo cáo.
- **`<ReportPageShell>`** — wrapper: header + DateRangePicker + HotelFilter + slot Scorecard + slot Tabs + Export.
- **`<AlertList>`** — danh sách "Cần chú ý" cho trang Tổng quan.

## Catalog & navigation

- `reportsCatalog.ts`: rút từ 10 → 5 entries (tổng quan + 4 báo cáo).
- Sidebar Báo cáo: hiển thị 5 mục thay vì 10.
- Department manager:
  - Housekeeping/Laundry → chỉ `/reports/housekeeping`
  - Inventory/Maintenance → chỉ `/reports/inventory`
  - Không thấy Tài chính / Tổng quan.

## Migration & compatibility

- Các URL cũ (`/reports/revenue`, `/reports/damages`, v.v.) → **redirect 302** sang trang gộp tương ứng kèm `?tab=` đúng.
- Hooks RPC (`useRevenueReport`, `useFinancialReport`, `useLaundryReport`, ...) **giữ nguyên** — chỉ thay đổi UI lắp ráp lại. Không cần migration DB.
- Bookmark/email cũ vẫn chạy.

## Rollout

1. Build component dùng chung (`KpiScorecard`, `ReportPageShell`, `AlertList`).
2. Build trang `/reports` Tổng quan mới.
3. Build 4 trang gộp (mỗi trang reuse các tab/section sẵn có làm `<TabsContent>`).
4. Thêm redirect từ URL cũ.
5. Cập nhật `reportsCatalog.ts` + sidebar.
6. Bump version 1.0.48, ghi changelog.
7. Giữ file page cũ trong codebase 1 release để rollback dễ; release sau xoá hẳn.

## Không thuộc phạm vi lần này

- Đánh giá vận hành / Benchmark ngành (`OperationsInsightsTab`) — giữ nguyên trong tab Tài chính.
- Báo cáo Super Admin (chain HQ) — không đụng.

---

**Bạn duyệt cấu trúc 4 trang này không, hay muốn gộp khác đi (ví dụ tách Bảo trì ra riêng / giữ Giặt là độc lập)?**
