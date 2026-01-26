

## Kế hoạch: Mở chi tiết task cụ thể khi nhân viên click thông báo

### I. VẤN ĐỀ HIỆN TẠI

| Thành phần | Hiện tại | Vấn đề |
|------------|----------|--------|
| **MyTasksPage** | Lấy `taskId` từ URL nhưng không sử dụng | Không truyền cho StaffTasksTab |
| **StaffTasksTab** | Không nhận prop `initialTaskId` | Không biết task nào cần highlight |
| **TaskCard** | Chỉ hiển thị danh sách | Không có cơ chế highlight/scroll-to |

---

### II. GIẢI PHÁP

Tạo **TaskDetailDialog** và tự động mở khi có `taskId` trong URL.

---

### III. CÁC BƯỚC THỰC HIỆN

#### Bước 1: Tạo TaskDetailDialog component

Hiển thị chi tiết task trong modal:
- Thông tin phòng, loại công việc, mức độ ưu tiên
- Thông tin người giao việc, thời gian
- Các actions: Bắt đầu, Hoàn thành, Kiểm tra phòng (tùy task type)

```typescript
// src/components/housekeeping/TaskDetailDialog.tsx
interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

#### Bước 2: Thêm hook useTaskById

Query 1 task cụ thể theo ID:

```typescript
// Thêm vào useHousekeepingTasks.ts
export function useTaskById(taskId: string | null) {
  return useQuery({
    queryKey: ['housekeeping-task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const { data } = await supabase
        .from('housekeeping_tasks')
        .select(`
          *,
          room:rooms(id, room_number, floor),
          requested_user:users!...(id, full_name),
          assigned_user:users!...(id, full_name)
        `)
        .eq('id', taskId)
        .single();
      return data;
    },
    enabled: !!taskId
  });
}
```

#### Bước 3: Cập nhật StaffTasksTab

Nhận prop `initialTaskId` và tự động mở dialog:

```typescript
// StaffTasksTab.tsx
interface StaffTasksTabProps {
  initialTaskId?: string | null;
}

export function StaffTasksTab({ initialTaskId }: StaffTasksTabProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTaskId || null
  );
  
  // Auto-open dialog when initialTaskId is provided
  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    }
  }, [initialTaskId]);
  
  return (
    <>
      {/* Task List */}
      {myTasks?.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
          onClick={() => setSelectedTaskId(task.id)}
        />
      ))}
      
      {/* Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </>
  );
}
```

#### Bước 4: Cập nhật MyTasksPage

Truyền `taskId` từ URL xuống StaffTasksTab:

```typescript
// MyTasksPage.tsx
export function MyTasksPage() {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('task');
  
  return (
    <div>
      <StaffTasksTab initialTaskId={taskId} />
    </div>
  );
}
```

#### Bước 5: Thêm onClick cho TaskCard

Cho phép click vào card để xem chi tiết:

```typescript
// TaskCard.tsx
interface TaskCardProps {
  task: HousekeepingTaskWithDetails;
  onClick?: () => void;  // Thêm prop mới
}

<div onClick={onClick} className="cursor-pointer">
  {/* Card content */}
</div>
```

---

### IV. NỘI DUNG TASK DETAIL DIALOG

| Thông tin | Chi tiết |
|-----------|----------|
| **Header** | Tên phòng + Badge trạng thái |
| **Loại công việc** | Icon + Label (Kiểm tra checkout, Dọn phòng...) |
| **Mức ưu tiên** | Badge màu (Khẩn cấp, Cao, Trung bình, Thấp) |
| **Thời gian** | Tạo lúc, Deadline (nếu có) |
| **Người giao** | Tên + Avatar |
| **Ghi chú** | Nội dung description |
| **Actions** | Bắt đầu / Tiếp tục / Hoàn thành |

---

### V. FILES CẦN TẠO/SỬA

| File | Thay đổi |
|------|----------|
| `src/components/housekeeping/TaskDetailDialog.tsx` | **TẠO MỚI** |
| `src/hooks/useHousekeepingTasks.ts` | Thêm `useTaskById` hook |
| `src/components/housekeeping/StaffTasksTab.tsx` | Nhận prop `initialTaskId`, tích hợp dialog |
| `src/pages/MyTasksPage.tsx` | Truyền `taskId` từ URL cho StaffTasksTab |
| `src/components/housekeeping/TaskCard.tsx` | Thêm prop `onClick` |

---

### VI. FLOW SAU KHI SỬA

1. Manager giao việc cho NV Linh
2. NV Linh nhận notification
3. Click vào notification → Navigate đến `/my-tasks?task=xxx`
4. **StaffTasksTab** nhận `initialTaskId`
5. **TaskDetailDialog** tự động mở với chi tiết task
6. NV Linh xem thông tin và thực hiện hành động (Bắt đầu, Hoàn thành...)

---

### VII. UI PREVIEW

```text
┌─────────────────────────────────────┐
│ ✕                      Chi tiết     │
├─────────────────────────────────────┤
│                                     │
│ 📍 Phòng P101                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📋 Kiểm tra checkout            │ │
│ │ ⚡ Ưu tiên: Trung bình           │ │
│ │ 👤 Giao bởi: Quản Lý 2          │ │
│ │ ⏰ 17 phút trước                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Ghi chú:                            │
│ Kiểm tra đồ dùng và báo cáo        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │       ▶ Bắt đầu thực hiện       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

