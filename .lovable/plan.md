
# Plan: Chuẩn hóa & làm cứng logic Xuất/Nhập kho

Mục tiêu: đưa toàn bộ luồng inventory về **1 nguồn sự thật**, không còn category trùng nghĩa, không còn nguy cơ trừ kho 2 lần, không còn race-condition khi nhiều người xuất song song.

Phạm vi gồm 3 đợt (rollout staged, mỗi đợt deploy + test riêng để có thể rollback).

---

## SPRINT 1 — Chuẩn hóa danh mục giao dịch (category)

### Vấn đề hiện tại
- DB cột `transaction_category` là `text` tự do → đang tồn tại 12 giá trị khác nhau, FE chỉ biết 8.
- `room_assign` (UI cũ) và `room_deliver` (distribution trigger) cùng nghĩa "giao đồ cho phòng" nhưng chạy 2 luồng → có thể trừ 2 lần.
- Quick dialogs / Mobile forms / Desktop forms khai báo enum khác nhau.

### A. Logic nghiệp vụ — danh sách category chuẩn (13 giá trị)

**Nhập (5):**
| key | Khi nào |
|---|---|
| `purchase` | Mua từ nhà cung cấp (có/không PO) |
| `return` | Phòng/nhân viên trả lại đồ về kho |
| `return_to_stock` | Tự động khi hủy room order |
| `laundry_return` | Nhận đồ giặt về (`laundry → stocked`) — đổi tên từ `laundry` để rõ chiều |
| `other_in` | Nhập tay khác — đổi tên từ `other` |

**Xuất (7):**
| key | Khi nào |
|---|---|
| `room_deliver` | Giao đồ cho phòng (qua distribution order — luồng duy nhất) |
| `staff_assign` | Cấp đồ cho nhân viên |
| `laundry_send` | Gửi đồ đi giặt — đổi tên từ `laundry` |
| `maintenance` | Cấp phụ tùng cho phiếu bảo trì |
| `disposal` | Hủy do hỏng/hết date |
| `warehouse_release` | Xuất nội bộ ngoài 6 luồng trên |
| `adjustment_out` | Lệch kiểm kê (short) — đổi tên từ `adjustment` |

**Chuyển (1):** `internal_transfer`

> `room_assign` bị **deprecated**: data cũ giữ nguyên, UI ẩn, RPC chặn không cho tạo mới.

### B. Schema / migration
1. Tạo ENUM `inventory_transaction_category_v2` với 13 giá trị trên + alias cho data cũ (`adjustment`→`adjustment_out`, `laundry`→`laundry_send`/`laundry_return` tùy `transaction_type`, `other`→`other_in`/`other_out`, `room_assign`→`room_deliver`).
2. Backfill dữ liệu cũ qua UPDATE có điều kiện theo `transaction_type`.
3. ALTER COLUMN `inventory_transactions.transaction_category` sang ENUM mới với `USING`.
4. Thêm CHECK constraint: `(transaction_type='in' AND category IN (...)) OR (transaction_type='out' AND category IN (...)) OR (transaction_type='transfer' AND category='internal_transfer')`.
5. Rollback: giữ migration đảo ngược về `text`.

### C. RPC / server actions
- `create_inbound_transaction`: validate `p_transaction_category` ∈ 5 giá trị nhập.
- `create_outbound_transaction`: validate ∈ 7 giá trị xuất, **reject** `room_deliver` (chỉ trigger được tạo) và `room_assign` (deprecated).
- `delete_inventory_transaction`: với `laundry_send` / `laundry_return` / `adjustment_out` → KHÔNG reverse `quantity_in_stock`, chỉ xóa bản ghi (vì stock đã được điều chỉnh ở module nguồn).

### D. UI screens
- `InboundPage`, `MobileInboundForm`, `QuickInboundDialog`: dùng chung enum 5 giá trị.
- `OutboundPage`, `MobileOutboundForm`, `QuickOutboundDialog`: enum 6 giá trị (ẩn `room_deliver` vì chỉ tạo qua distribution).
- `TransactionListPage`, `MobileTransactionCard`: cập nhật `categoryLabels` cho 13 key.
- File `src/types/inventory.types.ts`: đồng bộ type `TransactionCategory`.

### E. Permission — không đổi.

### F. Test
- SQL test: parallel INSERT 12 category cũ → backfill đúng 13 category mới.
- FE unit: snapshot label tiếng Việt cho 13 category.
- E2E: tạo inbound `purchase`, outbound `staff_assign`, kiểm tra hiển thị badge & filter.

### G. Rollout
- Migration enum + backfill chạy 1 transaction.
- Deploy FE cùng lúc.
- Rollback: ALTER COLUMN về `text`, drop enum.

---

## SPRINT 2 — Hợp nhất luồng "Cấp đồ cho phòng" + chống double-deduction

### Vấn đề
- UI Outbound cũ cho `room_assign` → giảm `items.quantity_in_stock` ngay.
- Distribution flow chuẩn: tạo order → approve → confirm delivery → trigger `room_items_update_inventory` cũng giảm `items.quantity_in_stock`.
- Nếu staff vô tình dùng cả 2 → **trừ 2 lần** cho cùng đồ.

### A. Logic
- Mọi việc cấp đồ cho phòng **bắt buộc** đi qua Distribution Order.
- Outbound page chỉ giữ 6 category (không có `room_assign`).
- `QuickOutboundDialog` cho phòng → chuyển hướng sang `CreateDistributionPage`.

### B. Schema
- Không đổi schema. Chỉ thêm RPC guard.

### C. RPC
- `create_outbound_transaction`: nếu `p_transaction_category = 'room_assign'` → `RAISE EXCEPTION 'Vui lòng dùng Phiếu cấp phát phòng (Distribution Order)'`.
- Trigger `room_items_update_inventory`: thêm idempotent key `(distribution_order_id, item_id)` để confirm 2 lần không trừ kho 2 lần (đã có UNIQUE? cần verify, nếu chưa thì thêm).

### D. UI
- `OutboundPage` + `MobileOutboundForm`: bỏ option `room_assign` khỏi RadioGroup.
- Nếu user mở link cũ có `?category=room_assign` → toast "Đã chuyển sang Phiếu cấp phát phòng" + redirect.
- `DistributionOrderDetailPage`: nút Confirm chỉ enable 1 lần (đã có), nhưng thêm khóa optimistic ở DB.

### E. Permission — Distribution cần `manage_inventory_distribution`. Giữ nguyên.

### F. Test
- SQL: gọi `create_outbound_transaction` với `room_assign` → expect exception.
- E2E: tạo distribution order, confirm 2 lần liên tiếp → stock chỉ trừ 1 lần.

### G. Rollout
- Deploy guard RPC + UI cùng lúc.
- Quan sát 7 ngày, không có exception → drop hẳn category `room_assign` ở Sprint 3.

---

## SPRINT 3 — Khóa hàng (FOR UPDATE) + chuẩn hóa giá vốn

### Vấn đề
1. `create_outbound_transaction` validate stock rồi mới UPDATE — giữa 2 bước, request khác có thể xen vào → vượt tồn.
2. `create_inbound_transaction` ghi đè `items.unit_price` mỗi lần nhập → mất giá vốn lịch sử, báo cáo lệch.

### A. Logic
- Dùng `SELECT ... FOR UPDATE` trên `items` và `warehouse_stock` của các SKU đang giao dịch (sort theo `item_id` để tránh deadlock).
- Tách `unit_cost` (giá vốn lúc nhập) khỏi `unit_price` (giá bán/giá hiển thị):
  - `inventory_transactions.unit_price` đã có (lưu giá tại thời điểm giao dịch — giữ nguyên).
  - **KHÔNG ghi đè** `items.unit_price` khi inbound. Chỉ cập nhật khi user sửa thủ công ở Item page.
- `total_value` outbound dùng **Weighted Average Cost**: `SUM(qty_in × unit_price_in) / SUM(qty_in)` từ `inventory_transactions` còn lại.

### B. Schema
- Không thêm cột (đã đủ).
- Tạo VIEW `item_avg_cost` để tính WAC, dùng cho báo cáo.

### C. RPC
- `create_inbound_transaction`:
  - Mở `FOR UPDATE` trên `items` + `warehouse_stock` (theo thứ tự `item_id`).
  - Bỏ dòng `unit_price = COALESCE(v_item.unit_price, unit_price)` trong UPDATE items.
- `create_outbound_transaction`:
  - Mở `FOR UPDATE` trên `items` + `warehouse_stock`.
  - `v_unit_price` = SELECT FROM `item_avg_cost` (fallback `items.unit_price` nếu chưa có inbound).
- `create_warehouse_transfer`: tương tự.

### D. UI — không đổi.

### E. Permission — không đổi.

### F. Test
- SQL concurrency test: 5 transaction chạy song song xuất 1 SKU có tồn 10, mỗi cái xuất 3 → đúng 3 thành công, 2 fail "Insufficient stock".
- SQL WAC test: nhập 10 @ 100k, nhập 10 @ 150k, xuất 5 → `total_value` = 5 × 125k.
- Migration không ảnh hưởng giá hiển thị ở Item page.

### G. Rollout
- Migration RPC (CREATE OR REPLACE) → idempotent, không downtime.
- Rollback: giữ phiên bản cũ ở migration đảo ngược.

---

## Báo cáo cần xuất sau mỗi Sprint

| Hạng mục | Trước | Sau |
|---|---|---|
| Số category được dùng trong DB | 12 (hỗn loạn) | 13 (chuẩn hóa, có CHECK) |
| FE dialogs đồng bộ enum | 3/6 | 6/6 |
| Khả năng trừ kho 2 lần qua `room_assign` | Có | Không (RPC chặn) |
| Race-condition outbound song song | Có | Không (`FOR UPDATE`) |
| Giá vốn item bị ghi đè khi nhập | Có | Không (WAC) |
| Test coverage cho RPC inventory | ~40% | ≥80% (mục tiêu) |

---

## Tổng kết file dự kiến chạm

**Migrations (3 file):**
- `..._inventory_category_enum.sql` — Sprint 1
- `..._distribution_idempotent_guard.sql` — Sprint 2
- `..._inventory_for_update_and_wac.sql` — Sprint 3

**FE (≈10 file):**
- `src/types/inventory.types.ts`
- `src/pages/inventory/InboundPage.tsx`, `OutboundPage.tsx`, `TransactionListPage.tsx`
- `src/components/inventory/MobileInboundForm.tsx`, `MobileOutboundForm.tsx`
- `src/components/inventory/QuickInboundDialog.tsx`, `QuickOutboundDialog.tsx`
- `src/components/inventory/MobileTransactionCard.tsx`, `TransactionTypeBadge.tsx`

**Test (3 file SQL + 2 vitest):**
- `supabase/tests/inventory_category_backfill.sql`
- `supabase/tests/inventory_concurrency.sql`
- `supabase/tests/inventory_wac.sql`
- `src/components/inventory/__tests__/categoryLabels.test.tsx`
- `src/hooks/__tests__/useInventoryTransactions.test.ts`

**Memory mới:** `mem://features/inventory/transaction-category-standard-v1`

---

## Thứ tự đề xuất
Làm tuần tự **Sprint 1 → 2 → 3**, mỗi sprint deploy + verify trước khi sang sprint kế. Có thể duyệt từng sprint riêng nếu muốn nhỏ hơn.
