

## Kế hoạch nâng cấp hệ thống Hóa đơn khách

### Tổng quan
Nâng cấp trang Hóa đơn khách từ hệ thống đơn giản (chỉ tạo + xuất PDF) thành hệ thống quản lý hóa đơn đầy đủ với: chọn kích thước in, xem trước, chỉnh sửa, gửi email, và các tính năng bổ sung.

---

### 1. Xem trước hóa đơn (Invoice Preview Dialog)
- Tạo component `InvoicePreviewDialog.tsx` hiển thị hóa đơn dạng HTML trong dialog lớn (preview trực quan trước khi in/xuất PDF)
- Render cùng template HTML đã có trong `InvoicePDFTemplate.ts` nhưng hiển thị trực tiếp trên màn hình
- Nút hành động: In, Tải PDF, Gửi email, Đóng

### 2. Chọn kích thước giấy in (Paper Size Selector)
- Hỗ trợ các khổ giấy: **A4** (210×297mm), **A5** (148×210mm), **K80** (80mm thermal receipt), **K58** (58mm thermal receipt)
- Cập nhật `generateInvoicePDF` nhận tham số `paperSize` để điều chỉnh width, padding, font-size tương ứng
- K80/K58: Layout thu gọn dạng receipt (1 cột, font nhỏ, không có phần ký tên)
- A5: Thu nhỏ tỷ lệ so với A4
- Dropdown chọn kích thước nằm trong Preview Dialog và khi xuất PDF

### 3. Chỉnh sửa hóa đơn (Edit Invoice)
- Tạo `EditInvoiceDialog.tsx` — tái sử dụng form từ `CreateInvoiceDialog` với prefill từ invoice hiện có
- Chỉ cho phép chỉnh sửa khi status = `draft`; hóa đơn `issued` phải hủy trước mới sửa được
- Thêm menu item "Chỉnh sửa" vào DropdownMenu trong danh sách

### 4. Gửi hóa đơn qua email
- Tạo `SendInvoiceEmailDialog.tsx` với field nhập email (prefill từ `guest_email` của booking nếu có)
- Tạo edge function `send-invoice-email` để:
  - Render HTML hóa đơn server-side
  - Gửi email kèm nội dung hóa đơn (HTML inline)
- Thêm cột `guest_email` vào bảng `guest_invoices` (migration)
- Lưu lịch sử gửi: thêm cột `email_sent_at` vào `guest_invoices`

### 5. Các tính năng bổ sung gợi ý
- **Nhân bản hóa đơn**: Tạo bản sao từ hóa đơn có sẵn (Duplicate)
- **In trực tiếp**: Nút "In" mở `window.print()` với CSS `@media print` phù hợp khổ giấy
- **Xuất Excel danh sách**: Export toàn bộ danh sách hóa đơn ra Excel (đã có `exportToExcel` util)
- **Logo khách sạn trên hóa đơn**: Lấy logo từ cấu hình hotel hiển thị trên header hóa đơn

---

### Chi tiết kỹ thuật

**Files mới:**
- `src/components/invoices/InvoicePreviewDialog.tsx` — Preview + chọn khổ giấy + actions
- `src/components/invoices/EditInvoiceDialog.tsx` — Chỉnh sửa hóa đơn draft
- `src/components/invoices/SendInvoiceEmailDialog.tsx` — Form gửi email
- `src/components/invoices/PaperSizeSelector.tsx` — Dropdown chọn khổ giấy
- `supabase/functions/send-invoice-email/index.ts` — Edge function gửi email

**Files sửa:**
- `src/components/invoices/InvoicePDFTemplate.ts` — Thêm param `paperSize`, tạo các template variant cho A4/A5/K80/K58
- `src/pages/invoices/GuestInvoicesPage.tsx` — Thêm menu items (Xem, Sửa, Gửi email, Nhân bản, In, Export Excel)
- `src/hooks/useGuestInvoices.ts` — Thêm field `guest_email`, `email_sent_at`

**Migration:**
- Thêm cột `guest_email TEXT`, `email_sent_at TIMESTAMPTZ` vào `guest_invoices`

**Khổ giấy — cấu hình:**

```text
A4:  width=794px, padding=40px 50px, font=13px
A5:  width=560px, padding=30px 35px, font=11px
K80: width=302px, padding=8px,      font=10px (receipt layout)
K58: width=218px, padding=6px,      font=9px  (receipt layout)
```

