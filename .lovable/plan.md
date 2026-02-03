

## Kế hoạch: Hoàn thiện logic Xác nhận nhận hàng (Delivery Confirmation)

### VẤN ĐỀ HIỆN TẠI

| Vấn đề | Mô tả |
|--------|-------|
| Flow 2 bước thừa | Bấm "Bắt đầu" chỉ update status, phải bấm thêm lần nữa để mở modal xác nhận |
| Không nhất quán | `checkout_inspection` auto-navigate, nhưng `delivery_confirmation` thì không |
| Lý do từ chối bị mất | Khi báo thiếu hàng, `rejectReason` không được lưu vào notes |
| Thiếu thông báo | Manager không được thông báo khi nhân viên báo thiếu hàng |

---

### GIẢI PHÁP

#### 1. Mở modal xác nhận ngay khi bấm "Bắt đầu" cho delivery task

**File**: `src/components/housekeeping/TaskCard.tsx` và `TaskDetailDialog.tsx`

```tsx
// TRƯỚC (TaskCard.tsx - handleStart):
const handleStart = async () => {
  await updateStatus({ taskId: task.id, status: 'in_progress' })
  
  if (task.task_type === 'checkout_inspection') {
    navigate(`/rooms/${task.room_id}/check?type=checkout...`)
  }
  // delivery_confirmation: chỉ update status, không làm gì thêm
}

// SAU:
const handleStart = async () => {
  await updateStatus({ taskId: task.id, status: 'in_progress' })
  
  if (task.task_type === 'checkout_inspection') {
    navigate(`/rooms/${task.room_id}/check?type=checkout...`)
  } else if (task.task_type === 'delivery_confirmation') {
    // Mở modal xác nhận ngay sau khi start
    setShowDeliveryModal(true)
  }
}
```

Áp dụng tương tự cho `TaskDetailDialog.tsx`.

---

#### 2. Lưu lý do từ chối vào notes khi báo thiếu hàng

**File**: `src/components/housekeeping/DeliveryConfirmationModal.tsx`

```tsx
// TRƯỚC:
const handleReject = async () => {
  await updateTaskStatus({ taskId, status: 'cancelled' })  // Không lưu reason
}

// SAU:
const handleReject = async () => {
  // 1. Update task với notes chứa lý do từ chối
  await updateTaskWithNotes({ 
    taskId, 
    status: 'cancelled',
    notes: `Thiếu hàng: ${rejectReason.trim()}`
  })
  
  // 2. Gửi thông báo cho manager (tùy chọn)
  // triggerDeliveryRejectNotification(...)
}
```

**Cập nhật hook** `useUpdateTaskStatus` hoặc tạo mutation mới để hỗ trợ lưu notes.

---

#### 3. (Tùy chọn) Gửi thông báo khi báo thiếu hàng

Khi nhân viên báo thiếu hàng, trigger workflow/notification cho manager biết.

---

### FLOW SAU KHI SỬA

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY CONFIRMATION TASK                   │
└─────────────────────────────────────────────────────────────────┘

                     [Task đang PENDING]
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Bấm "Bắt đầu thực hiện"              │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  Update status       Mở modal             [Không cần
  → in_progress       xác nhận              bấm thêm]
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
   [Nhận đủ hàng]                   [Thiếu hàng]
          │                               │
          ▼                               ▼
  confirm_delivery_                 Nhập lý do
  from_room_check()                       │
          │                               ▼
          ▼                         Cancel task
  Update items                     + Lưu notes
  → room_items                     + Thông báo
          │                         manager
          ▼                               │
  Complete task                           ▼
          │                         Task cancelled
          ▼                         với ghi chú
  Task completed                    chi tiết
```

---

### CHI TIẾT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/housekeeping/TaskCard.tsx` | Thêm logic mở modal ngay sau khi start delivery task |
| `src/components/housekeeping/TaskDetailDialog.tsx` | Tương tự như TaskCard |
| `src/components/housekeeping/DeliveryConfirmationModal.tsx` | Thêm logic lưu notes khi từ chối |
| `src/hooks/useHousekeepingTasks.ts` | Mở rộng `useUpdateTaskStatus` để hỗ trợ notes |

---

### LỢI ÍCH

1. **Giảm số bước**: 2 bước → 1 bước cho delivery task
2. **Nhất quán**: Tất cả task types đều có hành động ngay khi bấm "Bắt đầu"
3. **Truy xuất được**: Lý do thiếu hàng được lưu lại, dễ theo dõi
4. **Thông báo realtime**: Manager biết ngay khi có vấn đề về giao hàng

