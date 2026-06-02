## Mục tiêu
Khi trong **Quy tắc mùa giá** chọn kiểu **Đặt giá tuyệt đối** với giá ví dụ `2.500.000 ₫`, giá hiển thị ở **Quản lý phòng** và giá dùng khi **tạo đặt phòng** phải lấy `2.500.000 ₫`, không lấy giá mặc định `20.000.000 ₫`.

## Phát hiện hiện tại
- **Có thể reuse**
  - `resolve_daily_prices_bulk` đã là single source để tính giá ngày cho grid và sơ đồ phòng.
  - `useTodayPricesByHotel` đã dùng RPC này để hiển thị giá hôm nay ở `RoomFloorMapView` và `RoomTable`.
  - `seasonal_rate_overrides.adjust_type = 'set_rate'` đã có sẵn để biểu diễn giá tuyệt đối.
- **Cần refactor/fix**
  - UI `SeasonalRulesPage` đang cho chọn cả `mode` và `adjust_type`, dễ tạo sai tổ hợp; với “giá theo ngày tuyệt đối” phải tự hiểu là `mode='overwrite'` + `adjust_type='set_rate'`.
  - Sau khi lưu/xóa mùa giá, cache `today-prices-by-hotel`, `resolved-daily-prices`, `pricing-health` chưa được invalidate nên màn Quản lý phòng có thể vẫn hiển thị giá mặc định cũ.
  - RPC `calculate_booking_price` dùng khi tạo đặt phòng đang xử lý `percent` trong `overwrite` sai công thức và chưa thống nhất hoàn toàn với resolver giá ngày.
- **Cần thêm mới**
  - Migration vá RPC `calculate_booking_price` để `set_rate` luôn là giá tuyệt đối theo đơn vị ngày/đêm; ví dụ Standard mặc định 20.000.000, mùa set 2.500.000 thì tổng 1 đêm = 2.500.000.
  - UI copy rõ hơn: “Đặt giá mùa” thay vì để người dùng phải hiểu “Ghi đè + Đặt giá tuyệt đối”.
- **Rủi ro migration**
  - Không tạo bảng mới, không đổi schema, chỉ replace function hiện có nên rủi ro thấp.
  - Cần giữ tương thích với `fixed_amount` và `percent` hiện tại để không làm hỏng quy tắc cũ.

## Kế hoạch triển khai

### A. Kiến trúc / logic nghiệp vụ
- Chuẩn hóa nghĩa của quy tắc mùa:
  - `set_rate`: đặt giá cuối cùng tuyệt đối cho mỗi ngày/đêm.
  - `fixed_amount`: cộng/trừ số tiền vào giá hiện tại nếu `add_on`; nếu `overwrite` thì xem như đặt giá tuyệt đối để giữ tương thích dữ liệu cũ.
  - `percent`: tăng/giảm theo phần trăm dựa trên giá nền.
- Quy tắc ngày cụ thể trong `rate_plan_daily_prices` vẫn ưu tiên cao nhất; nếu có override theo ngày thì nó thắng mùa giá.

### B. Schema / migration
- Thêm migration thay thế RPC `calculate_booking_price`:
  - Sửa `overwrite + set_rate` trả đúng `adjust_value * số_đêm`.
  - Sửa `overwrite + percent` thành `giá nền * (1 + %/100)` thay vì chỉ lấy phần trăm.
  - Giữ `GRANT EXECUTE` hiện có cho người dùng đã đăng nhập và service role.
- Không thêm bảng/cột mới.

### C. API / RPC / server actions
- Giữ `resolve_daily_prices_bulk` làm chuẩn cho giá hiển thị.
- Đồng bộ logic trong `calculate_booking_price` để đặt phòng không lệch với màn giá.

### D. UI screens / components
- Sửa `SeasonalRulesPage`:
  - Đổi default form tạo mới sang `mode='overwrite'`, `adjust_type='set_rate'`, nhập giá trị tiền tuyệt đối.
  - Khi chọn “Đặt giá tuyệt đối”, tự khóa/ép mode sang “Ghi đè”.
  - Đổi label mô tả để người dùng hiểu: nhập `2.500.000` nghĩa là giá phòng trong mùa là `2.500.000 ₫`.
- Sửa `useSeasonalRates`:
  - Sau lưu/xóa mùa giá, invalidate thêm `today-prices-by-hotel`, `resolved-daily-prices`, `pricing-health`, `rate-plans`, `daily-prices`.

### E. Permission / role rules
- Không đổi quyền hiện tại.
- Vẫn dựa trên RLS và quyền hiện có của bảng mùa giá.

### F. Test cases
- Thêm test logic thuần cho helper tính giá mùa:
  - Base `20.000.000`, `overwrite + set_rate 2.500.000` → `2.500.000`.
  - Base `20.000.000`, `overwrite + percent 10` → `22.000.000`.
  - Base `20.000.000`, `add_on + fixed_amount -1.000.000` → `19.000.000`.
- Nếu build mode cho phép, chạy test liên quan bằng `bunx vitest run` hoặc `lovable-exec test`.

### G. Rollout notes
- Sau migration, giá ở **Quản lý phòng** sẽ cập nhật sau khi cache bị invalidate hoặc refresh.
- Các quy tắc mùa cũ vẫn hoạt động; quy tắc “Đặt giá tuyệt đối” sẽ trở thành cách mặc định để set giá mùa như mong muốn.
- Rollback: revert migration RPC về bản trước và revert thay đổi UI/cache.