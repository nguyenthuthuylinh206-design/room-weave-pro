

## Tính năng Dịch vụ cộng thêm (Extra Services)

### Phân tích hiện trạng
- Hệ thống `items` hiện chỉ hỗ trợ 4 loại: `linen`, `consumable`, `equipment`, `furniture` — tất cả là **vật phẩm vật lý** cần quản lý tồn kho.
- Dịch vụ (massage, spa, đặt xe, thuê xe...) **không có tồn kho**, không cần giặt, không kiểm tra phòng — hoàn toàn khác bản chất.
- `room_bookings` đã có trường `service_charges` và `extra_charges` nhưng chưa có hệ thống ghi chi tiết từng dịch vụ được sử dụng.

### Thiết kế giải pháp

#### 1. Database — Bảng mới `hotel_services` và `booking_service_charges`

**`hotel_services`** — Danh mục dịch vụ của khách sạn:

| Cột | Loại | Mô tả |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| hotel_id | uuid FK | |
| name | text | Tên dịch vụ (Massage, Spa, Thuê xe...) |
| name_en | text | Tên tiếng Anh (tùy chọn) |
| category | enum | `wellness`, `transport`, `food_beverage`, `laundry_extra`, `other` |
| description | text | Mô tả |
| unit | text | Đơn vị (lần, giờ, chuyến, ngày) |
| price | numeric | Giá mặc định |
| is_active | boolean | Đang hoạt động |
| icon | text | Emoji icon |
| sort_order | int | Thứ tự hiển thị |

**`booking_service_charges`** — Ghi nhận dịch vụ sử dụng theo booking:

| Cột | Loại | Mô tả |
|---|---|---|
| id | uuid PK | |
| booking_id | uuid FK → room_bookings | |
| service_id | uuid FK → hotel_services | |
| service_name | text | Tên dịch vụ (snapshot) |
| quantity | int | Số lượng |
| unit_price | numeric | Đơn giá tại thời điểm |
| total_price | numeric | Thành tiền |
| notes | text | Ghi chú |
| created_by | uuid | Người thêm |
| created_at | timestamptz | |

RLS: Cả hai bảng bảo vệ theo `tenant_id`, authenticated only.

#### 2. Quản lý dịch vụ — Tab mới trong /items

Thêm tab **"Dịch vụ"** vào trang `/items` (cùng cấp với tab danh mục hiện tại):
- Danh sách dịch vụ dạng bảng: Tên, Danh mục, Đơn giá, Đơn vị, Trạng thái
- Dialog thêm/sửa dịch vụ
- Filter theo category và trạng thái
- Không hiển thị cột tồn kho (vì dịch vụ không có stock)

#### 3. Thêm dịch vụ vào Booking — Trong RoomBookingDialog

Trong dialog quản lý booking đang ở (RoomBookingDialog), thêm section **"Dịch vụ sử dụng"**:
- Nút "+ Thêm dịch vụ" → mở dialog chọn từ `hotel_services`
- Danh sách dịch vụ đã thêm: tên, SL, đơn giá, thành tiền, nút xóa
- Tổng tiền dịch vụ tự động cộng vào `service_charges` của booking
- Khi checkout, chi tiết dịch vụ hiển thị trong bảng tổng kết

#### 4. Tích hợp Checkout & Báo cáo

- `CheckoutSummaryDialog` / `GroupCheckoutDialog`: Hiển thị chi tiết từng dịch vụ thay vì chỉ 1 dòng "Phí dịch vụ"
- Báo cáo doanh thu: Có thể breakdown doanh thu dịch vụ theo loại

### File thay đổi

| File | Hành động |
|---|---|
| **DB Migration** | Tạo enum `service_category`, bảng `hotel_services`, `booking_service_charges` + RLS |
| `src/types/services.types.ts` | **Mới** — Type definitions |
| `src/hooks/useHotelServices.ts` | **Mới** — CRUD hook cho hotel_services |
| `src/hooks/useBookingServiceCharges.ts` | **Mới** — CRUD hook cho booking_service_charges |
| `src/components/services/ServiceListTab.tsx` | **Mới** — Tab danh sách dịch vụ |
| `src/components/services/ServiceFormDialog.tsx` | **Mới** — Dialog thêm/sửa dịch vụ |
| `src/components/services/BookingServiceCharges.tsx` | **Mới** — Component thêm/hiển thị dịch vụ trong booking |
| `src/pages/items/ItemsPage.tsx` | **Sửa** — Thêm tab "Dịch vụ" |
| `src/components/rooms/RoomBookingDialog.tsx` | **Sửa** — Thêm section dịch vụ sử dụng |
| `src/components/items/MobileItemsPage.tsx` | **Sửa** — Thêm tab dịch vụ trên mobile |

