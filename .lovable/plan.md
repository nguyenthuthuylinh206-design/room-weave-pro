

## Kế hoạch: Di chuyển Điều chỉnh Số lượng sang Bước Handover (Quản lý kho giao hàng)

### I. THAY ĐỔI FLOW

**Flow hiện tại:**
```text
HANDOVER                    CONFIRM RECEIVE              GIAO PHÒNG
(Quản lý kho)               (Nhân viên)                  (Nhân viên)
    │                           │                            │
    ▼                           ▼                            ▼
Không kiểm tra           Kiểm tra + điều chỉnh         Giao từng phòng
Không trừ kho            TRỪ KHO                       Cập nhật room_items
```

**Flow mới:**
```text
HANDOVER                    CONFIRM RECEIVE              GIAO PHÒNG
(Quản lý kho)               (Nhân viên)                  (Nhân viên)
    │                           │                            │
    ▼                           ▼                            ▼
KIỂM TRA + ĐIỀU CHỈNH      Chỉ xác nhận                 Giao từng phòng
TRỪ KHO                    (không trừ kho nữa)          Cập nhật room_items
```

### II. LÝ DO THAY ĐỔI

| Vấn đề hiện tại | Giải pháp mới |
|-----------------|---------------|
| Nhân viên không biết kho có đủ không | Quản lý kho kiểm tra trước khi giao |
| Nhân viên bị lỗi khi xác nhận | Quản lý kho đã điều chỉnh sẵn |
| Không có cơ hội sửa nếu thiếu hàng | Quản lý kho điều chỉnh ngay tại kho |

### III. THAY ĐỔI DATABASE

#### 3.1. Sửa RPC `handover_batch`

**Thêm tham số:**
```sql
CREATE OR REPLACE FUNCTION handover_batch(
  p_batch_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_adjustments jsonb DEFAULT NULL  -- MỚI: Danh sách điều chỉnh
) RETURNS jsonb
```

**Logic mới:**
1. Nếu `p_adjustments = NULL`:
   - Kiểm tra tồn kho tất cả items
   - Nếu thiếu → Trả về `INSUFFICIENT_STOCK` + danh sách thiếu
   - Nếu đủ → Trừ kho, cập nhật status
   
2. Nếu có `p_adjustments`:
   - Sử dụng số lượng điều chỉnh
   - Cập nhật `quantity_actual` cho từng item
   - Trừ kho theo `quantity_actual`
   - Cập nhật status

#### 3.2. Đơn giản hóa RPC `confirm_receive_order`

**Logic mới:**
- Chỉ cập nhật status từ `released` → `in_progress`
- KHÔNG trừ kho (đã trừ ở bước handover)
- KHÔNG cần kiểm tra tồn kho

### IV. THAY ĐỔI FRONTEND

#### 4.1. Cập nhật Hook `useHandoverBatch`

```typescript
export function useHandoverBatch() {
  return useMutation({
    mutationFn: async ({ 
      batchId, 
      adjustments  // THÊM MỚI
    }: { 
      batchId: string
      adjustments?: ItemAdjustment[]
    }) => {
      const { data, error } = await supabase.rpc('handover_batch', {
        p_batch_id: batchId,
        p_actor_id: user.id,
        p_adjustments: adjustments || null,
      })
      // Xử lý INSUFFICIENT_STOCK error
    }
  })
}
```

#### 4.2. Di chuyển AdjustQuantityDialog sang bước Handover

**Trong `RouteDetailView.tsx`:**

```typescript
// Handover batch handler - now with stock check
const handleHandoverFirstBatch = useCallback(async () => {
  if (!firstPendingBatch) return
  
  const result = await handoverBatch.mutateAsync({ 
    batchId: firstPendingBatch.id 
  })
  
  // Nếu thiếu hàng, mở dialog điều chỉnh
  if (!result.success && result.error === 'INSUFFICIENT_STOCK') {
    setInsufficientItems(result.insufficient_items)
    setAdjustDialogOpen(true)
  }
}, [firstPendingBatch, handoverBatch])

// Confirm với adjustments
const handleConfirmWithAdjustments = useCallback(async (
  adjustments: ItemAdjustment[], 
  reason: string
) => {
  if (!firstPendingBatch) return
  
  await handoverBatch.mutateAsync({ 
    batchId: firstPendingBatch.id, 
    adjustments 
  })
  
  setAdjustDialogOpen(false)
  toast.success('Đã giao hàng cho nhân viên với số lượng điều chỉnh')
}, [firstPendingBatch, handoverBatch])
```

#### 4.3. Cập nhật DeliveryStepWizard

**Thay đổi UI bước Handover:**

```tsx
// Step 1: Pending - Warehouse manager hands over WITH stock check
if (status === 'pending' && isWarehouseManager) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Kiểm tra hàng trong kho, điều chỉnh số lượng nếu thiếu, 
        sau đó giao cho nhân viên {assignedToName}
      </p>
      {onHandoverBatch && (
        <Button onClick={onHandoverBatch} className="w-full h-12">
          <Package className="h-5 w-5 mr-2" />
          Kiểm tra & Giao hàng cho nhân viên
        </Button>
      )}
    </div>
  )
}
```

### V. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| **Database Migration** | Sửa `handover_batch` để kiểm tra + trừ kho |
| **Database Migration** | Đơn giản hóa `confirm_receive_order` |
| `useRouteBatch.ts` | Cập nhật `useHandoverBatch` để nhận adjustments |
| `useRouteBatch.ts` | Đơn giản hóa `useConfirmReceiveOrder` |
| `RouteDetailView.tsx` | Di chuyển logic AdjustQuantityDialog sang handover |
| `DeliveryStepWizard.tsx` | Cập nhật text hướng dẫn |

### VI. QUY TRÌNH SAU KHI SỬA

```text
BƯỚC 1: QUẢN LÝ KHO GIAO HÀNG
─────────────────────────────
Manager ấn "Kiểm tra & Giao hàng cho nhân viên"
    │
    ▼
RPC kiểm tra tồn kho
    │
    ├── ĐỦ HÀNG ───────────────────────────────┐
    │                                          │
    └── THIẾU HÀNG                             │
        │                                      │
        ▼                                      │
    Mở AdjustQuantityDialog                    │
        │                                      │
        ├── [Điều chỉnh + Xác nhận]           │
        │        │                             │
        │        ▼                             │
        │   RPC với adjustments ───────────────┼──┐
        │                                      │  │
        └── [Quay lại chỉnh sửa phiếu]        │  │
                                               │  │
    ◄──────────────────────────────────────────┘  │
    │                                             │
    ▼                                             │
TRỪ KHO (quantity_in_stock ↓)  ◄──────────────────┘
Batch status → 'handed_over'
Order status → 'released'
    │
    ▼
BƯỚC 2: NHÂN VIÊN XÁC NHẬN NHẬN HÀNG
────────────────────────────────────
Nhân viên ấn "Xác nhận đã nhận hàng"
    │
    ▼
(KHÔNG trừ kho - đã trừ ở bước 1)
Order status → 'in_progress'
    │
    ▼
BƯỚC 3: GIAO ĐẾN TỪNG PHÒNG
───────────────────────────
Nhân viên giao hàng đến từng phòng
```

### VII. LỢI ÍCH

| Trước | Sau |
|-------|-----|
| Nhân viên gặp lỗi nếu kho thiếu | Quản lý kho đã xử lý trước |
| 2 bước kiểm tra kho | 1 bước kiểm tra duy nhất |
| Nhân viên bị stuck | Flow liền mạch |
| Không rõ ai chịu trách nhiệm | Quản lý kho chịu trách nhiệm điều chỉnh |

### VIII. CHI TIẾT TECHNICAL

#### Migration SQL cho `handover_batch`:

```sql
CREATE OR REPLACE FUNCTION handover_batch(
  p_batch_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_adjustments jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_batch record;
  v_order record;
  v_item record;
  v_insufficient jsonb := '[]'::jsonb;
  v_qty_actual integer;
  v_transaction_code text;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Get batch and order info
  SELECT * INTO v_batch FROM distribution_order_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  
  SELECT * INTO v_order FROM distribution_orders WHERE id = v_batch.distribution_order_id;
  
  -- Validate batch status
  IF v_batch.status NOT IN ('open', 'pending') THEN
    RAISE EXCEPTION 'Batch already handed over';
  END IF;
  
  -- Check stock for all items in this batch
  IF p_adjustments IS NULL THEN
    FOR v_item IN
      SELECT doi.item_id, i.name, i.code, 
             SUM(doi.quantity) as required,
             i.quantity_in_stock as available
      FROM distribution_order_rooms dor
      JOIN distribution_order_items doi ON doi.distribution_order_room_id = dor.id
      JOIN items i ON i.id = doi.item_id
      WHERE dor.distribution_order_id = v_order.id
        AND (dor.batch_number = v_batch.batch_number OR v_batch.batch_number IS NULL)
      GROUP BY doi.item_id, i.name, i.code, i.quantity_in_stock
    LOOP
      IF v_item.available < v_item.required THEN
        v_insufficient := v_insufficient || jsonb_build_object(
          'item_id', v_item.item_id,
          'item_name', v_item.name,
          'item_code', v_item.code,
          'required', v_item.required,
          'available', v_item.available,
          'shortage', v_item.required - v_item.available
        );
      END IF;
    END LOOP;
    
    -- If insufficient, return error with details
    IF jsonb_array_length(v_insufficient) > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_STOCK',
        'message', 'Một số mặt hàng không đủ trong kho',
        'insufficient_items', v_insufficient
      );
    END IF;
  END IF;
  
  -- Generate transaction code
  v_transaction_code := 'TXN-HDO-' || to_char(now(), 'YYYYMMDD-HH24MISS');
  
  -- Deduct inventory and update quantity_actual
  FOR v_item IN
    SELECT doi.id as item_row_id, doi.item_id, doi.quantity,
           i.hotel_id, i.tenant_id, i.quantity_in_stock, i.quantity_pending
    FROM distribution_order_rooms dor
    JOIN distribution_order_items doi ON doi.distribution_order_room_id = dor.id
    JOIN items i ON i.id = doi.item_id
    WHERE dor.distribution_order_id = v_order.id
      AND (dor.batch_number = v_batch.batch_number OR v_batch.batch_number IS NULL)
  LOOP
    -- Get actual quantity (from adjustments or original)
    IF p_adjustments IS NOT NULL THEN
      SELECT (adj->>'quantity_actual')::integer INTO v_qty_actual
      FROM jsonb_array_elements(p_adjustments) adj
      WHERE (adj->>'item_id')::uuid = v_item.item_id;
      
      IF v_qty_actual IS NULL THEN
        v_qty_actual := v_item.quantity;
      END IF;
      
      -- Update quantity_actual
      UPDATE distribution_order_items
      SET quantity_actual = v_qty_actual
      WHERE id = v_item.item_row_id;
    ELSE
      v_qty_actual := v_item.quantity;
    END IF;
    
    -- Create inventory transaction
    INSERT INTO inventory_transactions (...) VALUES (...);
    
    -- Update item stock
    UPDATE items
    SET quantity_in_stock = quantity_in_stock - v_qty_actual,
        quantity_pending = COALESCE(quantity_pending, 0) + v_qty_actual
    WHERE id = v_item.item_id;
  END LOOP;
  
  -- Update batch and order status
  UPDATE distribution_order_batches SET status = 'handed_over', ... WHERE id = p_batch_id;
  UPDATE distribution_orders SET status = 'released', ... WHERE id = v_order.id;
  
  RETURN jsonb_build_object('success', true, ...);
END;
$$;
```

