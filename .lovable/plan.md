

## Mở giới hạn phòng cho gói Trial + Thông báo thân thiện

### Vấn đề hiện tại
Gói `free_trial` có `max_rooms = 50` → Khách hàng dùng thử bị chặn khi tạo phòng thứ 51. Trong thời gian miễn phí, khách hàng nên được tự do thêm phòng để trải nghiệm đầy đủ phần mềm.

### Giải pháp

**1. Database: Bỏ giới hạn phòng cho gói trial**

Migration SQL cập nhật `max_rooms = NULL` cho gói `free_trial` (NULL = không giới hạn trong function `check_tenant_can_add`).

**2. UI: AddRoomsDialog — Hiển thị thông báo thân thiện cho trial**

Khi `subscription_status === 'trial'`:
- Ẩn phần tính giá, chiết khấu, thanh toán (vì miễn phí)
- Hiển thị Alert thân thiện:
  > "Bạn đang trong chương trình Hỗ trợ chuyển đổi số — hoàn toàn MIỄN PHÍ! Hãy thoải mái thêm phòng để trải nghiệm đầy đủ tính năng. Chúng tôi luôn đồng hành cùng bạn trong quá trình số hóa quản lý khách sạn."
- Nút xác nhận đổi thành "Thêm phòng miễn phí" (thay vì "Tiếp tục thanh toán")
- Thêm phòng trực tiếp vào `registered_rooms` mà không cần qua flow thanh toán

**3. UI: Bulk import — Bỏ chặn quota cho trial**

`useBulkCreateRooms.ts` đã có check quota. Vì `max_rooms = NULL` nên sẽ tự động bỏ qua (logic `if maxRooms !== null`).

**4. UI: useQuotaCheck — Tự động pass cho trial**

Không cần sửa — function `check_tenant_can_add` trả về `true` khi `max_rooms IS NULL`.

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | `UPDATE subscription_plans SET max_rooms = NULL WHERE code = 'free_trial'` |
| `src/components/settings/subscription/AddRoomsDialog.tsx` | Thêm logic phân biệt trial: hiện thông báo thân thiện, ẩn pricing, nút "Thêm phòng miễn phí", gọi updateSubscription trực tiếp |

### Chi tiết kỹ thuật

AddRoomsDialog khi trial:
- Lấy `subscription_status` từ `useTenantSubscription()`
- Nếu `status === 'trial'`: render UI đơn giản với Alert xanh, input số phòng, nút thêm miễn phí
- `handleConfirm` cho trial: gọi `updateSubscription` để cộng `registered_rooms` mà không tạo invoice/payment
- Bỏ `maxAdditional` limit cho trial (không giới hạn)

