---
name: Default-OK Room Check UX
description: Logic kiểm tra phòng đảo ngược — mặc định tất cả OK, nhân viên chỉ chạm vào item có sự cố để mở bottom sheet báo. Áp dụng cho TẤT CẢ check types.
type: design
---

# Default-OK Room Check UX

## Nguyên tắc
Đảo ngược logic mặc định: mọi item xuất hiện với vòng tròn xanh OK. Nhân viên chỉ tương tác khi có sự cố — phản ánh đúng thực tế 80/20 của buồng phòng (đa số phòng OK).

## Cấu trúc
- **`DefaultOkItemsCheck.tsx`** — component chính, group dọc theo category, không có tabs ngang.
- **`ReportIssueSheet.tsx`** — bottom sheet (Sheet side="bottom") gom toàn bộ tác vụ báo sự cố trong 1 màn: chọn loại + số lượng (stepper +/−) + cần bổ sung (switch) + ghi chú (cho hỏng/mất).
- Vào qua `ItemsCheckStep.tsx` cho mọi check type (daily, checkin, checkout, replenish, delivery, maintenance).

## Loại sự cố trong sheet
Action gom theo `item_type` × `allowedActions` từ `roomCheckConfig`:
- **linen**: laundry, change, add, missing, damaged, lost
- **consumable**: consumed, empty, missing, lost
- **equipment/furniture**: damaged, missing, lost

## UI/Touch standards
- Item card cao ≥64px, toàn bộ card chạm được (button), `active:scale-[0.99]`.
- Status circle bên trái: xanh ✓ khi OK, vàng ⚠ khi missing/damaged, đỏ ✕ khi lost, xanh dương khi laundry/change/add.
- Nút X bên phải reset về OK (cho phép sửa).
- Banner đầu trang đổi màu/text theo số sự cố: xanh "Tất cả OK" hoặc đỏ "Đã ghi nhận N sự cố".
- Search chỉ hiện khi totalItems > 8.

## KHÔNG dùng nữa
- `CategoryBasedItemsCheck.tsx` (tabs ngang + action buttons inline)
- `CategoryItemRow.tsx` với drawer phức tạp riêng cho từng action
