

## Phân tích lỗi cần sửa trong GroupCheckoutDialog

### Bug 1: `useCheckoutInspection` nhận UUID không hợp lệ (🔴 Critical)

**Console error:** `invalid input syntax for type uuid: "group_293e9212-b081-4e8b-b1c3-25f380e4d02e"`

**Nguyên nhân:** Trong `BookingsPage.tsx` (line 1041-1051), khi minimize group checkout, `booking.id` được set thành `"group_${selectedGroupId}"`. Sau đó `MinimizedCheckoutWidget` (line 58) truyền giá trị này vào `useCheckoutInspection(checkout.booking.id)`, hook này query DB với UUID — gây lỗi PostgreSQL.

**Sửa:** Trong `MinimizedCheckoutWidget`, nếu `checkout.isGroup === true`, skip `useCheckoutInspection` (truyền `undefined`). Group checkout có logic inspection riêng trong `GroupCheckoutDialog`.

### Bug 2: Missing DialogDescription warnings (🟡 Minor)

**Console warning:** `Missing Description or aria-describedby for DialogContent`

Nhiều Dialog trong project thiếu `<DialogDescription>` — cảnh báo accessibility từ Radix. Cần thêm `<DialogDescription>` hoặc `<VisuallyHidden>` vào các Dialog: `GroupCheckoutDialog`, và các dialog khác.

**Sửa:** Thêm `<DialogDescription>` (có thể dùng `<VisuallyHidden>` nếu không muốn hiển thị) vào `DialogContent` của `GroupCheckoutDialog.tsx`.

### Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/bookings/MinimizedCheckoutWidget.tsx` | Skip `useCheckoutInspection` khi `isGroup === true` |
| `src/components/bookings/GroupCheckoutDialog.tsx` | Thêm `DialogDescription` |

