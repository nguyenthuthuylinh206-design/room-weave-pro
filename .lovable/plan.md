
## Sửa lỗi tính doanh thu trên Owner Dashboard

### Vấn đề
"Doanh thu tháng này" hiển thị **0₫** mặc dù bạn đã thu được **2.099.000₫** từ 2 booking (315.000 + 1.784.000). Nguyên nhân: hệ thống chỉ tính doanh thu từ booking có `payment_status = 'paid'`, bỏ qua hoàn toàn số tiền đã thu từ booking `partial`.

### Giải pháp

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/hooks/useRevenueReport.ts` | Sửa hàm `calculateRevenueData`: `paidRevenue` = tổng `amount_paid` từ **tất cả** booking (không chỉ booking `paid`). `pendingRevenue` = tổng `total_amount - amount_paid` từ booking chưa thanh toán đủ |
| 2 | `src/hooks/useRevenueReport.ts` | Sửa biểu đồ xu hướng hàng tháng (line 180): tính revenue = tổng `amount_paid` thay vì chỉ lọc `payment_status === 'paid'` |

### Chi tiết logic mới

**Trước:**
```
paidRevenue = SUM(amount_paid) WHERE payment_status = 'paid'  → 0₫
pendingRevenue = SUM(total - paid) WHERE status IN (pending, partial) → 500K
```

**Sau:**
```
paidRevenue = SUM(amount_paid) FROM tất cả booking → 2.099.000₫
pendingRevenue = SUM(total - paid) WHERE chưa thanh toán đủ → 500.000₫
```

### Phạm vi ảnh hưởng
- Mục "Doanh thu tháng này" trong OwnerProfitOverview
- Biểu đồ xu hướng doanh thu 6 tháng
- Số liệu "Tháng trước" và "Hôm nay"
- Tỷ lệ tăng trưởng (%)
