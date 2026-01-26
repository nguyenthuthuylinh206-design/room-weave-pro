
## Kế hoạch: Sửa lỗi Task hiển thị không đầy đủ - Đồng bộ Housekeeping Task và Checkout Inspection

### I. PHÂN TÍCH VẤN ĐỀ

Có **2 hệ thống riêng biệt** đang chạy song song nhưng không được đồng bộ:

| Hệ thống | Bảng | Mục đích |
|----------|------|----------|
| Housekeeping Tasks | `housekeeping_tasks` | Quản lý công việc nhân viên |
| Checkout Inspection | `checkout_inspection_requests` | Workflow kiểm tra checkout |

**Vấn đề hiện tại:**
1. Task `checkout_inspection` có status `in_progress` cho phòng P101
2. Nhưng `checkout_inspection_requests` cho phòng P101 đã `completed`
3. Khi nhân viên bấm "Kiểm tra phòng", URL có `taskId` nhưng `RoomCheckPage` **không dùng param này**
4. `RoomCheckPage` tìm `checkout_inspection_requests` bằng `usePendingInspections(roomId)` → không tìm thấy → lỗi!

**Console Error:**
```
PGRST116: Cannot coerce the result to a single JSON object
The result contains 0 rows
```

---

### II. GIẢI PHÁP

#### Bước 1: Cập nhật URL Navigation trong TaskCard

Thay vì dùng param `taskId`, sử dụng logic thông minh hơn:

**File:** `src/components/housekeeping/TaskCard.tsx`

```typescript
const handleContinue = () => {
  if (task.task_type === 'checkout_inspection') {
    // Navigate trực tiếp - không cần inspection ID
    // RoomCheckPage sẽ tự tìm hoặc tạo flow mới
    navigate(`/rooms/${task.room_id}/check?type=checkout`)
  }
}
```

#### Bước 2: Cập nhật TaskDetailDialog tương tự

**File:** `src/components/housekeeping/TaskDetailDialog.tsx`

```typescript
const handleContinue = () => {
  if (!task) return
  onOpenChange(false)
  if (task.task_type === 'checkout_inspection') {
    navigate(`/rooms/${task.room_id}/check?type=checkout`)
  }
}
```

#### Bước 3: Sửa RoomCheckPage để xử lý khi không có pending inspection

**File:** `src/pages/rooms/RoomCheckPage.tsx`

Thêm logic xử lý khi:
- Không có pending `checkout_inspection_requests`
- Nhưng user vẫn muốn làm checkout check

```typescript
// Nếu checkout mode mà không có inspection request, vẫn cho phép kiểm tra
// (có thể là task được tạo thủ công hoặc inspection đã completed)
const canProceedWithoutInspection = 
  isCheckoutType && 
  !isInspectionLoading && 
  !pendingInspection && 
  !roomInspection
```

#### Bước 4: Đồng bộ status khi hoàn thành room check

**File:** `src/pages/rooms/RoomCheckPage.tsx` (trong `onSubmit`)

Sau khi tạo room check thành công với type `checkout`, tự động cập nhật housekeeping task liên quan:

```typescript
// Tìm và cập nhật housekeeping task nếu có
if (isCheckoutType && room?.id) {
  const { data: relatedTask } = await supabase
    .from('housekeeping_tasks')
    .select('id')
    .eq('room_id', room.id)
    .eq('task_type', 'checkout_inspection')
    .eq('assigned_to', user.id)
    .in('status', ['pending', 'in_progress'])
    .maybeSingle()
  
  if (relatedTask) {
    await supabase
      .from('housekeeping_tasks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        room_check_id: createdCheckId
      })
      .eq('id', relatedTask.id)
  }
}
```

---

### III. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/housekeeping/TaskCard.tsx` | Bỏ `taskId` param không dùng |
| `src/components/housekeeping/TaskDetailDialog.tsx` | Bỏ `taskId` param không dùng |
| `src/pages/rooms/RoomCheckPage.tsx` | Xử lý case không có inspection + auto-complete task |

---

### IV. WORKFLOW SAU SỬA

```text
1. Manager giao task checkout_inspection cho Staff
   ↓
2. Staff nhận notification, mở /my-tasks
   ↓
3. Staff bấm "Kiểm tra phòng" 
   ↓
4. Navigate: /rooms/{roomId}/check?type=checkout
   ↓
5. RoomCheckPage kiểm tra:
   - Có pending inspection? → Dùng inspection flow
   - Không có? → Vẫn cho phép checkout check
   ↓
6. Staff hoàn thành kiểm tra
   ↓
7. onSubmit:
   - Tạo room_check record
   - Auto-complete housekeeping_task liên quan
   - Auto-complete checkout_inspection_requests nếu có
   ↓
8. Task biến mất khỏi "Công việc của tôi"
```

---

### V. GIẢI PHÁP TẠM THỜI CHO DATA HIỆN TẠI

Cập nhật task đang bị "treo" (status in_progress nhưng inspection đã xong):

```sql
UPDATE housekeeping_tasks
SET 
  status = 'completed',
  completed_at = NOW()
WHERE 
  room_id = '15fdeeb9-4eaa-4b42-bdb5-e99ec65e5983'
  AND task_type = 'checkout_inspection'
  AND status = 'in_progress';
```

---

### VI. CHI TIẾT KỸ THUẬT

**Vấn đề với `usePendingInspections`:**
- Filter: `assigned_to = user.id` AND `status IN ('pending', 'in_progress')`
- Nếu inspection đã completed/cancelled → trả về null
- Gây lỗi khi `startInspection` được gọi với inspection không tồn tại

**Sửa đổi trong `startInspection`:**
Thay vì `.single()`, dùng `.maybeSingle()` để tránh lỗi khi 0 rows:

```typescript
const { data, error } = await supabase
  .from('checkout_inspection_requests')
  .update({ status: 'in_progress', started_at: new Date().toISOString() })
  .eq('id', inspectionId)
  .eq('status', 'pending')
  .select()
  .maybeSingle() // Thay cho .single()

if (!data) {
  // Inspection đã được start hoặc không tồn tại - không phải lỗi nghiêm trọng
  console.warn('Inspection already started or not found')
  return null
}
```
