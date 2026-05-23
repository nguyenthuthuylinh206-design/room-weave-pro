# QA toàn bộ Reports Hub — Phát hiện & đề xuất sửa

Đã rà 10 báo cáo (Doanh thu, Tài chính, KPI Vận hành, Hỏng/Mất, Hiệu năng phòng, Tồn kho, Kiểm kê kho, Xuất kho, Giặt là, Bảo trì) và các hook tương ứng. **Tin tốt**: Doanh thu đã có sẵn ở `/reports/revenue`, tenant/hotel filter đúng chuẩn 3 lớp, các RPC `get_*_report` tồn tại trong DB, mobile view đầy đủ trừ Outbound. **Vấn đề** chia 3 nhóm:

## 🔴 P0 — Bug nghiêm trọng (sai số liệu / vỡ UX)

1. **Doanh thu thiếu phụ thu dịch vụ & minibar** — `useRevenueReport.ts` chỉ cộng `early_checkin + late_checkout + damage_charges` vào surcharges. Cột `service_charges`, `extra_charges` (đã có trong `room_bookings`) **bị bỏ qua hoàn toàn**, dẫn đến tổng doanh thu thấp hơn thực tế.
2. `**netRevenue` không trừ discount & VAT** — Memory `advanced-revenue-analytics-v1` quy định `net = gross − discount − commission − VAT passthrough`. Hook hiện chỉ `total − commission`. Sai khi hotel có khuyến mãi hoặc VAT exclusive.
3. **Financial Report fallback xấu** — `FinancialReportPage.tsx:60` render plain `<div>Loading...</div>` (tiếng Anh, không skeleton, không Vietnamese) khi `reportData` chưa có. Vi phạm chuẩn Vietnamese-first + Enterprise SaaS.
4. **Lệch giữa `booking_payments` (1,54 tỷ) và `room_bookings.amount_paid` (599 triệu)** trên tenant Phước Linh — cần xác định nguồn truth cho báo cáo. Hiện Revenue dùng `amount_paid` (có thể đang miss các khoản pay-on-checkout chưa rollup).

## 🟡 P1 — Thiếu sót chức năng

5. **Outbound Report thiếu Mobile view** — 9/10 báo cáo có `Mobile*ReportPage.tsx`, riêng Outbound không có → trên mobile sẽ render desktop layout (chart Recharts vỡ).
6. `**useRevenueReport` không lọc theo `dateRange` tùy chọn** — chỉ có period preset (today/week/month/...), trong khi Financial/Operations/Damages có `DateRangePicker`. Owner muốn so quý/năm cụ thể không làm được.
7. **Damages Report parse legacy data** — có `normalizeDamageList` cho dạng `{itemId: qty}` cũ, nhưng không log cảnh báo khi gặp dữ liệu lạ → bug âm thầm.

## 🟢 P2 — Đề xuất nâng cấp (theo Sprint B/C trong roadmap)

8. **Card "Doanh thu" hiển thị đúng** cho Owner & Hotel Manager (xác nhận từ screenshot user gửi) — không phải bug, user đã thấy ở section **Tài chính** trên hub. Department Manager (housekeeping/laundry/inventory/maintenance) **cố ý không thấy** theo Sprint A.
9. **Thiếu báo cáo Lễ tân** (booking funnel, check-in/out theo ca, công nợ chưa thu) — đã có trong roadmap Sprint C.
10. **Thiếu báo cáo CRM khách (VIP, repeat rate)** — Sprint C.
11. **Thiếu Chain Overview** (multi-hotel ranking) — Sprint D.

## Phạm vi đề xuất triển khai ngay (nếu duyệt)

Focus **P0** trước, các P1/P2 chờ sprint sau:

### A. Logic nghiệp vụ

- Bổ sung `service_charges` + `extra_charges` vào `RevenueData.surcharges` và `totalRevenue`.
- Sửa `netRevenue` theo công thức chuẩn: ưu tiên cột `net_revenue` của DB; fallback `total − discount − commission − vat_passthrough`.
- Thêm field `discount_amount`, `vat_amount`, `vat_inclusive` vào select của `useRevenueReport`.

### B. Schema/Migration

- Không cần migration mới — các cột đã tồn tại.
- **Đề xuất** thêm DB view `v_booking_revenue` (Tech debt F-DBT-04) gom logic tài chính, tránh tính client. Để Sprint B.

### C. API/RPC

- Không thay đổi RPC. Chỉ điều chỉnh client query.

### D. UI/UX

- `FinancialReportPage.tsx:60`: thay `<div>Loading...</div>` bằng skeleton tiếng Việt giống Operations/Revenue.
- Thêm `DateRangePicker` cho Revenue (giữ preset hiện tại làm shortcut).
- Tạo `MobileOutboundReportPage.tsx` mirror layout 9 mobile pages còn lại.

### E. Permission

- Không đổi. Catalog Sprint A đã chuẩn.

### F. Test

- Thêm `useRevenueReport.test.ts`: case (1) booking có service_charges, (2) có discount + VAT exclusive, (3) refunded loại khỏi paid.
- Snapshot công thức `netRevenue` với 3 booking giả lập.

### G. Rollout

- Bump `APP_VERSION` + `CURRENT_VERSION` + changelog entry "Sửa công thức doanh thu, thêm phụ thu dịch vụ/minibar, mobile outbound".
- Invalidate `['revenue-report']` sau deploy để tránh cache cũ.
- Rollback: revert hook + page; không có DB change.

## Câu hỏi cần xác nhận trước khi build

1. **Nguồn truth doanh thu**: dùng `room_bookings.amount_paid`  tổng `booking_payments.amount where status='completed'` (chính xác hơn, nặng query)
2. **Phạm vi sprint này**:  luôn P1 (5–7)
3. **Date range tùy chọn cho Revenue**: cần ngay