

## Kết quả kiểm tra nghiệp vụ Hóa đơn

Sau khi review toàn bộ code, tôi phát hiện các vấn đề sau:

---

### Vấn đề 1: GuestInvoice interface thiếu field `guest_email` và `email_sent_at`

Database đã có 2 cột `guest_email` và `email_sent_at`, nhưng interface `GuestInvoice` trong `useGuestInvoices.ts` không khai báo chúng. Các component phải dùng `(invoice as any).guest_email` -- không an toàn, dễ lỗi.

**Sửa**: Thêm `guest_email` và `email_sent_at` vào interface `GuestInvoice`.

---

### Vấn đề 2: Edge function `send-invoice-email` CORS headers không đầy đủ

Headers hiện tại thiếu các header bắt buộc của Supabase client (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`). Điều này có thể gây lỗi CORS khi gọi từ trình duyệt.

**Sửa**: Cập nhật `corsHeaders` trong edge function.

---

### Vấn đề 3: Edge function email không thực sự gửi được

Edge function gọi `supabase.rpc('enqueue_email', ...)` nhưng RPC này chưa tồn tại trong database. Kết quả: email KHÔNG BAO GIỜ được gửi đi -- chỉ cập nhật record `guest_email`/`email_sent_at` rồi trả về success, gây hiểu nhầm cho người dùng.

**Sửa**: Hiện tại ghi nhận lại record email đã gửi là đúng, nhưng cần thông báo rõ cho user rằng cần cấu hình email domain trước khi email thực sự gửi được.

---

### Vấn đề 4: SendInvoiceEmailDialog cập nhật `email_sent_at` 2 lần

Cả edge function VÀ dialog đều update `email_sent_at`. Edge function đã update trong DB, sau đó dialog lại gọi `updateInvoice.mutateAsync({ id, email_sent_at })` -- thừa và dùng `as any`.

**Sửa**: Bỏ lần update thừa trong dialog (edge function đã xử lý), chỉ cần invalidate query.

---

### Vấn đề 5: In (Print) và Xem trước (Preview) hoạt động tốt

Cả 2 nghiệp vụ này code logic đúng:
- Preview render HTML qua `dangerouslySetInnerHTML` với `buildInvoiceHTML`
- Print mở window mới và gọi `window.print()`
- PDF generation dùng html2canvas + jsPDF đúng cách
- Paper size selector hoạt động đúng

Không có lỗi nghiệp vụ ở đây.

---

### Kế hoạch sửa

1. **`src/hooks/useGuestInvoices.ts`**: Thêm `guest_email: string | null` và `email_sent_at: string | null` vào interface `GuestInvoice`

2. **`supabase/functions/send-invoice-email/index.ts`**: Cập nhật CORS headers đầy đủ

3. **`src/components/invoices/SendInvoiceEmailDialog.tsx`**: Bỏ lần update `email_sent_at` thừa, thay bằng `queryClient.invalidateQueries`; sửa bỏ `as any` cast

4. **`src/pages/invoices/GuestInvoicesPage.tsx`**: Bỏ `(inv as any).email_sent_at`, dùng trực tiếp `inv.email_sent_at`

