# Đánh giá `/reports/finance` từ góc nhìn chủ khách sạn

## 1. Vấn đề hiện tại

### A. Trùng lặp & rối thông tin
- KPI strip trên cùng (FinanceKpiStrip: 6 tile) **trùng** với khối 4 card "Doanh thu thuần / Đã thu / LN / OTA+VAT" và 4 card "Tổng CP / Mua sắm / Giặt là / Bảo trì" trong tab **Chi phí** → cùng 1 số xuất hiện 2–3 lần.
- Tab **Doanh thu** có riêng bộ filter kỳ + 4 stat tile + tabs phụ (Tổng quan / Theo loại / Theo nguồn / Phòng) → **2 lớp tabs** lồng nhau, mỗi tab có filter riêng không đồng bộ với chip kỳ ở Hub.
- Tab **Chi phí & Lợi nhuận** có thêm `HotelFilterCard`, `DateRangePicker` riêng → 3 bộ filter trên cùng 1 trang.

### B. Sai chuẩn UI dự án
- `FinancialReportPage` còn dùng `<Card>`, icon-heavy, badge màu, emoji 🟡, hardcode hex (`#10b981`, `#3b82f6`, `#f97316`) — vi phạm Enterprise SaaS Minimalist + design token.
- Tab "ROI" hiển thị **số hardcode** ("8.1x", "450k", "150k", "-5% vs tháng trước") — không phải data thật, gây hiểu lầm cho chủ khách sạn.
- Nút "Quay lại", "Xuất PDF", "Xuất Excel" của FinancialReportPage lặp với header Hub.

### C. Thiếu thông tin chủ khách sạn cần
Chủ KS cần trả lời 5 câu trong 10 giây:
1. **Tháng này lời/lỗ bao nhiêu?** → có (Lợi nhuận) nhưng chôn dưới
2. **Tiền đi đâu?** → có (breakdown) nhưng chỉ 3 nhóm purchase/laundry/maintenance, **thiếu**: OTA commission, VAT, hoàn tiền, phụ thu âm
3. **Ai còn nợ tôi?** → chỉ có số tổng "Còn nợ", **không** drill-down danh sách booking nợ
4. **Dòng tiền hôm nay/tuần này?** → có "Hôm nay" trong tab Doanh thu nhưng **thiếu cash-in vs cash-out theo ngày**
5. **So với tháng trước/năm trước thế nào?** → có Δ% trên KPI nhưng **thiếu chart YoY/MoM cho profit**

### D. Vấn đề chức năng
- 2 filter kỳ độc lập (chip ở Hub + DateRangePicker trong từng tab) — đổi 1 cái cái kia không sync → KPI strip nói "tháng này", chart bên dưới có thể là "30 ngày qua".
- Export PDF/Excel chỉ export tab Chi phí, không export Doanh thu cùng kỳ.
- Mobile: `FinancialReportPage` redirect sang `MobileFinancialReportPage`, nhưng Hub shell vẫn render KPI strip → 2 lớp UI chồng.
- `revenue_summary` lấy từ `get_financial_report` RPC có thể lệch với `useRevenueReport` (2 nguồn khác nhau cho cùng 1 số).

---

## 2. Đề xuất nâng cấp (3 sprint)

### Sprint F1 — Dọn dẹp & thống nhất (ưu tiên cao nhất)
**Mục tiêu:** 1 nguồn dữ liệu, 1 bộ filter, không trùng lặp.

- **Bỏ** khối 4 card "Doanh thu/Đã thu/LN/OTA" và 4 card "Tổng CP/Mua/Giặt/Bảo trì" trong `FinancialReportPage` (đã có trong KPI strip Hub).
- **Bỏ** `DateRangePicker` và `HotelFilterCard` trong `FinancialReportPage` & `RevenueReportPage` → dùng chung `period` + `HotelContext` từ Hub (truyền qua props hoặc context).
- **Bỏ** nested tabs trong `RevenueReportPage` → chuyển 4 sub-tab (Tổng quan/Theo loại/Theo nguồn/Phòng) thành 4 section cuộn dọc.
- **Bỏ** tab "ROI" (hardcoded data) hoặc thay bằng số thật từ `get_financial_report`.
- **Bỏ** nút Quay lại / Export trong từng page → đưa 1 nút Export duy nhất lên Hub header, export gộp cả Doanh thu + Chi phí cùng kỳ.
- Refactor `FinancialReportPage` về chuẩn Minimalist: `<div className="border rounded-lg">` thay Card, bỏ icon/emoji, dùng token màu semantic.

### Sprint F2 — Bổ sung thông tin chủ KS thực sự cần
- **Khối "Lời/Lỗ kỳ này"** (section đầu tiên sau KPI): card lớn hiển thị
  - Lợi nhuận ròng (số to, màu xanh/đỏ) + Δ% kỳ trước + Δ% cùng kỳ năm trước (YoY)
  - Mini-chart 12 tháng profit để thấy xu hướng
- **Khối "Dòng tiền"** (cash flow):
  - Bar chart kép theo ngày trong kỳ: Cash-in (xanh) vs Cash-out (đỏ) → trả lời "hôm nay/tuần này tôi nhận/chi bao nhiêu"
  - Số dư ròng cuối kỳ
- **Khối "Công nợ"** (replace số "Còn nợ" trống):
  - Top 10 booking/khách còn nợ + ngày trễ hạn + link đến trang booking
  - Tổng nợ chia theo độ tuổi (0–7 ngày / 8–30 / >30) — aging report
- **Khối "Cơ cấu chi phí mở rộng"**: thêm OTA commission, VAT phải nộp, hoàn tiền, voucher — không chỉ purchase/laundry/maintenance.
- **Section "So sánh"**: bảng MoM + YoY cho 6 chỉ số (Revenue / Cost / Profit / Margin / Occupancy / RevPAR).

### Sprint F3 — Hành động & insight (cho owner ra quyết định)
- **AlertList tài chính** (tương tự AlertList Overview):
  - "5 booking quá hạn thanh toán > 7 ngày — XX triệu"
  - "Chi phí giặt là tháng này tăng 32% vs tháng trước"
  - "Biên lợi nhuận giảm dưới 15% — cảnh báo"
  - "VAT kỳ này XX triệu — nhớ kê khai trước ngày 20"
- **Drill-down**: click bất kỳ KPI/cột chart → mở slide-over chi tiết các giao dịch tạo nên số đó.
- **Preset kỳ "Cùng kỳ năm trước"** trong PeriodPresetChips.
- **Export 1 file PDF "Báo cáo tài chính tháng"** layout chuẩn cho chủ KS in/gửi kế toán.

---

## 3. Files dự kiến đụng

**Sprint F1 (bắt buộc làm trước):**
- `src/pages/reports/RevenueReportPage.tsx` — bỏ filter+nested tabs, nhận period qua props
- `src/pages/reports/FinancialReportPage.tsx` — bỏ KPI cards trùng, bỏ filter, bỏ tab ROI hardcoded, refactor về minimalist
- `src/pages/reports/hub/FinanceHubPage.tsx` — truyền period xuống children, thêm nút Export gộp ở header
- `src/pages/reports/hub/ReportHubShell.tsx` — hỗ trợ truyền props vào tab Component
- Xóa import `Card`/`HotelFilterCard` không dùng

**Sprint F2:**
- new: `src/components/reports/finance/ProfitHeadlineCard.tsx`
- new: `src/components/reports/finance/CashFlowChart.tsx` + hook `useCashFlow.ts`
- new: `src/components/reports/finance/DebtAgingPanel.tsx` + hook `useDebtAging.ts` (query `room_bookings` + `invoices` với `tenant_id` filter)
- new: `src/components/reports/finance/MoMYoYTable.tsx`

**Sprint F3:**
- new: `src/components/reports/finance/FinanceAlertList.tsx` + `useFinanceAlerts.ts`
- new: `src/components/reports/finance/ExportFinancePdf.ts` (gộp doanh thu + chi phí + công nợ)
- Cập nhật `PeriodPresetChips` thêm preset "same_period_last_year"

**Version bump:** 1.0.51 (F1) → 1.0.52 (F2) → 1.0.53 (F3)

---

## 4. Câu hỏi cần xác nhận

1. **Ưu tiên sprint nào trước?** F1 (dọn dẹp) là tiên quyết. Sau đó F2 hay F3 trước?
2. **Tab "ROI" hardcoded** — xóa luôn hay giữ và thay số thật (cần thêm RPC tính turnover/chi phí trên phòng)?
3. **"Dòng tiền" theo ngày** — lấy từ `payment_transactions` (cash-in) + `inventory_transactions/laundry_batches/maintenance_requests` (cash-out) đúng không, hay khách sạn có sổ kế toán riêng?
4. **Aging công nợ** — dùng `created_at` của booking hay `check_out_date` làm mốc tính tuổi nợ?

Sau khi bạn chốt, tôi sẽ vào build-mode và làm F1 trước (ước lượng 1 lượt).
