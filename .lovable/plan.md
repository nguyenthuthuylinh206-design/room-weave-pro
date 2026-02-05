

## Kế hoạch: Xử lý Nhiệm vụ Trùng Lặp (Duplicate Task Prevention)

### VẤN ĐỀ HIỆN TẠI

Hệ thống có nhiều task trùng lặp trong database:
- Phòng P104: 3 task "Kiểm tra checkout" đang pending
- Phòng P109: 2 task "Kiểm tra checkout" đang in_progress (cách nhau 2 phút)
- Nhiều phòng khác có 2+ task cùng loại, cùng status

**Nguyên nhân**: Có 5+ điểm tạo task trong hệ thống, nhưng chỉ 1 điểm (CleaningRequestBanner) có kiểm tra trùng lặp.

### GIẢI PHÁP

Triển khai logic kiểm tra trùng lặp ở 3 tầng:

---

### 1. Database Level - Unique Constraint + Helper Function

Tạo function kiểm tra task trùng lặp và sử dụng ở mọi nơi:

```sql
-- Function để kiểm tra task đang active cho room + task_type
CREATE OR REPLACE FUNCTION check_duplicate_housekeeping_task(
  p_room_id UUID,
  p_task_type TEXT,
  p_exclude_task_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  status TEXT,
  assigned_to UUID,
  assigned_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ht.id,
    ht.status::TEXT,
    ht.assigned_to,
    u.full_name::TEXT
  FROM housekeeping_tasks ht
  LEFT JOIN users u ON u.id = ht.assigned_to
  WHERE ht.room_id = p_room_id
    AND ht.task_type = p_task_type
    AND ht.status IN ('pending', 'in_progress')
    AND (p_exclude_task_id IS NULL OR ht.id != p_exclude_task_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. Hook Level - Centralized Validation

Cập nhật `useCreateTask()` trong `src/hooks/useHousekeepingTasks.ts`:

```typescript
// useCreateTask - Thêm duplicate check
export function useCreateTask() {
  // ...existing code...
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput & { skipDuplicateCheck?: boolean }) => {
      if (!tenantId) throw new Error('Không tìm thấy tenant')
      
      // Check for duplicate task (nếu không bỏ qua)
      if (!input.skipDuplicateCheck) {
        const { data: existingTask } = await supabase
          .from('housekeeping_tasks')
          .select('id, status, assigned_to, users:assigned_to(full_name)')
          .eq('room_id', input.room_id)
          .eq('task_type', input.task_type)
          .in('status', ['pending', 'in_progress'])
          .maybeSingle()
        
        if (existingTask) {
          const assignedName = (existingTask.users as any)?.full_name || 'Chưa giao'
          throw new Error(
            `DUPLICATE_TASK:${existingTask.id}:${existingTask.status}:${assignedName}`
          )
        }
      }
      
      // Proceed with insert...
    },
  })
}
```

---

### 3. UI Level - Smart Handling

**A. Cập nhật CreateTaskDialog.tsx:**

```typescript
// Thêm state và logic
const [duplicateTask, setDuplicateTask] = useState<{
  id: string
  status: string
  assignedName: string
} | null>(null)

const onSubmit = async (data: FormData) => {
  try {
    await createTask({...})
    onOpenChange(false)
  } catch (error) {
    // Parse duplicate error
    if (error.message.startsWith('DUPLICATE_TASK:')) {
      const [_, id, status, assignedName] = error.message.split(':')
      setDuplicateTask({ id, status, assignedName })
      return
    }
    // Handle other errors
  }
}

// Hiển thị thông báo duplicate
{duplicateTask && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Phòng này đã có task "{TASK_TYPE_LABELS[selectedTaskType]}" 
      đang {duplicateTask.status === 'in_progress' ? 'thực hiện' : 'chờ xử lý'}
      {duplicateTask.assignedName !== 'Chưa giao' && ` bởi ${duplicateTask.assignedName}`}
    </AlertDescription>
    <div className="mt-2 flex gap-2">
      <Button size="sm" variant="outline" onClick={() => navigate(`/my-tasks?task=${duplicateTask.id}`)}>
        Xem task
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDuplicateTask(null)}>
        Đóng
      </Button>
    </div>
  </Alert>
)}
```

**B. Cập nhật BulkCreateTaskDialog.tsx:**

```typescript
// Thêm check và skip logic cho bulk create
const handleSubmit = async () => {
  // Pre-check for existing tasks
  const { data: existingTasks } = await supabase
    .from('housekeeping_tasks')
    .select('room_id')
    .in('room_id', rooms.map(r => r.id))
    .eq('task_type', taskType)
    .in('status', ['pending', 'in_progress'])
  
  const existingRoomIds = new Set(existingTasks?.map(t => t.room_id) || [])
  const roomsWithoutDuplicates = rooms.filter(r => !existingRoomIds.has(r.id))
  const skippedCount = rooms.length - roomsWithoutDuplicates.length
  
  if (skippedCount > 0) {
    // Show warning toast
    toast.warning(`Bỏ qua ${skippedCount} phòng đã có task`)
  }
  
  // Create only for rooms without existing tasks
  for (const room of roomsWithoutDuplicates) {
    await createTask({...})
  }
}
```

---

### 4. Cleanup Tool - Xử Lý Data Cũ

Tạo tool cho Manager dọn dẹp duplicate cũ:

**File mới: `src/components/housekeeping/DuplicateTasksCleanup.tsx`**

```typescript
// Component hiển thị danh sách duplicate và cho phép:
// 1. Giữ lại 1 task (mới nhất hoặc đang in_progress)
// 2. Hủy các task còn lại
// 3. Merge notes/history nếu cần
```

---

### 5. Files Cần Sửa

| # | File | Thay đổi |
|---|------|----------|
| 1 | Database Migration | Tạo function `check_duplicate_housekeeping_task` |
| 2 | `src/hooks/useHousekeepingTasks.ts` | Thêm duplicate check trong `useCreateTask()` |
| 3 | `src/hooks/useCheckoutInspection.ts` | Thêm check trước khi insert housekeeping_task |
| 4 | `src/components/housekeeping/CreateTaskDialog.tsx` | UI xử lý duplicate warning |
| 5 | `src/components/housekeeping/BulkCreateTaskDialog.tsx` | Pre-filter rooms có duplicate |
| 6 | `src/components/bookings/GroupCheckoutDialog.tsx` | Check duplicate trước khi tạo task |
| 7 | `src/types/housekeeping.types.ts` | Thêm type cho duplicate error |
| 8 | **(Mới)** `src/components/housekeeping/DuplicateTasksCleanup.tsx` | Tool cleanup cho Manager |

---

### 6. Edge Cases Xử Lý

| Tình huống | Xử lý |
|------------|-------|
| Task đang pending, muốn tạo mới | Hỏi user: "Thay thế" hoặc "Xem task hiện tại" |
| Task đang in_progress | Chỉ cho xem, không tạo mới |
| Bulk create có 1 số phòng duplicate | Skip và hiển thị số lượng bỏ qua |
| Group checkout | Check từng booking trước khi tạo |
| Workflow automation | Cho phép skip duplicate check (cờ) |

---

### 7. Kết Quả Sau Triển Khai

- Không còn task trùng lặp mới được tạo
- UI thông báo rõ ràng khi phát hiện duplicate
- Manager có tool dọn dẹp data cũ
- Workflow automation vẫn hoạt động bình thường

