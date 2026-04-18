

## Vấn đề thực: Data legacy phân loại sai (không phải bug code)

**Bằng chứng từ DB cho phòng `997ffb2a-...`:**

| room_item | items.item_type | category | default_item_type | Đúng? |
|---|---|---|---|---|
| Khăn tắm lớn | `equipment` | Đồ vải | NULL | ❌ phải là `linen` |
| Ấm đun nước | `equipment` | Thiết bị | NULL | ✅ đúng |
| Bàn chải đánh răng | `equipment` | **Tiêu hao** | NULL | ❌ phải là `consumable` |

→ Code đã đúng (sửa fallback ở plan trước rồi). Nhưng **fallback không kích hoạt** vì `items.item_type` đã có giá trị 'equipment' rõ ràng → fallback chain `?? category.default_item_type` bị bỏ qua.

→ Daily + equipment = chỉ có **OK + Hỏng** (đúng theo `roomCheckConfig.equipmentActions: ['ok', 'damaged']`).

→ Hiển thị 0/3 sai loại tab: Khăn tắm lớn nằm ở tab "Đồ vải" (đúng theo category) nhưng nội bộ vẫn xử lý là equipment → render thiếu nút Thiếu.

## Có 2 nguồn gốc data sai cần sửa

**A. Data items (15+ record có `item_type` sai, `default_item_type` NULL):**
- 1 × Khăn tắm lớn (equipment) — phải là linen
- 1 × Bàn chải đánh răng (equipment) — phải là consumable
- Cô owner đã có 4 record Khăn tắm khác đã đúng `linen`, chứng tỏ đã từng sửa đúng nhưng record cũ chưa update

**B. Data item_categories (default_item_type NULL):**
- Category "Đồ vải" có 1 record `default_item_type = NULL`
- Category "Tiêu hao" có 1 record `default_item_type = NULL`
- Category "Thiết bị" có 1 record `default_item_type = NULL`

## Kế hoạch sửa — 2 migration data nhỏ, không đụng code

| # | Bảng | Hành động |
|---|---|---|
| 1 | `item_categories` | UPDATE `default_item_type` cho các record NULL theo tên category: "Đồ vải" → `linen`, "Tiêu hao"/"Phòng tắm" → `consumable`, "Thiết bị"/"Phòng khách"/"Phòng ngủ" → `equipment`, "Nội thất" → `furniture` |
| 2 | `items` | UPDATE `items.item_type` = `category.default_item_type` cho mọi item có `item_type` không khớp với `category.default_item_type` (sau khi bước 1 đã chuẩn hoá) |

### SQL dự kiến (dùng RPC migration)

```sql
-- Bước 1: chuẩn hoá default_item_type cho category NULL
UPDATE item_categories SET default_item_type = 'linen' 
  WHERE default_item_type IS NULL AND name ILIKE '%đồ vải%';
UPDATE item_categories SET default_item_type = 'consumable' 
  WHERE default_item_type IS NULL AND (name ILIKE '%tiêu hao%' OR name ILIKE '%phòng tắm%');
UPDATE item_categories SET default_item_type = 'equipment' 
  WHERE default_item_type IS NULL AND name ILIKE '%thiết bị%';

-- Bước 2: đồng bộ items.item_type theo category
UPDATE items i SET item_type = c.default_item_type
FROM item_categories c
WHERE i.category_id = c.id 
  AND c.default_item_type IS NOT NULL 
  AND (i.item_type IS NULL OR i.item_type::text != c.default_item_type::text);
```

## Quy tắc giữ nguyên

- Tiếng Việt thuần
- Không đổi code (`CategoryItemRow`, `CategoryBasedItemsCheck`, `roomCheckConfig` đã đúng)
- Không phá nghiệp vụ: chỉ chuẩn hoá `item_type` theo category — đúng spec `category-driven-classification-spec`
- Cảnh báo: bước 2 sẽ ảnh hưởng đến cách items render ở mọi nơi (inventory, laundry, room check). Nhưng đây là kết quả MONG MUỐN — phân loại đúng theo category mà owner đã chọn.

## Kết quả mong đợi

Sau migration:
- Khăn tắm lớn → `linen` → daily check hiện **OK / Thiếu / Hỏng**
- Bàn chải đánh răng → `consumable` → daily check hiện **OK / Thiếu / Hết**
- Ấm đun nước → vẫn `equipment` → daily check hiện **OK / Hỏng** (đúng nghiệp vụ)
- Tất cả phòng khác trong tenant tự động được "fix" theo

## Ngoài migration, có cần sửa code thêm không?

Không. Plan trước đã sửa fallback chain trong `CategoryBasedItemsCheck.tsx`, plan trước nữa đã sửa `getActionsForItemType` trong `CategoryItemRow.tsx`. Cả hai đều hoạt động đúng — chỉ là data legacy đang "thắng" fallback. Sau khi data sạch, cả 2 lớp fix code vẫn còn giá trị bảo vệ cho dữ liệu mới.

