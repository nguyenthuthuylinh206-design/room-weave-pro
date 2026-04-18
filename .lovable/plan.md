

## Vấn đề: `CategoryItemRow.getActionsForItemType()` không khớp với `roomCheckConfig`

Cấu hình `roomCheckConfig.ts` đã định nghĩa đúng các action theo nghiệp vụ cho từng `checkType` × `itemType`, nhưng `CategoryItemRow.tsx` dòng 175-194 **hardcode danh sách action theo itemType** và **bỏ qua `allowedActions` thực tế** truyền từ config:

| Loại đồ | Config (daily) | CategoryItemRow render | Thiếu nút |
|---|---|---|---|
| **Linen** | ok, missing, damaged | laundry, change, add, lost | ❌ Thiếu **Thiếu**, **Hỏng** |
| **Consumable** | ok, missing, empty | consumed (gộp tất cả) | ❌ Không tách **Thiếu** vs **Hết** |
| **Equipment** | ok, damaged | damaged, lost | ❌ Render thừa **Mất** (daily không có) |
| **Furniture** | ok, damaged | damaged, lost | ❌ Render thừa **Mất** |

→ Cô bấm tab Linen trong daily check → chỉ thấy nút OK (vì laundry/change/add/lost không có trong daily) → không báo được Thiếu/Hỏng.

## Nguyên nhân

`getActionsForItemType()` đang **whitelist cứng** theo itemType:
```ts
if (itemType === 'linen') {
  if (allowedActions.includes('laundry')) actions.push('laundry')
  // ... chỉ check 4 action: laundry/change/add/lost
  // → BỎ SÓT missing, damaged dù allowedActions có
}
```

Nó chỉ "cho phép" 1 tập con cứng, dù `allowedActions` từ config có nhiều hơn.

## Kế hoạch sửa — chỉ 1 file, 1 hàm

| # | File | Thay đổi |
|---|---|---|
| 1 | `CategoryItemRow.tsx` `getActionsForItemType()` (dòng 175-194) | Viết lại theo hướng **dynamic**: lặp qua tất cả action trong `allowedActions`, lọc ra action hợp lệ cho itemType, giữ thứ tự ưu tiên hiển thị |
| 2 | `CategoryItemRow.tsx` `ACTION_CONFIG` (dòng 60-69) | Thêm cấu hình cho `empty` (đồng bộ với `consumed` về bản chất nhưng label "Hết") nếu thiếu — kiểm tra lại |
| 3 | `CategoryItemRow.tsx` `handleQuickAction` switch | Thêm case `empty` → xử lý như `consumed` (mở drawer chọn số lượng + cần bổ sung), hoặc gộp missing/empty/consumed về cùng 1 flow drawer với label động |

### Logic mới đề xuất cho `getActionsForItemType()`

```ts
const ITEM_TYPE_ALLOWED_ACTIONS: Record<ItemType, string[]> = {
  linen:     ['laundry', 'change', 'add', 'missing', 'damaged', 'lost'],
  consumable:['consumed', 'empty', 'missing', 'lost'],
  equipment: ['damaged', 'missing', 'lost'],
  furniture: ['damaged', 'missing', 'lost'],
}

const PRIORITY_ORDER = ['missing', 'damaged', 'lost', 'consumed', 'empty', 'laundry', 'change', 'add']

const allowed = ITEM_TYPE_ALLOWED_ACTIONS[itemType] || []
return PRIORITY_ORDER.filter(a => allowed.includes(a) && allowedActions.includes(a))
```

→ Giao điểm 3 tập: cấu hình check type × giới hạn theo loại đồ × thứ tự hiển thị.

## Quy tắc giữ nguyên

- Tiếng Việt thuần
- Không sửa `roomCheckConfig.ts` (đã đúng nghiệp vụ)
- Không sửa schema/types
- Drawer/popup hỏng/mất giữ nguyên (đã bỏ chi phí ở plan trước)
- `consumed` và `empty` cùng dùng drawer chọn số lượng + cần bổ sung (đã có sẵn)
- Mặc định khi cô bấm "Thiếu" → tạo supplement request (đã có downstream)
- Mặc định khi cô bấm "Hỏng" → tạo maintenance request (đã có downstream)
- Mặc định khi cô bấm "Mất" → bổ sung + báo cáo (đã có downstream)

## Kết quả mong đợi

- **Daily + Linen**: thấy nút Thiếu, Hỏng (đúng nghiệp vụ)
- **Daily + Consumable**: thấy nút Thiếu, Hết
- **Daily + Equipment/Furniture**: thấy nút Hỏng (không thừa nút Mất)
- **Checkout + Linen**: thấy đầy đủ Giặt, Đổi, Mất, Hỏng
- **Replenish + Equipment**: thấy nút Hỏng để báo cáo
- Mọi check type khác đều render đúng theo `roomCheckConfig` — không cần sửa thêm

