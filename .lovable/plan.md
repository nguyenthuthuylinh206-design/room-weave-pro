

## Vấn đề

Khi giao việc "Kiểm tra checkout" từ `CheckoutSummaryDialog` (single booking) → `useCheckoutInspection.createInspection`:

1. ✅ Insert vào `checkout_inspection_requests` 
2. ✅ Insert vào `housekeeping_tasks` (đầy đủ `title`, `booking_id`, `assigned_to`, `checkout_inspection_id`)
3. ❌ **KHÔNG gửi `sendPushNotification`** (push thật)
4. ❌ **KHÔNG gửi `createInAppNotification`** (chuông trong app)
5. ❌ **KHÔNG gửi `sendTelegramNotification`** (Telegram)
6. ❌ **KHÔNG gọi `triggerWorkflow(HOUSEKEEPING_TASK_CREATED)`** (bỏ workflow auto)

→ Nhân viên chỉ "nhận thấy" task **NẾU đang mở app & đang ở tab visible** (qua realtime của `useUnifiedTasks`). Nếu app bị nền/đóng → **không có thông báo nào** và task vẫn nằm trong DB nhưng nhân viên không biết.

So sánh với 2 flow khác đã làm đúng:
- `GroupCheckoutDialog.handleBatchInspectionRequest` (lines 471-476): gọi đầy đủ 4 notification (push + in-app + telegram cá nhân + telegram nhóm)
- `useHousekeepingTasks.useCreateTask` (lines 235-265): gọi `triggerHousekeepingTaskAssignedNotification` + `triggerWorkflow`

→ Phải đồng bộ `useCheckoutInspection.createInspection` theo chuẩn của 2 flow trên.

## Hướng sửa

Mở rộng `mutationFn` của `createInspection` trong `src/hooks/useCheckoutInspection.ts`:

### Sau khi insert thành công, gửi 4 thông báo song song:

```ts
// 3. Lấy thông tin phòng + booking để build message
const { data: roomData } = await supabase
  .from('rooms').select('room_number').eq('id', roomId).single()
const { data: bookingData } = await supabase
  .from('room_bookings').select('guest_name').eq('id', bookingId).single()

const roomNumber = roomData?.room_number || ''
const guestName = bookingData?.guest_name || 'Khách'

// 4. Gửi notification song song (không block insert flow)
await Promise.allSettled([
  sendPushNotification({
    userId: assignedTo, tenantId,
    title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
    body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
    actionUrl: `/my-tasks`,
    notificationType: 'room_checkout',
  }),
  createInAppNotification({
    userId: assignedTo, tenantId,
    title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
    body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
    type: 'room_checkout',
    actionUrl: `/my-tasks`,
  }),
  sendTelegramNotification({
    tenantId, hotelId, userIds: [assignedTo],
    title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
    message: `Khách: ${guestName}\nVui lòng kiểm tra phòng trước khi checkout.`,
    notificationType: 'checkout',
    actionUrl: `/my-tasks`,
  }),
  // Telegram nhóm để manager biết ai được giao
  sendTelegramNotification({
    tenantId, hotelId, sendToStaffGroups: true,
    title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
    message: `Khách: ${guestName}\n👤 Giao cho nhân viên`,
    notificationType: 'checkout',
    actionUrl: `/my-tasks`,
  }),
])
```

### Bổ sung trong `onSuccess`:

- Invalidate thêm `['unified-tasks']` để trigger refresh ở `HousekeepingStaffDashboard` của các nhân viên khác đang mở app (chưa kích hoạt realtime cho tenant đó).

```ts
queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })
queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks'] })
queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
```

(Lưu ý: invalidate ở client của người giao việc không tự refresh client của nhân viên — nhưng `useUnifiedTasks` đã subscribe realtime trên `housekeeping_tasks` filter `assigned_to=eq.${userId}`, INSERT mới sẽ tự bay sang client nhân viên nếu họ đang online và visible).

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useCheckoutInspection.ts` | Trong `createInspection.mutationFn` (sau insert housekeeping_tasks): fetch `room_number` + `guest_name`, gửi 4 notification (push + in-app + telegram cá nhân + telegram nhóm) song song. Thêm các invalidate queries còn thiếu. |

Không cần migration, không sửa edge function, không sửa schema. Reuse `sendPushNotification`, `createInAppNotification`, `sendTelegramNotification` đã import sẵn.

