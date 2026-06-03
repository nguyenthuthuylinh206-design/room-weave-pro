---
name: E-Invoice Viettel Phase 1
description: Kiến trúc HĐĐT đa nhà cung cấp, Viettel SInvoice; async issue + polling cron; password trong Vault; ký Cloud/USB Token
type: feature
---

# E-Invoice (Hóa đơn điện tử) – Phase 1

## Bảng
- `hotel_einvoice_configs` (per hotel+provider): MST, branch_code, api_username, `api_password_secret_ref` (UUID → Vault), sign_type (cloud|usb_token), environment (sandbox|production), default template/series, cached_token. RLS: Owner only.
- `invoice_templates`: nhiều template/ký hiệu per (hotel,provider). 1 default duy nhất qua partial unique index.
- `hotel_invoices`: idempotent qua `transaction_uuid`; trường `invoice_type` (normal|adjustment|replacement), `parent_invoice_id`, `original_invoice_no`, `original_transaction_uuid`, `adjustment_type` (1/3/5), `viettel_status`, `last_polled_at`, `poll_attempts`. Status: `draft|queued|processing|signing|issued|cancelled|adjusted|replaced|failed`.
- `invoice_files`: PDF/XML/ZIP đính kèm (`einvoice-files` bucket, private).
- `invoice_api_logs`: log mọi call provider, request/response đã redact secret. Owner xem.

## Vault
- `set_einvoice_password(_config_id, _password)`: tạo secret mới trong Vault, cập nhật `api_password_secret_ref`, xóa secret cũ. Chỉ Owner cùng tenant.
- `get_einvoice_password(_config_id)`: chỉ service_role được gọi. Edge function dùng để lấy mật khẩu plain → gọi API Viettel.

## Storage bucket
- `einvoice-files` (private). RLS lọc theo `(storage.foldername(name))[1] = tenant_id`. Đường dẫn: `{tenant_id}/{hotel_id}/{invoice_id}/{invoiceNo}.{pdf|xml}`.

## Edge functions
- `einvoice-test-connection` – Owner: đăng nhập Viettel, lưu `last_test_ok`/`last_test_message`, cache token.
- `einvoice-issue` – Tạo bản ghi `queued→processing` ngay, gọi `createInvoice`. Nếu có `invoiceNo` ngay → `issued`; nếu USB Token / async → `processing` chờ poll.
- `einvoice-poll` – Chạy cron mỗi 2 phút (`einvoice-poll-every-2min`) HOẶC manual `{invoice_id}`. Gọi `searchByTransactionUuid`, max 30 attempts → `failed/poll_timeout`.
- `einvoice-download` – Tải PDF/XML từ Viettel (lazy + cache vào bucket), trả signed URL 10 phút, ghi `invoice_files`.
- `einvoice-cancel` – Owner: gọi `cancelTransactionInvoice` → status `cancelled`.
- `einvoice-list-templates` – Đồng bộ template từ Viettel về `invoice_templates`.

## Shared (`supabase/functions/_shared/einvoice`)
- `types.ts`: `IEInvoiceProvider` interface — `createInvoice`, `searchByTransactionUuid`, `downloadPdf`, `downloadXml`, `cancelInvoice`, `listTemplates`. `redactSecrets()` helper.
- `viettel.ts`: `ViettelInvoiceProvider`. MST gọi API = `tax_code` hoặc `tax_code-branch_code`. Token cache 55 phút, persist vào DB qua `persistCachedToken`.
- `runtime.ts`: `loadConfig` (resolve password Vault), `makeProvider` (factory + log hook), `requireUser`, `jsonResponse`.

## Mở rộng
Provider mới (MISA/VNPT/EasyInvoice) chỉ cần implement `IEInvoiceProvider` và thêm case trong `makeProvider()`. Schema không đổi.

## UI
- `/settings/einvoice` (Owner only): form cấu hình + kiểm tra kết nối + đồng bộ template + danh sách template (đặt mặc định/xóa). Mật khẩu để trống = không đổi.

## Quy tắc
- KHÔNG bao giờ lưu mật khẩu plain trong `hotel_einvoice_configs`; chỉ lưu `api_password_secret_ref`.
- Mọi log call API phải redact `password|token|authorization`.
- UI không được chờ Viettel ký → luôn dùng `einvoice-issue` async, để cron `einvoice-poll` xử lý phần còn lại.
- TemplateCode/InvoiceSeries không hardcode; lấy từ `invoice_templates.is_default` hoặc chỉ định `template_id` khi gọi.
