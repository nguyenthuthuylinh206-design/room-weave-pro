

## Kế hoạch: Cải thiện UI trang Quản lý Nhân sự

### I. VẤN ĐỀ HIỆN TẠI

| Vấn đề | Chi tiết |
|--------|----------|
| Status badge ở giữa | Badge trạng thái (Đang bận, Rảnh, Offline) đang căn giữa, gây lộn xộn |
| Buttons contact ở bên phải xa | Telegram/Phone buttons tách rời khỏi thông tin nhân viên |
| Tabs không nổi bật | Tab được chọn chỉ có shadow nhẹ, khó phân biệt với tab không chọn |

### II. GIẢI PHÁP

#### 2.1. Sắp xếp lại StaffCard Layout

**Trước:**
```text
[Avatar] [Name + Position]        [Status Badge]    [Telegram] [Phone]
         (bên trái)                 (giữa)            (bên phải)
```

**Sau:**
```text
[Avatar] [Name + Position] [Status Badge] [Telegram] [Phone]
         (tất cả căn trái, liền mạch)
```

#### 2.2. Tabs Active State nổi bật hơn

**Trước:**
- Active: `bg-background` + `shadow-sm` (rất nhẹ)

**Sau:**
- Active: `bg-background` + `shadow-sm` + `border-b-2 border-primary` hoặc `font-semibold text-primary`

### III. CHI TIẾT THAY ĐỔI

#### File 1: `src/components/staff/StaffCard.tsx`

**Dòng 91-101**: Thay đổi layout từ `justify-between` thành căn trái liền mạch

```tsx
// Trước:
<div className="flex-1 min-w-0">
  <div className="flex items-center justify-between gap-2">
    <div className="min-w-0">
      <p className="font-medium text-sm truncate">{staff.full_name}</p>
      ...
    </div>
    <StaffStatusBadge status={staff.status} size="sm" />
  </div>
</div>

// Sau:
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
    <p className="font-medium text-sm truncate">{staff.full_name}</p>
    <StaffStatusBadge status={staff.status} size="sm" showLabel={false} />
  </div>
  <p className="text-xs text-muted-foreground truncate">
    {staff.position_name || staff.user_level_code || 'Nhân viên'}
    {staff.hotel_name && <span className="ml-1">• {staff.hotel_name}</span>}
  </p>
</div>
```

- Status badge chỉ hiện dot (không label) để gọn hơn
- Nằm cùng dòng với tên nhân viên

#### File 2: `src/pages/staff/StaffManagementPage.tsx`

**Dòng 53-67**: Thêm class cho TabsTrigger active state

```tsx
// Trước:
<TabsTrigger value="list" className="gap-1.5">

// Sau:
<TabsTrigger 
  value="list" 
  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none"
>
```

Hoặc dùng style khác:
```tsx
className="gap-1.5 data-[state=active]:text-primary data-[state=active]:font-semibold"
```

### IV. VISUAL COMPARISON

**StaffCard - TRƯỚC:**
```text
┌──────────────────────────────────────────────────────┐
│ [Avatar] Nhân Viên Buồng          ● Đang bận   [✈][📞]│
│          Staff • MerryLand Phú Quốc                  │
└──────────────────────────────────────────────────────┘
```

**StaffCard - SAU:**
```text
┌──────────────────────────────────────────────────────┐
│ [Avatar] Nhân Viên Buồng ●        [✈] [📞]           │
│          Staff • MerryLand Phú Quốc                  │
└──────────────────────────────────────────────────────┘
```

**Tabs - TRƯỚC:**
```text
┌─────────────┬─────────────┬─────────────┐
│ Danh sách   │ Hoạt động   │ Công việc   │  (khó phân biệt)
└─────────────┴─────────────┴─────────────┘
```

**Tabs - SAU:**
```text
┌─────────────┬─────────────┬─────────────┐
│ Danh sách   │ Hoạt động   │ Công việc   │
└─────────────┴─────────────┴─────────────┘
  ▔▔▔▔▔▔▔▔▔▔▔  (active có underline primary)
```

### V. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/staff/StaffCard.tsx` | Layout căn trái, status badge compact |
| `src/pages/staff/StaffManagementPage.tsx` | Tabs active state nổi bật |

### VI. LỢI ÍCH

| Trước | Sau |
|-------|-----|
| Layout lộn xộn, không đều | Căn trái gọn gàng, thống nhất |
| Tab active không rõ ràng | Tab active có visual indicator mạnh |
| Status badge chiếm nhiều không gian | Compact dot-only, nằm cùng dòng tên |

