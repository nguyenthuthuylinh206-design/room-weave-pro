

## Kế hoạch: Sửa lỗi Logic "Thêm vào lô giặt nháp"

### NGUYÊN NHÂN LỖI

Có **2 lỗi database** ngăn chặn việc thêm lô giặt:

| # | Lỗi | Nguyên nhân |
|---|-----|-------------|
| 1 | `column sent_quantity does not exist` | RPC `add_laundry_to_draft_batch` dùng `sent_quantity` nhưng bảng `laundry_batch_items` có cột tên `quantity_delivered` |
| 2 | `violates check constraint "laundry_batches_status_check"` | Status `'draft'` CHƯA được thêm vào constraint. Hiện tại chỉ cho phép: `'delivered', 'washing', 'ready', 'received', 'stocked', 'cancelled'` |

### SO SÁNH SCHEMA

**Bảng `laundry_batch_items` thực tế:**
```
| Column             | Type    |
|--------------------|---------|
| id                 | uuid    |
| batch_id           | uuid    |
| item_id            | uuid    |
| quantity_delivered | integer |  ← Tên đúng
| weight_kg          | numeric |
| quantity_returned  | integer |
| quantity_lost      | integer |
| quantity_damaged   | integer |
```

**RPC `add_laundry_to_draft_batch` đang dùng:**
```sql
UPDATE laundry_batch_items
SET sent_quantity = sent_quantity + v_item.quantity  ← SAI
...
INSERT INTO laundry_batch_items (batch_id, item_id, sent_quantity)  ← SAI
```

**Constraint hiện tại:**
```sql
CHECK (status IN ('delivered', 'washing', 'ready', 'received', 'stocked', 'cancelled'))
-- THIẾU 'draft'
```

---

### GIẢI PHÁP

#### 1. Thêm status `'draft'` vào constraint

```sql
ALTER TABLE laundry_batches 
DROP CONSTRAINT IF EXISTS laundry_batches_status_check;

ALTER TABLE laundry_batches
ADD CONSTRAINT laundry_batches_status_check 
CHECK (status IN ('draft', 'delivered', 'washing', 'ready', 'received', 'stocked', 'cancelled'));
```

#### 2. Sửa RPC `add_laundry_to_draft_batch`

Thay đổi tất cả các reference từ `sent_quantity` sang `quantity_delivered`:

```sql
CREATE OR REPLACE FUNCTION public.add_laundry_to_draft_batch(...)
...
  -- Thay đổi 1: UPDATE
  UPDATE public.laundry_batch_items
  SET quantity_delivered = quantity_delivered + v_item.quantity,
      updated_at = now()
  WHERE id = v_existing_item_id;

  -- Thay đổi 2: INSERT
  INSERT INTO public.laundry_batch_items (
    batch_id, item_id, quantity_delivered
  ) VALUES (
    v_batch_id, v_item.item_id, v_item.quantity
  );

  -- Thay đổi 3: SUM
  UPDATE public.laundry_batches
  SET total_items = (
    SELECT COALESCE(SUM(quantity_delivered), 0)
    FROM public.laundry_batch_items
    WHERE batch_id = v_batch_id
  )
  ...
```

#### 3. Sửa Query trong `useDraftLaundryBatch`

```typescript
// Hiện tại (SAI):
items:laundry_batch_items(id, item_id, sent_quantity, ...)

// Sửa thành (ĐÚNG):
items:laundry_batch_items(id, item_id, quantity_delivered, ...)
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi | Độ phức tạp |
|------|----------|-------------|
| Database Migration | Thêm `'draft'` vào constraint + Sửa RPC | Cao |
| `src/hooks/useLaundryRequests.ts` | Sửa query `sent_quantity` → `quantity_delivered` | Thấp |

---

### CHI TIẾT MIGRATION SQL

```sql
-- 1. Cập nhật constraint để cho phép status 'draft'
ALTER TABLE public.laundry_batches 
DROP CONSTRAINT IF EXISTS laundry_batches_status_check;

ALTER TABLE public.laundry_batches
ADD CONSTRAINT laundry_batches_status_check 
CHECK (status IN ('draft', 'delivered', 'washing', 'ready', 'received', 'stocked', 'cancelled'));

-- 2. Sửa RPC add_laundry_to_draft_batch với column name đúng
CREATE OR REPLACE FUNCTION public.add_laundry_to_draft_batch(
  p_tenant_id UUID,
  p_hotel_id UUID,
  p_laundry_request_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID;
  v_today DATE := CURRENT_DATE;
  v_batch_code TEXT;
  v_request RECORD;
  v_item RECORD;
  v_existing_item_id UUID;
BEGIN
  -- Get the laundry request
  SELECT * INTO v_request
  FROM public.laundry_requests
  WHERE id = p_laundry_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu giặt';
  END IF;

  IF v_request.status = 'added_to_batch' THEN
    RAISE EXCEPTION 'Yêu cầu giặt đã được thêm vào lô khác';
  END IF;

  -- Find or create draft batch for today
  SELECT id INTO v_batch_id
  FROM public.laundry_batches
  WHERE tenant_id = p_tenant_id
    AND hotel_id = p_hotel_id
    AND status = 'draft'
    AND DATE(created_at) = v_today
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    -- Generate batch code
    SELECT 'LB-' || TO_CHAR(v_today, 'YYMMDD') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 3, '0')
    INTO v_batch_code
    FROM public.laundry_batches
    WHERE tenant_id = p_tenant_id
      AND DATE(created_at) = v_today;

    -- Create new draft batch
    INSERT INTO public.laundry_batches (
      tenant_id, hotel_id, batch_code, status, total_items, notes
    ) VALUES (
      p_tenant_id, p_hotel_id, v_batch_code, 'draft', 0, 'Tự động tạo từ kiểm tra phòng'
    )
    RETURNING id INTO v_batch_id;
  END IF;

  -- Add items to batch
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_request.items) 
    AS x(item_id UUID, item_name TEXT, quantity INTEGER, item_code TEXT)
  LOOP
    -- Check if item already exists in batch
    SELECT id INTO v_existing_item_id
    FROM public.laundry_batch_items
    WHERE batch_id = v_batch_id AND item_id = v_item.item_id;

    IF v_existing_item_id IS NOT NULL THEN
      -- Update existing item quantity (SỬA: quantity_delivered thay vì sent_quantity)
      UPDATE public.laundry_batch_items
      SET quantity_delivered = quantity_delivered + v_item.quantity
      WHERE id = v_existing_item_id;
    ELSE
      -- Insert new item (SỬA: quantity_delivered thay vì sent_quantity)
      INSERT INTO public.laundry_batch_items (
        batch_id, item_id, quantity_delivered
      ) VALUES (
        v_batch_id, v_item.item_id, v_item.quantity
      );
    END IF;
  END LOOP;

  -- Update batch total (SỬA: quantity_delivered thay vì sent_quantity)
  UPDATE public.laundry_batches
  SET total_items = (
    SELECT COALESCE(SUM(quantity_delivered), 0)
    FROM public.laundry_batch_items
    WHERE batch_id = v_batch_id
  ),
  updated_at = now()
  WHERE id = v_batch_id;

  -- Update laundry request status
  UPDATE public.laundry_requests
  SET status = 'added_to_batch',
      laundry_batch_id = v_batch_id,
      added_at = now(),
      updated_at = now()
  WHERE id = p_laundry_request_id;

  RETURN v_batch_id;
END;
$$;
```

---

### LUỒNG SAU KHI SỬA

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. User click "Thêm vào lô giặt nháp"                                        │
│    └── Dialog xác nhận mở                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. User click "Xác nhận thêm"                                                │
│    └── Gọi RPC add_laundry_to_draft_batch                                   │
│        ├── Tìm/tạo batch status='draft' (NOW ALLOWED)                       │
│        ├── INSERT/UPDATE laundry_batch_items.quantity_delivered (NOW WORKS) │
│        ├── UPDATE batch.total_items                                         │
│        └── UPDATE laundry_request.status='added_to_batch'                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. UI cập nhật realtime                                                      │
│    ├── Request biến mất khỏi danh sách "pending"                            │
│    ├── Draft batch card hiển thị số lượng mới                               │
│    └── Toast thông báo thành công                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Tạo draft batch | Lỗi constraint | Thành công |
| Thêm items vào batch | Lỗi column | Thành công |
| Query draft batch | Lỗi column | Thành công |
| Quy trình hoàn chỉnh | Không hoạt động | draft → delivered → ... |

