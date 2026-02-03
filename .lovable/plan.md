

## Giải pháp Toàn diện: Phân loại Đồ dùng trong Phòng

### VẤN ĐỀ HIỆN TẠI

| Chỉ số | Giá trị | Mô tả |
|--------|---------|-------|
| Items bị phân loại sai | 63/426 (15%) | Ảnh hưởng hiển thị sai tab trong Room Check |
| Nguyên nhân gốc | Thiếu liên kết Category → Item Type | Không có quy tắc gán tự động |
| Ví dụ lỗi điển hình | "Ấm đun nước" trong category "Thiết bị" nhưng item_type = "consumable" | |

**Ví dụ Items bị sai:**
- "Đồng hồ báo thức" → Category "Điện tử" → item_type = "linen" (SAI, phải là "equipment")
- "Tủ lạnh mini" → Category "Điện tử" → item_type = "furniture" (SAI, phải là "equipment")
- "Bột giặt" → Category "Vệ sinh" → item_type = "linen" (SAI, phải là "consumable")

---

### GIẢI PHÁP TOÀN DIỆN (4 LỚP BẢO VỆ)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    4 LAYERS OF ITEM TYPE PROTECTION                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LỚP 1: DATABASE STRUCTURE                                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ item_categories.default_item_type                                 │ │
│  │ Mỗi danh mục có loại đồ dùng mặc định                            │ │
│  │ VD: "Đồ vải" → default_item_type = 'linen'                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  LỚP 2: AUTO-CLASSIFICATION TRIGGER                                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Trigger: auto_classify_item_type()                                │ │
│  │ Khi INSERT/UPDATE item: Lấy default_item_type từ category        │ │
│  │ Nếu category không có → fallback dựa vào từ khóa tên item        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  LỚP 3: UI GUIDANCE                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Form tạo Item: Tự động chọn item_type dựa vào category           │ │
│  │ Form tạo Category: Bắt buộc chọn default_item_type               │ │
│  │ Highlight nếu user chọn khác gợi ý                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  LỚP 4: DATA MIGRATION + VALIDATION TOOL                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Migration: Fix 63 items đang bị sai                              │ │
│  │ Admin Tool: Scan & Report misclassified items                    │ │
│  │ Batch update function                                            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### PHẦN 1: DATABASE CHANGES

#### 1.1 Thêm cột `default_item_type` vào `item_categories`

```sql
ALTER TABLE item_categories 
ADD COLUMN default_item_type TEXT 
CHECK (default_item_type IN ('linen', 'consumable', 'equipment', 'furniture'));
```

#### 1.2 Cập nhật categories hiện có với default_item_type

Dựa vào tên category:
- "Đồ vải", "Linen" → `linen`
- "Vệ sinh", "Phòng tắm", "Ẩm thực", "Tiêu hao" → `consumable`
- "Điện tử", "Thiết bị", "Thiết bị điện" → `equipment`
- "Nội thất", "Phòng khách" → `furniture`

#### 1.3 Tạo Trigger `auto_classify_item_type`

```sql
CREATE OR REPLACE FUNCTION auto_classify_item_type()
RETURNS TRIGGER AS $$
DECLARE
  v_default_type TEXT;
BEGIN
  -- Nếu user đã chọn item_type, giữ nguyên
  IF NEW.item_type IS NOT NULL AND OLD IS NOT NULL AND NEW.item_type != OLD.item_type THEN
    RETURN NEW;
  END IF;

  -- Lấy default_item_type từ category
  SELECT default_item_type INTO v_default_type
  FROM item_categories 
  WHERE id = NEW.category_id;
  
  -- Gán nếu có
  IF v_default_type IS NOT NULL THEN
    NEW.item_type := v_default_type;
  -- Fallback: Phân loại theo tên item nếu category không có default
  ELSIF NEW.item_type IS NULL THEN
    NEW.item_type := CASE
      WHEN NEW.name ILIKE ANY(ARRAY['%khăn%','%ga%','%gối%','%chăn%','%màn%','%rèm%']) THEN 'linen'
      WHEN NEW.name ILIKE ANY(ARRAY['%dầu gội%','%sữa tắm%','%kem%','%bàn chải%','%xà phòng%','%nước%','%giấy%']) THEN 'consumable'
      WHEN NEW.name ILIKE ANY(ARRAY['%bàn%','%ghế%','%tủ%','%giường%','%sofa%','%kệ%']) THEN 'furniture'
      ELSE 'equipment'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 1.4 Fix data items hiện có

```sql
UPDATE items i
SET item_type = ic.default_item_type
FROM item_categories ic
WHERE i.category_id = ic.id
  AND ic.default_item_type IS NOT NULL
  AND i.item_type != ic.default_item_type;
```

---

### PHẦN 2: UI CHANGES

#### 2.1 Form tạo/sửa Category (CreateItemCategoryDialog)

Thêm trường `default_item_type` bắt buộc:

```text
┌─────────────────────────────────────────┐
│ Tạo Danh mục                            │
├─────────────────────────────────────────┤
│ Tên danh mục *: [Đồ vải            ]    │
│ Mã:             [DO_VAI            ]    │
│                                         │
│ Loại đồ dùng mặc định *:               │
│ [Đồ vải (linen) ▼]                      │
│  ├─ Đồ vải (linen)                      │
│  ├─ Tiêu hao (consumable)               │
│  ├─ Thiết bị (equipment)                │
│  └─ Nội thất (furniture)                │
│                                         │
│ Mô tả: [                           ]    │
│ ...                                     │
└─────────────────────────────────────────┘
```

#### 2.2 Form tạo/sửa Item (ItemFormPage)

Auto-fill `item_type` khi chọn category:

```typescript
// Khi user chọn category_id
const handleCategoryChange = (categoryId: string) => {
  setValue('category_id', categoryId);
  
  const category = categories?.find(c => c.id === categoryId);
  if (category?.default_item_type) {
    setValue('item_type', category.default_item_type);
    // Show toast: "Đã tự động chọn loại: Đồ vải"
  }
};
```

#### 2.3 Admin Tool: Scan & Fix Items

Thêm tab trong Settings để quản trị viên:
1. Xem danh sách items bị phân loại sai
2. Batch fix theo category
3. Export báo cáo

---

### PHẦN 3: FILES CẦN TẠO/SỬA

| Loại | File | Thay đổi |
|------|------|----------|
| **Migration** | `xxx_item_type_classification.sql` | Thêm cột, trigger, fix data |
| **Sửa** | `src/hooks/useItemCategories.ts` | Thêm field default_item_type |
| **Sửa** | `src/components/settings/categories/CreateItemCategoryDialog.tsx` | Thêm select item_type |
| **Sửa** | `src/pages/items/ItemFormPage.tsx` | Auto-fill item_type khi chọn category |
| **Tạo** | `src/components/settings/ItemClassificationTool.tsx` | Tool scan & fix |
| **Sửa** | `src/pages/settings/CategoryManagementPage.tsx` | Thêm tab Tool |

---

### PHẦN 4: QUY TRÌNH SAU TRIỂN KHAI

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    ITEM CLASSIFICATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. Admin tạo Category mới                                             │
│      ┌─────────────────┐                                               │
│      │ Chọn:           │                                               │
│      │ - Tên: Đồ vải   │                                               │
│      │ - Type: linen   │ ◄── BẮT BUỘC                                  │
│      └────────┬────────┘                                               │
│               │                                                         │
│               ▼                                                         │
│   2. Staff tạo Item mới                                                │
│      ┌─────────────────┐                                               │
│      │ Chọn Category:  │                                               │
│      │ → Đồ vải        │                                               │
│      │                 │                                               │
│      │ Item Type:      │                                               │
│      │ → [linen] ✓     │ ◄── TỰ ĐỘNG CHỌN                              │
│      └────────┬────────┘                                               │
│               │                                                         │
│               ▼                                                         │
│   3. Database Trigger                                                   │
│      ┌─────────────────┐                                               │
│      │ Validate &      │                                               │
│      │ Override nếu    │ ◄── BACKUP PROTECTION                         │
│      │ thiếu item_type │                                               │
│      └────────┬────────┘                                               │
│               │                                                         │
│               ▼                                                         │
│   4. Room Check hiển thị đúng tab                                      │
│      ┌─────────────────┐                                               │
│      │ Tab: ĐỒ VẢI     │                                               │
│      │ - Khăn tắm  ✓   │ ◄── HIỂN THỊ ĐÚNG                             │
│      │ - Ga giường ✓   │                                               │
│      └─────────────────┘                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### KẾT QUẢ MONG ĐỢI

| Mục tiêu | Kết quả |
|----------|---------|
| Fix data hiện có | 63 items được phân loại lại đúng |
| Ngăn lỗi tương lai | Trigger tự động gán item_type |
| UX tốt hơn | Auto-fill khi chọn category |
| Quản trị dễ dàng | Tool scan & batch fix |
| Room Check chính xác | Items hiển thị đúng tab theo loại |

