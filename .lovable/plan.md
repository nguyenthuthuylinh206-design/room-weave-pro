

## Kế hoạch: Thêm link "Công việc của tôi" vào Navigation

### I. PHÂN TÍCH HIỆN TẠI

| Component | Mô tả | Staff có thể thấy? |
|-----------|-------|-------------------|
| `BottomNav.tsx` | Bottom nav cũ (5 tabs) | ✅ |
| `MobileBottomNav.tsx` | Bottom nav chính cho mobile | ✅ |
| `MorePage.tsx` | Trang "Thêm" với các modules | ✅ |

**Vấn đề**: Không có link nào dẫn đến `/my-tasks` → Staff phải nhớ URL hoặc chờ notification

---

### II. GIẢI PHÁP

Thêm link "Công việc của tôi" (My Tasks) vào:
1. **MorePage** - Trong phần "Liên kết nhanh" (Quick Links)
2. **BottomNav** - Thêm tab mới cho Staff (thay thế hoặc bổ sung)

---

### III. CÁC BƯỚC THỰC HIỆN

#### Bước 1: Cập nhật MorePage.tsx

Thêm "Công việc của tôi" vào `quickLinks`:

```typescript
const quickLinks = [
  { icon: ClipboardList, label: 'Công việc của tôi', path: '/my-tasks' }, // THÊM MỚI
  { icon: User, label: 'Hồ sơ cá nhân', path: '/settings/profile' },
  { icon: Settings, label: 'Cài đặt', path: '/settings' },
  { icon: HelpCircle, label: 'Trợ giúp & Hỗ trợ', path: '/help' },
]
```

#### Bước 2: Cập nhật BottomNav.tsx

Thêm tab "Tasks" cho staff với badge hiển thị số công việc pending:

```typescript
const tabs: NavTab[] = [
  { id: 'dashboard', icon: Home, label: 'Home', path: '/' },
  { id: 'my-tasks', icon: ClipboardList, label: 'Tasks', path: '/my-tasks' }, // THÊM MỚI
  { id: 'rooms', icon: DoorOpen, label: 'Phòng', path: '/rooms', module: 'rooms' },
  { id: 'laundry', icon: Shirt, label: 'Laundry', path: '/laundry', module: 'laundry' },
  { id: 'maintenance', icon: Wrench, label: 'Bảo trì', path: '/maintenance', module: 'maintenance' },
]
```

#### Bước 3: Cập nhật MobileBottomNav.tsx

Thêm "Tasks" vào `NAV_ITEMS` cho Manager/Staff với badge:

```typescript
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'my-tasks', label: 'Tasks', icon: ClipboardList, path: '/my-tasks', badge: true }, // THÊM MỚI
  { id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms', badge: true },
  { id: 'laundry', label: 'Giặt là', icon: Shirt, path: '/laundry', module: 'laundry', badge: true },
  { id: 'maintenance', label: 'Bảo trì', icon: Wrench, path: '/maintenance', module: 'maintenance', badge: true },
]
```

---

### IV. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/pages/mobile/MorePage.tsx` | Thêm link "Công việc của tôi" vào quickLinks |
| `src/components/layout/BottomNav.tsx` | Thêm tab "Tasks" |
| `src/components/layout/MobileBottomNav.tsx` | Thêm tab "Tasks" với badge |

---

### V. BADGE LOGIC

Sử dụng hook `usePendingTaskCount` (đã có) để hiển thị số task pending của staff:

```typescript
const { data: myTaskCount = 0 } = usePendingTaskCount()

// Trong getBadgeCount:
if (itemId === 'my-tasks') return myTaskCount
```

---

### VI. KẾT QUẢ SAU SỬA

**Mobile Bottom Nav:**
```text
┌────────────────────────────────────────────┐
│  🏠     📋     🚪     👕     🔧           │
│ Home   Tasks  Phòng  Giặt  Bảo trì        │
│          (2)   (3)                         │
└────────────────────────────────────────────┘
```

**MorePage Quick Links:**
```text
┌────────────────────────────────────────────┐
│ 📋 Công việc của tôi              →        │
├────────────────────────────────────────────┤
│ 👤 Hồ sơ cá nhân                  →        │
├────────────────────────────────────────────┤
│ ⚙️ Cài đặt                        →        │
└────────────────────────────────────────────┘
```

---

### VII. LỢI ÍCH

- Staff dễ dàng truy cập công việc được giao từ navigation
- Không phải nhớ URL `/my-tasks`
- Badge hiển thị số task pending → nhắc nhở staff
- Tất cả user (kể cả không có quyền module) đều thấy link này

