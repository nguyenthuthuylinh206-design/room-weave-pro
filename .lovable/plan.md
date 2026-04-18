

## Lỗi: `handover_batch` RPC viết sai schema → insert NULL vào `item_id`

### Nguyên nhân chính xác

File `supabase/migrations/20260131024728_99ac130a-0514-4896-8d84-f725be76e49b.sql` (RPC `handover_batch`) có 3 lỗi:

1. **Insert sai cấu trúc** vào `inventory_transactions`:
   ```sql
   INSERT INTO inventory_transactions (
     tenant_id, hotel_id, transaction_code, transaction_type,
     reference_type, reference_id, notes, created_by, status
   ) VALUES (...)  -- THIẾU item_id, quantity, quantity_before, quantity_after
   ```
   → `item_id` là **NOT NULL** → lỗi `null value in column "item_id"`.

2. **Tham chiếu bảng KHÔNG TỒN TẠI**: `inventory_transaction_items` không có trong DB. Mỗi item phải là **1 dòng riêng** trong `inventory_transactions` (theo pattern `create_outbound_transaction` đã có).

3. **Hệ quả**: Bấm "Giao batch" → RPC fail → phiếu kẹt ở trạng thái `pending`, kho không trừ.

### Cách sửa — tạo migration mới viết lại `handover_batch`

**File mới**: `supabase/migrations/<timestamp>_fix_handover_batch_inventory_transactions.sql`

Sửa logic insert: thay vì 1 dòng "header" + nhiều rows ở bảng phụ, tạo **1 dòng `inventory_transactions` cho mỗi item** đã giao, theo đúng schema:

```sql
-- Trong vòng FOR LOOP qua từng item (line 90-135):
INSERT INTO inventory_transactions (
  tenant_id, hotel_id, transaction_code, transaction_type,
  transaction_category, item_id, quantity, 
  quantity_before, quantity_after, unit_price, total_value,
  related_type, related_id, from_warehouse_id,
  notes, created_by, status, transaction_date
) VALUES (
  v_order.tenant_id, v_order.hotel_id, 
  v_transaction_code || '-' || row_number,  -- mỗi item có suffix riêng
  'out', 'staff_assign',
  v_item.item_id, v_qty_actual,
  v_item.quantity_in_stock,                 -- before
  GREATEST(0, v_item.quantity_in_stock - v_qty_actual),  -- after
  v_item.unit_price, v_item.unit_price * v_qty_actual,
  'distribution_handover', v_order.id, v_order.from_warehouse_id,
  'Giao hàng cho NV - ' || v_order.order_code,
  v_actor_id, 'completed', now()
);
```

Đồng thời:
- **Bỏ insert vào `inventory_transaction_items`** (bảng không tồn tại)
- **Trừ `items.quantity_in_stock`** giữ nguyên như cũ
- **Trừ `warehouse_stock.quantity`** nếu có warehouse (đồng bộ với pattern outbound)
- **`v_transaction_id` cuối cùng** dùng dòng đầu tiên (hoặc bỏ field `transaction_id` trên `distribution_orders` nếu không bắt buộc) để gán vào `distribution_orders.transaction_id`

### Phạm vi

- **1 file migration mới** — chỉ `CREATE OR REPLACE FUNCTION handover_batch`
- Không sửa client code (`useRouteBatch.ts` đã gọi đúng)
- Không sửa UI
- Không sửa bảng — chỉ sửa hàm

### Sau khi sửa

Bấm **"Giao batch này"** → RPC chạy thành công:
- Tạo N dòng `inventory_transactions` (N = số item)
- Trừ `items.quantity_in_stock` 
- Đổi batch sang `handed_over`
- Đổi order sang `released`
- Toast xanh "Đã giao hàng cho nhân viên thành công"

Cô bấm thử lại nút "Giao batch này" sẽ chạy ngon.

