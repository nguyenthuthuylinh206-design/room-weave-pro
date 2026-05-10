## Mục tiêu

Tạo bộ tài liệu audit-grade cho toàn bộ Hotel Asset Manager (RoomQc), dạng Markdown + Mermaid trong `docs/architecture/`, đủ chi tiết để dùng làm cơ sở refactor: business flow → module map → ERD → RPC contracts → RLS → state machines → permission matrix.

Không sửa code sản phẩm. Chỉ tạo file tài liệu trong `docs/`.

---

## Cách triển khai (3 giai đoạn)

### Giai đoạn 1 — Khảo sát tự động (1 lượt build)

Viết script Node ở `scripts/audit/` (chạy local, không deploy) để **trích xuất sự thật từ codebase + DB**, tránh viết tay sai lệch:


| Script                | Output                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `extract-routes.ts`   | Quét `src/App.tsx` + `src/pages/` → bảng route × component × guard × permission                                          |
| `extract-rpcs.ts`     | Quét `supabase.rpc(...)` trong `src/` → danh sách RPC được gọi + nơi gọi                                                 |
| `extract-tables.ts`   | Quét `from('table')` → bảng × thao tác (select/insert/update/delete) × file                                              |
| `extract-edge-fns.ts` | Liệt kê `supabase/functions/*/index.ts` → mô tả + secret + cron                                                          |
| `extract-hooks.ts`    | Quét `src/hooks/use*.ts` → query keys, RPC calls, dependencies                                                           |
| `dump-db-schema.ts`   | Query `information_schema` + `pg_proc` qua read-only → tables, columns, FK, RPC signatures, RLS policies, triggers, cron |


Output trung gian → `docs/architecture/_generated/*.json` (làm nguồn cho diagram).

### Giai đoạn 2 — Viết tài liệu L1-L4 (2-3 lượt build)

Cấu trúc `docs/architecture/`:

```text
docs/architecture/
├── README.md                    # Index + cách đọc
├── 00-context/
│   ├── system-context.md        # L1: actors, external systems, Mermaid C4-context
│   └── glossary.md              # Thuật ngữ VN/EN
├── 01-modules/
│   ├── module-map.md            # L2: module dependency graph
│   ├── bookings.md
│   ├── rooms.md
│   ├── housekeeping.md          # gồm Room Check Lean, QC, tasks
│   ├── laundry.md
│   ├── inventory.md             # gồm warehouse, distribution, minibar
│   ├── maintenance.md
│   ├── payment.md               # VietQR + SePay
│   ├── subscription.md          # room-based pricing, grace
│   ├── users-permissions.md
│   ├── guests-crm.md
│   ├── reports.md
│   ├── notifications.md
│   ├── workflows.md             # automation engine
│   ├── super-admin.md
│   └── lost-found.md
├── 02-data/
│   ├── erd-overview.md          # ERD tổng (Mermaid)
│   ├── erd-bookings.md          # ERD per-domain
│   ├── erd-housekeeping.md
│   ├── erd-inventory.md
│   ├── erd-finance.md
│   └── rls-policies.md          # bảng × policy × role
├── 03-flows/
│   ├── auth-flow.md             # login, OTP, PWA credentials
│   ├── booking-lifecycle.md     # sequence: book → check-in → checkout → invoice
│   ├── room-check-lean.md       # state machine + sequence
│   ├── group-checkout.md
│   ├── payment-vietqr-sepay.md  # sequence webhook
│   ├── subscription-renewal.md
│   ├── laundry-batch.md
│   └── inventory-distribution.md
├── 04-contracts/
│   ├── rpc-catalog.md           # mọi RPC: signature, args, returns, errors VN, callers
│   ├── edge-functions.md        # endpoint, auth, secrets, cron, callers
│   ├── realtime-channels.md     # bảng × event × consumer
│   └── api-routes.md            # route × component × guard × permission
├── 05-state-machines/
│   ├── room-status.md           # 11 trạng thái (mem)
│   ├── booking-status.md
│   ├── task-qc.md
│   ├── laundry-batch.md
│   └── payment-transaction.md
├── 06-permissions/
│   ├── role-hierarchy.md        # 4-tier
│   ├── permission-matrix.md     # module × action × role (CSV + bảng MD)
│   └── hotel-access.md          # user_hotels, All Hotels mode
├── 07-frontend/
│   ├── routing.md
│   ├── component-tree.md        # Layout → pages → key components
│   ├── hooks-catalog.md         # query keys, invalidation map
│   ├── design-system.md         # tokens, Enterprise SaaS rules
│   └── pwa-offline.md
├── 08-ops/
│   ├── cron-jobs.md             # pg_cron + edge crons
│   ├── audit-log.md
│   ├── observability.md
│   └── multi-tenant-isolation.md
└── 09-refactor/
    ├── findings.md              # smell × severity × evidence × suggestion
    ├── tech-debt-register.md
    └── refactor-roadmap.md      # ưu tiên theo impact/effort
```

### Giai đoạn 3 — Refactor findings (1 lượt build)

Sau khi có sự thật, sinh `09-refactor/findings.md` với 5 lăng kính:

1. **Trùng lặp**: hooks/components/RPC overlap (vd `Layout.tsx` legacy vs `MainLayout.tsx`).
2. **Lệch convention**: query thiếu `.eq('tenant_id')`, dùng `''` thay `null` cho UUID, mutation rời thay vì RPC atomic.
3. **State machine rò rỉ**: transition không qua `transition_*` RPC.
4. **RLS gap**: bảng public-read, policy `using (true)`, policy không check tenant.
5. **Dead code**: route/file không import.

Mỗi finding: `id | severity | module | evidence(file:line) | suggested fix | effort`.

---

## Loại Mermaid sử dụng

- `C4Context` cho system context
- `flowchart` cho module map, business flow
- `sequenceDiagram` cho RPC/webhook flows
- `stateDiagram-v2` cho state machines
- `erDiagram` cho data model
- Bảng Markdown cho matrix (permission, RLS, query keys)

---

## Phạm vi rõ ràng

**Có**: Toàn bộ module liệt kê ở memory index (Bookings, Rooms, Housekeeping/QC, Laundry, Inventory, Maintenance, Payment/VietQR, Subscription, Users/Permissions, Guests, Reports, Notifications, Workflows, Super Admin, Lost & Found, PWA, Staff Management).

**Không**: Sửa code sản phẩm, thay đổi DB, chạy migration. Tất cả output nằm trong `docs/` và `scripts/audit/`.

---

## Ước lượng

- ~40-50 file Markdown
- ~60-80 sơ đồ Mermaid
- 3-4 lượt build (giai đoạn 1 / 2a / 2b / 3)
- Sau khi xong, bạn có thể xuất PDF từ `docs/` bằng tool ngoài nếu cần.

---

## Câu hỏi mở (sẽ giả định nếu không trả lời)

- Ngôn ngữ tài liệu: **mặc định tiếng Việt**, code/identifier giữ nguyên tiếng Anh.
- Vị trí: `**tạo vào file của dự án như các file tôi đang lưu**` 
- Có cần README ở root link sang docs không: **có**, thêm 1 dòng.

Sau khi bạn duyệt plan, mình sẽ bắt đầu Giai đoạn 1 (script khảo sát + dump schema thật từ DB).