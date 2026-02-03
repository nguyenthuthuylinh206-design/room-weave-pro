
## Kế hoạch: Đổi Room Check sang phân loại theo Danh mục (Category)

### PHÂN TÍCH HIỆN TẠI

**Cấu trúc hiện tại của ItemsCheckStep:**
```
Tab Item Type (level 1)
├── Đồ vải (linen)     → GroupByCategory → Ẩm thực, Phòng tắm, Đồ vải...
├── Tiêu hao (consumable) → GroupByCategory
├── Thiết bị (equipment)  → GroupByCategory  
└── Nội thất (furniture)  → GroupByCategory
```

**Cấu trúc mong muốn (giống Items page):**
```
Tab Category (level 1)
├── Ẩm thực      → All items in category (mixed linen/consumable)
├── Điện tử      → All items in category
├── Phòng khách  → All items in category (mixed types)
├── Phòng tắm    → All items in category (mixed types)
├── Đồ vải       → All items in category
└── ...
```

### VẤN ĐỀ CẦN GIẢI QUYẾT

1. **Actions phụ thuộc item_type**: 
   - Linen: Giặt, Đổi, Thêm, Mất
   - Consumable: Đã dùng, Cần bổ sung
   - Equipment: Hỏng, Mất
   - Furniture: Hỏng, Mất
   
2. **Khi tab theo Category**: Một category có thể chứa nhiều item_type khác nhau (VD: "Phòng tắm" có cả consumable và linen)

3. **UI phức tạp hơn**: Trong cùng một category, các items khác type cần hiển thị actions khác nhau

### GIẢI PHÁP ĐỀ XUẤT

#### Phương án A: Tab Category + Actions động theo item_type (KHUYẾN NGHỊ)

Tab chính theo Category, nhưng mỗi item hiển thị actions phù hợp với `item_type` của nó:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Room Check                                                      │
├─────────────────────────────────────────────────────────────────┤
│ [Tất cả 12] [Ẩm thực 3] [Phòng tắm 5] [Điện tử 4]               │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Phòng tắm (5 items)                                          │
│   ┌─────────────────────────────────────────────────────┐      │
│   │ 🧴 Dầu gội         [consumable] [Đã dùng] [Bổ sung] │      │
│   │ 🧴 Sữa tắm         [consumable] [Đã dùng] [Bổ sung] │      │
│   │ 🧺 Khăn tắm lớn    [linen]      [OK] [Giặt] [Đổi]   │      │
│   │ 🧺 Khăn mặt        [linen]      [OK] [Giặt] [Đổi]   │      │
│   │ 🔧 Giá treo khăn   [equipment]  [OK] [Hỏng] [Mất]   │      │
│   └─────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

**Ưu điểm:**
- Giống cấu trúc Items page - nhất quán UX
- Actions vẫn đúng theo loại đồ dùng
- Dễ tìm kiếm theo danh mục quen thuộc

**Nhược điểm:**
- Một category có thể có nhiều loại actions khác nhau

#### Phương án B: Giữ Tab Item Type, fix data

Giữ nguyên cấu trúc tabs theo item_type, nhưng:
1. Fix 70 items đang bị phân loại sai
2. Đồng bộ tất cả items về đúng category.default_item_type

---

### KẾ HOẠCH TRIỂN KHAI (Phương án A)

#### 1. Database: Fix data items (ưu tiên)

```sql
-- Đồng bộ tất cả items về đúng category.default_item_type
UPDATE items i
SET item_type = ic.default_item_type::item_type,
    updated_at = NOW()
FROM item_categories ic
WHERE i.category_id = ic.id
  AND ic.default_item_type IS NOT NULL
  AND i.item_type::TEXT != ic.default_item_type;
```

#### 2. Tạo Component mới: CategoryBasedItemsCheck

```typescript
// src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx

// Thay vì tabs theo item_type, tabs theo category
// Trong mỗi category, render items với actions động theo item_type
```

#### 3. Cập nhật ItemsCheckStep

```typescript
// Thay đổi logic tabs
// Từ: ['linen', 'consumable', 'equipment', 'furniture']
// Sang: [categories từ items trong phòng]

// Mỗi item render actions dựa vào item.item_type
const getActionsForItem = (item) => {
  switch (item.item_type) {
    case 'linen': return ['ok', 'laundry', 'change', 'add', 'lost']
    case 'consumable': return ['ok', 'used', 'refill']
    case 'equipment': return ['ok', 'damaged', 'lost']
    case 'furniture': return ['ok', 'damaged', 'lost']
  }
}
```

#### 4. Files cần sửa

| File | Thay đổi |
|------|----------|
| `ItemsCheckStep.tsx` | Đổi tabs từ item_type sang category |
| `item-type-tabs/index.ts` | Có thể reuse hoặc tạo CategoryItemRow mới |
| `useCategories.ts` | Đảm bảo trả về categories có items trong phòng |

---

### SO SÁNH 2 PHƯƠNG ÁN

| Tiêu chí | Phương án A (Tab Category) | Phương án B (Tab Item Type) |
|----------|---------------------------|----------------------------|
| UX nhất quán với Items page | ✅ Có | ❌ Không |
| Logic actions | Động theo item_type | Cố định theo tab |
| Độ phức tạp code | Trung bình | Thấp |
| Dễ tìm items | ✅ Theo danh mục quen thuộc | Cần nhớ loại đồ dùng |
| Xử lý mixed types | ✅ Tự nhiên | Khó khăn |

---

### KẾT LUẬN

**Khuyến nghị: Phương án A** - Tab theo Category

Lý do:
1. **Nhất quán với Items page** - User đã quen cách phân loại này
2. **Tự nhiên hơn** - "Tìm trong Phòng tắm" dễ hơn "Tìm đồ vải"
3. **Linh hoạt** - Actions vẫn đúng theo từng loại đồ dùng
4. **Giải quyết tận gốc** - Không cần lo về việc items bị xếp sai tab

**Bước tiếp theo:**
1. Fix data: Đồng bộ 70 items về đúng category default
2. Cập nhật ItemsCheckStep để tabs theo category thay vì item_type
3. Mỗi item row hiển thị actions động dựa vào item_type của nó
