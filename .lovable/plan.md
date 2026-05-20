## Chẩn đoán

Nguyên nhân rất rõ trong code hiện tại:

- `InvoicePreviewDialog` luôn tạo QR bằng `buildVatClaimUrl(invoice, tokenData?.token)`.
- Khi `tokenData` chưa kịp tải, hàm `buildVatClaimUrl` đang fallback sang `invoice.id`.
- `invoice.id` **không phải** `claim_token` trong bảng `invoice_vat_claims`, nên khi khách quét `/i/{invoice.id}`, RPC public trả `not_found` và UI báo: **“Mã QR không hợp lệ hoặc đã hết hạn.”**

Nói ngắn gọn: bill có thể đã in QR quá sớm, QR chứa ID hóa đơn thay vì token VAT thật.

## Kế hoạch sửa

### A. Kiến trúc / logic nghiệp vụ

- QR lấy Thuế GTGT chỉ được in khi có token thật từ `ensure_vat_claim_token`.
- Không bao giờ dùng `invoice.id` làm fallback QR nữa.
- Nếu token chưa sẵn sàng:
  - Preview hiển thị trạng thái “Đang tạo mã QR VAT…”
  - Nút `In`, `PDF`, `In QR VAT` tạm disable hoặc tự đợi token xong rồi mới chạy.
- URL QR chuẩn hóa về domain thật:

```text
https://roomqc.com/i/:claim_token
```

### B. Schema / migration

- Không cần migration mới.
- Bảng/RPC hiện tại đã đủ: `invoice_vat_claims`, `ensure_vat_claim_token`, `get_vat_claim_public`.

### C. API / RPC / server actions

- Reuse `ensure_vat_claim_token`.
- Với các nút in trực tiếp ở danh sách hóa đơn và màn booking, trước khi in sẽ gọi tạo/lấy token thật.
- Không đổi provider HĐĐT, vẫn giữ stub nội bộ.

### D. UI screens / components

Sửa các file:

1. `src/components/invoices/InvoicePDFTemplate.ts`
   - `buildVatClaimUrl` chỉ nhận token thật, không fallback invoice id.
   - QR label in thêm URL ngắn để khách gõ tay.
   - Sửa `remaining = total_amount - (amount_paid + deposit_amount)` theo nghiệp vụ.

2. `src/components/invoices/InvoicePreviewDialog.tsx`
   - Chỉ dựng QR khi `tokenData.token` tồn tại.
   - Disable `In`, `PDF`, `In QR VAT` khi token đang tải.
   - Thêm thông báo nhỏ nếu chưa tạo được QR.
   - Thêm dependency `hotelInfo`/QR đầy đủ để preview rebuild đúng.

3. `src/pages/invoices/GuestInvoicesPage.tsx`
   - Menu `In`/`Tải PDF` phải tạo token trước, truyền `hotelInfo`, mặc định K80.
   - Không gọi `printInvoice(inv)` trần nữa.

4. `src/pages/bookings/BookingDetailPage.tsx`
   - Nút `In hóa đơn` tạo token trước khi in.
   - Mặc định K80, truyền đủ tên KS/địa chỉ/SĐT/MST.

5. `supabase/functions/send-invoice-email/index.ts`
   - Đồng bộ QR URL/token nếu email có QR.
   - Deploy lại function sau khi sửa.

6. `src/lib/app-version.ts`, `public/changelog.json`
   - Bump version để PWA/browser nhận bản mới.

### E. Permission / role rules

- Không thay đổi phân quyền.
- Tạo token vẫn chỉ cho nhân sự cùng tenant qua RPC authenticated.
- Public `/i/:token` chỉ đọc đúng dữ liệu tối thiểu cần cho khách nhập thông tin VAT.

### F. Test cases

Thêm test cho logic template/helper:

- `buildVatClaimUrl(token)` trả `https://roomqc.com/i/{token}`.
- Không token thì không tạo QR URL hợp lệ giả.
- Rate `8` và `0.08` đều render `8%`.
- Cọc được trừ khỏi `Còn lại`.

### G. Rollout notes

- Các QR đã in trước đây bằng `invoice.id` sẽ vẫn không hợp lệ; cần in lại bill/QR VAT sau khi sửa.
- Không có rollback DB.
- Sau khi cập nhật, nếu máy vẫn thấy bill cũ thì cần hard refresh hoặc mở lại PWA để nhận version mới.