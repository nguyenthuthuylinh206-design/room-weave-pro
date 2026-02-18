
## Fix: Trang thanh toán không tìm thấy thông tin ngân hàng

### Nguyên nhân gốc

`SubscriptionPaymentPage.tsx` đang gọi:

```typescript
const { data: bankSettings } = useBankPaymentSettings(); // Không có hotelId
```

Hook `useBankPaymentSettings` yêu cầu `hotelId` để hoạt động. Khi không có `hotelId`, hook trả về `null` ngay lập tức (dòng 44: `if (!hotelId) return null`). Đây là lý do tại sao trang luôn hiển thị lỗi "Không tìm thấy thông tin ngân hàng".

Hệ thống thanh toán subscription dùng **cấu hình ngân hàng toàn cục** (do Super Admin thiết lập — không gắn với hotel cụ thể), trong khi hook đang tìm theo hotel.

### Giải pháp

Chỉ cần thay 1 dòng trong `SubscriptionPaymentPage.tsx`: dùng `useSuperAdminBankPaymentSettings()` thay vì `useBankPaymentSettings()`.

Hook `useSuperAdminBankPaymentSettings` (vừa tạo ở fix trước) query đúng record:
- `hotel_id IS NULL`
- `tenant_id IS NULL`  
- `is_active = true`

### Thay đổi cần thực hiện

**File: `src/pages/settings/SubscriptionPaymentPage.tsx`**

```typescript
// Trước (lỗi - không có hotelId, luôn trả null):
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
...
const { data: bankSettings, isLoading: isLoadingBank } = useBankPaymentSettings();

// Sau (đúng - lấy cấu hình global của Super Admin):
import { useSuperAdminBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
...
const { data: bankSettings, isLoading: isLoadingBank } = useSuperAdminBankPaymentSettings();
```

### Kết quả

- Trang thanh toán subscription sẽ load được thông tin ngân hàng từ cấu hình Super Admin
- QR code hiển thị đúng để khách hàng quét và chuyển khoản
- Không ảnh hưởng các chức năng thanh toán khác (phòng, v.v.)
