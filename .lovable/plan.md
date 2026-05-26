# Báo cáo — Khoảng cách còn lại so với mục tiêu

Mục tiêu đã cam kết: **mỗi trang trả lời 1 câu hỏi trong < 10 giây**, mở đầu bằng "Bảng điểm" + có "Cần chú ý". Sprint trước mới **gom URL & tab**, chưa làm phần "đánh giá nhanh". Đây là việc còn thiếu, chia theo P0 → P2.

---

## P0 — Bắt buộc, vì đây là lý do user vẫn thấy "không đánh giá được gì"

### 1. Component `<KpiScorecard>` chuẩn + dải KPI ở đầu mỗi hub
Hiện 4 hub chỉ là tab gộp — vào trang vẫn thấy ngay bảng số dày đặc của page cũ. Cần:
- 1 component tile: nhãn nhỏ • số lớn • delta vs kỳ trước (▲/▼ %) • màu semantic (xanh tốt / đỏ xấu / xám trung tính) • 1 dòng diễn giải ngắn ("Tốt hơn tháng trước", "Dưới ngưỡng ngành").
- Strip 6 tile ở đầu mỗi hub (Finance / Operations / Housekeeping / Inventory), **luôn hiển thị ở MỌI tab** (không nằm trong từng tab).
- Skeleton + empty state riêng.

### 2. Trang `/reports` Tổng quan điều hành (chưa tồn tại)
Plan có nhưng **chưa build**. Hiện vào `/reports` rớt vào hub-list cũ. Cần:
- 6 KPI tile tổng (Doanh thu thuần • Lợi nhuận • Công suất • RevPAR • Chi phí • Công nợ).
- 1 biểu đồ kết hợp Doanh thu vs Chi phí 30 ngày.
- `<AlertList>` "Cần chú ý" (3–5 dòng) gom từ: booking quá hạn checkout, kho dưới min, ticket bảo trì urgent đang mở, lô giặt trễ hẹn, QC reject rate cao.

### 3. So sánh kỳ trước (period-over-period)
KPI hiện chỉ là con số tuyệt đối — không có "tốt hay xấu". Cần:
- Hook `usePeriodComparison(dateRange)` tự tính kỳ trước cùng độ dài, gọi lại RPC, trả `{current, previous, deltaPct}`.
- Áp dụng cho cả 4 hub.

### 4. Period preset chuẩn
DateRangePicker hiện cho chọn tay → user lười. Thêm chip preset cố định ở header hub: **Hôm nay • 7 ngày • Tháng này • Tháng trước • 90 ngày • Năm nay**. Mặc định "Tháng này".

---

## P1 — Cần để báo cáo "có nghĩa", không chỉ "có số"

### 5. Benchmark inline trên KPI
Đã có `industryBenchmarks.ts` + `classifyBenchmark()` — đang chỉ dùng ở tab Đánh giá vận hành. Đưa kết quả `excellent/good/average/poor` thành **badge nhỏ** trên KPI tile (Occupancy, RevPAR, ADR, Profit Margin, Extra Revenue Share, Laundry Cost/Room).

### 6. Tab "Buồng phòng" trong Housekeeping Hub
Plan ghi rõ nhưng comment trong code: *"Sprint 1: chỉ gom Giặt là. Tab Buồng phòng bổ sung sau."* → vẫn còn nợ.
- Tasks completed / on-time rate
- QC pass rate + top reason reject
- Avg cleaning time / phòng
- Top staff by throughput
Reuse data từ `housekeeping_tasks` + `qc_*` (đã có Dashboard `/housekeeping/qc`).

### 7. RPC `get_operations_kpi` thực sự (Operations Hub)
Hiện Operations Hub gom 3 trang cũ rời, mỗi trang gọi RPC riêng → mở trang là 3 spinner. Cần 1 RPC duy nhất trả KPI strip (occupancy, ADR, RevPAR, room nights, rooms needing attention, period loss) để strip load < 500ms.

### 8. Loại bỏ duplicate UI trong tab
Khi nhúng `RevenueReportPage` vào FinanceHub, mỗi tab vẫn render lại `PageHeader + DateRangePicker + HotelFilter` của page cũ → 2 lớp header chồng nhau. Cần:
- Refactor 8 page cũ thành **dumb section component** (không header/filter/dateRange — nhận props từ hub).
- Hub giữ DUY NHẤT 1 bộ filter, truyền xuống.

---

## P2 — Đánh bóng

### 9. Export thống nhất
Mỗi hub có 1 nút **"Xuất báo cáo"** ở header (PDF cho ban giám đốc + Excel cho kế toán), gộp tất cả tab thay vì xuất rời.

### 10. Drilldown từ Tổng quan
Click KPI ở `/reports` → mở đúng hub + tab tương ứng có sẵn dateRange.

### 11. Mobile (414px)
Strip 6 KPI hiện sẽ tràn ngang. Cần grid responsive: 2 cột mobile / 3 cột tablet / 6 cột desktop, và tab strip dùng horizontal scroll + snap.

### 12. Cleanup
- Xoá 8 page route cũ sau khi xác nhận redirect ổn.
- Xoá entry catalog cũ khỏi i18n.
- Bump version 1.0.49.

---

## Đề xuất thứ tự sprint kế tiếp

**Sprint B1 (1 lượt build)**: P0 #1 + #3 + #4 — `<KpiScorecard>` + comparison hook + preset chip. Áp vào Finance Hub trước làm mẫu.

**Sprint B2**: P0 #2 — Trang `/reports` Tổng quan + `<AlertList>`.

**Sprint B3**: P1 #6 + #7 — Tab Buồng phòng + RPC operations KPI gộp.

**Sprint B4**: P1 #8 + P2 #9–12 — refactor section, export, mobile, cleanup.

---

**Bạn duyệt thứ tự B1 → B4 này không? Hay muốn ưu tiên Tổng quan (B2) trước Scorecard (B1)?**