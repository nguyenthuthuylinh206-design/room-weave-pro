

## Yêu cầu: Equipment/Furniture cũng cần nút "Thiếu"

Hợp lý — thực tế ấm đun, điều khiển, móc treo... có thể bị thiếu (mất, chưa cấp, NV trước quên trả) chứ không chỉ hỏng.

## Vấn đề hiện tại

`roomCheckConfig.ts` chỉ cho equipment/furniture 2 action ở daily check:
```ts
equipmentActions: ['ok', 'damaged']    // ❌ thiếu 'missing'
furnitureActions: ['ok', 'damaged']    // ❌ thiếu 'missing'
```

Type `EquipmentAction` / `FurnitureAction` cũng chưa có `'missing'`:
```ts
export type EquipmentAction = 'ok' | 'lost' | 'damaged'   // ❌
```

## Kế hoạch sửa — 1 file `roomCheckConfig.ts`

| # | Thay đổi |
|---|---|
| 1 | Mở rộng type: `EquipmentAction = 'ok' \| 'missing' \| 'lost' \| 'damaged'`, tương tự `FurnitureAction` |
| 2 | `daily.equipmentActions` → `['ok', 'missing', 'damaged']` (OK / Thiếu / Hỏng) |
| 3 | `daily.furnitureActions` → `['ok', 'missing', 'damaged']` |
| 4 | `checkin.equipmentActions` → `['ok', 'missing', 'damaged']` (lễ tân cần biết phòng thiếu đồ trước check-in) |
| 5 | `checkin.furnitureActions` → `['ok', 'missing', 'damaged']` |
| 6 | `replenish.equipmentActions` → `['ok', 'missing', 'damaged']` (vốn dùng để báo bổ sung) |
| 7 | `replenish.furnitureActions` → `['ok', 'missing', 'damaged']` |
| 8 | `maintenance.equipmentActions` → giữ `['ok', 'damaged']` (chỉ verify sau sửa, không cần) |

**Không sửa**:
- `checkout` — đã có `lost` (mất hẳn → tính phí), khác với `missing` (thiếu tạm). Checkout không nên có "thiếu" vì khách đã trả phòng.
- `delivery` — chỉ xác nhận giao hàng, không kiểm thiếu.

## Downstream cần kiểm tra (nếu phát sinh)

- `CategoryItemRow.tsx` — đã render theo `allowedActions` từ config nên tự động hiện nút Thiếu ngay khi config mở rộng. Không cần sửa.
- `ACTION_LABELS['missing'] = 'Thiếu'` — đã có sẵn dòng 165. ✅
- `ACTION_COLORS['missing']` — đã có dòng 178. ✅
- Logic xử lý khi cô bấm "Thiếu" cho equipment → giống linen/consumable: cộng vào `items_missing` để báo cáo + tự sinh phiếu bổ sung. Nếu hiện tại chỉ linen/consumable handle `missing`, cần kiểm tra nhánh equipment trong `CategoryBasedItemsCheck.tsx` / `ItemsCheckStep.tsx` có treat `'missing'` action đúng không. Sẽ verify khi vào default mode; nếu thiếu sẽ map sang `items_missing` (giống linen).

## Kết quả mong đợi

- Daily check: ấm đun, điều khiển → hiện **OK / Thiếu / Hỏng** ✅
- Checkin: lễ tân thấy ngay phòng thiếu thiết bị → xử lý trước khi khách vào
- Replenish: cô buồng phòng báo thiếu thiết bị để cấp bù
- Checkout vẫn dùng `lost` (mất → tính phí khách) như cũ
- Tiếng Việt thuần, không đụng DB, không đụng UI component

