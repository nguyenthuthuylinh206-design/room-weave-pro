
## Rà soát toàn bộ Bảng điều khiển và sửa các số liệu đang lệch

Mình đã kiểm tra code của toàn bộ dashboard và thấy lỗi không nằm ở 1 chỗ, mà là nhiều widget đang dùng công thức hoặc nguồn dữ liệu khác nhau. Kế hoạch sửa sẽ tập trung vào 5 nhóm sau:

### 1) Sửa nguồn dữ liệu “Đã thu hôm nay”
- `useBookingStats.ts` hiện vẫn tính từ `room_bookings.total_amount` với điều kiện `payment_status = 'paid'`.
- Cách này sai vì:
  - bỏ sót thanh toán một phần
  - không bám theo lịch sử thanh toán thực tế đã có ở `booking_payments`
- Cách sửa:
  - đổi sang lấy tổng `booking_payments.amount` với `payment_status = 'completed'` theo `paid_at` trong ngày
  - giữ fallback cho booking cũ nếu cần

### 2) Đồng bộ lại bộ lọc thời gian trên Owner Dashboard
- Dropdown `1m / 3m / 6m / 12m` đang bị lệch mốc:
  - `1m` hiện thực tế đang lấy từ đầu tháng trước tới cuối tháng này
- Ngoài ra `OwnerProfitOverview` đang không nhận preset này, nên đổi dropdown mà block doanh thu chính vẫn đứng yên.
- Cách sửa:
  - chuẩn hóa preset thành số tháng bao gồm tháng hiện tại
  - truyền preset/period xuống các widget liên quan
  - sửa label hiển thị để khớp dữ liệu thật

### 3) Sửa biểu đồ chi phí đang bị dư 1 tháng
- Hàm DB `get_monthly_expenses` đang generate từ `now() - p_months` đến `now()` theo kiểu inclusive.
- Kết quả:
  - chọn 1 tháng ra 2 cột
  - chọn 12 tháng ra 13 cột
- Cách sửa:
  - tạo migration để function chỉ trả đúng số tháng yêu cầu
  - giữ frontend dùng cùng một quy ước với backend

### 4) Sửa các cảnh báo dashboard đang query sai phạm vi
- `useOwnerAlerts()` phần đồ hỏng/mất đang không filter theo `tenant_id` / `hotel_id`
- Việc này có thể làm cảnh báo nhảy sai dữ liệu khi xem theo khách sạn
- Cách sửa:
  - thêm filter đầy đủ theo tenant + hotel context
  - rà lại các alert query để không còn lệch phạm vi

### 5) Sửa các nhãn/trạng thái gây hiểu nhầm
- `OwnerRevenueOverview` đang gom partial payment thành “Chưa thanh toán”
- Mobile dashboard đang query trạng thái phòng `available` trong khi hệ thống dùng `vacant`
- Cách sửa:
  - hiển thị đủ 3 trạng thái: `Đã thanh toán / Thanh toán một phần / Chờ thanh toán`
  - nếu là partial thì hiển thị thêm số còn lại
  - sửa query trạng thái phòng mobile về đúng enum thật

## File dự kiến chỉnh
- `src/hooks/useBookingStats.ts`
- `src/hooks/useRevenueReport.ts`
- `src/components/dashboard/owner/OwnerDashboard.tsx`
- `src/components/dashboard/owner/OwnerProfitOverview.tsx`
- `src/components/dashboard/owner/OwnerRevenueOverview.tsx`
- `src/components/dashboard/owner/MobileOwnerDashboard.tsx`
- `src/components/dashboard/owner/OwnerSmartAlerts.tsx`
- `src/components/dashboard/MobileDashboard.tsx`
- migration DB cho `get_monthly_expenses`

## Kết quả mong đợi
- “Đã thu hôm nay” khớp tiền thực nhận
- Dropdown thời gian đổi tới đâu, widget liên quan đổi đúng tới đó
- Biểu đồ chi phí không còn dư tháng
- Cảnh báo không lẫn dữ liệu khách sạn/tenant khác
- Badge thanh toán và trạng thái phòng hiển thị đúng nghiệp vụ

## Chi tiết kỹ thuật
```text
Nguồn dữ liệu chuẩn:
- Đã thu hôm nay     = SUM(booking_payments.amount) đã completed trong ngày
- Chờ thanh toán     = SUM(MAX(total_amount - amount_paid, 0))
- Xu hướng doanh thu = tính theo tiền thực thu, không chỉ booking fully paid
- Preset 1m/3m/6m/12m = đúng số tháng bao gồm tháng hiện tại, không dư 1 tháng
```
