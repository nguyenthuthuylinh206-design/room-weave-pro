## Đánh giá hiện trạng `/bookings/:id`

### Vấn đề chung

1. **Header rời rạc**: Tên khách, status, phòng, số đêm tách rời — không có thông tin "tóm tắt" quan trọng (tổng tiền, còn nợ, hành động nhanh)
2. **Tabs dùng icons** — vi phạm chuẩn "Minimalist Enterprise SaaS" của dự án (no icons in tabs)
3. **Card style** — dùng `Card` thay vì `border rounded-lg` chuẩn dự án
4. **Background màu** cho Check-in/Check-out (`bg-blue-50`, `bg-orange-50`) — vi phạm "no colored backgrounds, only semantic text colors"

---

### Tab 1: Thông tin — **THIẾU**

- ❌ Không có **mã booking** (rất cần để tra cứu, in hóa đơn)
- ❌ Không có **giấy tờ tùy thân** đã scan (CCCD/Passport) — đã có trong DB nhưng không hiển thị
- ❌ Không hiển thị **địa chỉ khách**, **quốc tịch**
- ❌ Không hiển thị **booking source** (Walk-in/Booking.com/Agoda...)
- ❌ Không hiển thị **booking type** (Daily/Hourly/Monthly)
- ❌ Không hiển thị **thời gian đặt phòng** (created_at), **người tạo**
- ❌ Không có **ảnh giấy tờ thumbnails**
- ❌ Số khách chỉ là số — thiếu adult/children breakdown nếu có
- ❌ Không có **lịch sử lưu trú** (CRM link nếu khách quay lại)

### Tab 2: Đồ dùng — **THIẾU**

- ❌ Không có **filter/search** khi danh sách dài
- ❌ Không **link sang phiên kiểm tra phòng** (room_check_session) tương ứng
- ❌ Không phân biệt rõ **đồ tiêu hao có tính phí vs miễn phí** (nước suối free vs minibar)

### Tab 3: Vấn đề — **THIẾU**

- ❌ Không hiển thị **chi phí đền bù** (`damage_charges`) — quan trọng nhất
- ❌ Không có **ảnh đồ hỏng/mất** (nếu có upload)
- ❌ Không **link sang Maintenance request** nếu vấn đề đã chuyển thành yêu cầu sửa chữa
- ❌ Không có **người báo cáo** (staff name) cho từng issue
- ❌ Không hiển thị **tên item cụ thể** bị hỏng/mất — chỉ thấy số lượng tổng

### Tab 4: Thanh toán — **THIẾU**

- ❌ Không có **lịch sử giao dịch** (`booking_payments`) — ai thu, lúc nào, phương thức gì
- ❌ Không hiển thị **damage_charges** trong tổng cộng (đã có cột trong DB nhưng không cộng vào)
- ❌ Không có **nút thao tác**: "Thu tiền", "Hoàn tiền", "Tạo QR thanh toán", "In hóa đơn", "Gửi email hóa đơn"
- ❌ Không có **link tải/xem hóa đơn PDF** (`guest_invoices`)
- ❌ Không hiển thị **invoice number** đã tạo
- ❌ Service charges chỉ hiện tổng — thiếu **breakdown từng dịch vụ** (đã có `BookingServiceCharges` component)
- ❌ Khi `paid_status = partial`, không nổi bật số **còn nợ**

---

## Đề xuất cải tiến

### A. Header gọn — Sticky Summary Bar

```
[←] TRẦN THỊ THANH HOAN  #BK-2026-0419-P101  [Đã trả phòng]
    P101 • Standard • 1 đêm • 19→20/04/2026
                                    Tổng: 850.000 ₫  •  Đã thu đủ ✓
                              [In HĐ] [Chỉnh sửa]
```

### B. Tabs phẳng, không icon, có badge số

```
Thông tin   Đồ dùng (12)   Vấn đề (2)   Thanh toán (Đã thu)
```

### C. Tab Thông tin — bố cục 2 cột chặt chẽ

- **Cột trái**: Khách hàng (full info + giấy tờ scan thumbnail có click xem) + Lịch sử lưu trú
- **Cột phải**: Phòng & Thời gian (KHÔNG dùng background xanh/cam, dùng border + text-blue-600/text-orange-600) + Booking metadata (mã, nguồn, loại, người tạo, ngày tạo)
- **Hàng dưới**: Ghi chú (full width)

### D. Tab Đồ dùng — gộp 2 card hiện có + thêm

- Section 1: **Phụ thu Minibar/Dịch vụ** (giữ ChargeableConsumablesCard) — nổi bật vì liên quan tiền
- Section 2: **Đồ tiêu hao tiêu chuẩn** (giữ BookingConsumablesCard)
- Section 3 mới: **Dịch vụ cộng thêm** (BookingServiceCharges read-only)
- Thêm link "Xem phiên kiểm tra phòng →"

### E. Tab Vấn đề — bổ sung chi phí + chi tiết item

- Card tóm tắt: Đồ hỏng / Đồ mất / **Chi phí đền bù** (3 cột thay vì 2)
- Timeline: Mỗi issue hiện **tên item cụ thể** + **người báo cáo** + **link maintenance request** nếu có
- Empty state: gọn hơn, bỏ icon tròn xanh lớn

### F. Tab Thanh toán — thêm action + lịch sử

- Giữ breakdown hiện tại, **bổ sung damage_charges** vào section "Phụ thu"
- Thêm **section "Lịch sử giao dịch"** — từng lần thu (deposit, partial, final) với phương thức + người thu + thời gian
- Thêm **section "Hóa đơn"** — link xem/tải PDF nếu đã phát hành
- **Action buttons sticky bottom**: `[Thu tiền]` `[Tạo QR]` `[In hóa đơn]` `[Gửi email]` `[Hoàn tiền]` (theo trạng thái)
- Highlight số "Còn phải thu" lớn + đỏ khi >0

---

## Files cần thay đổi


| File                                                | Thay đổi                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/pages/bookings/BookingDetailPage.tsx`          | Rewrite — sticky header, tab badges, bố cục mới, bỏ Card → border, bỏ icon tabs, bỏ bg màu |
| `src/components/bookings/BookingIssuesCard.tsx`     | Thêm cột chi phí đền bù, tên item, người báo cáo, link maintenance                         |
| `src/components/bookings/BookingPaymentHistory.tsx` | **MỚI** — list `booking_payments`                                                          |
| `src/components/bookings/BookingDocumentsCard.tsx`  | **MỚI** — hiển thị ảnh giấy tờ scan                                                        |
| `src/components/bookings/BookingMetadataCard.tsx`   | **MỚI** — mã BK, nguồn, loại, người tạo                                                    |
| `src/components/bookings/BookingActionBar.tsx`      | **MỚI** — Thu tiền/QR/In/Email/Hoàn tiền                                                   |
| `src/hooks/useBookingPayments.ts`                   | **MỚI** (nếu chưa có) — query `booking_payments`                                           |
| `src/hooks/useGuestStayHistory.ts`                  | **MỚI** — query lịch sử lưu trú theo phone/guest_id                                        |


---

## Câu hỏi xác nhận

1. **Phạm vi cải tiến**:
  - A: Làm **toàn bộ** 4 tabs + header + sticky action bar (lớn, ~8 file)
    &nbsp;
2. **Action buttons trong tab Thanh toán** — bạn muốn có những nút nào?
  &nbsp;
  - B: Cơ bản: Thu tiền, In hóa đơn
    &nbsp;
3. **Hiển thị giấy tờ tùy thân (CCCD scan)**:
  - B: Không cần — bảo mật
4. **Lịch sử giao dịch & lịch sử lưu trú**:
  - A: Có cả hai
    &nbsp;