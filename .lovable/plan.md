
# IMPLEMENTATION PLAN — Decision v1.2 Final Cleanup

## 1. Hiểu biết về hệ thống hiện tại

**Module đã có:**
- **Đợt A (Asset Group)** đã land: enum `asset_group` 9 nhóm, cột `items.asset_group + migration_review_required`, `hotel_policy + hotel_policy_history`, RPC `preview_asset_group_mapping` / `apply_asset_group_mapping`, view `room_check_staff_items_view`, enum `charge_status` (7 giá trị), idempotency columns trên `inventory_transactions`, page `/settings/asset-group-migration` + `/settings/hotel-policy`.
- **Lean Room Check** đã land: `RoomCheckRouter`, `LeanInspectionPage`, `LeanReportIssueSheet` (đang dùng 3 lựa chọn legacy), `useLeanDraft`, RPCs `submit_room_check_lean`, `perform_quick_room_check`, `undo_quick_room_check`, `reopen_room_check`.
- **Phase C đã chạy:** `room_check_issues` (multi-issue mới), edge function `process-room-check-outbox`, page `/reception/pending-charges` + RPC `review_chargeable_consumptions`, `chargeable_consumptions.approval_status`.
- **Inventory C2:** `consumption_snapshots` + cron + dead-stock RPCs.
- **Laundry:** `atomic_laundry_batch_delivered/received` đã có (theo memory linen pool bridge).

**Vấn đề tài liệu yêu cầu giải quyết:**
1. Smart sheet theo `asset_group` chưa làm — sheet vẫn 3 lựa chọn cứng.
2. Outbox chưa đúng chuẩn: cần issue-level, schema_version, `issue_role`, SHA-256 idempotency, retry policy 5 bước, dead-letter, FOR UPDATE SKIP LOCKED, reconciliation cuối ngày.
3. Chưa có enum `issue_role` (primary_issue / derived_action) và constraint quantity theo primary_issue.
4. Charge flow FO → Manager override với `override_reason` bắt buộc chưa có (mới có approve/reject 1 lớp).
5. Laundry FSM chưa có state `partially_received / compensation_needed / closed`, chưa cấm cancel sau delivered, chưa có cron compensation theo policy snapshot.
6. Permission Matrix: thiếu role `Storekeeper`, chưa enforce ở RLS đầy đủ; cần chặn Staff truy cập `unit_price/wash_cycles/warehouse_stock` qua API/RLS (hiện mới ẩn ở view).
7. `hotel_policy` thiếu unique index active per key, chưa snapshot vào `laundry_batch`.
8. Migration asset_group chưa có dry-run report chuẩn (Top 20 ambiguous, top 20 category chưa map).
9. Wizard cũ `/rooms/:id/check` còn tồn tại — cần Lean variant cho replenish/delivery (Sprint 4).

**Quyết định cốt lõi (15 chốt) đã ghi nhận:** asset_group, smart sheet, linen pool bridge, outbox issue-level, ẩn finance khỏi staff, FSM laundry mở rộng, SHA-256 idempotency, permission matrix 6 vai trò (thêm Storekeeper), hotel_policy governance, FO/Manager escalation, multi-bucket + primary/derived, security enforce DB, migration governance.

## 2. Gap analysis chi tiết

| Hạng mục | Trạng thái | Còn thiếu |
|---|---|---|
| `asset_group` enum + cột | ✅ | Backfill thực tế cho 746 item (đang null) |
| Smart Sheet 9 variant | ❌ | Refactor `LeanReportIssueSheet` đọc asset_group, render đúng primary + sub-reason |
| `issue_role` enum | ❌ | Tạo enum + cột trên `room_check_issues` + outbox payload |
| `room_check_issues` table | ✅ | Thêm `issue_role`, `needs_review`, `review_reason`, `quality_issue`, `retire_reason` |
| Outbox `outbox_events` chuẩn | ⚠️ | Hiện có function process; cần bảng outbox_events với schema_version/idempotency_key_hash/retry_count/next_retry_at/dead_letter, FOR UPDATE SKIP LOCKED, retry curve 1/5/15/60/180 phút |
| Idempotency SHA-256 | ⚠️ | Đã có cột trên inventory_transactions, cần áp dụng cho outbox + RPC laundry |
| Charge workflow FO → Manager | ⚠️ | Hiện chỉ approve/reject 1 lớp; cần `pending_fo_confirm → fo_rejected → manager_override` với `override_reason NOT NULL` |
| Laundry FSM (9 state) | ⚠️ | Thêm `partially_received`, `compensation_needed`, `closed`, cấm cancel sau delivered, snapshot policy `compensation_after_days` vào batch, cron compensation |
| Storekeeper role | ❌ | Thêm `app_role` enum value + RLS + UI gating |
| RLS staff-safe | ⚠️ | View đã ẩn; cần RLS policy chặn Staff query trực tiếp `items.unit_price`, `warehouse_stock`, `linen_batches.wash_cycles` |
| `hotel_policy` index | ⚠️ | Thêm `uq_hotel_policy_active_key` partial unique |
| Migration dry-run report | ⚠️ | RPC trả về top 20 ambiguous + category chưa map |
| Reconciliation job cuối ngày | ❌ | Edge function cron so khớp room_check_issues vs side-effect |
| Wizard cũ Lean-ize | ❌ | Sprint 4 |

## 3. Lộ trình triển khai (theo tài liệu §20)

**Sprint 1A — Data foundation** (mostly done, finalize)
- D9: Tạo enum `issue_role` + cột trên `room_check_issues` + bảng `outbox_events` chuẩn
- D5: Hash SHA-256 column + UNIQUE (tenant_id, hotel_id, idempotency_key_hash) cho outbox
- D7/D8: Thêm app_role `storekeeper`; viết RLS chặn Staff truy cập field tài chính/kỹ thuật
- D10: RPC `dryrun_asset_group_mapping_report` (counts + top 20)
- Hotel_policy unique index + governance hoàn thiện

**Sprint 1B — Outbox**
- R1: Sửa `submit_room_check_lean` → trong cùng transaction insert N outbox_events (1/issue) với `schema_version=1`, `issue_role`, hash key
- R2–R7: Worker cho 6 bucket (gọi RPC atomic per bucket); R7 chỉ tạo `laundry_request`
- R8: Retry curve 1/5/15/60/180 phút, dead_letter status, alert
- R9: Cron reconciliation cuối ngày so issue ↔ side-effect

**Sprint 1C — Linen pool bridge + Laundry FSM**
- L1–L2: Bảng `laundry_request`, gom thành `laundry_batch`
- L3–L4: Atomic delivered/received (đã có, audit lại double-deduction)
- L5: `atomic_laundry_batch_partially_received`
- L6: Cron `compensation_needed` dùng `policy_snapshot.compensation_after_days`
- L7: Tăng wash_cycles theo `batch_inventory` khi received
- L8: Audit log đầy đủ + cấm transition `delivered/washing/ready → cancelled`

**Sprint 2 — Smart ReportIssueSheet**
- U1: Refactor `LeanReportIssueSheet` đọc `asset_group` + `is_chargeable` + `category` + `hotel_policy`
- U2: 9 variant theo bảng §6.3, max 4 primary options + sub-reason
- U5: Mapping UI → bucket theo §7
- U6: Option "Chưa rõ nguyên nhân" set `needs_review=true`, `charge_status=pending_manager_review`
- U7/U8: Ẩn finance + badge "Cần thay" cho linen retire
- U9: Photo evidence theo `hotel_policy.photo_required_by_issue_type`

**Sprint 3 — Cross-module**
- C1: Manager review queue cho `needs_review=true`
- C2: FO confirm minibar (đã có 1 phần) → bổ sung Manager override với `override_reason` NOT NULL → notify nếu `minibar_fo_reject_notify_manager=true`
- C3: Auto `maintenance_request` từ damaged equipment/furniture
- C4: Auto `supplement_request` từ replaced/missing
- C7: Bulk approve cho Manager
- C8: Storekeeper UI fulfill supplement + receive PO + New Linen Batch flow

**Sprint 4 — Lean-ize wizard cũ + QA**
- Lean variant cho replenish/delivery, migrate distribution_order vào Lean
- QA matrix DL-01..20, US-01..12, CM-01..16, SEC-01..14
- Pilot 2 khách sạn

## 4. Acceptance Criteria mapping
Sẽ test theo block §21 của tài liệu (DL/US/CM/SEC). Mỗi sprint kết thúc = pass nhóm AC tương ứng (Sprint 1 = DL, Sprint 2 = US, Sprint 3 = CM, mọi sprint = SEC).

## 5. Rủi ro & mitigation chính
- Backfill 746 item NULL → bắt buộc dry-run + Manager sign-off trước khi `apply_asset_group_mapping`.
- Outbox migration nóng: cần dual-write tạm (function cũ vẫn chạy + outbox song song) trong 48h → so khớp → cutover.
- Cấm cancel laundry sau delivered là breaking → cần manual_inventory_adjustment flow trước khi enforce.
- FSM mới của laundry phải có data migration cho batch đang ở các state cũ.

## 6. File / module sẽ tạo và sửa (preview)
**Mới:** `outbox_events` table + indices, `laundry_batches.policy_snapshot`, `app_role=storekeeper`, RPCs (`dryrun_asset_group_mapping_report`, `atomic_laundry_batch_partially_received`, `manager_override_minibar_charge`), edge functions (`reconcile-room-check-side-effects`, `laundry-compensation-cron` mở rộng), hooks (`useAssetGroupSheetVariant`, `useLaundryFSM`, `useOverrideMinibarCharge`), pages (`/reception/minibar-charges-review`, `/storekeeper/supplement-queue`, `/laundry/batches/:id` mở rộng FSM), 9 variant component cho sheet.

**Refactor:** `LeanReportIssueSheet` (đọc asset_group), `submit_room_check_lean` RPC (ghi outbox issue-level), `process-room-check-outbox` edge function (retry curve + dead-letter + lock), `PendingChargesPage` (thêm Manager override panel).

## 7. Câu hỏi cần xác nhận trước khi build

1. **Backfill `asset_group`:** chạy auto migration server-side (an toàn hơn vì 746 item NULL block Smart Sheet) hay yêu cầu Manager bấm "Áp dụng" trên `/settings/asset-group-migration`?
2. **Outbox cutover:** dual-write 48h rồi cutover, hay cutover thẳng (rủi ro cao hơn nhưng nhanh)?
3. **Storekeeper role:** thêm như `app_role` mới (cần migrate user hiện có) hay tạm dùng permission flag trên `staff` để khỏi đụng auth schema?
4. **Wizard cũ `/rooms/:id/check?type=replenish|delivery`:** giữ tới hết Sprint 4 (theo plan) hay deprecate sớm hơn?
5. **Manager override minibar:** cần UI riêng (`/reception/minibar-overrides`) hay tích hợp vào `PendingChargesPage` hiện có dưới tab "FO đã từ chối"?
6. **Laundry data migration:** batch đang ở state cũ (`stocked`, `received`) sẽ map sang state mới thế nào? Có cần đóng tất cả về `closed` không?

## 8. Đề xuất bắt đầu hôm nay

**Bước 1 (1 ngày):** Backfill `asset_group` cho toàn bộ 746 item — dry-run + apply (giải quyết blocker hiện tại của Smart Sheet, vì user đang gặp đúng vấn đề này). Đồng thời migration tạo `issue_role` enum + cột trên `room_check_issues` + cột `needs_review/review_reason`.

**Bước 2 (2 ngày):** Refactor `LeanReportIssueSheet` thành Smart Sheet đọc `asset_group` (Sprint 2 U1–U6) — đây là phần user nhìn thấy ngay, validate UX trước khi đụng outbox.

**Bước 3 (3 ngày):** Sprint 1A còn lại + Sprint 1B Outbox chuẩn (table outbox_events, schema_version, retry curve, dead-letter, FOR UPDATE SKIP LOCKED, sửa `submit_room_check_lean` ghi issue-level).

Lý do thứ tự: Bước 1 unblock UI ngay (vấn đề user vừa report). Bước 2 deliver giá trị nghiệp vụ thấy được. Bước 3 là nền tảng kỹ thuật cho mọi side-effect ổn định trước khi build Sprint 1C/3/4.
