

## Đính kèm file PDF hóa đơn trong email

### Vấn đề
- Email hóa đơn hiện tại chỉ hiển thị HTML inline, khách không thể tải file PDF về
- PDF cần đúng chuẩn hóa đơn: có đầy đủ header khách sạn, bảng chi tiết, tổng kết, khối chữ ký

### Giải pháp
Tạo PDF ngay trên trình duyệt (client-side, dùng html2canvas + jsPDF đã hoạt động tốt) → chuyển sang base64 → gửi lên Edge Function → đính kèm vào email qua Resend API.

Lý do chọn cách này: Edge Function (Deno) không có html2canvas/DOM, nên không thể render HTML thành PDF server-side. Client-side đã có sẵn code tạo PDF chuẩn Vietnamese Unicode.

### Thay đổi

**1. Cập nhật `src/components/invoices/InvoicePDFTemplate.ts`**
- Thêm function `generateInvoicePDFBase64()` trả về base64 string thay vì tải file (tái sử dụng logic hiện có, chỉ thay `doc.save()` bằng `doc.output('datauristring')`)

**2. Cập nhật `src/components/invoices/SendInvoiceEmailDialog.tsx`**
- Khi bấm "Gửi email": gọi `generateInvoicePDFBase64()` để tạo PDF trước
- Gửi cả `pdf_base64` và `filename` lên Edge Function cùng với `invoice_id` và `to_email`
- Cần truyền thêm `hotelInfo` prop vào dialog để tạo PDF đúng thông tin khách sạn

**3. Cập nhật `supabase/functions/send-invoice-email/index.ts`**
- Nhận thêm `pdf_base64` và `filename` từ request body
- Gửi qua Resend với `attachments: [{ filename, content: pdf_base64 }]`
- Giữ nguyên HTML email đẹp + thêm dòng "Hóa đơn PDF đính kèm bên dưới"

**4. Cập nhật nơi gọi `SendInvoiceEmailDialog`**
- Truyền thêm `hotelInfo` prop từ `GuestInvoicesPage`

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/invoices/InvoicePDFTemplate.ts` | Thêm `generateInvoicePDFBase64()` |
| `src/components/invoices/SendInvoiceEmailDialog.tsx` | Tạo PDF client-side, gửi base64 lên server |
| `supabase/functions/send-invoice-email/index.ts` | Nhận PDF base64, đính kèm qua Resend attachments |
| `src/pages/invoices/GuestInvoicesPage.tsx` | Truyền `hotelInfo` vào SendInvoiceEmailDialog |

