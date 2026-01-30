
## Kế hoạch hoàn thiện tích hợp Supplement & Laundry Requests

### Tổng quan tình hình

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Route `/supplements` | ✅ Hoàn thành | App.tsx line 450-458 |
| SupplementsPage.tsx | ✅ Hoàn thành | Đã có full UI + filters |
| SupplementRequestSheet.tsx | ✅ Hoàn thành | Duyệt/Từ chối đã hoạt động |
| LaundryRequestsTab.tsx | ✅ Hoàn thành | Đã tạo nhưng chưa tích hợp |
| useSupplementRequests.ts | ✅ Hoàn thành | CRUD đầy đủ |
| useLaundryRequests.ts | ✅ Hoàn thành | CRUD + auto-add-to-batch |
| Sidebar navigation | ❌ Thiếu | Không có link Supplements |
| Mobile navigation | ❌ Thiếu | Không có link Supplements |
| Laundry Dashboard integration | ❌ Thiếu | LaundryRequestsTab chưa được render |
| Realtime subscriptions | ❌ Thiếu | Chưa có auto-refresh |

---

### Giai đoạn 1: Tích hợp Navigation (Ưu tiên cao)

#### 1.1 Cập nhật Sidebar.tsx

Thêm menu "Bổ sung đồ" vào navigation:

```text
Vị trí: Sau menu Inventory hoặc trong submenu Inventory
Mục mới:
- titleKey: 'supplements'
- href: '/supplements'  
- icon: Package (hoặc AlertTriangle)
- roles: ['owner', 'hotel_manager', 'department_manager', 'staff']
```

Hai phương án:
- **Phương án A**: Thêm như mục độc lập (dễ truy cập)
- **Phương án B**: Thêm vào submenu Inventory (logic hơn vì liên quan đến kho)

#### 1.2 Cập nhật MobileNav.tsx

Thêm link tương tự vào menu mobile slide-out.

#### 1.3 Cập nhật MorePage.tsx

Thêm mục "Yêu cầu bổ sung" vào section Management cho mobile.

---

### Giai đoạn 2: Tích hợp Laundry Dashboard

#### 2.1 LaundryDashboardPage.tsx (Desktop)

Thêm tab hoặc section hiển thị `LaundryRequestsTab`:

```text
Cấu trúc mới:
- Stats Cards (giữ nguyên)
- Tabs: [Active Batches] [Pending Requests]
  - Active Batches: Giữ nguyên ActiveBatchesTable
  - Pending Requests: Render LaundryRequestsTab
- Charts & Performance (giữ nguyên)
```

Hoặc phương án đơn giản hơn:
```text
- Thêm card alert phía trên nếu có pending requests
- Click để mở LaundryRequestsTab dạng Sheet/Dialog
```

#### 2.2 MobileLaundryDashboard.tsx

Thêm Quick Action button "Đồ giặt từ phòng" với badge pending count.

---

### Giai đoạn 3: Realtime Subscriptions

#### 3.1 Supplement Requests Realtime

Thêm useEffect trong SupplementsPage.tsx:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('supplement-requests-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'supplement_requests' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['supplement-requests'] })
        queryClient.invalidateQueries({ queryKey: ['supplement-requests-pending-count'] })
      }
    )
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [])
```

#### 3.2 Laundry Requests Realtime

Tương tự cho LaundryRequestsTab.tsx:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('laundry-requests-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'laundry_requests' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['laundry-requests'] })
        queryClient.invalidateQueries({ queryKey: ['laundry-requests-pending-count'] })
      }
    )
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [])
```

---

### Giai đoạn 4: Cải tiến UX (Tùy chọn)

#### 4.1 Badge thông báo trên Sidebar

Hiển thị số lượng pending requests bên cạnh menu items:

```text
Inventory [3]  ← 3 supplement requests pending
Laundry [5]    ← 5 laundry requests pending
```

#### 4.2 Toast notification khi có request mới

Khi realtime nhận được request mới, hiển thị toast với quick action.

---

### Chi tiết kỹ thuật

#### Files cần chỉnh sửa:

| File | Thay đổi |
|------|----------|
| `src/components/layout/Sidebar.tsx` | Thêm supplements vào navigation array |
| `src/components/layout/MobileNav.tsx` | Thêm supplements link |
| `src/pages/MorePage.tsx` | Thêm supplements vào Management section |
| `src/pages/laundry/LaundryDashboardPage.tsx` | Import và render LaundryRequestsTab |
| `src/components/laundry/MobileLaundryDashboard.tsx` | Thêm quick action cho laundry requests |
| `src/pages/supplements/SupplementsPage.tsx` | Thêm realtime subscription |
| `src/components/laundry/LaundryRequestsTab.tsx` | Thêm realtime subscription |

#### i18n Keys cần thêm (nếu chưa có):

```json
// navigation.json
{
  "supplements": "Bổ sung đồ",
  "laundryRequests": "Yêu cầu giặt"
}
```

---

### Thứ tự triển khai đề xuất

1. **Sidebar + MobileNav** - Cho phép truy cập trang Supplements
2. **MorePage** - Cập nhật menu More cho mobile
3. **LaundryDashboardPage** - Tích hợp LaundryRequestsTab
4. **MobileLaundryDashboard** - Tích hợp cho mobile
5. **Realtime subscriptions** - Auto-refresh khi có thay đổi
6. **Badge notifications** - UX enhancement (tùy chọn)

---

### Ước tính thời gian

| Giai đoạn | Ước tính |
|-----------|----------|
| Navigation integration | ~15 phút |
| Laundry Dashboard integration | ~20 phút |
| Realtime subscriptions | ~10 phút |
| Testing & fixes | ~15 phút |
| **Tổng** | **~60 phút** |
