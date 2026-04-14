

## Sửa lỗi hiển thị sai loại kiểm tra trên RoomGrid

### Nguyên nhân

Khi nhân viên bấm nút "Kiểm tra" từ trang Phòng, URL không có `?type=`, nên session luôn tạo với `check_type = 'daily'`. Dù nhân viên chọn "Checkout" ở bước 1, session **không bao giờ được cập nhật** → RoomGrid hiển thị sai "đang kiểm tra Đầu ngày".

### Kế hoạch sửa

**1. Thêm hàm `updateSessionCheckType` vào `useRoomCheckSession.ts`**
- Hàm update `check_type` trong bảng `room_check_sessions` khi user thay đổi loại kiểm tra ở step 1

**2. Cập nhật `RoomCheckPage.tsx`**
- Khi `watchedCheckType` thay đổi (user chọn loại khác ở step 1), gọi `updateSessionCheckType` để đồng bộ session với lựa chọn thực tế
- Đảm bảo khi navigate từ CheckoutInspectionBanner (đã có `?type=checkout`) thì session tạo đúng từ đầu (đã OK)

### Kết quả
- RoomGrid hiển thị đúng: "đang kiểm tra Checkout" khi nhân viên chọn checkout
- Realtime cập nhật ngay khi nhân viên đổi loại kiểm tra

