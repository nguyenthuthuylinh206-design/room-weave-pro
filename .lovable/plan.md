

## Sửa lỗi nhỏ: Badge cho mục "Phòng" trong Mobile Bottom Nav

### Vấn đề phát hiện

Trong file `MobileBottomNav.tsx`, mục "Phòng" đang gắn sai `badgeKey`:

```typescript
// Line 42 - SAI
{ id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms', badgeKey: 'tasks' },
```

Mục "Phòng" không nên hiển thị số housekeeping tasks, vì đã có mục "Tasks" riêng (line 41) để hiển thị tasks rồi.

### Giải pháp

Xóa `badgeKey` khỏi mục "Phòng" để tránh hiển thị trùng lặp:

**File:** `src/components/layout/MobileBottomNav.tsx`

**Thay đổi dòng 42:**

```typescript
// TRƯỚC (sai)
{ id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms', badgeKey: 'tasks' },

// SAU (đúng)
{ id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms' },
```

### Tổng quan implementation hiện tại (đã đúng)

| Component | Vị trí Badge | Trạng thái |
|-----------|--------------|------------|
| Desktop Sidebar - Parent menus | Kho & Tài sản, Laundry, Bảo trì | ✅ Đúng |
| Desktop Sidebar - Child items | Bổ sung đồ, Phiếu giao, Điều chỉnh, Yêu cầu giặt, Yêu cầu bảo trì | ✅ Đúng |
| Mobile Bottom Nav | Tasks, Laundry, Bảo trì | ⚠️ Sửa badge Phòng |
| Mobile Sidebar | Kho & Tài sản, Laundry, Bảo trì | ✅ Đúng |

### UI hiển thị trên Mobile

```text
Bottom Navigation Bar:
┌────────────────────────────────────────────────────┐
│ [Home] [Tasks🔴3] [Phòng] [Giặt là🔴2] [Bảo trì🔴1] │
└────────────────────────────────────────────────────┘
```

### Thời gian triển khai

~2 phút (chỉ xóa 1 property)

