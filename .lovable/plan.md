## Vấn đề: Báo "Thiếu" nhưng không nhập số lượng → không tạo được phiếu giao bổ sung

Cô nói đúng — hiện tại bấm **Thiếu** chỉ là 1 nút toggle, không hỏi thiếu mấy cái. Hệ thống không biết cần bổ sung bao nhiêu → phiếu giao sinh ra sai hoặc không sinh được.

## Phân tích hiện trạng

Đọc nhanh `CategoryItemRow.tsx` + `CategoryBasedItemsCheck.tsx`:

- Khi bấm **Thiếu**, code set `status = 'missing'` cho item nhưng KHÔNG hỏi số lượng
- Mặc định coi như thiếu = thiếu toàn bộ `expected_quantity` của item trong phòng
- → Sai khi phòng có 4 khăn, chỉ thiếu 1 cái → hệ thống tưởng thiếu cả 4

## Kế hoạch sửa — UX nhập số lượng thiếu

### A. Cách hỏi số lượng (UX đề xuất)

Khi bấm **Thiếu** lần đầu → hiện inline ngay cạnh nút:

```
[OK] [Thiếu: 1 ▲▼ / 4] [Hỏng]
              ↑ stepper nhỏ, mặc định = 1
```

- Stepper compact `h-7 w-7`, max = `expected_quantity`
- Bấm lại nút **Thiếu** → reset về OK
- Bấm **OK** hoặc **Hỏng** → bỏ trạng thái thiếu

**Áp dụng tương tự cho:**

- `missing` (linen/consumable/equipment/furniture) ở Daily/Checkin
- `empty` (consumable) ở Daily — "hết mấy chai?"
- `damaged` (linen/equipment/furniture) — "hỏng mấy cái?"
- `lost` (checkout) — "mất mấy cái?"
- `consumed` (consumable, checkout) — "khách dùng mấy chai?"

→ Mọi action **không phải OK** đều cần hỏi số lượng (vì 1 phòng có thể có 4 khăn nhưng chỉ 2 bẩn, 1 mất).

### B. Lưu trữ

Schema hiện tại `room_check_items` đã có cột `quantity_affected` (hoặc tương đương). Cần verify khi vào default mode — nếu chưa có thì migration thêm cột `affected_quantity int default 0`.

### C. Phiếu giao bổ sung

Khi finalize check:

- Group items có `status IN ('missing', 'empty')` theo item_id
- Sinh `inventory_distribution_orders` với `quantity = sum(affected_quantity)` thay vì `expected_quantity`
- Phiếu giao chính xác đúng số cần bổ sung

### D. Tính phí khách (checkout)

- `lost` × `unit_price` × `affected_quantity` → phụ phí
- `damaged` × `replacement_cost` × `affected_quantity` → phụ phí
- `consumed` (chargeable) × `sale_price` × `affected_quantity` → phụ phí

## File cần sửa (dự kiến)


| File                                                          | Thay đổi                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `CategoryItemRow.tsx`                                         | Thêm stepper inline khi action != 'ok'; expose `onQuantityChange`               |
| `CategoryBasedItemsCheck.tsx`                                 | Lưu `affected_quantity` vào state item, truyền vào submit                       |
| `useRoomCheckSubmit` (hoặc edge function `submit-room-check`) | Map `affected_quantity` vào `room_check_items` + tính phiếu giao + tính phụ phí |
| Migration DB (nếu chưa có)                                    | `ALTER TABLE room_check_items ADD COLUMN affected_quantity int DEFAULT 1`       |


## Câu hỏi xác nhận trước khi code

1. **UX nhập số**: stepper inline (▲▼) hay popup nhỏ? Cô thích cách nào? (▲▼)
2. **Mặc định khi bấm Thiếu**: số 1 hay full `expected_quantity`? số 1
3. **Áp dụng cho tất cả action ≠ OK** hay chỉ riêng `missing/empty/lost/consumed/damaged`? **Áp dụng cho tất cả action ≠ OK** 

Cô chọn xong tôi viết plan chi tiết hơn rồi code.