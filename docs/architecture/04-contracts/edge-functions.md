# Edge Functions

28 functions. Nguồn: `supabase/functions/*/index.ts`.

| Name | Lines | Secrets dùng | Mô tả |
|---|---|---|---|
| `beeknoee-models` | 95 | BEEKNOEE_API_KEY | Lists available Beeknoee chat/vision models for the AI Settings page. |
| `check-shift-overtime` | 248 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Get all staff currently on shift with long duration |
| `check-subscription-status` | 170 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | * Cron job to check and update subscription statuses * * This function should be called periodically |
| `cleanup-sessions` | 141 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Handle CORS preflight |
| `create-user` | 444 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Generate random password |
| `dead-stock-digest` | 169 | RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Weekly dead-stock email digest |
| `execute-workflow` | 602 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | * Check if all conditions match the event data |
| `expire-pending-payments` | 105 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Handle CORS preflight requests |
| `get-scan-session` | 58 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Public-facing helper: returns minimal status of a document scan session by id. |
| `laundry-compensation-cron` | 58 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | * Cron edge — chạy 6h/lần. * Gọi RPC mark_batches_compensation_needed để chuyển các batch * `partial |
| `lift-expired-dnd-oos` | 37 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Cron-triggered: gỡ DND/OOS hết hạn bằng cách gọi RPC `lift_expired_dnd_oos`. |
| `mobile-scan-upload` | 297 | BEEKNOEE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | deno.land/std@0.168.0/http/server.ts"; |
| `notify-chargeable` | 184 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN | deno.land/x/hono@v3.4.1/mod.ts' |
| `process-room-check-outbox` | 59 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | esm.sh/@supabase/supabase-js@2.45.0' |
| `reconcile-room-check-side-effects` | 47 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | * Cron — chạy mỗi 6h. * So khớp room_check_issues vs room_check_issue_outbox: * - Đếm dead-letter tr |
| `reset-password-with-otp` | 168 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Validate password strength (must match frontend schema) |
| `scan-guest-document` | 233 | BEEKNOEE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | deno.land/std@0.168.0/http/server.ts"; |
| `send-invoice-email` | 267 | RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | esm.sh/@supabase/supabase-js@2' |
| `send-notification-email` | 462 | RESEND_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | api.resend.com/emails', { |
| `send-password-reset` | 337 | RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | api.resend.com/emails', { |
| `send-push-notification` | 486 | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY | Skip tenant verification for self-notifications |
| `send-telegram-notification` | 303 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN | Filter groups by specific hotel |
| `send-welcome-email` | 355 | RESEND_API_KEY, SUPABASE_URL | api.resend.com/emails', { |
| `sepay-webhook` | 564 | SEPAY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Normalize string: remove special characters and convert to uppercase |
| `sync-sepay-transactions` | 370 | SEPAY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Normalize string: remove special characters and convert to uppercase |
| `telegram-webhook` | 535 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET | When group becomes supergroup |
| `update-user` | 246 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Handle CORS preflight |
| `verify-otp` | 206 | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL | Same hash function as send-password-reset |

## Phân loại theo mục đích


### Payment

- **`sepay-webhook`** — Normalize string: remove special characters and convert to uppercase (secrets: SEPAY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`sync-sepay-transactions`** — Normalize string: remove special characters and convert to uppercase (secrets: SEPAY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`expire-pending-payments`** — Handle CORS preflight requests (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)

### Auth / OTP

- **`reset-password-with-otp`** — Validate password strength (must match frontend schema) (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`verify-otp`** — Same hash function as send-password-reset (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`send-password-reset`** — api.resend.com/emails', { (secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`create-user`** — Generate random password (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`update-user`** — Handle CORS preflight (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)

### Notifications

- **`send-notification-email`** — api.resend.com/emails', { (secrets: RESEND_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`send-push-notification`** — Skip tenant verification for self-notifications (secrets: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY)
- **`send-telegram-notification`** — Filter groups by specific hotel (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN)
- **`send-welcome-email`** — api.resend.com/emails', { (secrets: RESEND_API_KEY, SUPABASE_URL)
- **`send-invoice-email`** — esm.sh/@supabase/supabase-js@2' (secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`telegram-webhook`** — When group becomes supergroup (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET)
- **`notify-chargeable`** — deno.land/x/hono@v3.4.1/mod.ts' (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN)

### Scan / OCR

- **`scan-guest-document`** — deno.land/std@0.168.0/http/server.ts"; (secrets: BEEKNOEE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`mobile-scan-upload`** — deno.land/std@0.168.0/http/server.ts"; (secrets: BEEKNOEE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`get-scan-session`** — Public-facing helper: returns minimal status of a document scan session by id. (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`beeknoee-models`** — Lists available Beeknoee chat/vision models for the AI Settings page. (secrets: BEEKNOEE_API_KEY)

### Cron / Background

- **`check-shift-overtime`** — Get all staff currently on shift with long duration (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`check-subscription-status`** — * Cron job to check and update subscription statuses * * This function should be called periodically (e.g., every hour) to: (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`cleanup-sessions`** — Handle CORS preflight (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`dead-stock-digest`** — Weekly dead-stock email digest (secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`expire-pending-payments`** — Handle CORS preflight requests (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`laundry-compensation-cron`** — * Cron edge — chạy 6h/lần. * Gọi RPC mark_batches_compensation_needed để chuyển các batch * `partially_received` quá hạn sang `compensation_needed`. (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`lift-expired-dnd-oos`** — Cron-triggered: gỡ DND/OOS hết hạn bằng cách gọi RPC `lift_expired_dnd_oos`. (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`process-room-check-outbox`** — esm.sh/@supabase/supabase-js@2.45.0' (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
- **`reconcile-room-check-side-effects`** — * Cron — chạy mỗi 6h. * So khớp room_check_issues vs room_check_issue_outbox: * - Đếm dead-letter trong cửa sổ N giờ (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)

### Workflow

- **`execute-workflow`** — * Check if all conditions match the event data (secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
