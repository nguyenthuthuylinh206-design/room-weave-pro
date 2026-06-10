## Kết quả scan sâu

Chạy lại `security--run_security_scan` + `supabase--linter` + truy vấn trực tiếp `pg_proc`:

| Hạng mục | Số lượng | Trạng thái |
|---|---|---|
| Tổng SECURITY DEFINER trong `public` | 308 | — |
| Anon có thể EXECUTE | **2** | ✅ Đúng whitelist (`get_vat_claim_public`, `submit_vat_claim_public`) |
| Authenticated có thể EXECUTE | **308** | ⚠ Toàn bộ WARN 0029 đều từ đây |
| Function thiếu `search_path` | **0** | ✅ |
| Public bucket cho LIST | **0** | ✅ (đã siết đợt trước) |

→ Anon side đã sạch đúng @security-memory. Search path + bucket cũng sạch. **Toàn bộ 310 WARN còn lại đều là `0028` x2 (whitelist) + `0029` x308 (authenticated)** — linter cảnh báo mặc định cho mọi SECDEF callable bởi authenticated.

## Đánh giá rủi ro thật sự

Trong 308 hàm `authenticated`-executable, có thể chia 3 nhóm:

**Nhóm 1 — RPC nghiệp vụ (an toàn theo memory):** ~220 hàm validate `auth.uid()` / `get_current_tenant_id()` / `has_role()` / `has_user_permission()` bên trong (vd `perform_checkin`, `submit_room_check_lean`, `transition_room_status`, `cancel_booking`, …). Memory ghi nhận "mọi RPC validate tenant" → **chấp nhận WARN**.

**Nhóm 2 — Trigger / helper bị flag nhầm:** function `RETURNS trigger` hoặc helper nội bộ không truy cập data tenant trực tiếp (`update_updated_at_column`, `touch_*`, …) → an toàn.

**Nhóm 3 — Cron / maintenance functions ⚠ ĐÁNG SIẾT:** ~25–30 hàm chỉ dành cho cron/service_role mà vẫn cho `authenticated` EXECUTE. Một user đăng nhập bình thường có thể gọi và **kích hoạt side-effect** (xoá session, đẩy tenant vào read-only, gửi reminder, recompute snapshot…). Không leak data nhưng là vector lạm dụng tài nguyên / nhiễu nghiệp vụ.

Ví dụ phát hiện được:
- `auto_apply_read_only_after_grace()` — có thể bị gọi tay → ép tenant khác vào read-only.
- `auto_clear_read_only_after_renewal()` — ngược lại, gỡ read-only sai.
- `auto_close_stale_shifts()` / `auto_offline_inactive_staff()` — đóng ca/offline staff hàng loạt.
- `check_expiring_subscriptions()` / `cleanup_expired_otps()` / `cleanup_old_check_sessions()` / `cleanup_orphaned_auth_users()` / `cleanup_rate_limit_hits()` / `cleanup_stale_check_sessions()` — dọn dữ liệu cross-tenant.
- `compute_auto_reorder_suggestions(tenant,hotel)` — tốn CPU + có thể chỉ định tenant tuỳ ý.
- `lift_expired_dnd_oos()` — đã có edge function cron riêng.

## Đề xuất xử lý

### Bước 1 — Migration "lock down cron RPCs" (KHUYẾN NGHỊ)
Soạn 1 migration `REVOKE EXECUTE … FROM authenticated, anon` và chỉ `GRANT … TO service_role` cho danh sách ~25 hàm cron/maintenance (sẽ liệt kê đầy đủ trong migration). Edge function chạy bằng service_role → không ảnh hưởng cron đang chạy.

Kết quả dự kiến: 310 WARN → ~285 WARN, và đóng vector lạm dụng.

### Bước 2 — Audit spot-check 5 RPC nhạy cảm nhất
Đọc source của: `bulk_delete_items`, `apply_room_standards`, `assign_default_permissions_to_role`, `can_create_user`, `confirm_warehouse_delivery` — xác nhận có `get_current_tenant_id()` + role check. Nếu thiếu → bổ sung trong cùng migration.

### Bước 3 — Cập nhật `@security-memory`
Ghi rõ:
- Anon EXECUTE whitelist: 2 hàm VAT claim public.
- Cron/maintenance RPCs chỉ `service_role` (sau bước 1).
- Các WARN `0029` còn lại (~285) là chấp nhận có chủ đích: mọi RPC nghiệp vụ tự validate tenant + role trong thân hàm, hoặc trả về data đã RLS-filter.

### Bước 4 — Mark "ignore" các finding `0029` còn lại trong scanner
Sau khi memo được cập nhật, đánh dấu các finding `0029` thuộc nhóm 1 + 2 là `ignored` với lý do tham chiếu memory → tránh nhiễu trong các scan sau.

## Câu hỏi cần bạn chốt

1. **Có đồng ý Bước 1 (lock down cron RPCs ~25 hàm)?** Đây là hardening thực chất, rủi ro ~0 vì cron đều chạy qua edge function service_role.
2. **Có muốn mình audit thêm nhóm RPC nhạy cảm ở Bước 2** (đọc source 5 hàm, sửa nếu thiếu check)?
3. **Có muốn mình mass-ignore các finding `0029` đã được memo hoá ở Bước 4** để scan tiếp theo gọn lại còn ~5–10 WARN thật sự cần soi?

Chờ bạn chốt rồi mình triển khai migration + cập nhật memory + ignore findings trong cùng một lượt build.
