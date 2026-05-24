
# Kế hoạch QA toàn diện (Option C)

Chạy đủ 3 lớp test trên ~200 case của 17 file checklist, tự tạo tài khoản test, output 1 báo cáo PDF cuối cùng.

## Phạm vi
- **17 file checklist** trong `/mnt/documents/qa-checklist/` (00-OVERVIEW → 14-super-admin + 99-regression-smoke)
- **Môi trường**: Preview hiện tại (`id-preview--...lovable.app`) — KHÔNG đụng data tenant thật của bạn
- **Thời lượng**: ~30-45 phút

## 3 lớp test

### Lớp 1 — Static review (100% case, ~200 case)
Trace từng case sang file/hook/RPC tương ứng. Output: Pass / Fail / Cần test thủ công, kèm `file:line`.
- Verify RLS policies (98 bảng) khớp với case
- Verify RPC signatures (`perform_checkin/checkout/submit_room_check_lean/transition_*`)
- Verify trigger, audit log, validation Zod
- Verify error mapping tiếng Việt

### Lớp 2 — DB / RPC test (module lõi)
Dùng `supabase--read_query` + `supabase--insert` + `curl_edge_functions` để verify thực tế trên DB:
- **Auth**: signup/login/OTP reset/role guard
- **Permissions**: `has_user_permission` + tenant isolation cross-tenant
- **Bookings**: tạo → check-in (`perform_checkin`) → checkout (`perform_checkout`) atomic
- **Room Check Lean**: `submit_room_check_lean` 2-pass fan-out, audit log, undo
- **Payment**: simulate webhook SePay → match ref + tolerance 1000đ → side effects
- **State machines**: transition_room_status / booking / task — verify revoke UPDATE
- **Cron**: expire-pending-payments, lift-expired-dnd-oos (đang lỗi `payment_transactions.status does not exist` — sẽ report)

**Data cleanup**: mọi insert dùng prefix `[QA-TEST]` + tenant test riêng, cleanup cuối session.

### Lớp 3 — Browser smoke (chạy thật trên preview)
Tạo tài khoản test mới qua UI register → onboarding → tạo tenant test → chạy `99-regression-smoke.md`:
- Login email + Google fallback
- Tạo hotel, room, item, booking
- Walk-in check-in → room check lean (Quick Path + Issue) → checkout
- QR payment simulate (webhook trigger từ DB)
- Mobile viewport 390x844 — verify bottom nav, back behavior, touch target
- Capture screenshot mỗi step quan trọng

**Không test**: VietQR thật, camera OCR thật, push notification thật, email thật vào inbox, PWA install vật lý.

## Deliverable

1. **`QA-Report-Full.pdf`** (`/mnt/documents/qa-checklist/`):
   - Cover + executive summary (Pass / Fail / Warning / Manual)
   - Bảng tổng hợp theo module (17 chương)
   - Chi tiết từng case Fail với: case ID, mô tả, evidence (file:line / SQL output / screenshot), severity, đề xuất fix
   - Phụ lục: SQL log, screenshot mobile/desktop
2. **`QA-Report-Full.md`** (source)
3. **Issue list** tổng hợp các bug đã phát hiện được, sort theo severity (đã thấy 1 bug cron `expire-pending-payments` ngay từ log)

## Quy ước

- KHÔNG sửa code production trong loop này — chỉ test + report
- Nếu phát hiện bug critical (data leak, RLS bypass): dừng, báo ngay
- Tất cả test data có prefix `[QA-TEST]` + xóa sạch cuối session
- Browser test chạy ở viewport mobile 390x844 (memory `room-check-mobile-ui-standards-v2`)

## Bước tiếp theo
Khi bạn approve plan này, tôi sẽ:
1. Switch sang build mode
2. Chạy tuần tự Lớp 1 → 2 → 3, stream progress
3. Render PDF cuối cùng và liệt kê file thay đổi (nếu có)
