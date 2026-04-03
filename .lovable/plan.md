
Không phải chỉ do cache. Mình thấy đây là tổ hợp của 3 vấn đề:

1. Cache/query stale thật:
- `App.tsx` đang để `staleTime: 5 phút`
- `refetchOnWindowFocus: false`
- Sau thanh toán/checkout, nhiều query của dashboard chưa được invalidate

2. Logic giữa các widget đang lệch nhau:
- `OwnerRevenueOverview` lấy “Đã thu hôm nay” từ `booking_payments.paid_at`
- `OwnerProfitOverview` lại lấy “Hôm nay” từ `useRevenueReport()` đang lọc theo `room_bookings.check_out_date`
- Vì vậy cùng 1 trang mới có chuyện “Đã thu hôm nay = 1.099.000đ” nhưng “Hôm nay = 0đ”

3. Một số chỗ vẫn tính công nợ sai:
- `useOwnerAlerts()` đang coi mọi booking `payment_status <> 'paid'` là “Chưa thanh toán”
- Nhưng dữ liệu hiện tại có booking `partial` với `remaining_balance = total - deposit - amount_paid = 0`
- `MobileOwnerDashboard` còn công thức cũ, chưa trừ `deposit_amount`

Các phần cần kiểm tra trên trang này

1. Cảnh báo cần chú ý
- Quá hạn checkout
- Chưa thanh toán
- Đồ hỏng/mất
- Tồn kho thấp
- Cần bổ sung gấp

2. Doanh thu & Lợi nhuận
- Doanh thu tháng này
- Chờ thanh toán
- Số booking
- TB/booking
- Biểu đồ doanh thu 6 tháng
- “Tháng trước”
- “Hôm nay”

3. Hoạt động phòng hôm nay
- Tổng phòng
- Đang có khách
- Phòng trống
- Check-in hôm nay
- Check-out hôm nay
- Tỷ lệ lấp đầy
- Danh sách check-in/check-out

4. Doanh thu hôm nay
- Đã thu
- Chờ thanh toán
- Doanh thu dự kiến
- Badge trạng thái `paid / partial / pending`

5. Tổng quan tài chính + biểu đồ chi phí
- Có đang đồng bộ đúng với preset `1m / 3m / 6m / 12m` hay không

Kế hoạch xử lý

1. Chuẩn hóa định nghĩa số liệu dashboard
```text
remaining_balance = max(total_amount - deposit_amount - amount_paid, 0)
today_collected = sum(booking_payments.amount) theo paid_at trong ngày
```

2. Sửa `useOwnerAlerts()`
- thêm `deposit_amount` vào query
- đổi logic “Chưa thanh toán” sang đếm booking có `remaining_balance > 0`
- không dùng riêng `payment_status` để kết luận còn nợ

3. Sửa `useRevenueReport()`
- phần `today` chuyển sang dùng ledger thanh toán thực tế (`booking_payments`)
- giữ logic tháng theo chuẩn đã chốt để không làm lệch card “Doanh thu tháng này”
- rà lại “Tháng trước” và chart để không trộn 2 kiểu dữ liệu khác nhau

4. Sửa `MobileOwnerDashboard`
- select thêm `deposit_amount`
- đổi công thức pending sang `total - paid - deposit`

5. Bổ sung invalidate sau payment/checkout
- trong `useBookingPayments`
- trong `useBookingActions`
- invalidate đầy đủ các query:
```text
booking-stats
today-checkins
today-checkouts
revenue-report
owner-alerts
all-pending-payments
```

6. Đồng bộ filter thời gian
- kiểm tra `OwnerProfitOverview` có đang bỏ qua preset từ `OwnerDashboard` hay không
- nếu có, truyền preset/period xuống để tránh cảm giác “đổi bộ lọc mà số vẫn y nguyên”

Bằng chứng mình đã xác định
- Hôm nay có payment ledger `315.000 + 784.000 = 1.099.000`
- Có 2 booking đang `partial` nhưng số còn nợ thực tế = `0`
- Vì vậy phần “Chưa thanh toán 2” hiện tại là sai logic, không phải chỉ do cache

Kết quả mong đợi sau khi sửa
- Refresh hay không refresh đều ra cùng một số
- “Hôm nay” và “Đã thu hôm nay” không còn vênh nhau
- “Chưa thanh toán” chỉ hiện booking còn nợ thật
- Desktop và mobile dùng cùng công thức công nợ
- Đổi preset thời gian thì toàn bộ block liên quan đổi theo
