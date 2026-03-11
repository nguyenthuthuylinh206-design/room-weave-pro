

## Phân tích logic Phase 1 - Các vấn đề cần sửa

### 1. **Guest CRM: Thiếu trigger cập nhật `total_stays`, `total_spent`, `last_stay_date`** 🔴

Migration chỉ tạo bảng `guests` với các cột thống kê nhưng **không có trigger/function** nào tự động cập nhật khi booking checkout. Các cột `total_stays`, `total_spent`, `last_stay_date` sẽ luôn = 0/null.

**Sửa:** Tạo trigger trên `room_bookings` - khi `status` chuyển sang `checked_out`, update `total_stays += 1`, `total_spent += total_amount`, `last_stay_date = check_out_date` cho guest tương ứng.

---

### 2. **Guest CRM: UNIQUE constraint `(tenant_id, phone)` lỗi khi phone = NULL** 🟡

PostgreSQL cho phép nhiều row có `(tenant_id, NULL)` vì `NULL != NULL`. Điều này không gây lỗi nhưng logic code không handle trường hợp guest không có SĐT - `useBookingForm.ts` chỉ upsert khi `guestPhone.trim()` có giá trị, nghĩa là **booking không có SĐT sẽ không tạo guest record**. Đây là thiếu sót cho khách walk-in không cung cấp SĐT.

**Sửa:** Cho phép tạo guest khi chỉ có `guestName` (không yêu cầu phone). Dùng `full_name` + `tenant_id` để tìm kiếm, hoặc luôn tạo guest mới khi không có phone.

---

### 3. **Guest CRM: `useBookingForm.ts` dùng `(b as any).guest_id`** 🟡

Line 568: `bookingsData.forEach(b => (b as any).guest_id = guestId)` - Type assertion bỏ qua type checking. Field `guest_id` đã có trong Supabase types (confirmed từ types.ts) nhưng code vẫn dùng `as any`.

**Sửa:** Thêm `guest_id: null` vào object trong `bookingsData` map function, rồi gán trực tiếp thay vì dùng `as any`.

---

### 4. **Guest Invoices: Không có nút "Tạo hóa đơn" từ booking** 🔴

`GuestInvoicesPage` chỉ hiển thị danh sách hóa đơn đã tạo. **Không có UI nào** để tạo hóa đơn mới - không có `CreateInvoiceDialog`, không có nút trong `BookingDetailPage` hay `CheckoutSummaryDialog`. Người dùng không thể tạo hóa đơn.

**Sửa:** Tạo `CreateInvoiceDialog` component với:
- Nút "Tạo hóa đơn" trong `GuestInvoicesPage` (tạo mới)
- Nút "Xuất hóa đơn" trong `CheckoutSummaryDialog` (pre-fill từ booking data)
- Form cho phép nhập MST, tên công ty, sửa line items

---

### 5. **Guest Invoices: `vat_rate` lưu 0.1 (10%) nhưng PDF hiển thị `vat_rate * 100`** 🟡

DB default `vat_rate = 0.1`. PDF template line 78: `${(invoice.vat_rate * 100).toFixed(0)}%` → hiển thị "10%". Nhưng `useCreateGuestInvoice` hook nhận `vat_rate` từ caller - cần đảm bảo consistency: nếu frontend dùng `10` (phần trăm) thì DB lưu `0.1` (tỷ lệ), hoặc ngược lại. Hiện tại không rõ convention.

**Sửa:** Chuẩn hóa: DB lưu tỷ lệ thập phân (0.1 = 10%), frontend hiển thị %. Thêm comment rõ ràng trong hook.

---

### 6. **Lost & Found: Thiếu chức năng "Xử lý/Hủy" đồ** 🟡

Chỉ có nút "Trả" (claim) cho status `stored`. Không có cách chuyển sang `disposed` (đã hủy bỏ sau thời gian lưu giữ) hoặc `donated`. Cũng thiếu chức năng sửa/xóa item đã đăng ký.

**Sửa:** Thêm dropdown actions cho mỗi item: "Trả đồ", "Xử lý/Hủy bỏ", "Sửa thông tin".

---

### 7. **Lost & Found: Thiếu item_code auto-generate** 🟢

DB có cột `item_code` nhưng code `useCreateLostFoundItem` không generate mã tự động. Mã này hữu ích để dán nhãn lên đồ vật lưu giữ.

**Sửa:** Tạo function tương tự `generate_guest_invoice_number` cho lost found item code (format: LF-YYYYMMDD-XXXX).

---

### 8. **Guest CRM: `GuestDetailPage` không hiển thị id_image (ảnh CCCD)** 🟢

DB có `id_image_url` nhưng detail page không render ảnh giấy tờ tùy thân đã scan.

**Sửa:** Thêm hiển thị ảnh CCCD/Passport trong phần thông tin khách.

---

### 9. **Invoice PDF: Không hỗ trợ tiếng Việt có dấu** 🔴

`jsPDF` mặc định không hỗ trợ font Unicode/tiếng Việt có dấu. Template dùng text không dấu ("Khach hang", "Hoa don") là workaround nhưng **không chuyên nghiệp** cho hóa đơn chính thức.

**Sửa:** Embed font Unicode (ví dụ Roboto hoặc Open Sans) vào jsPDF, hoặc dùng `html2canvas` + jsPDF để render HTML template có dấu thành PDF.

---

### 10. **Guest Invoices: Thiếu chức năng hủy hóa đơn** 🟡

Chỉ có hiển thị và download PDF. Không có cách đổi status sang `cancelled` hoặc `issued`.

**Sửa:** Thêm actions dropdown trong list: "Xuất chính thức" (draft → issued), "Hủy" (→ cancelled).

---

## Tóm tắt ưu tiên

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Thiếu trigger cập nhật stats guest | 🔴 Critical |
| 4 | Không có UI tạo hóa đơn | 🔴 Critical |
| 9 | PDF không hỗ trợ tiếng Việt có dấu | 🔴 Critical |
| 2 | Guest không phone không được tạo | 🟡 High |
| 3 | Type safety `as any` | 🟡 High |
| 5 | vat_rate convention | 🟡 High |
| 6 | Thiếu dispose/edit lost found | 🟡 High |
| 10 | Thiếu actions hóa đơn | 🟡 High |
| 7 | Lost found item_code | 🟢 Medium |
| 8 | Thiếu hiển thị ảnh CCCD | 🟢 Low |

