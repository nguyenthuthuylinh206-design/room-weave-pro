

## Đánh giá Thống kê & Báo cáo Super Admin — Các lỗi phát hiện

### Lỗi nghiêm trọng

| # | Vấn đề | File | Chi tiết |
|---|---|---|---|
| 1 | **400 error `cancelled_at`** | `useSuperAdminStats.ts` line 155 | `useChurnRate` query cột `cancelled_at` — cột này không tồn tại trên bảng `tenants` → request trả 400 (xác nhận từ network logs) |
| 2 | **Doanh thu theo gói = 0₫ sai** | `useSuperAdminStats.ts` line 83-84 | `useRevenueByPlan` dùng `price_monthly` từ plan, nhưng "Gói Tiêu Chuẩn" có `price_monthly=0` (vì dùng `room_based` pricing). 7 tenant hiển thị 0₫ doanh thu — **sai hoàn toàn**. Cần tính doanh thu thực từ `payment_transactions` thay vì từ giá plan |
| 3 | **`useTenantList` dùng `current_period_end`** | `useSuperAdminStats.ts` line 184 | Cột không tồn tại, cùng bug đã fix ở reminders nhưng chưa fix ở đây |

### Lỗi logic & UX

| # | Vấn đề | File |
|---|---|---|
| 4 | **Chart không theo date range picker** | `RevenueChart.tsx` hardcoded 6 tháng, `TenantGrowthChart.tsx` hardcoded 30 ngày — bỏ qua giá trị date range picker trên trang Analytics |
| 5 | **ARPU chia cho 0** | `AdvancedDashboard.tsx` line 325: `plan.totalRevenue / plan.tenantCount` crash khi tenantCount=0 |
| 6 | **ChurnRateCard dùng Card + text tiếng Anh** | `ChurnRateCard.tsx` — "Churn Analysis", "Healthy", "At Risk", "Churned Tenants", "Period", "30 days" |
| 7 | **RevenueChart, TenantGrowthChart text tiếng Anh** | "Failed to load...", "No revenue data available", "No tenant growth data available" |

### Kế hoạch fix

#### 1. Fix `useRevenueByPlan` — tính doanh thu thực
Thay vì dùng `price_monthly` từ plan, query `payment_transactions` grouped by `tenant → subscription_plan`, tính tổng `amount` thực tế đã thanh toán.

#### 2. Fix `useChurnRate` — sửa cột `cancelled_at`
Đổi sang dùng `subscription_status` change hoặc `updated_at` để xác định thời điểm churn, vì cột `cancelled_at` không tồn tại.

#### 3. Fix `useTenantList` — sửa `current_period_end` → `subscription_end_date`

#### 4. Chart nhận date range từ props
- `RevenueChart` nhận prop `months` thay vì hardcode 6
- `TenantGrowthChart` nhận prop `days` thay vì hardcode 30
- `AdvancedAnalytics` truyền giá trị date range xuống

#### 5. Fix ARPU divide by zero
Thêm check `plan.tenantCount > 0` trước khi chia.

#### 6. Chuẩn hóa UI `ChurnRateCard`
- Thay `Card` → `div border rounded-lg`
- Dịch tất cả text sang tiếng Việt
- Bỏ `bg-green-100`, `bg-red-100` → dùng semantic text color

#### 7. Dịch text tiếng Anh còn sót
`RevenueChart.tsx`, `TenantGrowthChart.tsx` — dùng i18n translation.

### File thay đổi
1. `src/hooks/useSuperAdminStats.ts` — Fix `useRevenueByPlan`, `useChurnRate`, `useTenantList`
2. `src/components/super-admin/analytics/RevenueChart.tsx` — Nhận prop months, dịch text
3. `src/components/super-admin/analytics/TenantGrowthChart.tsx` — Nhận prop days, dịch text
4. `src/components/super-admin/analytics/ChurnRateCard.tsx` — UI chuẩn hóa + dịch
5. `src/components/super-admin/analytics/AdvancedAnalytics.tsx` — Truyền props xuống chart
6. `src/components/super-admin/dashboard/AdvancedDashboard.tsx` — Fix ARPU divide by zero, truyền props

