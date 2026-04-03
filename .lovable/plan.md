

## Hiển thị chi tiết dịch vụ & minibar trong Group Checkout

### Vấn đề
Screenshot cho thấy "Dịch vụ sử dụng 1.000.000đ" vẫn hiện dạng chung chung. Có 2 nguyên nhân:

1. **Dữ liệu chi tiết không được fetch được** — `fetchServiceChargeSummary()` trả về mảng rỗng dù `room_bookings.service_charges = 1.000.000`. Fallback tạo 1 item "Dịch vụ (chưa có chi tiết)" → vẫn không có tên cụ thể.
2. **Bảng tổng hợp** (`GroupCheckoutSummary.tsx`) luôn hiện "Dịch vụ sử dụng" chung chung, chưa liệt kê chi tiết.

### Nguyên nhân gốc
Khả năng cao dữ liệu dịch vụ được lưu trực tiếp vào `room_bookings.service_charges` (cộng dồn số tổng) mà **không tạo bản ghi chi tiết** trong `booking_service_charges` hoặc `chargeable_consumptions`. Cần kiểm tra thực tế bằng query database.

### Giải pháp

| # | Thay đổi | Mô tả |
|---|----------|-------|
| 1 | **Query DB kiểm tra** | Truy vấn `booking_service_charges` và `chargeable_consumptions` cho booking đang test để xác nhận dữ liệu có hay không |
| 2 | `useGroupCheckoutCalculations.ts` | Cải thiện fallback: nếu không có chi tiết, thử fetch lại với điều kiện lỏng hơn (bỏ filter `tenant_id` nếu cần). Thêm console.log debug để dễ trace |
| 3 | `GroupCheckoutSummary.tsx` | Thêm prop `allServiceDetails` chứa tổng hợp chi tiết từ tất cả phòng. Hiển thị liệt kê chi tiết thay vì 1 dòng "Dịch vụ sử dụng" |
| 4 | `GroupCheckoutDialog.tsx` | Truyền `allServiceDetails` xuống `GroupCheckoutSummary` bằng cách gom `serviceDetails` từ tất cả `roomCosts` |

### Bước thực hiện

1. **Query database** để kiểm tra dữ liệu thực tế trong `booking_service_charges` và `chargeable_consumptions`
2. Nếu dữ liệu trống → trace ngược flow ghi dịch vụ để tìm chỗ bị thiếu insert
3. Nếu dữ liệu có nhưng query fail → fix điều kiện query trong `fetchServiceChargeSummary`
4. Cập nhật `GroupCheckoutSummary.tsx` để hiển thị chi tiết từng dịch vụ/minibar thay vì tổng gộp
5. Thêm debug logging tạm thời trong `calculateRoomCost` để dễ troubleshoot

### Kết quả mong đợi

Thay vì:
```text
Dịch vụ sử dụng             1.000.000đ
```

Sẽ hiển thị:
```text
Dịch vụ & Minibar
  Dịch vụ  Massage 60 phút        500.000đ
  Minibar  Coca Cola ×2            20.000đ
  Minibar  Bia Tiger ×3            75.000đ
```

