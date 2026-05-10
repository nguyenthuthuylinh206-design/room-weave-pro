# Hotel Asset Manager (RoomQc) — Architecture Docs

> Bộ tài liệu audit-grade L1-L4 cho toàn bộ hệ thống. Mục đích: làm cơ sở refactor.
>
> **Sinh tự động** từ codebase + database tại: `_generated/` (chạy `node scripts/audit/extract-all.mjs` + `bash scripts/audit/dump-db-schema.sh`).
>
> **Cập nhật**: 2026-05-10 — dựa trên 134 pages, 173 hooks, 139 RPC, 92 tables, 28 edge functions, 357 migrations.

---

## Cách đọc tài liệu này

- **L1 (Context)** — Hệ thống nhìn từ ngoài, ai dùng, tích hợp gì.
- **L2 (Container/Module)** — Module, dependency, ranh giới.
- **L3 (Component)** — Page, component, hook, RPC, edge function trong từng module.
- **L4 (Code/Data)** — ERD chi tiết, RLS, signature RPC, state machine, permission matrix.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| [00-context/](./00-context/) | system-context, glossary |
| [01-modules/](./01-modules/) | module-map + 16 module specs (bookings, rooms, housekeeping, laundry, inventory, maintenance, payment, subscription, users-permissions, guests-crm, reports, notifications, workflows, super-admin, lost-found) |
| [02-data/](./02-data/) | ERD overview + per-domain ERDs (bookings, housekeeping, inventory, finance) + RLS policies |
| [03-flows/](./03-flows/) | 8 sequence: auth, booking-lifecycle, room-check-lean, group-checkout, payment-vietqr-sepay, subscription-renewal, laundry-batch, inventory-distribution |
| [04-contracts/](./04-contracts/) | rpc-catalog, edge-functions, realtime-channels, api-routes |
| [05-state-machines/](./05-state-machines/) | 5 FSM: room-status, booking-status, task-qc, laundry-batch, payment-transaction |
| [06-permissions/](./06-permissions/) | role-hierarchy, permission-matrix, hotel-access |
| [07-frontend/](./07-frontend/) | routing, component-tree, hooks-catalog, design-system, pwa-offline |
| [08-ops/](./08-ops/) | cron-jobs, audit-log, observability, multi-tenant-isolation |
| [09-refactor/](./09-refactor/) | **findings + tech-debt-register + refactor-roadmap** |
| `_generated/` | JSON/TSV tự sinh (không sửa tay) |

## Quy ước

- Tiếng Việt cho mô tả, tiếng Anh cho identifier.
- Mermaid cho mọi sơ đồ (render được trên GitHub/Notion/VSCode).
- Mỗi finding ở `09-refactor/findings.md` có `id | severity | evidence(file:line)`.

## Quick stats (tự sinh)

```text
RPCs:           139     (xem 04-contracts/rpc-catalog.md)
Tables:         92      (xem 02-data/erd-overview.md)
Edge functions: 28      (xem 04-contracts/edge-functions.md)
Routes:         140     (xem 04-contracts/api-routes.md)
Hooks:          173     (xem 07-frontend/hooks-catalog.md)
Pages:          134
Migrations:     357
Triggers:       ~150
RLS policies:   ~824
```

## Nguyên tắc kiến trúc cốt lõi (lấy từ memory)

1. **Multi-tenant 3 lớp**: RLS + client `.eq('tenant_id')` + RPC validate.
2. **State qua RPC atomic**: `transition_room_status`, `transition_booking_status`, `transition_task_status`, `perform_checkin`, `perform_checkout`, `submit_room_check_lean`.
3. **UUID dùng `null`**, không dùng `''`.
4. **Audit log mọi state transition**.
5. **Vietnamese-first UI**, mobile-portrait first, offline-tolerant 24h.
6. **Group checkout thủ công** sau khi thanh toán (không auto).
7. **Finance**: `unpaid = total_amount - (amount_paid + deposit_amount)`.

## Bắt đầu từ đâu?

- Mới tham gia dự án → đọc theo thứ tự: `00 → 01 → 03 → 06`.
- Cần refactor → đọc thẳng `09-refactor/findings.md`.
- Debug bug nghiệp vụ → tra module ở `01-modules/` + flow ở `03-flows/`.
- Sửa RPC/RLS → tra `04-contracts/` + `02-data/rls-policies.md`.
