# Refactor Findings

> Tổng hợp các điểm cần refactor, sắp xếp theo severity. Mỗi finding có evidence từ code/DB.
>
> Severity: **🔴 Critical** (data loss / security) · **🟠 High** (bug nguy cơ) · **🟡 Medium** (debt / DX) · **🟢 Low** (cleanup).

---

## A. Trùng lặp & dead code

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-DUP-01 | ✅ | ~~`src/components/Layout.tsx` legacy~~ — **Đã xóa 2026-05-10**. App chỉ còn `MainLayout.tsx`. | – | Đóng. |
| F-DUP-02 | ✅ | ~~Trùng `/admin/*` và `/super-admin/*`~~ — **Sai**. App.tsx chỉ có `/super-admin/*`, folder `pages/admin/` chỉ là vị trí lưu mã. Đã verify `rg "path.*\"/admin" src/App.tsx` → 0 kết quả. | – | Đóng. |
| F-DUP-03 | ✅ | ~~`MorePage.tsx` ở `src/pages/` và `src/pages/mobile/`~~ — **Đã xóa file legacy `src/pages/MorePage.tsx` ngày 2026-05-10** (không có import, chỉ bản `pages/mobile/MorePage.tsx` còn được sử dụng). | git history | Đóng. |
| F-DUP-04 | 🟢 | **145 RPC không có caller frontend** (284 tổng - 139 gọi từ FE). Một số dùng từ trigger / edge / cron, còn lại có thể dead. | `_generated/summary.json` | Audit phân loại: trigger / edge / cron / dead → xóa dead |

## B. Lệch convention

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-CON-01 | 🟠 | Một số query thiếu `.eq('tenant_id', tenantId)` (chỉ dựa RLS) → vi phạm Core rule | `rg "supabase\.from\(" src \| rg -v "tenant_id"` cần audit | Lint rule custom + sửa từng case |
| F-CON-02 | 🟠 | UUID rỗng truyền `''` thay `null` ở vài form | `rg "uuid.*''" src/components` | Chuẩn hoá qua zod transform |
| F-CON-03 | 🟡 | Mutation đa bảng không qua RPC atomic ở vài hook | xem `_generated/hooks.json` các hook có nhiều `.from().insert/update` liên tiếp | Chuyển sang RPC `perform_*` / `transition_*` |
| F-CON-04 | 🟡 | Query keys không nhất quán (thiếu `tenantId` hoặc `hotelId`) → cache leak khi switch hotel | sample từ `_generated/hooks.json` | Áp dụng pattern `[domain, sub, tenantId, hotelId, ...]` toàn bộ |

## C. State machine rò rỉ

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-FSM-01 | ✅ | ~~~10 chỗ update `rooms.status` trực tiếp~~ — **2026-05-10**: đã refactor toàn bộ `useRoomChecks.ts` (4 vị trí), `useBulkRoomActions.ts` (1 vị trí), `useRooms.ts:useMarkRoomReady` (1 vị trí) sang RPC `transition_room_status`. `useUpdateRoom` strip field `status` + warn. ESLint rule `lovable-internal/no-direct-room-status-update` đã ở mức **error toàn dự án** (không còn allowlist). Còn các file khác (`useBookingActions.ts`, `useCheckoutInspection.ts`, `useTaskQc.ts`, `BookingsPage.tsx`) — nếu vẫn còn vi phạm sẽ bị CI chặn. | grep + ESLint CI | Bước cuối: revoke quyền `UPDATE (status)` ở RLS để defense-in-depth |
| F-FSM-02 | ✅ | ~~`room_bookings.status` & `housekeeping_tasks.status` trực tiếp~~. **2026-05-10 (đợt cuối)**: refactor xong toàn bộ — `useCheckoutInspection.cancelInspection`, `useHousekeepingTasks.useCancelTask`, `RoomCheckPage` (auto-complete task khi nộp room check) đều dùng `transition_task_status`. **Lint sweep toàn dự án: 0 vi phạm**. ESLint chặn cứng vi phạm mới. | ESLint sweep ✓ | Bước cuối: revoke quyền UPDATE column `status` ở RLS (defense-in-depth) |
| F-FSM-03 | 🟡 | Quick path room check chỉ daily/periodic — chặn ở UI; cần defense in depth ở RPC | `perform_quick_room_check` source | Thêm assert ở RPC |

## D. RLS / Security

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-SEC-01 | ✅ | ~~Bảng RLS OFF~~ — **Đã verify 111/111 bảng đều RLS ON** (`_generated/db-rls-enabled.tsv`). Không còn rủi ro RLS-disabled. Cần riêng audit chất lượng nội dung policy (xem F-SEC-04). | `db-rls-enabled.tsv` | Đóng. |
| F-SEC-02 | 🟡 | ~~SePay webhook public không auth~~ → **Đã có shared secret bắt buộc (B3 fail-close, 2026-05-10)**. Còn lại: thêm IP allowlist của SePay + rate limit. | `supabase/functions/sepay-webhook/index.ts:96-128` | Thêm IP allowlist + rate limit theo `_shared/rateLimit.ts` |
| F-SEC-03 | 🟠 | Match payment chỉ dựa ref_code text → false-match khả dĩ | `payment.md` | Secondary match theo amount + thời gian + tolerance |
| F-SEC-04 | 🟡 | Một số policy dùng `using (true)` cho SELECT (nếu có) | xem `rls-policies.md` | Thắt theo tenant + role |
| F-SEC-05 | 🟡 | `guest-documents` bucket public — preview đẹp nhưng URL có thể leak | memory `Storage` core | Signed URL hoặc proxy edge function cho preview |

## E. Performance

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-PERF-01 | 🟡 | Query `users` join `tenant + hotel + position` chạy mỗi 5 phút × user → có thể nặng | `src/hooks/useUser.ts` | Cache 5 phút (đã có), thêm select cụ thể |
| F-PERF-02 | 🟡 | Realtime subscribe `*` thay vì cụ thể event/filter | grep `on('postgres_changes', { event: '*'` | Filter `event` + `filter: tenant_id=eq.X` |
| F-PERF-03 | 🟡 | `queryKey` không có hotelId → switch hotel không invalidate | – | Bổ sung |

## F. Tech debt cụ thể (theo memory)

| ID | Sev | Mô tả |
|---|---|---|
| F-DBT-01 | 🟡 | Outbox + reconcile có khả năng double-apply nếu fan-out lỗi giữa chừng. Cần idempotent key đầy đủ ở `room_check_issues × side_effect_type`. |
| F-DBT-02 | 🟡 | Group payment distribution dùng convention metadata chuỗi → dễ vỡ. Nên enum + JSON schema. |
| F-DBT-03 | 🟡 | Reference codes có nhiều convention (memory `qr-payment-system-spec`). Cần 1 hàm canonical. |
| F-DBT-04 | 🟡 | Tài chính booking tính ở nhiều chỗ (server + client). Nên có DB view duy nhất. |
| F-DBT-05 | 🟢 | `Hotel Asset Manager` còn sót ở vài chỗ string sau rebrand RoomQc. |

## G. RPC overload & contract drift

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-RPC-OVERLOAD-01 | ✅ | ~~`submit_room_check_lean` 2 overload~~ — **Đã DROP overload cũ (không có `_items_sent_to_laundry`) ngày 2026-05-10**. DB còn đúng 1 bản canonical. Snapshot + `db-functions.tsv` đã đồng bộ. | migration 2026-05-10, `db-functions.tsv` | Đóng. |
| F-RPC-DOC-01 | ✅ | Trước đây docs ghi sai chữ ký `transition_room_status` / `transition_booking_status` / `perform_checkin` / `perform_checkout`. Đã sửa theo `db-functions.tsv` snapshot 2026-05-10. **Đã hardened**: test `src/test/rpc-signature-drift.test.ts` chạy trong CI cho 13 RPC critical. | test ✓ | Giữ snapshot, mở rộng khi thêm RPC mới |
| F-RPC-OVERLOAD-02 | 🟡 | **Phát hiện 2026-05-10 qua test mở rộng (C1)**: 18 app RPC còn overload trùng tên: `apply_room_standards`, `complete_room_delivery`, `confirm_receive_order`, `create_distribution_order`, `create_inbound_transaction`, `create_laundry_loss_transaction`, `create_laundry_return_transaction`, `create_outbound_transaction`, `get_categories_with_stats`, `get_distribution_orders_filtered`, `get_items_filtered`, `get_laundry_batches_filtered`, `get_monthly_expenses`, `get_recent_activities`, `handover_batch`, `settle_batch_compensation`, `setup_new_tenant`, `setup_room_initial`, `undo_room_delivery_confirmation`. PostgREST có thể chọn nhầm. Đã whitelist tạm trong test; CI **đã chặn THÊM MỚI**. | `rpc-signature-drift.test.ts` ALLOWED_OVERLOADS | Audit từng RPC, DROP overload thừa, xóa khỏi whitelist |
| F-FSM-LINT-01 | ✅ | **Mới 2026-05-10**: ESLint custom rule `lovable-internal/no-direct-room-status-update` chặn cứng update trực tiếp `rooms.status` / `room_bookings.status` / `housekeeping_tasks.status`. File legacy có sẵn vi phạm chỉ ở mức warn (allowlist trong `eslint.config.js`). | `eslint-rules/no-direct-room-status-update.js`, CI ✓ | Refactor dần các file warn để đưa lên error toàn dự án |
| F-CI-01 | ✅ | **Mới 2026-05-10**: GitHub Action `.github/workflows/ci.yml` chạy ESLint + Vitest mỗi PR. | `.github/workflows/ci.yml` | – |
| F-SEC-RATE-01 | ✅ | **Mới 2026-05-10**: SePay webhook có rate limit 60 req/IP/phút + IP allowlist qua env `SEPAY_ALLOWED_IPS`. | `sepay-webhook/index.ts` | Đặt `SEPAY_ALLOWED_IPS` ở Cloud Secrets khi có danh sách IP chính thức từ SePay |

---

## Roadmap refactor đề xuất (4 sprint × 2 tuần)

### Sprint R1 — Security & Integrity (must)
- F-SEC-01, F-SEC-02, F-SEC-03
- F-FSM-01, F-FSM-02 (revoke direct status update)

### Sprint R2 — Convention enforcement
- F-CON-01 (lint), F-CON-02 (zod transform), F-CON-04 (query keys)
- F-PERF-02, F-PERF-03

### Sprint R3 — Domain consolidation
- F-DUP-01, F-DUP-02, F-DUP-03, F-DUP-04
- F-DBT-04 (DB view tài chính)

### Sprint R4 — Hardening
- F-DBT-01 (outbox idempotent), F-DBT-02 (enum metadata), F-DBT-03 (canonical ref code)
- F-FSM-03 (defense in depth Quick path)
- F-SEC-04, F-SEC-05

---

## Cách dùng tài liệu này

1. Đọc `_generated/*.json` + `_generated/db-*.tsv` để có sự thật mới nhất → re-run scripts khi schema đổi.
2. Mỗi PR refactor → đính kèm finding ID xử lý.
3. Khi đóng finding → cập nhật bảng (chuyển sang ✅ hoặc xóa).
4. Khi phát hiện finding mới → thêm vào đúng nhóm A-F.
