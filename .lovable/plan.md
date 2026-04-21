

## Tài liệu Engineering bổ sung — phần 2

Tiếp nối tài liệu IA & State Diagrams đã có, soạn 6 chương kỹ thuật chi tiết, dùng **Lovable AI Gateway model `anthropic/claude-sonnet-4-5`** (fallback `openai/gpt-5` nếu gateway không hỗ trợ) cho phần văn xuôi/phân tích, sơ đồ Mermaid + bảng ASCII tự viết để khớp 100% code.

### Output

| File | Vai trò |
|---|---|
| `/mnt/documents/UserFlows-API-DataModel.md` | Bản gốc Markdown, 6 chương, mở được trên GitHub/Notion |
| `/mnt/documents/UserFlows-API-DataModel.pdf` | Bản PDF in được, render Mermaid + bảng dữ liệu |

Hai file **mới**, không đè lên `IA-and-State-Diagrams.md/.pdf` đã có. Bộ tài liệu hoàn chỉnh = phần 1 (IA + State) + phần 2 (Flows + API + Data + Logic + Edge Cases).

### Phạm vi nội dung

**Chương 1 — User Flows (luồng thực tế end-to-end)**

Mỗi flow gồm: persona, trigger, sequence Mermaid, screen-by-screen action, RPC/edge function được gọi, kết quả mong đợi.

1. **Onboarding tenant mới** — `/landing → /auth/signup → email verify → /onboarding → tạo hotel đầu tiên → tạo warehouse → /dashboard`.
2. **Tạo booking walk-in** — `/bookings/new` 5-step Wizard: type/dates → chọn phòng → guest info (+ scan CCCD qua Gemini) → payment → confirm. Gồm OTA branch và group booking.
3. **Check-in** — `/bookings → click booking → perform_checkin RPC → room status vacant→occupied → auto-create checkin_prep task`.
4. **Check-out** — `/bookings → checkout button → kiểm tra inspection → GroupCheckoutDialog (nếu group) → payment (cash/QR) → perform_checkout → room status → cleaning → auto-create cleaning task`.
5. **Staff nhận task** — `/my-tasks → TaskCard "Bắt đầu" → /rooms/:id/check?type=...&resume=true → DefaultOK items check → ChargeableItems → CleaningRequest → Phase1Confirm → Review → submit → task completed`.
6. **Laundry batch** — `/laundry/new → step1 vendor+date → step2 chọn items → step3 confirm → create_laundry_batch_with_items RPC → delivered → /laundry/:id/receive → ready → received → stocked → inventory cập nhật`.
7. **Maintenance request** — Báo lỗi từ room check hoặc thủ công → assign → in_progress → completed (kèm chi phí) → recurring detection.
8. **QR payment khách** — Booking modal → render VietQR → khách quét → SePay webhook → match `invoice_number` → realtime update → UI confirm.
9. **Subscription extend/buy rooms** — `/settings/subscription → tăng phòng/gia hạn → invoice + payment_transaction → QR → SePay webhook → tenants.registered_rooms / subscription_end_date update`.
10. **Distribution route batch** — Tạo route → release → in_progress (nhân viên đi giao theo stops) → completed → close.
11. **Super Admin tenant management** — Login super_admin → `/super-admin/tenants` → tạo/sửa/suspend tenant → reminder gửi mail tự động.

**Chương 2 — Wireframes (giao diện ASCII)**

Wireframe text-based 80-cột cho 12 màn hình quan trọng nhất:
- Dashboard (desktop + mobile)
- BookingsPage table + MobileBookingsPage card
- BookingWizard 5 step
- RoomCheckPage 6 step (kèm DefaultOK list, ReportIssueSheet)
- GroupCheckoutDialog
- LaundryBatchDetail / ReceiveBatch
- MyTasks (StaffTaskRow + TaskCard)
- Settings → Subscription (room slider + QR)
- Super Admin Dashboard

Mỗi wireframe: layout box, vùng chính, component key (Tailwind class chính, h-8/h-9, p-2/p-3), interaction notes, responsive breakpoint.

**Chương 3 — Data Model (ERD chi tiết)**

- ERD tổng (Mermaid `erDiagram`) chia cụm: Tenancy, Hotels & Rooms, Bookings & Guests, Inventory & Items, Laundry, Maintenance, Tasks, Payments & Subscription, Permissions, Workflows, Super Admin.
- Bảng dictionary: cho mỗi table chính (~40 bảng) liệt kê columns (name, type, nullable, default, FK), indexes, RLS policy chính, triggers.
- Quan hệ critical: `tenants ← hotels ← rooms ← room_bookings ← booking_payments / room_checks / housekeeping_tasks / checkout_inspections`.
- Enum reference: `app_role`, `user_level_code`, booking status, batch status, task status, room status, payment status.

**Chương 4 — API Spec (kết nối)**

4.1. **Edge Functions inventory** (22 functions): mỗi function có URL, method, auth (verify_jwt true/false), request schema, response schema, side effects, ví dụ curl.
- `sepay-webhook` (public)
- `create-user` / `update-user` / `reset-password-with-otp` / `send-password-reset` / `verify-otp`
- `scan-guest-document` / `mobile-scan-upload`
- `execute-workflow`
- `send-notification-email` / `send-push-notification` / `send-telegram-notification` / `send-welcome-email` / `send-invoice-email`
- `expire-pending-payments` / `check-shift-overtime` / `check-subscription-status` / `cleanup-sessions` / `sync-sepay-transactions`
- `notify-chargeable` / `telegram-webhook` / `beeknoee-models`

4.2. **Atomic RPCs** (~15): signature, params, return type, validation, idempotency.
- `perform_checkin`, `perform_checkout`, `update_booking_amount_paid`
- `create_laundry_batch_with_items`, `check_and_update_batch_status`, `receive_laundry_batch`
- `has_role`, `has_permission`
- `complete_room_check`, `complete_cleaning_task`
- `assign_task_round_robin`

4.3. **Supabase client patterns**: query với tenant filter mandatory, realtime channel subscribe, storage upload (`guest-documents` public bucket), error mapping qua `mapPostgresError`.

4.4. **External webhooks**: SePay → `/sepay-webhook` (payload schema thật từ SePay docs), Telegram bot.

**Chương 5 — Business Logic (quy tắc nghiệp vụ)**

5.1. **Pricing & Billing**
- Daily/Hourly/Monthly rate calculation; monthly discount 3m/6m/12m = 5/10/15%.
- Subscription pricing 1.000đ/phòng/ngày, min 30 ngày, discount theo thời hạn.
- VAT 8%/10%, service fee, OTA commission, early check-in surcharge formula.
- Group payment distribution: `roomCostsByBooking` proportional split.
- Remaining balance: `total_amount - (amount_paid + deposit_amount)`.

5.2. **Inventory rules**
- Stock deduction: lost/consumed/sent_to_laundry decrease, replaced increase.
- Laundry inventory mirror: `quantity_in_stock ↔ quantity_in_laundry`.
- Minibar double-billing prevention.
- Warehouse prerequisite trước khi tạo item.

5.3. **Permissions**
- Tier hierarchy: Owner > Manager > Staff (tạo user, đổi password).
- 8-action matrix; module-action permission table.
- Hotel-level filter qua `user_hotels`.
- Tenant isolation (`.eq('tenant_id', tenantId)` mandatory).

5.4. **Task & Housekeeping**
- Round-robin assignment chỉ trong on-shift staff.
- Auto-create cleaning task sau checkout.
- Default-OK reverse logic trong room check.
- Auto-resume từ localStorage `room-check-{roomId}`.

5.5. **Subscription enforcement**
- Room limit theo `registered_rooms`.
- Trial → active → past_due → suspended → cancelled.
- Suspended = block toàn bộ trừ /settings/subscription.

**Chương 6 — Edge Cases (xử lý lỗi)**

Bảng 3 cột (Tình huống | Phát hiện | Xử lý) cho ~50 case:

- **Booking conflicts**: 2 user đặt cùng phòng cùng giờ → unique constraint + Vietnamese error qua `mapPostgresError`.
- **Check-in vào phòng occupied/maintenance** → RPC reject, toast lỗi.
- **Payment race condition**: SePay webhook đến trước UI poll → realtime update.
- **Invoice number mismatch**: tolerance ±1.000đ, normalize string.
- **Webhook duplicate** → idempotent qua `transaction_id` unique.
- **Network mất giữa room check** → autosave localStorage, resume khi quay lại.
- **PWA cache stuck** → CacheBuster bump version.
- **Token expired giữa thao tác** → AuthContext refresh + redirect login giữ return URL.
- **Quét CCCD AI fail validation** → 422 error, hiện thông báo, cho phép nhập tay.
- **All Hotels mode + tạo mới** → block với cảnh báo.
- **Suspended tenant** → middleware redirect `/settings/subscription`.
- **Group checkout: 1 phòng chưa inspect** → block, list rooms thiếu.
- **Laundry batch nhận thiếu/hỏng** → split quantity_returned/lost/damaged + compensation.
- **Distribution stop cannot_access** → exception_type, resolved sau.
- **Realtime channel mất connection** → auto reconnect, manual refresh fallback.
- **Permission thay đổi giữa session** → useUserPermissions invalidate + re-route.
- **UUID empty string** → null conversion (project memory rule).
- **PDF export font Vietnamese vỡ** → preload font Inter/Roboto.
- **Telegram bot offline** → log nhưng không block.
- **Email domain chưa verify** → fallback noreply.
- **Mobile bottom nav > 5 tabs** → tràn vào More.

(Liệt kê đầy đủ ~50 case theo modules.)

### Cách thực hiện

1. **Extract metadata** từ codebase bằng script Python:
   - Edge functions: parse `supabase/functions/*/index.ts` lấy method/auth/handler signature.
   - RPCs: grep migrations file lấy `CREATE OR REPLACE FUNCTION` signatures.
   - Hooks: parse imports/exports để map hook → table → operation.
   - User flows: trace Wizard steps + RoomCheckPage steps từ component code.

2. **Soạn JSON brief** cho từng chương từ metadata extracted (đảm bảo AI viết dựa trên fact thật).

3. **Gọi Lovable AI** model `anthropic/claude-sonnet-4-5` viết phần văn xuôi/giải thích/phân tích cho từng chương. Sơ đồ Mermaid + ERD + wireframe ASCII tự viết tay sau khi đọc code, không để AI vẽ.

4. **Compose Markdown** ghép các phần lại, thêm TOC, page-break cho PDF.

5. **Render PDF**: Mermaid → SVG bằng `@mermaid-js/mermaid-cli`, nhúng vào HTML, dùng chromium headless print → PDF A4 (cùng pipeline đã thành công ở phần 1).

6. **QA**: convert từng trang PDF → ảnh, kiểm tra overflow/wireframe ASCII có bị wrap không, font Vietnamese có hiển thị không. Fix và re-render nếu lỗi. Ảnh QA xóa sau, không copy vào `/mnt/documents/`.

### File sẽ tạo

| Path | Loại |
|---|---|
| `/tmp/extract_api.py` | Script extract edge functions + RPCs metadata |
| `/tmp/extract_flows.py` | Script extract Wizard/RoomCheck flow steps từ code |
| `/tmp/build_doc2.py` | Script gọi AI + compose Markdown |
| `/tmp/render_pdf2.sh` | Script render PDF |
| `/mnt/documents/UserFlows-API-DataModel.md` | **Output chính** |
| `/mnt/documents/UserFlows-API-DataModel.pdf` | **Output chính** |

Không sửa code app, không migration, không đụng config. Chỉ đọc code và sinh tài liệu.

### Lưu ý

- Ưu tiên fact chính xác qua extract script, AI chỉ viết văn xuôi.
- Wireframe ASCII 80-cột để PDF không vỡ; mobile wireframe 40-cột.
- ERD Mermaid chia nhiều sơ đồ nhỏ theo cluster (tránh 1 ERD khổng lồ không đọc nổi).
- Toàn bộ tiếng Việt, terminology theo project memory.
- Nếu AI gateway từ chối model `anthropic/claude-sonnet-4-5`, fallback `openai/gpt-5` và báo lại trong response.

