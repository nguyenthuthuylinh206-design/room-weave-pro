

## Mục tiêu

Biến tab **Vấn đề** thành một sổ ghi nhận sự cố thực tế: từng món bị hỏng/mất, **nguyên nhân**, **ai gây ra**, **quyết định xử lý** (thu khách / đền bù / miễn phí / bảo hành), và **liên kết sang phụ thu** trong Thanh toán.

## Hiện trạng cần sửa

1. `BookingIssuesCard` đang sum `items_damaged`/`items_lost` như **number** nhưng thực tế DB là **JSONB array** — đếm sai (luôn ra 0 hoặc NaN).
2. Mỗi `room_checks.items_damaged` đã có sẵn: `item_name`, `quantity`, `damage_type` (repairable/replacement_needed), `damage_cost`, `item_code`. **CHƯA hiển thị**.
3. Không thấy **nguyên nhân** (reason), **ai báo cáo** (checked_by → user name), **ảnh** (photos[]), **trạng thái xử lý** (đã thu khách / miễn / chuyển bảo trì).
4. Không có cách **thêm/sửa ghi chú nguyên nhân** trực tiếp trên trang Booking — phải mở dialog chỉnh sửa.
5. `damage_charges` & `damage_notes` ở booking-level rời rạc với từng item trong `room_checks`.

## Thiết kế mới — Tab Vấn đề

### 1. Header tóm tắt (giữ 3 ô — sửa logic đếm)

```
ĐỒ HỎNG: 1 món     ĐỒ MẤT: 0     PHỤ THU: 350.000 ₫
```
Đếm `length` của array thay vì sum giá trị JSONB.

### 2. Danh sách sự cố — mỗi item là 1 hàng chi tiết

Duyệt qua tất cả `room_checks` trong khoảng booking, **flatten** từng item trong `items_damaged` + `items_lost` thành 1 dòng:

```
┌─────────────────────────────────────────────────────────────┐
│ Ấm đun nước (×1)              [HỎNG] [Cần thay mới]         │
│ 19/04 10:27 • Checkout • Người báo: Nguyễn Văn A            │
│ Nguyên nhân: [_________________________] [Lưu]              │
│ Xử lý: ● Thu khách 350.000₫  ○ Miễn  ○ Bảo hành/Nội bộ      │
│ [📷 1 ảnh]                            → Đã thêm vào phụ thu │
└─────────────────────────────────────────────────────────────┘
```

**Thao tác inline:**
- **Nguyên nhân** (reason): textarea ngắn, lưu vào `room_checks.items_damaged[i].reason` (cập nhật JSONB) — KHÔNG cần migration.
- **Quyết định xử lý** (3 lựa chọn): `charge_guest` / `waive` / `internal` — lưu vào `items_damaged[i].resolution` (JSONB).
- **Ảnh**: hiển thị thumbnails từ `room_checks.photos[]` (nếu có), click mở lightbox.
- **Người báo cáo**: join `checked_by` → `users.full_name`.

### 3. Liên kết Thanh toán

- Khi resolution = `charge_guest` → tổng `damage_charges` của booking phải khớp với sum `damage_cost × quantity` của các item đã chọn thu.
- Hiển thị badge "→ Đã thêm vào phụ thu" hoặc "⚠ Chưa cộng vào hóa đơn" nếu lệch.
- Nút "Đồng bộ phụ thu" cập nhật `room_bookings.damage_charges` + `damage_items` + `total_amount`.

### 4. Ghi chú thiệt hại tổng (giữ nguyên)

Vẫn hiển thị `booking.damage_notes` ở dưới — dành cho note tổng (không gắn 1 item cụ thể).

### 5. Empty state — gọn

Bỏ icon tròn xanh lớn, dùng 1 dòng text-muted-foreground: "Không có vấn đề nào được ghi nhận trong thời gian khách lưu trú."

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/bookings/BookingIssuesCard.tsx` | Rewrite — flatten items, render per-item card với reason/resolution/photos, fix logic đếm |
| `src/hooks/useBookingConsumables.ts` | `useBookingIssues`: trả thêm `checked_by_name` (join users), parse JSONB chính xác |
| `src/hooks/useBookingIssues.ts` | **MỚI** — hook riêng `useUpdateRoomCheckItem` để update reason/resolution trong JSONB array |
| `src/components/bookings/IssueItemRow.tsx` | **MỚI** — component 1 dòng sự cố với edit reason + radio resolution + ảnh |
| `src/pages/bookings/BookingDetailPage.tsx` | Truyền thêm `bookingId`, `damageItems` (parsed từ booking.damage_items) vào `BookingIssuesCard` để hiển thị badge đồng bộ |

## Schema DB

**Không cần migration** — tận dụng JSONB sẵn có:
- `room_checks.items_damaged[i]` thêm field `reason: string` và `resolution: 'charge_guest'|'waive'|'internal'` (JSONB tự do).
- `room_bookings.damage_charges` + `damage_items` + `damage_notes` đã có sẵn.

## Câu hỏi xác nhận

1. **Khi đổi "Quyết định xử lý" sang `charge_guest`**:
   - A: **Tự động** cộng vào `booking.damage_charges` + `total_amount` ngay
   - B: Chỉ ghi nhận, nút "Đồng bộ phụ thu" thủ công sau khi review xong tất cả
   - C: Hiển thị cảnh báo "Cần đồng bộ" nhưng KHÔNG động vào booking đã trả phòng (vì đã thu tiền rồi)

2. **Booking đã `paid_status = paid`** (đã thanh toán xong) mà phát sinh hỏng sau:
   - A: Chặn — chỉ cho ghi nhận, không sửa được damage_charges
   - B: Cho phép tạo "Phụ thu bổ sung" → tăng `total_amount`, đẩy về `partial`
   - C: Tách thành booking phụ phí riêng (phức tạp — bỏ qua giai đoạn này)

