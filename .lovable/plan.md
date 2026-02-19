
## Fix: Ấn "Mua thêm phòng" → Hiện thành công luôn không qua thanh toán

### Root cause

`AddRoomsDialog.tsx` dòng 40:
```typescript
const { data: bankSettings } = useBankPaymentSettings(); // Không có hotelId → luôn trả null
```

Vì `useBankPaymentSettings()` yêu cầu `hotelId`, khi gọi không có tham số, hook luôn return `null` (dòng 44: `if (!hotelId) return null`).

Trong `handleConfirm` (dòng 67):
```typescript
if (bankSettings) {       // bankSettings = null → false
  ...mở dialog thanh toán
} else {
  // Đi vào đây → cộng phòng NGAY, không qua thanh toán
  await updateSubscription.mutateAsync(...)
}
```

Kết quả: hệ thống cộng phòng ngay mà không tạo invoice, không hiển thị QR.

Tương tự, `BankTransferPaymentDialog.tsx` dòng 30 cũng gọi `useBankPaymentSettings()` không có `hotelId` → dialog payment cũng không hiển thị được QR dù có mở.

### Giải pháp

Subscription payment dùng cấu hình ngân hàng **global** (Super Admin thiết lập, `hotel_id IS NULL`), không phải của từng hotel. Cần dùng `useSuperAdminBankPaymentSettings()` thay thế.

### Thay đổi cần thực hiện

**1. `AddRoomsDialog.tsx`**

```typescript
// Trước:
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
const { data: bankSettings } = useBankPaymentSettings();

// Sau:
import { useSuperAdminBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
const { data: bankSettings } = useSuperAdminBankPaymentSettings();
```

**2. `BankTransferPaymentDialog.tsx`**

```typescript
// Trước:
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
const { data: bankSettings, isLoading: isLoadingSettings } = useBankPaymentSettings();

// Sau:
import { useSuperAdminBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
const { data: bankSettings, isLoading: isLoadingSettings } = useSuperAdminBankPaymentSettings();
```

**3. `PlanChangeDialog.tsx`** (kiểm tra phòng ngừa — dùng `useBankPaymentSettings` không hotelId)

Cần kiểm tra và fix nếu tương tự.

### Kết quả

- Khi ấn "Tiếp tục thanh toán" → mở `BankTransferPaymentDialog` với bank settings đúng
- Dialog tạo invoice, hiển thị QR code để quét
- Phòng chỉ được cộng sau khi SePay webhook xác nhận thanh toán thành công
- Không còn hiện "thành công" ngay khi ấn nút
