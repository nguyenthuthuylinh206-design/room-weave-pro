

## Kế hoạch triển khai Phase 1: Guest CRM + Lost & Found + Xuất hóa đơn

---

### Feature 1: Guest CRM (Quản lý Khách hàng)

**Vấn đề hiện tại:** Thông tin khách (guest_name, guest_phone, guest_email) lưu trực tiếp trong `room_bookings` → không tra cứu được lịch sử, không biết khách VIP, không phát hiện khách quay lại.

**Database:**
- Tạo bảng `guests`:
```text
guests
├── id (uuid PK)
├── tenant_id (FK tenants)
├── full_name (text NOT NULL)
├── phone (text)
├── email (text)
├── id_type (text) - CCCD/Passport/...
├── id_number (text)
├── nationality (text)
├── gender (text)
├── date_of_birth (date)
├── address (text)
├── vip_level (text default 'normal') - normal/silver/gold/vip/blacklist
├── notes (text)
├── total_stays (int default 0)
├── total_spent (numeric default 0)
├── last_stay_date (date)
├── created_at, updated_at
├── UNIQUE(tenant_id, phone) - tránh trùng khách theo SĐT
```
- Thêm cột `guest_id (uuid, nullable, FK guests)` vào `room_bookings`
- Tạo trigger: khi insert/update booking, tự động tìm hoặc tạo guest theo phone → set `guest_id`
- Tạo function cập nhật `total_stays`, `total_spent`, `last_stay_date` khi booking checkout
- RLS: tenant isolation

**Frontend:**
- **Trang danh sách khách** (`/guests`) - bảng với tìm kiếm, filter VIP, sort theo số lần ở
- **Trang chi tiết khách** (`/guests/:id`) - thông tin + lịch sử booking + tổng chi tiêu
- **Auto-suggest trong RoomBookingDialog**: khi nhập SĐT → tự fill thông tin khách từ bảng guests
- **Sidebar**: thêm mục "Khách hàng" trong nhóm Rooms (cạnh Bookings)

**Files mới:**
- `src/pages/guests/GuestsPage.tsx` - danh sách
- `src/pages/guests/GuestDetailPage.tsx` - chi tiết
- `src/hooks/useGuests.ts` - CRUD hooks
- `src/components/guests/GuestAutoComplete.tsx` - auto-suggest component

**Files sửa:**
- `src/components/rooms/RoomBookingDialog.tsx` - thêm auto-suggest khi nhập SĐT
- `src/components/layout/Sidebar.tsx` - thêm nav "Khách hàng"
- `src/App.tsx` - thêm routes
- `src/i18n/locales/*/navigation.json` - thêm key

---

### Feature 2: Lost & Found (Đồ thất lạc)

**Database:**
- Tạo bảng `lost_found_items`:
```text
lost_found_items
├── id (uuid PK)
├── tenant_id (FK tenants)
├── hotel_id (FK hotels)
├── item_name (text NOT NULL)
├── description (text)
├── category (text) - electronics/clothing/documents/jewelry/other
├── found_location (text) - phòng/khu vực
├── room_id (uuid nullable FK rooms)
├── found_date (date NOT NULL)
├── found_by (uuid FK users)
├── photo_urls (jsonb default '[]')
├── status (text default 'stored') - stored/claimed/disposed/donated
├── claimed_by_name (text)
├── claimed_by_phone (text)
├── claimed_date (date)
├── storage_location (text)
├── notes (text)
├── created_at, updated_at
```
- RLS: tenant isolation, staff có thể CRUD

**Frontend:**
- **Trang danh sách** (`/lost-found`) - bảng filter theo status, ngày, phòng
- **Dialog thêm/sửa** - form đăng ký đồ thất lạc, upload ảnh
- **Dialog trả đồ** - ghi nhận thông tin người nhận
- **Sidebar**: thêm mục "Đồ thất lạc" (nhóm Rooms hoặc standalone)

**Files mới:**
- `src/pages/lost-found/LostFoundPage.tsx`
- `src/hooks/useLostFound.ts`
- `src/components/lost-found/LostFoundFormDialog.tsx`
- `src/components/lost-found/ClaimDialog.tsx`

**Files sửa:**
- `src/components/layout/Sidebar.tsx`
- `src/App.tsx`
- `src/i18n/locales/*/navigation.json`

---

### Feature 3: Xuất hóa đơn khách (Guest Invoice / Phiếu thanh toán)

**Lưu ý:** Bảng `invoices` hiện tại dùng cho subscription (gói cước tenant). Cần bảng riêng cho hóa đơn khách hàng.

**Database:**
- Tạo bảng `guest_invoices`:
```text
guest_invoices
├── id (uuid PK)
├── tenant_id (FK tenants)
├── hotel_id (FK hotels)
├── booking_id (FK room_bookings)
├── invoice_number (text UNIQUE) - format: HD-YYYYMMDD-XXXX
├── guest_name, guest_phone, guest_address (text)
├── guest_tax_code (text) - MST cho hóa đơn VAT
├── company_name (text) - tên công ty (nếu xuất VAT)
├── room_number (text)
├── check_in_date, check_out_date (date)
├── line_items (jsonb) - [{description, quantity, unit_price, amount}]
├── subtotal (numeric)
├── vat_rate (numeric default 0.1)
├── vat_amount (numeric)
├── service_fee_rate (numeric)
├── service_fee_amount (numeric)
├── total_amount (numeric)
├── deposit_amount (numeric default 0)
├── amount_paid (numeric default 0)
├── payment_method (text)
├── notes (text)
├── status (text default 'draft') - draft/issued/cancelled
├── issued_at (timestamptz)
├── created_by (uuid FK users)
├── created_at, updated_at
```
- Function `generate_invoice_number(tenant_id)` - tạo số hóa đơn tự tăng theo ngày
- RLS: tenant isolation

**Frontend:**
- **Nút "Xuất hóa đơn"** trong `BookingDetailPage` và `CheckoutSummaryDialog` (sau khi checkout)
- **Dialog tạo hóa đơn** - pre-fill từ booking data, cho phép sửa thông tin công ty/MST
- **Preview & In PDF** - template hóa đơn tiếng Việt chuẩn (dùng jsPDF đã có)
- **Trang quản lý hóa đơn** (`/invoices`) - danh sách, tìm kiếm, filter
- **Chi tiết hóa đơn** - xem lại và in lại

**Template hóa đơn PDF gồm:**
- Header: tên KS, địa chỉ, SĐT, MST
- Thông tin khách: tên, SĐT, CCCD, MST (nếu có)
- Chi tiết: tiền phòng, phụ thu (early/late), dịch vụ, thiệt hại
- Tổng cộng, VAT, phí dịch vụ, tổng thanh toán
- Đã cọc, đã thanh toán, còn lại
- Chữ ký (thu ngân / khách)

**Files mới:**
- `src/pages/invoices/GuestInvoicesPage.tsx`
- `src/components/invoices/CreateInvoiceDialog.tsx`
- `src/components/invoices/InvoicePDFTemplate.ts` - generate PDF
- `src/hooks/useGuestInvoices.ts`

**Files sửa:**
- `src/pages/bookings/BookingDetailPage.tsx` - thêm nút "Xuất hóa đơn"
- `src/components/bookings/CheckoutSummaryDialog.tsx` - thêm nút sau checkout
- `src/components/layout/Sidebar.tsx`
- `src/App.tsx`
- `src/i18n/locales/*/navigation.json`

---

### Thứ tự triển khai đề xuất

1. **Guest CRM** - DB + hooks + pages + auto-suggest trong booking dialog
2. **Lost & Found** - DB + CRUD UI đơn giản
3. **Xuất hóa đơn** - DB + PDF template + tích hợp vào checkout flow

Mỗi feature sẽ thực hiện: migration → hooks → pages/components → routing + navigation → i18n.

