

## Kế hoạch Sửa Lỗi Constraint - Distribution Orders Status

### I. NGUYÊN NHÂN LỖI

**Lỗi:** `new row for relation "distribution_orders" violates check constraint "distribution_orders_status_check"`

**Nguyên nhân gốc:**

| Nguồn | Status cho phép |
|-------|----------------|
| **TypeScript types** (RouteStatus) | `pending`, `released`, `in_progress`, `completed`, `closed`, `cancelled` |
| **DB Constraint hiện tại** | `pending`, `in_progress`, `completed`, `cancelled` |
| **RPC handover_batch()** | Cố gán status = `'released'` → **LỖI** |
| **RPC close_route_if_complete()** | Cố gán status = `'closed'` → **Sẽ LỖI** |

**Constraint thiếu 2 status:**
- `released` - Khi kho đã giao hàng cho nhân viên
- `closed` - Khi phiếu đã hoàn thành và đóng

### II. GIẢI PHÁP

Cập nhật constraint để thêm 2 status còn thiếu:

```sql
ALTER TABLE distribution_orders 
DROP CONSTRAINT distribution_orders_status_check;

ALTER TABLE distribution_orders 
ADD CONSTRAINT distribution_orders_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,      -- Chờ giao cho nhân viên
  'released'::text,     -- Đã giao cho nhân viên (chờ nhân viên xác nhận)
  'in_progress'::text,  -- Đang giao đến các phòng
  'completed'::text,    -- Hoàn thành giao tất cả phòng
  'closed'::text,       -- Đã đóng phiếu
  'cancelled'::text     -- Đã hủy
]));
```

### III. QUY TRÌNH STATUS SAU KHI SỬA

```text
pending → released → in_progress → completed → closed
    │                                             │
    └──────────────────────────────────────────────┘
                        cancelled
```

| Status | Mô tả | Chuyển từ |
|--------|-------|-----------|
| `pending` | Phiếu mới tạo, chờ kho giao hàng | - |
| `released` | Kho đã giao hàng cho NV, chờ NV xác nhận | `pending` |
| `in_progress` | NV đã nhận hàng, đang giao đến phòng | `released` |
| `completed` | Tất cả phòng đã được giao | `in_progress` |
| `closed` | Phiếu đã đóng | `completed` |
| `cancelled` | Phiếu bị hủy | `pending`, `in_progress` |

### IV. KẾ HOẠCH TRIỂN KHAI

**Migration SQL:**

```sql
-- Update distribution_orders status constraint to include 'released' and 'closed'
ALTER TABLE distribution_orders 
DROP CONSTRAINT IF EXISTS distribution_orders_status_check;

ALTER TABLE distribution_orders 
ADD CONSTRAINT distribution_orders_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'released'::text,
  'in_progress'::text,
  'completed'::text,
  'closed'::text,
  'cancelled'::text
]));
```

### V. FILES LIÊN QUAN (KHÔNG CẦN SỬA CODE)

| File | Trạng thái |
|------|-----------|
| `route-batch.types.ts` | Đã định nghĩa đúng RouteStatus với 6 giá trị |
| `RouteDetailView.tsx` | Đã sử dụng đúng các status |
| `DeliveryStepWizard.tsx` | Đã sử dụng đúng các status |
| RPC `handover_batch()` | Đã sử dụng đúng 'released' |
| RPC `close_route_if_complete()` | Đã sử dụng đúng 'closed' |

**Chỉ cần cập nhật constraint trong database** - code đã đúng sẵn.

### VI. SAU KHI SỬA

**Test scenario:**
1. Mở phiếu đang `pending`
2. Click "Giao hàng cho nhân viên"
3. Phiếu chuyển sang `released` ✅ (không còn lỗi)
4. Nhân viên click "Xác nhận nhận hàng"
5. Phiếu chuyển sang `in_progress` ✅

