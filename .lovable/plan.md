# Audit 17 overload RPC còn lại (F-RPC-OVERLOAD-02)

## Bối cảnh

Sau khi clean `complete_room_delivery`, `confirm_receive_order`, `deliver_stop`, file `src/test/rpc-signature-drift.test.ts` vẫn whitelist 17 RPC còn overload trùng tên — rủi ro PostgREST chọn nhầm. Mục tiêu: kiểm toán từng RPC, migrate caller, DROP overload thừa, xoá khỏi whitelist.

## Phân loại 17 RPC theo độ rủi ro

**Nhóm A — Phụ thêm 1 param mở rộng (an toàn, DROP narrow)**
Cặp đôi old/new chỉ khác 1 param optional. Caller TS dùng named-args → đã ngầm gọi signature wider. DROP narrow không break runtime.


| RPC                                | Diff                                         |
| ---------------------------------- | -------------------------------------------- |
| `apply_room_standards`             | + `p_user_id`                                |
| `create_distribution_order`        | + `p_auto_release, p_supplement_request_ids` |
| `create_inbound_transaction`       | + `p_to_warehouse_id`                        |
| `create_outbound_transaction`      | + `p_from_warehouse_id`                      |
| `get_categories_with_stats`        | + `p_hotel_id`                               |
| `get_distribution_orders_filtered` | + `p_floor, p_shift_date, p_shift_code`      |
| `get_items_filtered`               | + `p_warehouse_id`                           |
| `get_monthly_expenses`             | + `p_hotel_id`                               |
| `get_recent_activities`            | + `p_hotel_id`                               |
| `handover_batch`                   | + `p_adjustments`                            |
| `settle_batch_compensation`        | + `_compensation_amount, _notes`             |
| `setup_room_initial`               | + `p_user_id`                                |
| `undo_room_delivery_confirmation`  | + `p_performed_by`                           |


**Nhóm B — Hai signature khác hẳn (rủi ro cao, cần audit caller kỹ)**


| RPC                                 | Old                                                                       | New                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `create_laundry_loss_transaction`   | `p_batch_id, p_batch_code, p_item_id, p_quantity, p_loss_type` (per-item) | `p_items jsonb, p_loss_type, p_related_id` (batch jsonb) |
| `create_laundry_return_transaction` | tương tự, per-item                                                        | batch jsonb                                              |
| `get_laundry_batches_filtered`      | `p_from_date/p_to_date, p_limit/p_offset`                                 | `p_search, p_page/p_page_size`                           |
| `setup_new_tenant`                  | `p_tenant_id, p_hotel_name…`                                              | `p_user_id, p_tenant_name, p_tenant_email…`              |


## Kế hoạch 4 sprint

### Sprint A1 — Nhóm A round 1 (read-only & idempotent, low blast radius)

RPC: `get_categories_with_stats`, `get_monthly_expenses`, `get_recent_activities`, `get_distribution_orders_filtered`, `get_items_filtered`, `get_laundry_batches_filtered` (chỉ phần read).

- Audit caller: xác nhận tất cả đang gọi wider signature.
- 1 migration DROP các overload narrow.
- Xoá 6 entry khỏi `ALLOWED_OVERLOADS`.

### Sprint A2 — Nhóm A round 2 (mutation 1 RPC = 1 transaction)

RPC: `apply_room_standards`, `setup_room_initial`, `undo_room_delivery_confirmation`, `handover_batch`, `settle_batch_compensation`.

- Tương tự A1 nhưng có write → cần kiểm tra log/audit sau DROP.
- 1 migration DROP narrow.

### Sprint A3 — Nhóm A round 3 (mutation lớn)

RPC: `create_distribution_order`, `create_inbound_transaction`, `create_outbound_transaction`.

- Cần đảm bảo caller truyền đủ tham số mới (vd. `p_supplement_request_ids` có thể `null`).
- Update hooks nếu thiếu key wrapper.

### Sprint B — Nhóm B (cần audit nghiệp vụ)

Mỗi RPC làm riêng 1 PR vì semantics khác:

1. `create_laundry_loss_transaction` + `create_laundry_return_transaction`: tìm caller per-item, migrate sang jsonb batch hoặc giữ per-item làm canonical.
2. `get_laundry_batches_filtered`: thống nhất pagination (limit/offset hay page/page_size). Pick 1, migrate caller.
3. `setup_new_tenant`: nhiều khả năng cũ là legacy bootstrap CLI / cũ là wizard onboarding mới. Xác định kẻ thắng.

## Quy trình chung mỗi RPC

1. `grep -rn '<rpc>' --include='*.ts' --include='*.tsx' src/` → list caller.
2. Kiểm tra `supabase.rpc('<rpc>', { ... })` payload xem key trùng signature nào.
3. Nếu caller dùng wider: chỉ cần DROP narrow.
4. Nếu caller dùng narrow: refactor sang wider trước (thêm key thiếu = `null`), test, rồi DROP.
5. Regenerate `docs/architecture/_generated/db-functions.tsv` (`bash scripts/audit/dump-db-schema.sh`).
6. Xoá entry khỏi `ALLOWED_OVERLOADS`.
7. Chạy `bunx vitest run src/test/rpc-signature-drift.test.ts` → phải pass.

## Rollback

- Mỗi migration DROP đi kèm 1 file ghi chú phục hồi: `supabase/migrations/_rollback/<ts>_restore_<rpc>.sql` chứa `CREATE OR REPLACE FUNCTION …` của signature đã drop (lấy từ `pg_get_functiondef` trước khi drop).
- Nếu sau release thấy 404/`PGRST202` từ client cũ → áp lại rollback file.

## Bắt đầu từ đâu?

**Đề xuất chạy Sprint A1 trước** trong response này (6 RPC read-only, blast radius nhỏ nhất, dễ verify). Sprint A2/A3/B làm các lượt sau.

**Câu hỏi cho bạn:** OK chạy ngay Sprint A1 