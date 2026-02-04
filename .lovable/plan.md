

## Kế hoạch: Sửa lỗi "relation categories does not exist"

### NGUYÊN NHÂN LỖI

RPC `get_laundry_batch_detail` tại migration `20260204155337_ba14dc4f-b714-49b5-8256-52995bcb1b01.sql` có lỗi:

```sql
-- Dòng 49 - SAI:
LEFT JOIN categories c ON c.id = i.category_id

-- ĐÚNG:
LEFT JOIN item_categories c ON c.id = i.category_id
```

Bảng `categories` KHÔNG tồn tại trong database. Bảng đúng là `item_categories`.

---

### GIẢI PHÁP

Tạo database migration để sửa RPC `get_laundry_batch_detail`:

```sql
CREATE OR REPLACE FUNCTION public.get_laundry_batch_detail(p_batch_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'batch', to_jsonb(lb),
    'vendor', CASE WHEN lv.id IS NOT NULL THEN to_jsonb(lv) ELSE NULL END,
    'hotel', to_jsonb(h),
    'delivery_staff', CASE WHEN ds.id IS NOT NULL THEN jsonb_build_object(
      'id', ds.id,
      'full_name', ds.full_name,
      'avatar_url', ds.avatar_url
    ) ELSE NULL END,
    'return_staff', CASE WHEN rs.id IS NOT NULL THEN jsonb_build_object(
      'id', rs.id,
      'full_name', rs.full_name,
      'avatar_url', rs.avatar_url
    ) ELSE NULL END,
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', lbi.id,
          'batch_id', lbi.batch_id,
          'item_id', lbi.item_id,
          'quantity_delivered', lbi.quantity_delivered,
          'weight_kg', lbi.weight_kg,
          'condition_note', lbi.condition_note,
          'quantity_returned', lbi.quantity_returned,
          'quantity_lost', lbi.quantity_lost,
          'quantity_damaged', lbi.quantity_damaged,
          'return_condition', lbi.return_condition,
          'item_code', i.code,
          'item_name', i.name,
          'item_thumbnail', i.thumbnail_url,
          'item_unit', i.unit,
          'category_name', c.name
        )
      )
      FROM laundry_batch_items lbi
      JOIN items i ON i.id = lbi.item_id
      LEFT JOIN item_categories c ON c.id = i.category_id  -- SỬA: categories → item_categories
      WHERE lbi.batch_id = lb.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM laundry_batches lb
  LEFT JOIN laundry_vendors lv ON lv.id = lb.vendor_id
  JOIN hotels h ON h.id = lb.hotel_id
  LEFT JOIN users ds ON ds.id = lb.delivery_staff_id
  LEFT JOIN users rs ON rs.id = lb.return_staff_id
  WHERE lb.id = p_batch_id;
  
  RETURN v_result;
END;
$$;
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| Database Migration (SQL) | Sửa `categories` → `item_categories` trong RPC |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Lỗi "relation categories does not exist" khi xem chi tiết lô giặt | Xem chi tiết lô giặt thành công |
| Không thể xem draft batch | Xem được chi tiết draft batch với items và category |

