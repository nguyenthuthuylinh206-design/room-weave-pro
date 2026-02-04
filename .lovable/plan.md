

## Kế hoạch: Bổ sung thông báo cho Group Checkout

### VẤN ĐỀ

Trong `GroupCheckoutDialog`, khi gửi yêu cầu kiểm tra phòng (`handleBatchInspectionRequest`), hệ thống **KHÔNG GỬI THÔNG BÁO** đến nhân viên được gán. Điều này khác với checkout lẻ (`CheckoutSummaryDialog`) - nơi gửi đầy đủ:

- Push notification
- In-app notification  
- Telegram cá nhân
- Telegram nhóm staff

### GIẢI PHÁP

Thêm gửi thông báo song song sau khi tạo inspection request và housekeeping task trong hàm `handleBatchInspectionRequest`:

```typescript
// Sau khi tạo inspection request và housekeeping task
// Gửi thông báo song song (parallel)
const staff = staffList.find(s => s.id === staffId)
const staffName = staff?.full_name || 'Nhân viên'

await Promise.all([
  // 1. Push notification cho nhân viên
  sendPushNotification({
    userId: staffId,
    tenantId,
    title: `Yêu cầu kiểm tra phòng ${booking.room?.room_number}`,
    body: `Khách ${booking.guest_name} sắp checkout. Vui lòng kiểm tra phòng.`,
    actionUrl: `/my-tasks`,
    notificationType: 'room_checkout',
  }),
  
  // 2. In-app notification cho nhân viên
  createInAppNotification({
    userId: staffId,
    tenantId,
    title: `Yêu cầu kiểm tra phòng ${booking.room?.room_number}`,
    body: `Khách ${booking.guest_name} sắp checkout. Vui lòng kiểm tra phòng.`,
    type: 'room_checkout',
    actionUrl: `/my-tasks`,
  }),
  
  // 3. Telegram cho nhân viên cá nhân
  sendTelegramNotification({
    tenantId,
    hotelId,
    userIds: [staffId],
    title: `🔍 Yêu cầu kiểm tra phòng ${booking.room?.room_number}`,
    message: `Khách: ${booking.guest_name}\nVui lòng kiểm tra phòng trước khi checkout.`,
    notificationType: 'checkout',
    actionUrl: `/my-tasks`,
  }),
  
  // 4. Telegram cho nhóm staff của hotel
  sendTelegramNotification({
    tenantId,
    hotelId,
    sendToStaffGroups: true,
    title: `🔍 Yêu cầu kiểm tra phòng ${booking.room?.room_number}`,
    message: `Khách: ${booking.guest_name}\n👤 Giao cho: ${staffName}\nVui lòng kiểm tra phòng trước khi checkout.`,
    notificationType: 'checkout',
    actionUrl: `/my-tasks`,
  }),
])
```

---

### THAY ĐỔI CẦN THỰC HIỆN

#### 1. Thêm imports

```typescript
import { 
  triggerRoomCheckoutNotification,
  sendPushNotification,
  createInAppNotification,
  sendTelegramNotification 
} from '@/hooks/useNotificationTriggers'
```

#### 2. Cập nhật hàm `handleBatchInspectionRequest`

```typescript
const handleBatchInspectionRequest = async () => {
  // ... existing validation code ...
  
  setIsProcessing(true)
  try {
    for (const bookingId of roomsToRequest) {
      const booking = groupData?.bookings.find(b => b.id === bookingId)
      const staffId = staffAssignments.get(bookingId)
      
      if (!booking || !staffId) continue
      
      // Create inspection request (existing)
      await supabase.from('checkout_inspection_requests').insert({...})
      
      // Create housekeeping task (existing)
      await supabase.from('housekeeping_tasks').insert({...})
      
      // NEW: Send notifications (parallel)
      const staff = staffList.find(s => s.id === staffId)
      const staffName = staff?.full_name || 'Nhân viên'
      const roomNumber = booking.room?.room_number || ''
      const guestName = booking.guest_name
      
      await Promise.all([
        // Push notification
        sendPushNotification({
          userId: staffId,
          tenantId,
          title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
          body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
          actionUrl: `/my-tasks`,
          notificationType: 'room_checkout',
        }),
        // In-app notification
        createInAppNotification({
          userId: staffId,
          tenantId,
          title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
          body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
          type: 'room_checkout',
          actionUrl: `/my-tasks`,
        }),
        // Telegram to individual staff
        sendTelegramNotification({
          tenantId,
          hotelId,
          userIds: [staffId],
          title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
          message: `Khách: ${guestName}\nVui lòng kiểm tra phòng trước khi checkout.`,
          notificationType: 'checkout',
          actionUrl: `/my-tasks`,
        }),
        // Telegram to staff groups
        sendTelegramNotification({
          tenantId,
          hotelId,
          sendToStaffGroups: true,
          title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
          message: `Khách: ${guestName}\n👤 Giao cho: ${staffName}\nVui lòng kiểm tra phòng trước khi checkout.`,
          notificationType: 'checkout',
          actionUrl: `/my-tasks`,
        }),
      ])
    }
    
    toast.success(`Đã gửi ${roomsToRequest.length} yêu cầu kiểm tra`)
    refetchInspections()
  } catch (error) {
    // ... existing error handling ...
  } finally {
    setIsProcessing(false)
  }
}
```

---

### FILES CẦN THAY ĐỔI

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/bookings/GroupCheckoutDialog.tsx` | Thêm imports và gửi thông báo trong `handleBatchInspectionRequest` |

---

### KẾT QUẢ MONG ĐỢI

Khi gửi yêu cầu kiểm tra phòng trong Group Checkout:

| Kênh | Trước | Sau |
|------|-------|-----|
| Push notification | ❌ Không | ✅ Có |
| In-app notification | ❌ Không | ✅ Có |
| Telegram cá nhân | ❌ Không | ✅ Có |
| Telegram nhóm | ❌ Không | ✅ Có |

**Nhân viên sẽ nhận được thông báo ngay khi được giao kiểm tra phòng** - giống hệt với checkout lẻ.

