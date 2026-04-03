

## Hiển thị chi tiết dịch vụ & minibar trong bảng Group Checkout

### Vấn đề
Bảng checkout nhóm đang hiện "Dịch vụ sử dụng 1.000.000đ" mà không liệt kê chi tiết từng dịch vụ/minibar. Nhân viên không biết khách đã dùng gì để kiểm tra.

### Nguyên nhân
Code đã có logic hiển thị chi tiết (lines 345-358 trong `GroupCheckoutRoomCard.tsx`), nhưng dữ liệu `serviceDetails` đang rỗng trong một số trường hợp dù `serviceCharges > 0`. Có thể do:
- Phí dịch vụ lưu trực tiếp trong `room_bookings.service_charges` nhưng không có bản ghi chi tiết tương ứng
- Hoặc lỗi khi fetch `fetchServiceChargeSummary` (tenant_id không match, query fail silent)

### Giải pháp

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/hooks/useGroupCheckoutCalculations.ts` | Thêm fallback: nếu `serviceDetails` rỗng nhưng `serviceCharges > 0`, tạo 1 detail item tổng hợp từ `room_bookings.service_charges` |
| 2 | `src/components/bookings/group-checkout/GroupCheckoutRoomCard.tsx` | Bỏ fallback "Dịch vụ sử dụng" chung chung — luôn dùng danh sách chi tiết. Thêm nhóm header "Minibar" và "Dịch vụ" để phân biệt rõ ràng |

### Chi tiết UI

Thay vì 1 dòng "Dịch vụ sử dụng 1.000.000đ", sẽ hiển thị:

```text
── Dịch vụ & Minibar ──────────────────
  Coca Cola ×2                  20.000đ
  Bia Tiger ×1                  25.000đ
  Massage 60 phút ×1           300.000đ
  Giặt ủi ×1                  150.000đ
────────────────────────────────────────
```

- Nhóm minibar và dịch vụ hiển thị cùng danh sách, phân biệt bằng text nhỏ (minibar / dịch vụ)
- Bỏ emoji 🧊 🛎️ theo quy tắc UI project
- Hiện số lượng × đơn giá khi quantity > 1

