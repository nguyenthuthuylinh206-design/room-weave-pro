# Báo cáo Dòng tiền (Cash Flow)

Trang trả lời 5 câu chủ khách sạn hỏi mỗi sáng: tiền vào bao nhiêu, sắp phải trả ai, ai còn nợ mình, OTA giữ bao nhiêu, tuần tới cần chuẩn bị bao nhiêu tiền mặt.

## 1. Vị trí & điều hướng
- Route mới: `/reports/cash-flow` (standalone), thêm vào `reportsCatalog.ts` section **Tài chính**, đánh dấu `isNew: true`.
- Roles: `super_admin`, `owner`, `hotel_manager` (Manager chỉ thấy hotel được gán qua HotelContext).
- Permission: `view_reports`.

## 2. Bố cục trang

```text
┌────────────────────────────────────────────────────────┐
│ Period chips: Hôm nay | 7N | Tháng | Tuỳ chỉnh          │
│ Hotel selector                                         │
├────────────────────────────────────────────────────────┤
│ 4 KPI Headline                                         │
│ Tiền vào kỳ | Tiền ra kỳ | Net cash | Số dư công nợ    │
│ (mỗi ô có Δ% vs kỳ trước)                              │
├────────────────────────────────────────────────────────┤
│ Biểu đồ dòng tiền theo ngày                            │
│ ComposedChart: cột Tiền vào (xanh) / Tiền ra (đỏ),     │
│ line Net cash dồn                                      │
├────────────────────────────────────────────────────────┤
│ Tiền vào theo kênh           │ Tiền ra theo nhóm        │
│ Cash | Bank | OTA payout     │ Mua hàng (PO)           │
│ | Deposit | Khác             │ Giặt là                 │
│                              │ Bảo trì                  │
│                              │ Lương/khác (manual)      │
├────────────────────────────────────────────────────────┤
│ Công nợ phải thu (Aging)                               │
│ 0-7N | 8-30N | 31-60N | >60N + danh sách top 10        │
├────────────────────────────────────────────────────────┤
│ OTA chưa thanh toán                                    │
│ Theo kênh (Booking.com/Agoda/Traveloka...): số booking,│
│ doanh thu, hoa hồng, net OTA giữ                       │
├────────────────────────────────────────────────────────┤
│ Sắp phải trả (Upcoming payables) 30N tới               │
│ PO sắp đến hạn + maintenance pending + laundry chưa trả│
├────────────────────────────────────────────────────────┤
│ Cảnh báo dòng tiền (Insight cards)                     │
└────────────────────────────────────────────────────────┘
```

## 3. Công thức & nguồn dữ liệu

| Khối | Công thức | Bảng nguồn |
|---|---|---|
| Tiền vào | `SUM(amount)` `booking_payments.payment_status='completed'` trong kỳ theo `paid_at` | `booking_payments` |
| Tiền vào theo kênh | group by `payment_method` (cash/bank_transfer) + tách OTA từ `room_bookings.booking_source` LIKE 'ota_%' | `booking_payments` + `room_bookings` |
| Tiền ra — Mua hàng | `SUM(total_amount)` `purchase_orders` `status IN ('received','paid')` theo `received_at`/`paid_at` | `purchase_orders` |
| Tiền ra — Giặt là | `SUM(actual_cost ?? estimated_cost)` `laundry_batches` đã stocked trong kỳ | `laundry_batches` |
| Tiền ra — Bảo trì | `SUM(actual_cost)` `maintenance_requests` `status='completed'` trong kỳ | `maintenance_requests` |
| Tiền ra — Tổn thất kho | `SUM(total_value)` `inventory_transactions` type `damage`/`loss` | `inventory_transactions` |
| Net cash | Tiền vào − Tiền ra | derived |
| Công nợ phải thu | `room_bookings`: `total_amount − (amount_paid + deposit_amount) > 0` AND `payment_status != 'paid'` | `room_bookings` |
| Aging | Theo `check_out_date` (fallback `created_at`) so với hôm nay | derived |
| OTA chưa thanh toán | `room_bookings` `booking_source LIKE 'ota_%'` AND chưa có `booking_payments.completed` đối ứng | `room_bookings` + `booking_payments` |
| Upcoming payables | `purchase_orders` `status='received' AND payment_status!='paid'` + `maintenance_requests` `status IN ('in_progress','completed') AND actual_cost > 0 AND chưa đánh dấu paid` | nhiều bảng |

Tenant isolation: tất cả query `.eq('tenant_id', tenantId)` + lọc `hotel_id` qua HotelContext.

## 4. Reuse / Refactor / Mới

**Reuse**
- `PeriodPresetChips`, `resolvePeriod` (reportPeriods.ts).
- `KpiScorecard` cho 4 KPI lớn, `AlertList` cho insight.
- `useRevenueReport` để lấy OTA commission (đã có `ota_commission_amount`, `bySource`).
- `useMonthlyExpenses` không đủ vì chỉ trả tổng theo tháng — viết riêng theo ngày.
- `formatCurrency`, ChartContainer recharts.

**Refactor nhỏ**
- `reportsCatalog.ts`: thêm entry `cash-flow` section `finance`.

**Mới**
- `src/pages/reports/CashFlowReportPage.tsx`
- `src/components/reports/cash-flow/CashFlowKpiHeadline.tsx`
- `src/components/reports/cash-flow/CashInOutChart.tsx` (ComposedChart theo ngày)
- `src/components/reports/cash-flow/CashInBreakdown.tsx` (tiền vào theo kênh + bảng)
- `src/components/reports/cash-flow/CashOutBreakdown.tsx` (tiền ra theo nhóm + bảng)
- `src/components/reports/cash-flow/ReceivablesAgingPanel.tsx` (aging bucket + top 10 booking)
- `src/components/reports/cash-flow/OtaPendingPanel.tsx`
- `src/components/reports/cash-flow/UpcomingPayablesPanel.tsx`
- `src/components/reports/cash-flow/CashFlowInsights.tsx` (rule-based: net âm, OTA giữ >X%, aging >30N chiếm cao, payable 7N tới > tiền vào dự kiến)
- `src/hooks/useCashFlowMetrics.ts` (gộp 4 nguồn tiền vào/ra theo ngày + bucket)
- `src/hooks/useReceivablesAging.ts`
- `src/hooks/useOtaPending.ts`
- `src/hooks/useUpcomingPayables.ts`
- Route trong `App.tsx`.

Tất cả hook dùng `react-query`, `staleTime: 5 phút`, query key gồm `tenantId + hotelId + period`. All Hotels mode hỗ trợ (hotelId null).

## 5. UI/UX
- Theo chuẩn Enterprise SaaS Minimalist (border, không icon nặng).
- KPI tile: số to `text-3xl font-mono`, Δ% nhỏ semantic color.
- Mobile portrait: KPI cuộn ngang snap, các panel xếp dọc full-width.
- Empty state riêng từng panel ("Chưa có giao dịch trong kỳ").
- Loading: Skeleton từng vùng (không block full page).
- Format tiền: `1.700.000 ₫` (dấu chấm thousands).

## 6. Permissions
- `view_reports` bắt buộc.
- Owner/Super Admin: All Hotels mode.
- Hotel Manager: chỉ hotel đã gán.
- Staff: ẩn route khỏi catalog (đã có cơ chế `useAccessibleReports`).

## 7. Version & rollout
- Bump `APP_VERSION` + `CURRENT_VERSION` → `1.0.53`.
- Thêm changelog `public/changelog.json`.
- Không migration DB (đọc dữ liệu sẵn có).
- QA checklist: kỳ rỗng → empty; tổng tiền vào khớp manual 1 ngày; aging bucket tính đúng mốc 7/30/60; All Hotels mode tổng đúng; mobile iPhone SE không tràn.
- Rollback: xoá route + catalog entry.

## 8. Out of scope (sprint sau)
- Forecast dòng tiền 30N tới bằng booking pace.
- Reconciliation OTA payout (cần import statement Booking.com/Agoda).
- Xuất PDF/Excel riêng cho cash flow (sẽ gộp vào Export tổng Finance Hub).
- Module ghi nhận chi lương/điện nước thủ công (cần bảng `manual_expenses` — tách sprint riêng).

## 9. Câu hỏi chốt
1. **Định nghĩa "Tiền ra"**: bạn muốn ghi nhận theo ngày **received** (nhận hàng/hoàn tất dịch vụ) hay theo ngày **paid** (thực sự chuyển khoản)? Default đề xuất: theo `paid_at` khi có, fallback `received_at`/`completed_at`.
2. **Tuổi nợ (Aging)**: tính từ `check_out_date` hay `created_at` của booking? Default: `check_out_date`.
3. **OTA payout**: bạn có muốn coi toàn bộ booking OTA đã checkout nhưng chưa có `booking_payments completed` là "OTA giữ", hay chỉ tính khi `payment_status != 'paid'`? Default: cách 2 (an toàn hơn, không double-count).
4. **Lương & chi phí cố định** (điện/nước/internet): có cần ô nhập tay tạm trong report này, hay chờ module `manual_expenses` riêng?
