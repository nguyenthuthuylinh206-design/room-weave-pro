# Refactor Findings

> Tổng hợp các điểm cần refactor, sắp xếp theo severity. Mỗi finding có evidence từ code/DB.
>
> Severity: **🔴 Critical** (data loss / security) · **🟠 High** (bug nguy cơ) · **🟡 Medium** (debt / DX) · **🟢 Low** (cleanup).

---

## A. Trùng lặp & dead code

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-DUP-01 | 🟢 | `src/components/Layout.tsx` (legacy) không được import. App dùng `MainLayout.tsx`. | `rg "from .*components/Layout" src` → 0 | Xóa file legacy + đảm bảo asset reference đã chuyển hết |
| F-DUP-02 | 🟡 | Trùng `/admin/*` (trong MainLayout, RoleGuard) và `/super-admin/*` (SuperAdminLayout). | `src/App.tsx:243-260` vs `:284-340` | Chốt 1 entry, redirect cái còn lại |
| F-DUP-03 | 🟡 | `MorePage.tsx` ở `src/pages/` và `src/pages/mobile/` | `src/pages/MorePage.tsx`, `src/pages/mobile/MorePage.tsx` | Hợp nhất hoặc rename rõ desktop/mobile |
| F-DUP-04 | 🟢 | RPC không có caller frontend (~XX, xem `04-contracts/rpc-catalog.md` mục cuối) | `_generated/rpc-calls.json` | Audit từng cái: dùng từ trigger / edge / dead? |

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
| F-FSM-01 | 🟠 | Có nơi update `rooms.status` trực tiếp thay vì `transition_room_status` → mất audit | grep `from('rooms').update` cần kiểm | Migration: revoke UPDATE column `status` ở RLS, chỉ qua RPC |
| F-FSM-02 | 🟠 | Tương tự cho `room_bookings.status` và `housekeeping_tasks.status` | – | Như trên |
| F-FSM-03 | 🟡 | Quick path room check chỉ daily/periodic — chặn ở UI; cần defense in depth ở RPC | `perform_quick_room_check` source | Thêm assert ở RPC |

## D. RLS / Security

| ID | Sev | Mô tả | Evidence | Đề xuất |
|---|---|---|---|---|
| F-SEC-01 | 🔴 | Nếu có bảng nào RLS OFF → expose dữ liệu | `02-data/rls-policies.md` mục đầu | Bật RLS + viết policy ngay |
| F-SEC-02 | 🟠 | `sepay-webhook` public, không auth → cần rate limit + IP allowlist | `supabase/functions/sepay-webhook/index.ts` | Thêm shared secret header + IP allowlist của SePay |
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
| F-RPC-OVERLOAD-01 | 🟠 | `submit_room_check_lean` tồn tại **2 overload** trong DB: một bản có `_items_sent_to_laundry`, một bản không. PostgREST có thể chọn nhầm overload theo client payload → giảm/lệch số liệu giặt là. | `_generated/db-functions.tsv` có 2 dòng `submit_room_check_lean` | DROP overload cũ trong 1 migration; cập nhật memory `room-check-lean-business-logic-v1` ghi rõ chữ ký canonical |
| F-RPC-DOC-01 | 🟢 | Trước đây docs ghi sai chữ ký `transition_room_status` / `transition_booking_status` / `perform_checkin` / `perform_checkout`. Đã sửa theo `db-functions.tsv` snapshot 2026-05-10. | `bookings.md`, `rooms.md`, `05-state-machines/room-status.md` | Giữ test snapshot chữ ký RPC trong CI để không drift lại |

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
