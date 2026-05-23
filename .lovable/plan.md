
# Đánh giá tổng quan vận hành (Operations Insights)

## Mục tiêu
Thêm tab **"Đánh giá vận hành"** vào `/reports/financial` giúp chủ khách sạn 2–4 sao trả lời 3 câu hỏi:
1. **Tháng này lời/lỗ bao nhiêu?** (Lợi nhuận thuần, biên lợi nhuận)
2. **Hiệu quả tốt hơn hay kém hơn kỳ trước & ngành?**
3. **Cần làm gì để cải thiện?** (Lời khuyên ưu tiên)

---

## A. Logic nghiệp vụ

### Bộ KPI "dễ hiểu" (4 chỉ số chính + 4 phụ)

**4 chỉ số chính (card lớn):**
| KPI | Công thức | Ý nghĩa |
|---|---|---|
| 💰 Lợi nhuận thuần | `Doanh thu thuần − Tổng chi phí` | "Tháng này lãi bao nhiêu" |
| 📊 Biên lợi nhuận | `Lợi nhuận / Doanh thu × 100%` | "Cứ 100đ thu được lãi bao nhiêu" |
| 🛏️ Doanh thu / phòng / ngày | `Doanh thu / (số phòng × số ngày)` | RevPAR — chuẩn ngành KS |
| 📈 Tỷ lệ lấp đầy | `Đêm bán / (số phòng × số ngày)` | Occupancy rate |

**4 chỉ số phụ (compact row):**
- Giá phòng TB (ADR): `Doanh thu phòng / đêm bán`
- Chi phí / phòng / ngày
- Doanh thu dịch vụ thêm (% trên tổng)
- Khách quay lại (% từ guest_stats)

### So sánh kỳ
- Mỗi KPI hiển thị: giá trị hiện tại + delta % so kỳ trước (cùng độ dài) + arrow ↑↓ semantic color.
- Range chọn được: tuần này / tháng này / quý này / tùy chọn.

### Benchmark ngành (hardcoded VN 2–4 sao)
Lưu trong `src/lib/industryBenchmarks.ts`:
```ts
{
  occupancy: { poor: 40, fair: 55, good: 70, excellent: 80 }, // %
  profitMargin: { poor: 10, fair: 20, good: 30, excellent: 40 },
  revpar: { poor: 300_000, fair: 500_000, good: 800_000, excellent: 1_200_000 }, // VND
  adr: { poor: 400_000, fair: 700_000, good: 1_000_000, excellent: 1_500_000 },
  extraRevenueShare: { poor: 5, fair: 10, good: 15, excellent: 25 }, // %
}
```
Hiển thị badge: 🔴 Yếu / 🟡 Trung bình / 🟢 Tốt / 🟢 Xuất sắc.

### Lời khuyên (Hybrid)
**Bước 1 — Rule engine** (`src/lib/operationsAdvisor.ts`): sinh ~15 rule, mỗi rule trả `{severity, category, finding, suggestion, impactVnd?}`. Ví dụ:
- `occupancy < 50%` → "Lấp đầy thấp" + gợi ý KM
- `laundryCostPerRoom > 50k` → "Chi phí giặt cao" + so vendor
- `extraRevenueShare < 5%` → "Bỏ lỡ doanh thu minibar/dịch vụ"
- `lateCheckoutCount > 10` → "Nhiều check-out muộn" + thu phụ phí
- `damageCost trending up` → cảnh báo hư hỏng tăng
- `roomTypeProfitGap > 30%` → "Phòng X hiệu quả thấp"
- v.v.

**Bước 2 — AI tóm tắt** (edge function `operations-advisor`):
- Input: KPI snapshot + danh sách findings rule-based (top 8) + benchmark deltas.
- Model: `google/gemini-3-flash-preview` (mặc định).
- Output: 3–5 lời khuyên Việt tự nhiên, **xếp theo tác động VNĐ ước tính**, mỗi lời khuyên gồm: tiêu đề, mô tả 1–2 câu, action gợi ý cụ thể, mức độ ưu tiên (cao/vừa/thấp).
- Fallback: nếu AI fail (402/429/timeout), hiển thị danh sách rule-based thô — không vỡ trang.

### Export PDF
- Reuse `src/lib/invoiceHelpers.ts` pattern + `jspdf` (đã có).
- 1 trang A4: header KS + kỳ báo cáo, 4 KPI chính, bảng benchmark, top 5 lời khuyên, biểu đồ trend 6 tháng.

---

## B. Schema / migration

**Không cần migration mới.** Tất cả data đã có:
- `room_bookings` (doanh thu, occupancy)
- `booking_payments` (cashflow)
- `service_charges` + `extra_charges`
- `laundry_batches` + `purchase_orders` + `maintenance_requests` (chi phí)
- `rooms` (capacity)
- `guest_stats` (khách quay lại)

**Optional (đề xuất, không bắt buộc Sprint này):** DB view `v_operations_kpi_daily` để cache. Sprint sau.

---

## C. API / RPC

### Edge function mới: `supabase/functions/operations-advisor/index.ts`
- Input: `{ tenantId, hotelId, period, kpiSnapshot, ruleFindings }`
- Validate JWT, verify tenant ownership.
- Gọi Lovable AI Gateway với system prompt tiếng Việt, tool calling để cấu trúc output.
- Xử lý 429/402 → return graceful error.

### Client hook: `src/hooks/useOperationsInsights.ts`
- Gom data từ `useRevenueReport` + `useFinancialReport` + thêm query cho occupancy, ADR, guest stats.
- Tính KPI ở client (pure function `computeKpiSnapshot`).
- Chạy `runOperationsAdvisor()` rule engine.
- Gọi edge function `operations-advisor` (React Query, staleTime 10 phút).

---

## D. UI / Components

### Files mới
- `src/pages/reports/components/OperationsInsightsTab.tsx` — container tab.
- `src/components/reports/insights/KpiHeroCard.tsx` — card KPI lớn với delta + benchmark badge.
- `src/components/reports/insights/BenchmarkBadge.tsx` — badge 4 mức.
- `src/components/reports/insights/AdviceCard.tsx` — card lời khuyên (priority + action).
- `src/components/reports/insights/InsightsTrendChart.tsx` — Recharts line 6 tháng.
- `src/components/reports/insights/ExportInsightsPdfButton.tsx`.
- `src/lib/industryBenchmarks.ts`
- `src/lib/operationsAdvisor.ts` (rule engine + tests)
- `src/lib/operationsAdvisor.test.ts`
- `src/hooks/useOperationsInsights.ts`

### File sửa
- `src/pages/reports/FinancialReportPage.tsx` — thêm `<Tabs>` với 2 tab: "Chi phí" (hiện tại) + "Đánh giá vận hành" (mới, default).
- `src/lib/app-version.ts` + `public/changelog.json` — bump 1.0.45.

### UX
- Mobile-first portrait, card stack vertical.
- Semantic text colors (Enterprise SaaS minimalist, **không** background màu cho status).
- Loading: skeleton từng KPI card + skeleton AI advice riêng (AI chậm hơn).
- Empty state: "Chưa đủ dữ liệu để đánh giá. Cần ít nhất 7 ngày vận hành."

---

## E. Permission

- Hiển thị tab cho: `super_admin`, `owner`, `hotel_manager` (giống quyền hiện tại của Financial Report).
- `department_manager` & `staff`: không thấy tab này (Financial vốn đã ẩn).
- All Hotels mode: hỗ trợ — KPI tổng hợp toàn chuỗi, advice gắn nhãn hotel cụ thể.

---

## F. Test cases

**Unit (vitest):**
- `operationsAdvisor.test.ts`:
  - Rule low occupancy fires khi <50%
  - Rule không fire nếu thiếu data
  - Sắp xếp theo severity + impactVnd desc
  - Edge: divide-by-zero (0 phòng), period 0 ngày
- `industryBenchmarks.test.ts`: classify đúng 4 mức
- `useOperationsInsights.test.ts` (mock): KPI snapshot đúng công thức

**Integration:**
- Edge function `operations-advisor` smoke test với mock KPI → trả về JSON hợp lệ.
- Fallback khi `LOVABLE_API_KEY` 429 → vẫn render rule-based.

---

## G. Rollout

1. Migration: không.
2. Deploy edge function `operations-advisor` (auto).
3. Feature flag implicit: tab chỉ hiện khi `useOperationsInsights` không throw → an toàn.
4. Bump APP_VERSION 1.0.45 + changelog "Thêm Đánh giá vận hành với AI gợi ý".
5. QA checklist:
   - [ ] iPhone SE portrait không vỡ layout
   - [ ] All Hotels mode hiển thị đúng
   - [ ] AI fallback hoạt động (test bằng cách invalidate key tạm)
   - [ ] PDF export render đúng tiếng Việt có dấu
   - [ ] Tenant isolation: 2 tenant khác nhau không thấy data của nhau
6. Rollback: revert tab → fallback về Financial cũ (zero schema change).

---

## Cấu trúc tab UI

```text
┌────────────────────────────────────────┐
│ [Chi phí] [Đánh giá vận hành ●]        │  ← Tabs
├────────────────────────────────────────┤
│ Kỳ: [Tháng này ▾]  [Xuất PDF]          │
├────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐                   │
│ │Lợi nhuận│ │Biên LN │  ← 4 KPI Hero    │
│ │ 45M ↑12%│ │ 28% 🟢 │                  │
│ └────────┘ └────────┘                   │
│ ┌────────┐ ┌────────┐                   │
│ │RevPAR  │ │Occupancy│                  │
│ │ 680k 🟡│ │ 62% 🟢 │                  │
│ └────────┘ └────────┘                   │
├────────────────────────────────────────┤
│ KPI phụ (compact row)                   │
├────────────────────────────────────────┤
│ 📈 Xu hướng 6 tháng (chart)             │
├────────────────────────────────────────┤
│ 💡 Lời khuyên ưu tiên                   │
│ ┌────────────────────────────────────┐ │
│ │ 🔴 CAO • Lấp đầy phòng Deluxe thấp│ │
│ │ Chỉ 35% so trung bình ngành 55%   │ │
│ │ → Tác động: ~12M/tháng            │ │
│ │ [Tạo khuyến mãi]                  │ │
│ └────────────────────────────────────┘ │
│ ... (3-5 cards)                         │
└────────────────────────────────────────┘
```

---

## Phần còn thiếu / Sprint sau
- DB view `v_operations_kpi_daily` để cache (tech debt F-DBT-04).
- Báo cáo so sánh giữa các hotel trong chain (Sprint D — Chain Overview).
- Lưu lịch sử insight đã đọc để track "đã làm gì sau lời khuyên".
- Cron weekly: tự động sinh + email insight cho Owner.
