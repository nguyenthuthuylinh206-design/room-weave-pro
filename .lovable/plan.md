
## Bối cảnh

Bill trong ảnh có 2 nhóm vấn đề: **(A) Bug tính toán hiển thị**, **(B) Thiếu thông tin nghiệp vụ chuẩn KS Việt Nam**.

## A. Bug nghiêm trọng cần sửa ngay

### 1. Hiển thị thuế suất sai 100 lần ("VAT 800%", "Phí DV 500%")
- `DEFAULT_PRICING_RULES` (src/lib/bookingCalculations.ts:46-47) và booking wizard lưu rate dạng **integer phần trăm** (8, 5).
- Nhưng `InvoicePDFTemplate.ts:120-121, 191-192`, `EditInvoiceDialog`, `CreateInvoiceDialog`, `send-invoice-email/index.ts:168` lại assume **decimal** (0.08) và làm `rate * 100`.
- Hệ quả: 8 × 100 = 800%. Số tiền VAT thì đúng vì đã lưu sẵn `vat_amount`.

**Fix**: chuẩn hoá 1 quy ước duy nhất — đề xuất **giữ integer percent** (vì DB hiện có dữ liệu kiểu này và booking UI dùng vậy):
- Sửa `InvoicePDFTemplate.ts` (K58/K80/A5/A4) và `send-invoice-email`: bỏ `* 100`, render `${invoice.vat_rate}%`.
- Sửa `EditInvoiceDialog.tsx` và `CreateInvoiceDialog.tsx`:
  - default `vat_rate: 10` thay `0.1`, `service_fee_rate: 5` thay `0.05`.
  - `vatAmount = subtotal * form.vat_rate / 100`.
  - Input ô % không cần chia 100.
- Thêm helper `normalizeRate(r)` tạm thời: nếu `r < 1` thì coi là decimal cũ và `r*100`, để không vỡ các invoice cũ đã lưu rate=0.1.

### 2. Chênh "Tạm tính 58.800.000" vs line item 60.200.000
Chênh đúng 1 đêm × 1.4M. Cần verify: subtotal đang trừ đêm checkout hay deposit? `useBookingForm.ts:491` tính subtotal từ `state.subtotal` nhưng line item lại in `nights × price`. Sẽ kiểm tra trong implement và đồng bộ: line item phải khớp subtotal (đúng số đêm tính tiền theo policy đêm cuối/đêm đầu).

## B. Bổ sung nghiệp vụ KS Việt Nam (bill nhiệt K80)

Header hiện chỉ ghi "KHÁCH SẠN". Cần đọc từ `hotels` table và đổ vào template:
- Tên KS (in đậm, cỡ lớn)
- Địa chỉ
- Điện thoại / hotline
- MST (nếu có) — để khách check cross trước khi điền form VAT
- Logo tuỳ chọn (base64 hoặc bỏ qua)

Body cần thêm:
- **Mã booking / số phòng / số khách / số đêm** rõ ràng.
- **Ngày nhận – ngày trả** (dd/MM/yy HH:mm).
- **Chi tiết dịch vụ**: hiện chỉ in "Tiền phòng". Cần render các nhóm từ `line_items` (minibar, giặt ủi, phụ thu sớm/muộn, dịch vụ extra) theo group.
- **Giảm giá / cọc** thành dòng riêng (nếu có).
- **Phương thức thanh toán**: Tiền mặt / Chuyển khoản / Thẻ — đọc `payment_method`.
- **Thu ngân / Ca**: lấy `created_by` → tên nhân viên; ca trực hiện tại.
- **Số tiền đã thu / Còn lại / Tiền thừa trả khách**.

Footer:
- "Cảm ơn quý khách. Hẹn gặp lại!"
- Dòng nhỏ: "Quét mã để lấy hoá đơn GTGT điện tử trong vòng 7 ngày."
- URL ngắn dạng `roomqc.com/i/XXXX` dưới QR để khách không scan được vẫn gõ tay được.
- Số bill + thời gian in + version app.

## C. Đa khổ giấy — đảm bảo nhất quán

Cùng 1 hàm dựng data (`buildInvoiceModel(invoice, hotel, staff)`) → 4 renderer K58/K80/A5/A4 chỉ khác CSS/layout. Hiện 4 renderer copy logic riêng dễ lệch. Refactor:
- `buildInvoiceModel()`: trả về object đã chuẩn hoá (rate %, các dòng, totals, footer text).
- 4 builder chỉ format HTML.

## D. QR lấy VAT — chỉnh nhỏ

- Slip QR (`printVatQrSlip`) phải kèm **tên KS + số bill** để khách không nhầm khi quét bill của KS khác.
- TTL 7 ngày — hiển thị "Hạn lấy HĐ: dd/MM/yyyy" dưới QR.

## E. Phạm vi KHÔNG đụng tới

- DB schema invoice giữ nguyên (đã có vat_rate/service_fee_rate).
- Flow public claim `/i/:token` (Phase 2) giữ nguyên.
- Provider HĐĐT stub giữ nguyên (Phase 3 sau).

## File sẽ sửa

- `src/components/invoices/InvoicePDFTemplate.ts` — refactor 4 builders + thêm header KS, footer, dịch vụ, payment, thu ngân, QR slip có tên KS.
- `src/components/invoices/InvoicePreviewDialog.tsx` — truyền `hotel`, `staff` xuống builder.
- `src/components/invoices/EditInvoiceDialog.tsx` + `CreateInvoiceDialog.tsx` — chuẩn hoá rate sang integer %.
- `src/lib/bookingCalculations.ts` — comment lại quy ước rate %.
- `supabase/functions/send-invoice-email/index.ts` — bỏ `* 100`.
- Thêm helper `src/components/invoices/buildInvoiceModel.ts` (mới).
- `src/lib/app-version.ts` + `public/changelog.json` — bump 1.0.37.

## QA checklist

1. Bill cũ (vat_rate=0.08 lưu trước fix) vẫn render đúng "VAT 8%" nhờ `normalizeRate`.
2. Bill mới (vat_rate=8) render "VAT 8%".
3. Tạo invoice mới: số tiền VAT khớp khi nhập 10% → subtotal × 0.1.
4. In K58/K80/A4/A5 đều có: tên KS, MST, địa chỉ, SĐT, thu ngân, payment method, QR + URL text.
5. Email HĐ: % thuế hiển thị đúng.
6. Tổng = Tạm tính + VAT + Phí DV − Giảm giá; Còn lại = Tổng − Đã thu − Cọc.

## Cần xác nhận (1 câu hỏi)

Bạn muốn quy ước rate giữ **integer % (8, 5)** hay đổi hết về **decimal (0.08, 0.05)**? Tôi đề xuất giữ integer % vì DB và booking UI hiện đang dùng vậy, ít rủi ro migrate dữ liệu hơn.
