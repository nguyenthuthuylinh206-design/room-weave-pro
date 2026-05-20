## Mục tiêu

Chuẩn hoá luồng xuất hoá đơn theo thực tế khách sạn VN:

```
Thanh toán → In bill nhiệt (K80/K58) → In QR "Lấy hoá đơn VAT"
   → Khách quét QR, tự nhập thông tin công ty/email (public form)
   → Hệ thống tự phát hành HĐĐT (e-invoice)
   → Gửi PDF + link tra cứu qua email
```

Hỗ trợ đầy đủ khổ giấy: **A4, A5, K80, K58**, có **QR code** in trực tiếp trên bill nhiệt.

---

## A. Kiến trúc nghiệp vụ

1. **Bill nhiệt (K80/K58)** in tại quầy ngay khi thanh toán — chỉ là phiếu thu, không phải HĐĐT.
2. Trên bill in **QR code** dẫn tới `/i/:claimToken` (public, không cần login).
3. Khách quét → form công khai nhập: Tên công ty, MST, địa chỉ, email nhận hoá đơn. Chỉ điền 1 lần, có TTL 7 ngày.
4. Submit → edge function `issue-einvoice`:
  - Validate MST (regex 10/13 số)
  - Cập nhật `guest_invoices` (tax_code, company_name, email, status='issued')
  - Gọi provider HĐĐT (giai đoạn 1: mock/stub – tạo PDF HĐĐT nội bộ; giai đoạn 2: tích hợp VNPT/Misa/Easyinvoice qua API key)
  - Lưu file vào storage bucket `einvoices/`
  - Gọi `send-transactional-email` với template `einvoice-issued` (link tải PDF + mã tra cứu)
5. Khách nhận email; lễ tân thấy trạng thái invoice chuyển `pending_vat → issued`.

---

## B. Schema / Migration

**Bảng mới `invoice_vat_claims**` (public access qua token):

- `id uuid pk`
- `invoice_id uuid fk guest_invoices`
- `tenant_id uuid`
- `claim_token text unique` (random 24 ký tự, dùng cho URL)
- `expires_at timestamptz` (default now()+7 days)
- `claimed_at timestamptz null`
- `company_name, tax_code, company_address, email text`
- `einvoice_pdf_path text null`
- `einvoice_lookup_code text null`
- `status text` (`pending` | `submitted` | `issued` | `failed` | `expired`)

`**guest_invoices` thêm cột:**

- `vat_claim_status text default 'none'` (`none` | `pending` | `issued`)
- `einvoice_issued_at timestamptz null`
- `einvoice_provider text null`

**RLS:**

- `invoice_vat_claims`: SELECT/UPDATE public bằng `claim_token` (anon role, WHERE expires_at > now() AND claimed_at IS NULL); authenticated full theo `tenant_id`.
- Storage bucket `einvoices` private; signed URL trong email.

**Trigger:** sau khi `payment_transactions` chuyển `completed` cho invoice loại VAT-eligible → auto insert `invoice_vat_claims` row + token.

---

## C. API / RPC / Edge Functions

1. `POST /functions/v1/issue-einvoice` (public, có rate-limit theo token)
  - Body: `{ claim_token, company_name, tax_code, company_address, email }`
  - Zod validate, normalize MST, kiểm tra token còn hạn
  - Atomic: update claim + invoice + enqueue email
2. `GET /functions/v1/lookup-einvoice?code=...` — public tra cứu HĐĐT (giai đoạn 2).
3. Email template `einvoice-issued.tsx` (React Email) trong `_shared/transactional-email-templates/`.
4. Reuse `send-transactional-email`.

---

## D. UI / Components

### D1. Refactor `InvoicePDFTemplate.ts`

- Tách thành 4 builder rõ ràng: `buildA4Html`, `buildA5Html`, `buildK80Html`, `buildK58Html`.
- Mỗi builder nhận thêm `qrPayload?: { url: string; label: string }`.
- Khổ nhiệt (K80/K58): chèn block QR cuối bill (canvas inline SVG `qrcode` lib đã có sẵn) + dòng *"Quét mã để lấy hoá đơn VAT"*.
- A4/A5: thêm QR nhỏ góc dưới phải.
- Fix giãn dòng / wrap cho tên dài trên K58.
- `printInvoice`: thêm `@page { size: 80mm auto; margin: 2mm }` cho K80, tương tự K58, giữ A4/A5 chuẩn.

### D2. `InvoicePreviewDialog.tsx`

- Thêm tab/segment **"In bill thanh toán"** vs **"Hoá đơn VAT điện tử"** (khi đã issued).
- Hiển thị trạng thái claim VAT: badge `Chưa lấy VAT / Khách đang nhập / Đã phát hành`.
- Nút **"In lại QR lấy VAT"** (in một mảnh K80 chỉ có QR + hướng dẫn).

### D3. Trang public `src/pages/public/InvoiceVatClaimPage.tsx`

- Route `/i/:token` (no auth, mobile-first).
- Form Zod: company_name, tax_code (10/13 số), company_address, email.
- Sau submit: màn hình "Đã gửi, hoá đơn sẽ tới email trong vài phút".
- Token hết hạn / đã dùng: trạng thái rõ ràng, có CTA gọi lễ tân.

### D4. `GuestInvoicesPage.tsx`

- Thêm cột **VAT** (badge trạng thái), filter "Chưa lấy VAT".
- Action menu: **Copy link VAT**, **In lại QR**, **Resend email**.

---

## E. Permission / Role

- Lễ tân/Manager: in bill, in lại QR, resend email.
- Owner/Manager: cấu hình provider HĐĐT trong `/settings/einvoice` (giai đoạn 2).
- Public anon: chỉ thao tác qua claim_token hợp lệ.

---

## F. Test cases

- Unit: `parseTaxCode`, builder HTML từng khổ, snapshot QR payload.
- Edge function: token hết hạn, MST sai, double-submit, email suppressed.
- E2E: thanh toán → in K80 có QR → mở `/i/:token` mobile → submit → invoice status = issued → email log có row `sent`.

---

## G. Rollout

1. **Phase 1 (PR1)**: refactor builder 4 khổ + QR + print CSS chuẩn — không đụng DB.
2. **Phase 2 (PR2)**: migration `invoice_vat_claims`, edge function `issue-einvoice` (stub provider — tự render PDF HĐĐT từ template A5), public claim page, email template.
3. **Phase 3 (PR3)**: tích hợp provider thật (VNPT/Misa) qua secret + settings page.
4. Feature flag `settings.einvoice.enabled` per tenant; mặc định OFF, bật khi tenant cấu hình xong.
5. Bump APP_VERSION + changelog mỗi PR.

---

## Câu hỏi cần xác nhận trước khi code

1. **Provider HĐĐT**: tích hợp luôn 
2. **QR target**: dùng domain hiện tại `roomqc.com/i/:token` hay subdomain riêng?
3. **Khách bắt buộc nhập email** hay cho phép chỉ MST + nhận PDF tải về luôn trên trình duyệt?
4. **Bill nhiệt mặc định khổ nào** (K80 phổ biến nhất) — để set default khi bấm "In bill"?

Trả lời 4 câu trên rồi mình bắt tay vào Phase 1 ngay.