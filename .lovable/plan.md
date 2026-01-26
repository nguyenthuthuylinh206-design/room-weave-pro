

## Kế hoạch: Thêm thông báo chi tiết khi giao/chuyển việc cho nhân viên

### I. PHÂN TÍCH HIỆN TẠI

| Thành phần | Hiện tại | Vấn đề |
|------------|----------|--------|
| `useReassignTask` | Chỉ toast "Đã giao việc cho X" | Không gửi notification đến nhân viên |
| `triggerTaskAssignedNotification` | Hỗ trợ maintenance, room_check, laundry, distribution | Chưa hỗ trợ housekeeping tasks |

### II. GIẢI PHÁP

#### 1. Tạo function mới `triggerHousekeepingTaskAssignedNotification`

Thêm vào `useNotificationTriggers.ts`:

```typescript
export async function triggerHousekeepingTaskAssignedNotification({
  tenantId,
  hotelId,
  assignedToUserId,
  assignedByUserId,
  taskId,
  taskType,        // checkout_inspection, cleaning, etc.
  roomNumber,
  priority,
  reason,          // Lý do chuyển việc (nếu có)
  isReassignment,  // true = chuyển việc, false = giao mới
}: {
  tenantId: string;
  hotelId: string;
  assignedToUserId: string;
  assignedByUserId: string;
  taskId: string;
  taskType: string;
  roomNumber: string;
  priority: string;
  reason?: string;
  isReassignment: boolean;
}) {
  if (assignedToUserId === assignedByUserId) return;

  const assigner = await getUserById(assignedByUserId);
  const taskTypeLabel = TASK_TYPE_LABELS[taskType] || taskType;
  const priorityLabel = PRIORITY_LABELS[priority] || priority;

  // Title rõ ràng: Giao mới vs Chuyển việc
  const title = isReassignment 
    ? 'Bạn được chuyển công việc mới' 
    : 'Bạn được giao công việc mới';

  // Body chi tiết với đầy đủ thông tin
  const bodyParts = [
    `📍 Phòng ${roomNumber}`,
    `📋 ${taskTypeLabel}`,
    `⚡ Ưu tiên: ${priorityLabel}`,
    `👤 Giao bởi: ${assigner?.full_name || 'Quản lý'}`
  ];
  
  if (reason) {
    bodyParts.push(`📝 Lý do: ${reason}`);
  }

  const body = bodyParts.join('\n');
  const actionUrl = `/staff?task=${taskId}`;

  // Gửi đồng thời: In-app + Push + Telegram
  await Promise.all([
    createInAppNotification({
      userId: assignedToUserId,
      tenantId,
      title,
      body,
      type: 'task_assigned',
      actionUrl,
      icon: 'user-check',
      metadata: { 
        taskId, 
        taskType, 
        roomNumber,
        priority,
        assignedBy: assignedByUserId,
        isReassignment 
      }
    }),
    sendPushNotification({
      userId: assignedToUserId,
      tenantId,
      title,
      body,
      actionUrl,
      tag: `task-housekeeping-${taskId}`,
      notificationType: 'task_assigned',
    }),
    // Telegram notification to individual user
    sendTelegramNotification({
      tenantId,
      hotelId,
      userIds: [assignedToUserId],
      title,
      message: body,
      notificationType: 'system',
      actionUrl,
    }),
  ]);
}
```

#### 2. Cập nhật `useReassignTask` để gọi notification

Trong `useHousekeepingTasks.ts`:

```typescript
// Sau khi update thành công
onSuccess: async (data, variables) => {
  // Invalidate queries (giữ nguyên)
  queryClient.invalidateQueries(...)
  
  // Toast (giữ nguyên)
  toast.success(`Đã giao việc cho ${data.assigned_user?.full_name}`)
  
  // GỬI THÔNG BÁO CHI TIẾT đến nhân viên
  if (data.assigned_to && user) {
    await triggerHousekeepingTaskAssignedNotification({
      tenantId: user.tenant_id,
      hotelId: data.hotel_id,
      assignedToUserId: data.assigned_to,
      assignedByUserId: user.id,
      taskId: data.id,
      taskType: data.task_type,
      roomNumber: data.room?.room_number || 'N/A',
      priority: data.priority,
      reason: variables.reason,
      isReassignment: !!variables.reason, // Có lý do = chuyển việc
    })
  }
}
```

### III. NỘI DUNG THÔNG BÁO CHI TIẾT

**Ví dụ thông báo khi giao việc mới:**
```
📌 Bạn được giao công việc mới

📍 Phòng 305
📋 Dọn phòng  
⚡ Ưu tiên: Cao
👤 Giao bởi: Quản Lý 2
```

**Ví dụ thông báo khi chuyển việc:**
```
📌 Bạn được chuyển công việc mới

📍 Phòng 401
📋 Kiểm tra checkout
⚡ Ưu tiên: Khẩn cấp
👤 Giao bởi: Quản Lý 2
📝 Lý do: NV cũ bận việc khác
```

### IV. CÁC KÊNH THÔNG BÁO

| Kênh | Mục đích |
|------|----------|
| **In-app** | Hiển thị trong app, lưu lịch sử |
| **Push** | Thông báo đẩy lên thiết bị (PWA) |
| **Telegram** | Thông báo trực tiếp đến chat Telegram cá nhân |

### V. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/hooks/useNotificationTriggers.ts` | Thêm function `triggerHousekeepingTaskAssignedNotification` |
| `src/hooks/useHousekeepingTasks.ts` | Import và gọi trigger trong `useReassignTask.onSuccess` |

### VI. THỨ TỰ TRIỂN KHAI

1. Thêm `triggerHousekeepingTaskAssignedNotification` vào `useNotificationTriggers.ts`
2. Import function vào `useHousekeepingTasks.ts`
3. Cập nhật `onSuccess` của `useReassignTask` để gọi trigger
4. Test giao việc và kiểm tra notification trên các kênh

