

## Vấn đề: Migration trước bỏ sót 3 items trong phòng đang xem

**Bằng chứng từ DB cho phòng `997ffb2a`:**

| Item | item_type | category | default_item_type |
|---|---|---|---|
| Khăn tắm lớn | `equipment` ❌ | Đồ vải | **NULL** ❌ |
| Ấm đun nước | `equipment` ✅ | Thiết bị | **NULL** ❌ |
| Bàn chải đánh răng | `equipment` ❌ | Tiêu hao | **NULL** ❌ |

→ Migration trước chỉ UPDATE khi `default_item_type IS NOT NULL` → 3 category này có NULL nên bị skip → 3 items giữ nguyên `equipment` sai.

**Bằng chứng category bị duplicate**: Có nhiều bản ghi cùng tên ("Đồ vải", "Tiêu hao", "Thiết bị") — một số đã có `default_item_type`, một số NULL. 3 items trong phòng đang trỏ tới đúng các bản NULL.

## Kế hoạch sửa — 1 migration data triệt để hơn

| # | Bảng | Hành động |
|---|---|---|
| 1 | `item_categories` | UPDATE `default_item_type` cho TẤT CẢ category còn NULL theo tên: "Đồ vải"→`linen`, "Tiêu hao"/"Phòng tắm"→`consumable`, "Thiết bị"/"Phòng khách"/"Phòng ngủ"/"Tiện nghi"→`equipment`, "Nội thất"→`furniture` |
| 2 | `items` | UPDATE `items.item_type` = `category.default_item_type` cho mọi item bị lệch — sau khi bước 1 đã chuẩn hoá hết |

### SQL dự kiến

```sql
-- Bước 1: chuẩn hoá toàn bộ category NULL còn sót
UPDATE item_categories SET default_item_type = 'linen'
  WHERE default_item_type IS NULL AND name ILIKE '%đồ vải%';
UPDATE item_categories SET default_item_type = 'consumable'
  WHERE default_item_type IS NULL AND (name ILIKE '%tiêu hao%' OR name ILIKE '%phòng tắm%');
UPDATE item_categories SET default_item_type = 'equipment'
  WHERE default_item_type IS NULL AND (name ILIKE '%thiết bị%' OR name ILIKE '%phòng khách%' OR name ILIKE '%phòng ngủ%' OR name ILIKE '%tiện nghi%');
UPDATE item_categories SET default_item_type = 'furniture'
  WHERE default_item_type IS NULL AND name ILIKE '%nội thất%';

-- Bước 2: đồng bộ items.item_type theo category
UPDATE items i SET item_type = c.default_item_type::text::item_type
FROM item_categories c
WHERE i.category_id = c.id
  AND c.default_item_type IS NOT NULL
  AND (i.item_type IS NULL OR i.item_type::text != c.default_item_type::text);
```

## Quy tắc giữ nguyên

- Tiếng Việt thuần
- Không đổi code
- Tuân thủ spec `category-driven-classification-spec`
- Không xoá category duplicate (để owner tự dọn nếu muốn)

## Kết quả mong đợi sau migration

Phòng `997ffb2a` sẽ render:
- **Khăn tắm lớn** → `linen` → Daily hiện **OK / Thiếu / Hỏng** ✅
- **Ấm đun nước** → `equipment` → Daily hiện **OK / Hỏng** (đúng nghiệp vụ)
- **Bàn chải đánh răng** → `consumable` → Daily hiện **OK / Thiếu / Hết** ✅

Tất cả phòng khác trong tenant cũng tự động được fix.

