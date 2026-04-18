

## Vấn đề: Chỉ thấy nút "Hỏng" cho khăn tắm trong Daily check

Đã trace kỹ luồng — gốc rễ là **item type bị mặc định sai về `equipment`** khi `items.item_type` NULL.

### Bằng chứng từ DB

```
Khăn tắm lớn × 6 records:
  - 4 records: default_item_type = 'linen' (đúng)
  - 2 records: default_item_type = NULL (sai)
  - Khăn tắm nhỏ × 3 records: category 'Phòng khách' → default_item_type = 'equipment' (sai)
```

### Bằng chứng từ code

`CategoryBasedItemsCheck.tsx` dòng 114-136:
```ts
const { data } = await supabase
  .from('items')
  .select('id, item_type, quantity_in_stock, ..., item_categories(...)')  // ❌ KHÔNG select category.default_item_type
  
return {
  ...item,
  item_type: (itemData?.item_type as ItemType) || 'equipment',  // ❌ NULL → fallback 'equipment'
  ...
}
```

Daily check + equipment per `roomCheckConfig`:
```ts
equipment: { equipmentActions: ['ok', 'damaged'] }
```

→ Khăn tắm bị treat as equipment → chỉ render nút **Hỏng**, mất nút **Thiếu** đáng lẽ có cho linen.

### Vi phạm spec đã có

Memory `category-driven-classification-spec` nói rõ: **item type phải lấy từ `item_categories.default_item_type` khi item.item_type NULL**. Code hiện tại đang bỏ qua bước fallback này.

## Kế hoạch sửa — 1 file, logic fallback

| # | File | Thay đổi |
|---|------|---------|
| 1 | `CategoryBasedItemsCheck.tsx` query (dòng 116) | Bổ sung `default_item_type` vào select của `item_categories(...)` |
| 2 | `CategoryBasedItemsCheck.tsx` enrichment (dòng 132) | Đổi fallback chain: `itemData.item_type ?? category.default_item_type ?? 'equipment'` |
| 3 | `CategoryBasedItemsCheck.tsx` (dòng 145) | Tương tự cho fallback nhánh data null |

### Logic mới đề xuất

```ts
const category = itemData?.item_categories as { 
  id: string; name: string; color: string | null; icon: string | null;
  default_item_type: ItemType | null  // ← thêm
} | null

return {
  ...item,
  item_type: (itemData?.item_type as ItemType) 
          ?? (category?.default_item_type as ItemType) 
          ?? 'equipment',
  ...
}
```

### Tuỳ chọn: Cleanup data (không bắt buộc, có thể làm sau)

Có thể chạy 1 migration nhỏ:
- Xét `Khăn tắm` đang ở category 'Phòng khách' với `default_item_type = 'equipment'` → đây là **lỗi phân loại category**, để cô owner tự sửa qua UI Item categories
- Hoặc chỉ update `items.item_type` cho các record NULL bằng `category.default_item_type` (an toàn, không phá UI cũ)

→ **Không làm trong plan này** để khỏi đụng dữ liệu owner. Code fallback đã giải quyết 95% case.

## Quy tắc giữ nguyên

- Tiếng Việt thuần
- Không sửa `roomCheckConfig.ts`
- Không sửa `CategoryItemRow.tsx` (logic mapping action đã đúng)
- Không migration DB
- Tuân thủ spec `category-driven-classification-spec`

## Kết quả mong đợi

- Khăn tắm (NULL item_type, category 'Đồ vải' → default_item_type 'linen') → render đúng linen → daily hiện **Thiếu** + **Hỏng**
- Khăn tắm (NULL item_type, category 'Phòng khách' → equipment) → vẫn render equipment (đúng theo cấu hình category, owner cần sửa category nếu muốn)
- Items có `item_type` set rõ → giữ nguyên hành vi
- Mọi check type khác không ảnh hưởng

