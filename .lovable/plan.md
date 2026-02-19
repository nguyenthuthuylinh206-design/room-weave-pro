
## Fix: Ấn thanh toán hiện thành công ngay — Race condition với async query

### Nguyên nhân thực sự

Đây là vấn đề **race condition**, không phải vấn đề sai hook như trước. Sau khi fix hook sang `useSuperAdminBankPaymentSettings()`, logic đã đúng về mặt dữ liệu, nhưng còn một lỗi timing:

Network request xác nhận: `PATCH /tenants` được gọi ngay — tức `updateSubscription.mutateAsync()` đang chạy dù có bankSettings trong DB.

**Timeline lỗi:**

```text
Component mount → bankSettings = undefined (đang fetch)
                                    ↓
                          User nhấn nút "Thanh toán"
                                    ↓
              handleConfirm() → if (bankSettings) → FALSE (undefined, chưa load xong)
                                    ↓
                    else → updateSubscription.mutateAsync() ← Cộng phòng ngay!
                                    ↓
                    Query hoàn thành → bankSettings có giá trị (nhưng quá muộn)
```

Điều này xảy ra khi user nhấn nút trong khoảng thời gian ngắn sau khi dialog mở, trước khi query `useSuperAdminBankPaymentSettings()` trả về dữ liệu từ server.

### Giải pháp

Hai thay đổi cần thực hiện ở cả `AddRoomsDialog.tsx` và `PlanChangeDialog.tsx`:

**1. Lấy `isLoading` từ hook để disable nút khi đang fetch:**

```typescript
const { data: bankSettings, isLoading: isBankSettingsLoading } = useSuperAdminBankPaymentSettings();
```

**2. Disable nút "Thanh toán" khi đang loading bank settings:**

```tsx
<Button 
  onClick={handleConfirm} 
  disabled={updateSubscription.isPending || isBankSettingsLoading || ...}
>
  {isBankSettingsLoading ? 'Đang tải...' : bankSettings ? 'Tiếp tục thanh toán' : '...'}
</Button>
```

**3. Thêm guard trong `handleConfirm` để chặn khi đang loading:**

```typescript
const handleConfirm = async () => {
  // Guard: Chưa load xong bank settings
  if (isBankSettingsLoading) return;
  
  if (bankSettings) {
    // Mở dialog thanh toán
  } else {
    // Nếu bankSettings = null (không cấu hình), không cho phép thanh toán
    // Thay vì tự cộng phòng trực tiếp, thông báo lỗi
    toast.error('Chưa cấu hình thông tin thanh toán. Vui lòng liên hệ quản trị viên.');
    return;
  }
};
```

> Lý do xóa nhánh `else → updateSubscription.mutateAsync()`: Đây là fallback nguy hiểm — nếu bank settings không load được, hệ thống sẽ tự động cộng phòng miễn phí. Nên chặn hành động này lại và yêu cầu admin cấu hình.

### Thay đổi cần thực hiện

**File 1: `src/components/settings/subscription/AddRoomsDialog.tsx`**
- Thêm `isLoading: isBankSettingsLoading` từ `useSuperAdminBankPaymentSettings()`
- Disable nút khi `isBankSettingsLoading`
- Trong `handleConfirm`: guard `if (isBankSettingsLoading) return;`
- Trong nhánh `else`: thay vì gọi `updateSubscription.mutateAsync()`, hiển thị toast lỗi

**File 2: `src/components/settings/subscription/PlanChangeDialog.tsx`**
- Tương tự: thêm `isLoading`, guard trong `handleConfirm`, xóa fallback nguy hiểm

### Kết quả

- Nút "Thanh toán" bị disabled trong khi đang load thông tin ngân hàng
- Sau khi load xong, nếu có bank settings → mở dialog QR
- Nếu không có bank settings → thông báo lỗi rõ ràng, không tự động cộng phòng
- Không còn hiện "thành công" ngay lập tức
