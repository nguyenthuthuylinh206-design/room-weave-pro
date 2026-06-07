## Vấn đề

Khi bấm "Khách lấy HĐVAT" trong `PrintReceiptDialog`, hiện chỉ có **1 ô email kế toán** — thiếu các trường bắt buộc cho HĐVAT:
- Tên công ty
- Mã số thuế
- Địa chỉ công ty

Trong khi đó, component `src/components/invoices/VatRequestForm.tsx` đã có sẵn đầy đủ các trường này (đã tạo ở turn trước) nhưng **chưa được wire vào** `PrintReceiptDialog`.

## Giải pháp

Sửa `src/components/invoices/PrintReceiptDialog.tsx`:

1. **Import** `VatRequestForm` từ `./VatRequestForm`.
2. **Xóa** state cục bộ `accountantEmail`, `isSubmittingVat` và hàm `handleSubmitVatRequest` (cùng block JSX inline form ở dòng 284–326).
3. **Thay** nhánh `showVatRequestForm === true` bằng:
   ```tsx
   <VatRequestForm
     parentInvoiceId={invoice?.id ?? null}
     bookingId={bookingId}
     tenantId={tenantId}
     hotelId={hotelId}
     subtotal={vatEnabled ? totalWithVat : subtotal}
     onSuccess={() => { setShowVatRequestForm(false); onOpenChange(false) }}
     onCancel={() => setShowVatRequestForm(false)}
   />
   ```
4. Giữ nguyên section "Totals" (VAT toggle + tổng cộng) phía trên để kế toán thấy subtotal đang submit.

## Files

- `src/components/invoices/PrintReceiptDialog.tsx` — edit.

Không động DB, không động `VatRequestForm` (đã đúng schema: company_name, guest_tax_code, guest_address, accountant_email).
