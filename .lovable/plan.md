

## Kế hoạch: Sửa lỗi "Hàng chưa được xác nhận nhận"

### NGUYÊN NHÂN GỐC

Function `confirm_receive_order` chỉ update trạng thái order nhưng **KHÔNG update trạng thái batch**:

| Bảng | Trước khi xác nhận | Sau khi xác nhận | Mong đợi |
|------|-------------------|-----------------|----------|
| `distribution_orders.status` | released | in_progress | in_progress |
| `distribution_order_batches.status` | handed_over | **handed_over** (không đổi) | **received** |

Khi giao hàng (`deliver_stop`), function kiểm tra:
```sql
IF v_batch.status NOT IN ('received', 'done') THEN
  RAISE EXCEPTION 'Batch not received yet';
```

Batch vẫn là `handed_over` → Lỗi!

---

### GIẢI PHÁP

Sửa function `confirm_receive_order` để update cả batch status:

```sql
-- Update all batches to 'received'
UPDATE distribution_order_batches
SET status = 'received',
    received_at = now(),
    received_by = v_actor_id,
    updated_at = now()
WHERE distribution_order_id = p_order_id
  AND status = 'handed_over';
```

Thêm đoạn code trên vào function **SAU** khi update `distribution_orders` và **TRƯỚC** khi return.

---

### HOTFIX DATABASE

Sau khi deploy migration, cần chạy hotfix cho các order đang bị stuck:

```sql
-- Fix orders đã in_progress nhưng batch chưa received
UPDATE distribution_order_batches
SET status = 'received',
    received_at = COALESCE(received_at, now()),
    updated_at = now()
WHERE distribution_order_id IN (
  SELECT id FROM distribution_orders WHERE status = 'in_progress'
)
AND status = 'handed_over';
```

---

### TÓM TẮT THAY ĐỔI

| Thay đổi | Mục đích |
|----------|----------|
| Sửa `confirm_receive_order` RPC | Tự động update batch status khi xác nhận nhận hàng |
| Hotfix data hiện tại | Sửa các batch đang bị stuck ở `handed_over` |

---

### KIỂM TRA SAU KHI SỬA

Order hiện tại sau khi hotfix:
- `distribution_orders.status`: `in_progress` ✓
- `distribution_order_batches.status`: `received` ✓ (thay vì `handed_over`)

Nhân viên sẽ ấn được nút GIAO mà không bị lỗi.

