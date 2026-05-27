
# Báo cáo Doanh thu Phòng

Trang báo cáo "số 1" cho chủ khách sạn: trả lời 5 câu trong 10 giây — hôm nay thu bao nhiêu, lấp đầy bao nhiêu %, giá bán trung bình, phòng nào bán tốt, kênh nào mang khách.

## 1. Vị trí & điều hướng

- Route mới: `/reports/room-revenue` (gắn vào `reportsCatalog.ts`, section "Doanh thu", icon Bed).
- Là trang đầu tiên trong nhóm "Doanh thu" của Reports Hub. Pin lên đầu sidebar reports cho role Owner/Manager.
- Mobile: layout dọc 1 cột, KPI strip cuộn ngang; Desktop: 12-col grid.

## 2. Bố cục trang (4 vùng)

```text
┌──────────────────────────────────────────────────┐
│  Period chips: Hôm nay | 7N | Tháng | Tuỳ chỉnh  │
│  Hotel selector (nếu Owner / chain)              │
├──────────────────────────────────────────────────┤
│  KPI Headline (4 ô lớn)                           │
│  Doanh thu | Occupancy | ADR | RevPAR             │
│  Δ% vs kỳ trước  •  Δ% YoY  •  Benchmark badge    │
├──────────────────────────────────────────────────┤
│  Mini-chart kỳ này (Occupancy & RevPAR theo ngày)│
│  Bar/Line kết hợp, hover xem số                  │
├──────────────────────────────────────────────────┤
│  Top Phòng bán tốt   │  Phòng bán chậm           │
│  (top 10: số đêm,    │  (bottom 5: <30% kỳ,      │
│   revenue, ADR/phòng)│   gợi ý: kiểm tra QC)     │
├──────────────────────────────────────────────────┤
│  Doanh thu theo kênh (OTA / Walk-in / Direct...) │
│  Stacked bar + bảng: bookings, gross, commission,│
│  net, %                                          │
├──────────────────────────────────────────────────┤
│  Gợi ý hành động (Insight cards)                 │
│  - "Cuối tuần ADR 1.2tr, tuần 800k → cân nhắc    │
│     tăng 10% giá Sat/Sun"                        │
│  - "Phòng 305 bán <20% trong 30N — kiểm tra QC"  │
│  - "OTA chiếm 65% — cân nhắc đẩy direct"         │
└──────────────────────────────────────────────────┘
```

## 3. Chỉ số & công thức

| Chỉ số | Công thức | Nguồn |
|---|---|---|
| Doanh thu kỳ | `SUM(net_revenue)` từ booking đã checkout trong kỳ | `useRevenueReport` |
| Occupancy % | `room_nights_sold / available_room_nights` | room_bookings × rooms |
| ADR | `room_revenue / room_nights_sold` (chỉ tiền phòng, loại surcharge) | room_bookings |
| RevPAR | `room_revenue / available_room_nights` = ADR × Occupancy | derived |
| ALOS | `SUM(nights) / bookings` | room_bookings |
| Top rooms | order by revenue desc, có ADR riêng | room_bookings group by room_id |
| By channel | group by booking_source (ota_*, walk_in, direct, phone, web) | room_bookings |

Benchmark badges (đã có `industryBenchmarks.ts` + `BenchmarkBadge`): áp cho Occupancy, ADR, RevPAR — màu xanh/vàng/đỏ.

## 4. Reuse / Refactor / Mới

**Reuse:**
- `useRevenueReport.ts` — đã có `topRooms`, `bySource`, surcharges. Chỉ cần thêm trường `roomNights`, `adr` per room.
- `useRoomsReportData.ts` — đã có `occupancy_stats`, `occupancyTrend`. Reuse.
- `PeriodPresetChips`, `resolvePeriod`, `KpiScorecard`, `BenchmarkBadge`, `AlertList`.
- `ReportHubShell` không cần — đây là trang standalone trong catalog (đơn giản hơn Hub gộp).

**Refactor nhỏ:**
- `useRevenueReport`: thêm `room_nights` + `adr` vào `RoomRevenue` (đã có `bookings`, `revenue` — bổ sung `nights` từ booking_dates).
- `reportPeriods.ts`: thêm preset `today` và `last_7_days` nếu chưa có.

**Mới:**
- `src/pages/reports/RoomRevenueReportPage.tsx` — page chính.
- `src/components/reports/room-revenue/RoomRevenueKpiHeadline.tsx` — 4 ô KPI lớn (Revenue/Occ/ADR/RevPAR).
- `src/components/reports/room-revenue/OccupancyRevparChart.tsx` — line/bar kép theo ngày (recharts ComposedChart).
- `src/components/reports/room-revenue/TopRoomsTable.tsx` — top/bottom rooms.
- `src/components/reports/room-revenue/ChannelMixPanel.tsx` — stacked bar + bảng kênh.
- `src/components/reports/room-revenue/RoomRevenueInsights.tsx` — sinh insight client-side từ data (weekend vs weekday ADR, low-occupancy rooms, OTA share).
- `src/hooks/useRoomRevenueMetrics.ts` — gộp Revenue + Occupancy, tính ADR/RevPAR derived, weekend split.
- Catalog entry trong `src/lib/reportsCatalog.ts` (role: owner + manager, permission: `view_reports`).

## 5. Data flow

```text
useRoomRevenueMetrics(period, hotelId)
  ├── useRevenueReport (gross, net, surcharges, topRooms, bySource)
  ├── useRoomsReportData (occupancy_stats, occupancyTrend, totalRooms)
  └── derive:
       • adr = roomRevenue / roomNightsSold
       • revpar = roomRevenue / (totalRooms * days)
       • weekendAdr vs weekdayAdr
       • previousPeriod, yoy → Δ%
```

Tenant isolation: cả 2 hook đều đã `.eq('tenant_id', tenantId)` + `HotelContext`.

## 6. UI/UX

- Theo chuẩn Enterprise SaaS Minimalist: `border rounded-lg`, không icon nặng, semantic color cho Δ% (green/red/amber), font-mono cho số tiền.
- KPI tile: số to (`text-3xl font-semibold`), label `text-xs uppercase tracking-wide text-muted-foreground`, Δ% nhỏ + benchmark badge.
- Mobile portrait: 4 KPI cuộn ngang (snap), chart full-width, bảng top rooms compact 3 cột (Phòng / Đêm / Doanh thu).
- Empty state: "Chưa có booking trong kỳ này" + nút đổi kỳ.
- Loading: Skeleton cho từng vùng.

## 7. Permissions

- `view_reports` bắt buộc.
- Owner: full + All Hotels mode.
- Manager: chỉ hotel được gán (HotelContext lọc sẵn).
- Staff: ẩn route khỏi catalog (đã có cơ chế `useAccessibleReports`).

## 8. Version & rollout

- Bump `APP_VERSION` và `CURRENT_VERSION` → `1.0.52`.
- Thêm changelog entry.
- Feature flag: không cần (page mới, không đụng flow cũ).
- QA checklist: 
  1. Hotel có 0 booking → empty state đúng.
  2. ADR/RevPAR khớp tay tính trên 1 ngày mẫu.
  3. Δ% vs kỳ trước đúng khi đổi preset.
  4. Mobile iPhone SE: KPI cuộn snap, chart không tràn.
  5. All Hotels mode: tổng cộng đúng.
- Rollback: xoá route + catalog entry, không có migration.

## 9. Out of scope (sprint sau)

- Pricing recommendation engine thật (chỉ có insight rule-based ở bản này).
- Forecast (ML) — sẽ tính sau khi đủ 90N data.
- Export PDF riêng cho báo cáo phòng — gộp vào Export tổng của Finance Hub ở sprint sau.

## 10. Câu hỏi chốt trước khi build

1. **ADR tính chỉ tiền phòng** (loại surcharge/extra) hay **gộp tất cả thu trên đêm phòng**? (Chuẩn quốc tế: chỉ tiền phòng — tôi default theo chuẩn này nếu bạn không yêu cầu khác.)
2. **Available room nights** có trừ phòng đang `maintenance/OOS` không? (Default: có trừ — đúng chuẩn RevPAR.)
3. **Insight cards**: bật ngay hay để sprint sau sau khi có metrics ổn?

Sau khi bạn ok → tôi vào build, làm hook + page + 5 component, bump version 1.0.52.
