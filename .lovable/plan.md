

## Kế hoạch: Kiểm tra và hoàn thiện logic cho tất cả loại công việc Housekeeping

### TỔNG QUAN 6 LOẠI CÔNG VIỆC

| Task Type | Tên hiển thị | Trạng thái hiện tại |
|-----------|--------------|---------------------|
| `checkout_inspection` | Kiểm tra checkout | ✅ **Có logic đầy đủ** - Auto navigate đến `/rooms/{id}/check?type=checkout` |
| `cleaning` | Dọn phòng | ⚠️ **Thiếu logic** - Chỉ có nút "Hoàn thành" đơn giản |
| `delivery_confirmation` | Xác nhận nhận hàng | ✅ **Đã fix** - Auto mở modal xác nhận |
| `checkin_prep` | Chuẩn bị check-in | ❌ **Không có logic** - Chỉ có nút "Hoàn thành" |
| `amenity_request` | Bổ sung đồ dùng | ❌ **Không có logic** - Chỉ có nút "Hoàn thành" |
| `other` | Khác | ⚠️ **OK** - Generic, chỉ cần "Hoàn thành" |

---

### CHI TIẾT VẤN ĐỀ TỪNG LOẠI

#### 1. CLEANING (Dọn phòng) - CẦN CẢI THIỆN

**Hiện tại:**
- Bấm "Bắt đầu" → Chỉ update status thành `in_progress`
- Bấm "Hoàn thành" → Update status thành `completed`
- **KHÔNG** update trạng thái phòng từ `cleaning` → `vacant`
- **KHÔNG** có checklist hay quy trình cụ thể

**Nên có:**
- Khi hoàn thành, **tự động update room.status = 'vacant'**
- Hoặc navigate đến flow kiểm tra phòng (daily check) trước khi mở phòng
- Liên kết với `CleaningCompleteDialog` đã có sẵn

---

#### 2. CHECKIN_PREP (Chuẩn bị check-in) - CẦN XÂY DỰNG

**Hiện tại:**
- Bấm "Hoàn thành" → Chỉ update status
- Không có logic thực sự

**Nên có:**
- Checklist các việc cần chuẩn bị (dựa trên room template)
- Kiểm tra phòng đủ đồ dùng (`room_items`)
- Có thể navigate đến form kiểm tra checkin hoặc hiển thị modal checklist

---

#### 3. AMENITY_REQUEST (Bổ sung đồ dùng) - CẦN XÂY DỰNG

**Hiện tại:**
- Bấm "Hoàn thành" → Chỉ update status
- Không biết cần bổ sung những gì

**Nên có:**
- Hiển thị danh sách đồ cần bổ sung (từ `description` hoặc link tới `room_items` thiếu)
- Khi hoàn thành, **cập nhật `room_items`** để ghi nhận đã bổ sung
- Hoặc navigate đến trang bổ sung đồ dùng

---

### GIẢI PHÁP ĐỀ XUẤT

#### Phương án 1: Quick Fix - Cải thiện flow Cleaning

**Thay đổi:**
1. Khi bấm "Hoàn thành" task `cleaning`:
   - Mở `CleaningCompleteDialog` (đã có sẵn)
   - Cho phép user chọn: "Mở phòng ngay" hoặc "Kiểm tra trước"
   - Update task status + room status

**File cần sửa:**
- `TaskCard.tsx` - Thêm logic mở dialog khi complete cleaning task
- `TaskDetailDialog.tsx` - Tương tự

---

#### Phương án 2: Full Implementation - Xây dựng đầy đủ logic

##### A. CLEANING Task
```text
┌─────────────────────────────────────────────┐
│              CLEANING TASK                  │
└─────────────────────────────────────────────┘
                    │
                    ▼
          [Bấm "Bắt đầu"]
                    │
                    ▼
           Status: in_progress
                    │
                    ▼
          [Bấm "Hoàn thành"]
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
  [Mở phòng ngay]         [Kiểm tra trước]
        │                       │
        ▼                       ▼
  room.status = vacant    Navigate to /rooms/{id}/check?type=daily
        │                       │
        ▼                       ▼
  Task completed          Task updated với room_check_id
```

##### B. CHECKIN_PREP Task
```text
┌─────────────────────────────────────────────┐
│           CHECKIN_PREP TASK                 │
└─────────────────────────────────────────────┘
                    │
                    ▼
          [Bấm "Bắt đầu"]
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
  Status: in_progress
                    │
                    ▼
  Mở modal/navigate hiển thị checklist:
  - Danh sách đồ dùng cần có trong phòng
  - Tick từng item đã chuẩn bị xong
                    │
                    ▼
  [Hoàn thành checklist]
                    │
                    ▼
  Task completed
  → Room status = ready / waiting_checkin
```

##### C. AMENITY_REQUEST Task
```text
┌─────────────────────────────────────────────┐
│          AMENITY_REQUEST TASK               │
└─────────────────────────────────────────────┘
                    │
                    ▼
          [Bấm "Bắt đầu"]
                    │
                    ▼
  Mở modal hiển thị:
  - Phòng nào?
  - Thiếu gì? (lấy từ description hoặc room_items)
                    │
                    ▼
  [Nhân viên mang đồ đến phòng]
                    │
                    ▼
  [Bấm "Xác nhận đã bổ sung"]
                    │
                    ▼
  Update room_items.quantity
  Task completed
```

---

### KẾ HOẠCH THỰC HIỆN (Phương án 1 - Quick Fix)

#### File thay đổi:

| File | Thay đổi |
|------|----------|
| `TaskCard.tsx` | Import `CleaningCompleteDialog`, thêm state + logic mở dialog khi complete cleaning |
| `TaskDetailDialog.tsx` | Tương tự TaskCard |

#### Chi tiết code:

**TaskCard.tsx / TaskDetailDialog.tsx:**
```tsx
// Thêm import
import { CleaningCompleteDialog } from '@/components/rooms/CleaningCompleteDialog'

// Thêm state
const [showCleaningComplete, setShowCleaningComplete] = useState(false)

// Sửa handleComplete
const handleComplete = async () => {
  // Nếu là cleaning task, mở dialog thay vì complete trực tiếp
  if (task.task_type === 'cleaning') {
    setShowCleaningComplete(true)
    return
  }
  
  // Các task type khác, complete bình thường
  await updateStatus({ taskId: task.id, status: 'completed' })
}

// Thêm callback khi cleaning hoàn thành
const handleCleaningCompleted = async () => {
  // Dialog đã xử lý room status
  // Chỉ cần update task status
  await updateStatus({ taskId: task.id, status: 'completed' })
  setShowCleaningComplete(false)
}

// Render dialog
{task.task_type === 'cleaning' && task.room && (
  <CleaningCompleteDialog
    open={showCleaningComplete}
    onOpenChange={setShowCleaningComplete}
    roomId={task.room_id}
    roomNumber={task.room.room_number}
    onComplete={handleCleaningCompleted}  // Cần thêm prop này vào dialog
  />
)}
```

**CleaningCompleteDialog.tsx - Thêm prop onComplete:**
```tsx
interface CleaningCompleteDialogProps {
  // ... existing props
  onComplete?: () => void  // Callback sau khi hoàn thành
}

// Trong handleConfirm, gọi onComplete sau khi xong
const handleConfirm = async () => {
  if (option === 'check') {
    onOpenChange(false)
    navigate(`/rooms/${roomId}/check?type=daily`)
  } else {
    await markRoomReady.mutateAsync({ roomId, skipCheck: true })
    onComplete?.()  // Gọi callback
    onOpenChange(false)
  }
}
```

---

### KẾT QUẢ SAU KHI SỬA

| Task Type | Flow mới |
|-----------|----------|
| `cleaning` | Bắt đầu → Làm → Hoàn thành → **Dialog chọn: Mở phòng/Kiểm tra** → Done |
| `checkin_prep` | Giữ nguyên (phase 2) |
| `amenity_request` | Giữ nguyên (phase 2) |

---

### LƯU Ý

- Phương án 1 chỉ fix `cleaning` vì đây là task phổ biến nhất và đã có `CleaningCompleteDialog` sẵn
- `checkin_prep` và `amenity_request` cần thiết kế UI/UX riêng (phase 2)
- Có thể mở rộng sau bằng cách tạo modal/flow cho từng loại task

