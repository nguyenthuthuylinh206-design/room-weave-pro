
## Kế hoạch: Thêm tính năng Quản lý công việc cho Manager

### I. TỔNG QUAN

Hiện tại hệ thống đã có:
- **Backend**: Hooks `useHotelTasks`, `useUnassignedTasks`, `useCreateTask`, `useUpdateTaskStatus`, `useCancelTask` đầy đủ
- **UI Staff**: `StaffTasksTab` cho nhân viên xem/nhận việc

**Thiếu**: Giao diện cho Manager quản lý toàn bộ công việc đã giao

---

### II. TÍNH NĂNG ĐỀ XUẤT

#### 1. Tab "Công việc" trong trang Quản lý Nhân sự

Thêm tab thứ 3 vào `StaffManagementPage.tsx`:

| Tab | Nội dung |
|-----|----------|
| Danh sách | Danh sách nhân viên (hiện có) |
| Hoạt động | Lịch sử hoạt động (hiện có) |
| **Công việc** | **Dashboard quản lý tasks (MỚI)** |

#### 2. Manager Tasks Dashboard

**Các thành phần chính:**

```
┌─────────────────────────────────────────────────────────┐
│  📊 Stats Cards (4 cột)                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐               │
│  │Chờ xử │ │Đang   │ │Hoàn   │ │Chờ    │               │
│  │lý: 5  │ │làm: 3 │ │thành  │ │giao: 2│               │
│  └───────┘ └───────┘ │hôm nay│ └───────┘               │
│                      │12     │                         │
│                      └───────┘                         │
├─────────────────────────────────────────────────────────┤
│  🔍 Filter Bar                                          │
│  [Trạng thái ▼] [Loại ▼] [Nhân viên ▼] [Tìm kiếm...]   │
├─────────────────────────────────────────────────────────┤
│  📋 Task List (grouped by staff)                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 👤 Nguyễn Văn A (2 việc đang làm)                  ││
│  │   ├─ P.101 - Dọn phòng 🔵 15 phút                  ││
│  │   └─ P.205 - Checkout 🟡 Chờ xử lý                 ││
│  ├─────────────────────────────────────────────────────┤│
│  │ 👤 Trần Thị B (1 việc)                             ││
│  │   └─ P.302 - Chuẩn bị check-in 🔵 8 phút          ││
│  ├─────────────────────────────────────────────────────┤│
│  │ ⚠️ Chưa giao (3 việc)                              ││
│  │   ├─ P.401 - Bổ sung đồ dùng 🔴 Khẩn cấp          ││
│  │   ├─ P.502 - Dọn phòng                            ││
│  │   └─ P.103 - Checkout                             ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### 3. Các action cho Manager

| Action | Mô tả |
|--------|-------|
| **Giao việc** | Chọn nhân viên để giao task chưa có người nhận |
| **Chuyển việc** | Đổi người thực hiện task sang nhân viên khác |
| **Xem chi tiết** | Xem thông tin task, lịch sử thay đổi |
| **Hủy task** | Hủy bỏ task (kèm lý do) |
| **Tạo mới** | Tạo task nhanh từ dashboard |

---

### III. CẤU TRÚC FILES

```
src/
├── components/
│   └── staff/
│       ├── ManagerTasksTab.tsx          # Tab quản lý tasks (MỚI)
│       ├── ManagerTaskCard.tsx          # Card hiển thị task với actions (MỚI)
│       ├── AssignTaskDialog.tsx         # Dialog giao/chuyển việc (MỚI)
│       ├── TaskFilters.tsx              # Bộ lọc tasks (MỚI)
│       └── ... (files hiện có)
├── hooks/
│   └── useHousekeepingTasks.ts          # Thêm useReassignTask mutation
└── pages/
    └── staff/
        └── StaffManagementPage.tsx      # Thêm tab "Công việc"
```

---

### IV. DATABASE & HOOKS

#### 1. Mutation mới: `useReassignTask`

```typescript
export function useReassignTask() {
  return useMutation({
    mutationFn: async ({ taskId, newAssigneeId, reason }: {
      taskId: string
      newAssigneeId: string
      reason?: string
    }) => {
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .update({ 
          assigned_to: newAssigneeId,
          notes: reason ? `Chuyển việc: ${reason}` : null
        })
        .eq('id', taskId)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  })
}
```

#### 2. Hook mới: `useTaskStats`

```typescript
export function useTaskStats(hotelId?: string) {
  return useQuery({
    queryKey: ['task-stats', hotelId],
    queryFn: async () => {
      // Đếm pending, in_progress, completed today, unassigned
    }
  })
}
```

---

### V. THỨ TỰ TRIỂN KHAI

| Phase | Công việc | Files |
|-------|-----------|-------|
| **1** | Thêm `useReassignTask` và `useTaskStats` hooks | `useHousekeepingTasks.ts` |
| **2** | Tạo `ManagerTasksTab` component | `ManagerTasksTab.tsx` |
| **3** | Tạo `ManagerTaskCard` với actions | `ManagerTaskCard.tsx` |
| **4** | Tạo `AssignTaskDialog` cho giao/chuyển việc | `AssignTaskDialog.tsx` |
| **5** | Tích hợp vào `StaffManagementPage` | `StaffManagementPage.tsx` |
| **6** | Thêm realtime subscription | `ManagerTasksTab.tsx` |

---

### VI. UI/UX GUIDELINES

Theo design system hiện tại:
- **Compact rows**: 48-56px height
- **Semantic colors**: `text-green-600` (OK), `text-red-600` (Urgent), `text-amber-600` (Warning)
- **No card backgrounds**: Sử dụng `border rounded-lg` thay vì Card
- **Mobile-first**: Tab "Công việc" responsive trên mobile

---

### VII. KẾT QUẢ MONG ĐỢI

Sau triển khai, Manager có thể:

1. **Xem tổng quan**: Dashboard hiển thị số lượng tasks theo trạng thái
2. **Theo dõi tiến độ**: Biết ai đang làm gì, bao lâu rồi
3. **Giao việc nhanh**: Giao tasks chưa có người nhận cho nhân viên
4. **Cân bằng workload**: Chuyển việc từ người bận sang người rảnh
5. **Xử lý trễ hạn**: Nhận cảnh báo và can thiệp kịp thời

---

### VIII. LƯU Ý BẢO MẬT

- Chỉ Manager/Admin mới thấy tab "Công việc" (sử dụng `canCreateHousekeepingTask`)
- RLS đã có sẵn trên bảng `housekeeping_tasks`
- Giao/Chuyển việc được log vào `notes` để audit
