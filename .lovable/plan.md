

## Kế hoạch: Triển khai chức năng Yêu cầu Kiểm tra Phòng từ danh mục Phòng

### PHÂN TÍCH HIỆN TẠI

#### Các thành phần liên quan:

| File | Chức năng |
|------|-----------|
| `RoomsPage.tsx` | Trang danh mục phòng (desktop) |
| `MobileRoomsPage.tsx` | Trang danh mục phòng (mobile) |
| `RoomGrid.tsx` | Grid view hiển thị các phòng |
| `RoomTable.tsx` | Table view hiển thị các phòng |
| `RoomBulkActionsBar.tsx` | Thanh bulk actions khi chọn nhiều phòng |
| `MobileRoomBulkActionsBar.tsx` | Thanh bulk actions (mobile) |
| `CreateTaskDialog.tsx` | Dialog tạo yêu cầu công việc housekeeping |
| `useCreateTask()` | Hook tạo housekeeping task |

#### Hiện trạng:

1. **Đã có sẵn:**
   - `CreateTaskDialog` component để tạo yêu cầu công việc
   - `useCreateTask()` hook để insert vào bảng `housekeeping_tasks`
   - Chức năng tạo task từ trang chi tiết phòng (`RoomDetailPage`, `MobileRoomDetailPage`)
   - Quyền tạo task: chỉ Manager và Admin (`canCreateHousekeepingTask`)

2. **Chưa có:**
   - Nút "Yêu cầu kiểm tra" trên mỗi card phòng trong grid/table
   - Bulk action "Yêu cầu kiểm tra nhiều phòng" khi chọn nhiều phòng
   - UI để nhanh chóng tạo yêu cầu kiểm tra từ danh mục phòng

### GIẢI PHÁP ĐỀ XUẤT

#### Phần 1: Thêm nút "Yêu cầu kiểm tra" vào RoomGrid

Thêm nút ở footer của mỗi card phòng, bên cạnh nút "Kiểm tra":

```text
HIỆN TẠI:
┌─────────────────────────────────────┐
│ P101                   [Status ▼]  │
│ Deluxe                             │
│─────────────────────────────────────│
│ 👥 2  🛏️ King  📐 35m²              │
│ ✓ Đủ đồ dùng                       │
│─────────────────────────────────────│
│ [ Xem chi tiết ]  [ Kiểm tra ]     │
└─────────────────────────────────────┘

ĐỀ XUẤT:
┌─────────────────────────────────────┐
│ P101                   [Status ▼]  │
│ Deluxe                             │
│─────────────────────────────────────│
│ 👥 2  🛏️ King  📐 35m²              │
│ ✓ Đủ đồ dùng                       │
│─────────────────────────────────────│
│ [Chi tiết] [Yêu cầu ▼] [Kiểm tra]  │  ← Thêm dropdown "Yêu cầu"
└─────────────────────────────────────┘
```

#### Phần 2: Dropdown menu cho các loại yêu cầu

Khi bấm nút "Yêu cầu", hiển thị dropdown với các option:

- Kiểm tra checkout
- Dọn phòng
- Chuẩn bị check-in
- Bổ sung đồ dùng
- Khác

Chọn option sẽ mở `CreateTaskDialog` với loại task được chọn sẵn.

#### Phần 3: Bulk action "Yêu cầu kiểm tra nhiều phòng"

Thêm vào `RoomBulkActionsBar`:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Đã chọn 3 phòng  [Xóa chọn]    [Đổi trạng thái ▼] [📋 Yêu cầu ▼] [🗑️ Xóa] │
└─────────────────────────────────────────────────────────────────┘
                                         ↑ Thêm dropdown này
```

Dropdown "Yêu cầu" sẽ:
1. Chọn loại task (cleaning, checkin_prep, etc.)
2. Tạo task cho TẤT CẢ phòng đã chọn
3. Hiển thị dialog xác nhận với danh sách phòng

#### Phần 4: Quick Create Task Dialog (Tạo nhanh cho nhiều phòng)

Component mới cho việc tạo task nhiều phòng cùng lúc:

```text
┌─────────────────────────────────────────────────────────┐
│ Tạo yêu cầu cho 3 phòng                            [X] │
├─────────────────────────────────────────────────────────┤
│ Phòng: P101, P102, P103                                 │
│                                                         │
│ Loại công việc:  [Dọn phòng ▼]                         │
│ Mức độ ưu tiên:  ○ Thấp  ● TB  ○ Cao  ○ Khẩn          │
│ Giao cho:        [Chọn nhân viên ▼] (tùy chọn)         │
│                                                         │
│ Ghi chú:                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│               [Hủy]  [Tạo 3 yêu cầu]                   │
└─────────────────────────────────────────────────────────┘
```

### FILES CẦN SỬA ĐỔI

| File | Thay đổi |
|------|----------|
| `RoomGrid.tsx` | Thêm dropdown "Yêu cầu" với các loại task, chỉ hiện cho Manager/Admin |
| `RoomTable.tsx` | Thêm column action hoặc dropdown tương tự RoomGrid |
| `RoomBulkActionsBar.tsx` | Thêm bulk action "Yêu cầu" với dropdown chọn loại task |
| `MobileRoomBulkActionsBar.tsx` | Tương tự cho mobile |
| **Mới**: `BulkCreateTaskDialog.tsx` | Dialog tạo task cho nhiều phòng cùng lúc |
| `useHousekeepingTasks.ts` | Thêm hook `useBulkCreateTasks()` để tạo nhiều task |

### CHI TIẾT KỸ THUẬT

#### 1. Thêm dropdown "Yêu cầu" vào RoomGrid

```tsx
// RoomGrid.tsx - Thêm vào CardFooter
import { CreateTaskDialog } from '@/components/housekeeping/CreateTaskDialog'
import { canCreateHousekeepingTask } from '@/lib/userAccess'

// State cho dialog
const [taskRoom, setTaskRoom] = useState<{id: string, number: string, hotelId: string} | null>(null)
const [taskType, setTaskType] = useState<TaskType>('cleaning')
const canCreateTask = canCreateHousekeepingTask(user)

// Trong CardFooter
{canCreateTask && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline">
        <ClipboardList className="h-4 w-4 mr-1" />
        Yêu cầu
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => openTaskDialog('cleaning')}>
        Dọn phòng
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openTaskDialog('checkout_inspection')}>
        Kiểm tra checkout
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openTaskDialog('checkin_prep')}>
        Chuẩn bị check-in
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openTaskDialog('amenity_request')}>
        Bổ sung đồ dùng
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

#### 2. BulkCreateTaskDialog component

```tsx
// BulkCreateTaskDialog.tsx
interface BulkCreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: { id: string; room_number: string; hotel_id: string }[]
  onSuccess?: () => void
}

export function BulkCreateTaskDialog({ open, onOpenChange, rooms, onSuccess }: Props) {
  const { mutateAsync: createTask } = useCreateTask()
  const [taskType, setTaskType] = useState<TaskType>('cleaning')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Tạo task cho từng phòng
      for (const room of rooms) {
        await createTask({
          hotel_id: room.hotel_id,
          room_id: room.id,
          task_type: taskType,
          priority,
          assigned_to: assignedTo || undefined,
          notes: notes || undefined,
        })
      }
      toast.success(`Đã tạo ${rooms.length} yêu cầu`)
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error('Không thể tạo yêu cầu')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu cho {rooms.length} phòng</DialogTitle>
        </DialogHeader>
        {/* Form fields */}
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Phòng: {rooms.map(r => r.room_number).join(', ')}
          </div>
          {/* Task type selector, priority, assignee, notes */}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : `Tạo ${rooms.length} yêu cầu`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### 3. Thêm bulk action vào RoomBulkActionsBar

```tsx
// RoomBulkActionsBar.tsx
import { BulkCreateTaskDialog } from '@/components/housekeeping/BulkCreateTaskDialog'
import { canCreateHousekeepingTask } from '@/lib/userAccess'

// Thêm state và handler
const [showBulkTaskDialog, setShowBulkTaskDialog] = useState(false)
const canCreateTask = canCreateHousekeepingTask(user)

// Cần pass rooms data vào component
// Thêm vào actions bar
{canCreateTask && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowBulkTaskDialog(true)}
  >
    <ClipboardList className="mr-2 h-4 w-4" />
    Yêu cầu kiểm tra
  </Button>
)}

<BulkCreateTaskDialog
  open={showBulkTaskDialog}
  onOpenChange={setShowBulkTaskDialog}
  rooms={selectedRooms}
  onSuccess={onClearSelection}
/>
```

### QUYỀN TRUY CẬP

- Chỉ **Manager** và **Admin** mới thấy và sử dụng được chức năng "Yêu cầu kiểm tra"
- Staff chỉ có thể xem danh sách phòng và thực hiện kiểm tra
- Sử dụng hàm `canCreateHousekeepingTask(user)` đã có sẵn để kiểm tra quyền

### THỨ TỰ TRIỂN KHAI

1. **Phase 1**: Tạo `BulkCreateTaskDialog.tsx` - Dialog tạo task nhiều phòng
2. **Phase 2**: Cập nhật `RoomGrid.tsx` - Thêm dropdown "Yêu cầu" cho từng phòng
3. **Phase 3**: Cập nhật `RoomBulkActionsBar.tsx` - Thêm bulk action
4. **Phase 4**: Cập nhật `RoomTable.tsx` - Thêm action column
5. **Phase 5**: Cập nhật mobile components (`MobileRoomBulkActionsBar.tsx`)

### KẾT QUẢ MONG ĐỢI

| Tính năng | Mô tả |
|-----------|-------|
| Yêu cầu từ card phòng | Manager bấm dropdown → chọn loại task → mở dialog tạo task |
| Yêu cầu bulk | Chọn nhiều phòng → bấm "Yêu cầu" → tạo task cho tất cả phòng đã chọn |
| Quyền hạn | Chỉ Manager/Admin thấy các nút yêu cầu |
| Notification | Task được tạo → Gửi thông báo cho nhân viên được giao |

