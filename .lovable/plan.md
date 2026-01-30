
## ✅ HOÀN THÀNH: Laundry requests tự động tạo cho Daily Check

### Thay đổi đã thực hiện

**File: `src/hooks/useRoomChecks.ts`**

1. **Cập nhật `processDailyCheck()`** - thêm params `checkId` và `userName`:
   - Nhận thêm `checkId` để liên kết laundry request với room check
   - Nhận thêm `userName` để hiển thị người tạo request

2. **Thêm logic tạo laundry request** sau khi update quantities:
   ```typescript
   const hasLaundry = laundryItems.length > 0
   if (hasLaundry && tenantId && userId && checkId) {
     await createLaundryRequestFromCheck({...})
   }
   ```

3. **Cập nhật call site** trong switch case `daily`:
   ```typescript
   case 'daily':
     await processDailyCheck({
       ...baseParams,
       checkId: check.id,
       userName: user?.full_name || 'Nhân viên',
     })
   ```

### Kết quả

| Check type | Tạo Laundry Request | Trạng thái |
|------------|---------------------|------------|
| **checkout** | ✅ | Đúng |
| **daily** | ✅ | **Đã sửa** |
| **checkin** | ❌ | Đúng |
| **maintenance** | ❌ | Đúng |

Khi nhân viên kiểm tra phòng hàng ngày có đồ gửi giặt → hệ thống tự động tạo `laundry_request` và hiển thị trong `/laundry?tab=requests`.
