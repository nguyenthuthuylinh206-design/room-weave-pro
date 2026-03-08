

## Phân tích trải nghiệm Mobile cho nhân viên phòng & nhân viên lễ tân

### Vấn đề phát hiện

#### 1. **Trang Bookings KHÔNG có giao diện mobile** (Nghiêm trọng - Lễ tân)
- `BookingsPage.tsx` (1737 dòng) render **Table 8 cột** trên mobile — không thể sử dụng được
- Không có `isMobile` check, không có `MobileBookingsPage` component
- Lễ tân cần check-in/check-out hàng ngày trên điện thoại nhưng phải thao tác trên bảng desktop thu nhỏ

#### 2. **BottomNav thiếu tab Bookings** (Nghiêm trọng - Lễ tân)
- `MobileBottomNav` chỉ có: Home, Tasks, Phòng, Giặt là, Bảo trì
- **Không có nút Đặt phòng/Bookings** — chức năng chính của lễ tân
- Lễ tân phải vào MobileSidebar (hamburger menu) hoặc biết URL `/bookings` để truy cập

#### 3. **MorePage thiếu Bookings** (Trung bình)
- Trang "Thêm" (`MorePage.tsx`) liệt kê nhiều module nhưng **không có Bookings**
- Lễ tân không có đường đi nào rõ ràng đến trang quản lý đặt phòng

#### 4. **BottomNav dùng cả `MobileBottomNav` và `BottomNav`** (Nhỏ - Confusing)
- `MainLayout` mobile dùng `BottomNav` (không có badges)
- `MobileLayout` dùng `MobileBottomNav` (có badges) nhưng `MobileLayout` **không được dùng trong routing** — tất cả route đều qua `MainLayout`
- Kết quả: Mobile users thấy `BottomNav` (không có pending count badges)

### Kế hoạch fix

#### Bước 1: Tạo `MobileBookingsPage` — giao diện mobile cho Bookings
- Danh sách booking dạng card/row thay vì table
- Mỗi booking hiển thị: tên khách, số phòng, ngày, trạng thái, nút check-in/check-out
- Filter theo status (tabs hoặc horizontal scroll chips)
- Pull-to-refresh
- Tap vào booking → mở RoomBookingDialog (đã có)

#### Bước 2: Cập nhật `BookingsPage` — thêm mobile detection
- Thêm `if (isMobile) return <MobileBookingsPage />` giống pattern các page khác

#### Bước 3: Thay `BottomNav` bằng `MobileBottomNav` trong MainLayout
- `MainLayout` mobile đang dùng `BottomNav` (không badges) → đổi sang `MobileBottomNav` (có badges)
- Hoặc merge logic badges vào `BottomNav`

#### Bước 4: Thêm tab Bookings vào MobileBottomNav
- Thay thế 1 tab ít dùng (ví dụ Maintenance) hoặc thêm "More" tab
- Hoặc: giữ 5 tab nhưng thay đổi cho role lễ tân: Home, Tasks, **Bookings**, Phòng, More

#### Bước 5: Thêm Bookings vào MorePage
- Thêm `{ icon: CalendarDays, label: 'Đặt phòng', path: '/bookings', module: 'bookings', color: 'text-primary' }` vào danh sách modules

### Tóm tắt ưu tiên

| # | Vấn đề | Mức độ | Ai bị ảnh hưởng |
|---|--------|--------|-----------------|
| 1 | BookingsPage không có mobile UI | Nghiêm trọng | Lễ tân |
| 2 | BottomNav thiếu Bookings | Nghiêm trọng | Lễ tân |
| 3 | MainLayout dùng BottomNav thay vì MobileBottomNav | Trung bình | Tất cả mobile |
| 4 | MorePage thiếu Bookings | Nhỏ | Lễ tân |

