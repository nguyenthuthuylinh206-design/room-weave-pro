

## Kế hoạch: Cải thiện UI tab Công việc (ManagerTasksTab)

### I. VẤN ĐỀ HIỆN TẠI

| Vấn đề | Chi tiết |
|--------|----------|
| Stats cards dùng background màu | Vi phạm nguyên tắc minimalist - chỉ nên dùng màu chữ semantic |
| Task card quá dày đặc | Nhiều thông tin trên 1 dòng với "•" phân cách khó đọc |
| Emoji trong priority | Không thống nhất style, gây rối mắt |
| Khoảng cách không đều | Các phần tử quá sát nhau |

### II. GIẢI PHÁP

#### 2.1. Stats Cards - Tối giản hóa

**Trước:**
```text
┌─────────────────────────┐
│ 🔶 bg-amber-50          │
│ [Icon] 2                │
│         Chờ xử lý       │
└─────────────────────────┘
```

**Sau:**
```text
┌─────────────────────────┐
│ [Icon amber] 2          │
│ Chờ xử lý               │
└─────────────────────────┘
(không có background màu, chỉ border + màu chữ semantic)
```

#### 2.2. Task Card - Layout rõ ràng hơn

**Trước:**
```text
P102•Dọn phòng•Dọn dẹp phòng P102
🟡 Trung bình•1 ngày trước•Tầng 1    [Giao việc]
```

**Sau:**
```text
┌─────────────────────────────────────────────────────┐
│  [Icon] P102            Dọn phòng      [Giao việc] │
│         Trung bình • 1 ngày trước • Tầng 1         │
└─────────────────────────────────────────────────────┘
```

Thay đổi:
- Số phòng lớn hơn, nổi bật hơn (font-bold)
- Loại công việc thành badge nhỏ
- Bỏ emoji, dùng màu chữ semantic cho priority
- Dòng thứ 2 hiển thị metadata với spacing đều

#### 2.3. Section Headers - Gọn gàng hơn

**User section:**
```text
Trước: [Chevron] [Avatar N] Nhân Viên Buồng Tám (2 việc, 0 đang làm)
Sau:   [Avatar N] Nhân Viên Buồng Tám              2 việc [Chevron]
```

### III. THAY ĐỔI CHI TIẾT

#### File 1: `src/components/staff/ManagerTasksTab.tsx`

**Stats Cards (dòng 177-191):**
- Loại bỏ `stat.bgColor` 
- Giữ border + màu icon/text semantic
- Layout: icon bên trái, số + label bên phải

**Section Headers:**
- Đưa chevron sang phải
- Avatar + tên nhân viên bên trái
- Số việc ở giữa với text nhẹ hơn

#### File 2: `src/components/staff/ManagerTaskCard.tsx`

**Room Number (dòng 94-101):**
- Font lớn hơn, bold hơn cho số phòng
- Loại công việc thành badge với background nhạt

**Priority (dòng 112-117):**
- Bỏ emoji (🔴🟠🟡⚪)
- Dùng màu chữ semantic: `text-red-600`, `text-amber-600`, etc.
- Priority urgent: thêm dot indicator thay vì emoji

**Metadata row (dòng 111-135):**
- Giảm số lượng "•" separator
- Group thông tin logic hơn

### IV. CODE CHANGES

#### `ManagerTasksTab.tsx` - Stats Cards

```tsx
// Line 122-152: Bỏ bgColor, đổi layout
const statsCards = [
  { 
    label: 'Chờ xử lý', 
    value: stats?.pending || 0, 
    icon: Clock, 
    color: 'text-amber-600',
  },
  // ... các stats khác không có bgColor
]

// Line 177-191: Render stats
<div className="flex items-center gap-3 p-3 rounded-lg border">
  <stat.icon className={cn('h-5 w-5', stat.color)} />
  <div>
    <p className={cn('text-xl font-semibold', stat.color)}>{stat.value}</p>
    <p className="text-xs text-muted-foreground">{stat.label}</p>
  </div>
</div>
```

#### `ManagerTaskCard.tsx` - Task Card Layout

```tsx
// Line 94-110: Room & Task type
<div className="flex items-center gap-2">
  <span className="font-mono text-base font-bold">
    {task.room?.room_number || 'N/A'}
  </span>
  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
    {TASK_TYPE_LABELS[task.task_type as TaskType]}
  </span>
</div>

// Line 112-117: Priority without emoji
<span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
  {task.priority === 'urgent' && 'Khẩn cấp'}
  {task.priority === 'high' && 'Ưu tiên cao'}
  {task.priority === 'medium' && 'Trung bình'}
  {task.priority === 'low' && 'Thấp'}
</span>
```

### V. VISUAL COMPARISON

**TRƯỚC:**
```text
┌──────────────────────────────────────────────────────┐
│ [bg-amber] 2      [bg-blue] 0    [bg-green] 0  ...  │
│ Chờ xử lý         Đang làm       Hoàn thành          │
├──────────────────────────────────────────────────────┤
│ ▼ [!] Chưa giao (1 việc)                             │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [⏰] P102•Dọn phòng•Dọn dẹp phòng P102  [Button]│ │
│ │      🟡 Trung bình•1 ngày trước•Tầng 1          │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**SAU:**
```text
┌──────────────────────────────────────────────────────┐
│ [⏰] 2          [▶] 0          [✓] 0          ...   │
│ Chờ xử lý       Đang làm       Hoàn thành            │
├──────────────────────────────────────────────────────┤
│ ▼ Chưa giao                              1 công việc │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [⏰] P102         [Dọn phòng]          [Button] │ │
│ │      Trung bình • 1 ngày trước • Tầng 1         │ │
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ [N] Nhân Viên Buồng Tám                 2 việc    ▼ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [⏰] P104         [Kiểm tra checkout]   [...] │ │
│ │      Trung bình • 19 ngày trước • Tầng 1        │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### VI. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/staff/ManagerTasksTab.tsx` | Stats cards layout, section headers |
| `src/components/staff/ManagerTaskCard.tsx` | Task card layout, bỏ emoji |

### VII. LỢI ÍCH

| Trước | Sau |
|-------|-----|
| Background màu gây rối mắt | Clean, chỉ dùng border + text color |
| Emoji không nhất quán | Icon system thống nhất |
| Thông tin dày đặc | Hierarchy rõ ràng, dễ scan |
| Separator "•" quá nhiều | Spacing và grouping hợp lý |

