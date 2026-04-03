

## Sửa lỗi "Chờ thanh toán" và "Chưa thanh toán" trên Dashboard

### Vấn đề gốc

Công thức tính số tiền còn nợ đang **thiếu `deposit_amount`**. Hệ thống đang tính:

```text
Còn nợ = total_amount - amount_paid          ← SAI
Còn nợ = total_amount - amount_paid - deposit_amount   ← ĐÚNG
```

**Ví dụ thực tế** (Khách sạn Phương Đông):

| Booking | total | amount_paid | deposit | Còn nợ thật | Dashboard hiện |
|---------|-------|-------------|---------|-------------|----------------|
| Booking 1 | 565K | 315K | 250K | **0₫** | 250K |
| Booking 2 | 2.034K | 1.784K | 250K | **0₫** | 250K |
| **Tổng** | | | | **0₫** | **500K** ← sai |

Cả 2 booking đã thanh toán đủ (paid + deposit = total) nhưng dashboard vẫn hiện "Chờ thanh toán 500.000₫".

### Các vị trí cần sửa

| # | File | Dòng lỗi | Công thức sai |
|---|------|----------|---------------|
| 1 | `src/hooks/useRevenueReport.ts` line 146 | `pendingRevenue` trong `calculateRevenueData` | `total_amount - amount_paid` (thiếu deposit) |
| 2 | `src/components/dashboard/owner/OwnerRevenueOverview.tsx` line 43-46 | `pendingPayment` tính từ pending bookings | `total_amount - amount_paid` (thiếu deposit) |
| 3 | `src/hooks/useBookingStats.ts` | Query `all-pending-payments` không select `deposit_amount` | Không có dữ liệu deposit để trừ |

### Cách sửa

**1. `useRevenueReport.ts`** — Thêm `deposit_amount` vào select và sửa công thức:
```typescript
// Line 127: thêm deposit_amount vào select
// Line 146: sửa thành
const pendingRevenue = nonRefunded.reduce((s, b) => 
  s + Math.max(0, (b.total_amount || 0) - (b.amount_paid || 0) - (b.deposit_amount || 0)), 0)
```

**2. `OwnerRevenueOverview.tsx`** — Thêm `deposit_amount` vào query và công thức:
```typescript
// Line 25: thêm deposit_amount vào select
// Line 43-44: sửa thành
const remaining = (b.total_amount || 0) - (b.amount_paid || 0) - (b.deposit_amount || 0)
```

**3. `useBookingStats.ts`** — Nếu có query pending riêng, cũng cần cập nhật tương tự

### Ngoài ra: `payment_status` không đồng bộ

Hai booking kia thực tế đã thanh toán đủ nhưng `payment_status` vẫn là `partial`. Đây là bug riêng trong RPC `update_booking_amount_paid` — nó không cộng `deposit_amount` khi xác định trạng thái. Tuy nhiên fix dashboard trước là ưu tiên, vì dashboard phải tính đúng bất kể status.

### Kết quả mong đợi
- "Chờ thanh toán" = **0₫** (đúng thực tế cho KS Phương Đông)
- Cảnh báo "Chưa thanh toán" giảm đúng số lượng thật sự còn nợ
- Tất cả widget dùng chung công thức: `remaining = total - paid - deposit`

