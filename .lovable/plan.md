

## Kế hoạch: Thêm Badge đếm công việc cần xử lý cho các danh mục

### Mục tiêu
Hiển thị số lượng công việc pending (màu đỏ) trên các danh mục navigation để user biết ngay cần xử lý những gì.

### Các danh mục cần đếm

| Danh mục | Điều kiện đếm | Hook hiện có |
|----------|---------------|--------------|
| **Bổ sung đồ** (`/supplements`) | `status = 'pending'` | ✅ `usePendingSupplementRequestCount` |
| **Yêu cầu giặt** (`/laundry?tab=requests`) | `status = 'pending'` | ✅ `usePendingLaundryRequestsCount` |
| **Phiếu giao hàng** (`/inventory/distributions`) | `status IN ('pending', 'in_progress')` | ❌ Cần tạo mới |
| **Bảo trì** (`/maintenance`) | `status IN ('pending', 'waiting')` | ✅ Có trong `pending-counts` query |
| **Điều chỉnh kho** (`/inventory/adjustments`) | `status = 'pending'` | ✅ `usePendingAdjustmentsCount` |
| **Housekeeping Tasks** (`/my-tasks`) | `status IN ('pending', 'assigned')` | ✅ `usePendingTaskCount` |

### Chi tiết triển khai

#### Bước 1: Tạo hook tập trung `usePendingCounts`
**File mới:** `src/hooks/usePendingCounts.ts`

Hook này sẽ:
- Gộp tất cả các query đếm pending vào một chỗ
- Sử dụng `Promise.all` để query song song
- Cache và refetch mỗi 30 giây
- Hỗ trợ filter theo hotel (khi không ở chế độ "All Hotels")

```typescript
interface PendingCounts {
  supplements: number       // Yêu cầu bổ sung đồ
  laundryRequests: number   // Yêu cầu giặt
  distributions: number     // Phiếu giao hàng
  maintenance: number       // Yêu cầu bảo trì
  adjustments: number       // Điều chỉnh kho
  tasks: number             // Công việc housekeeping
}
```

#### Bước 2: Cập nhật Desktop Sidebar
**File:** `src/components/layout/Sidebar.tsx`

Thay đổi:
1. Import và sử dụng `usePendingCounts` hook
2. Thêm property `badgeKey` vào `NavItem` interface
3. Hiển thị Badge màu đỏ với số lượng bên cạnh tên menu item
4. Áp dụng cho các child items cụ thể:
   - `supplements` → Bổ sung đồ
   - `laundryRequests` → Laundry Requests tab
   - `distributions` → Phiếu giao hàng
   - `maintenanceRequests` → Yêu cầu bảo trì

#### Bước 3: Cập nhật Mobile Sidebar
**File:** `src/components/layout/MobileSidebar.tsx`

Thay đổi:
1. Thay thế logic `pendingCounts` riêng lẻ bằng `usePendingCounts` hook
2. Cập nhật `getBadgeCount()` để map với tất cả badge types
3. Thêm badge cho menu item "Kho & Tài sản" (tổng của supplements + distributions + adjustments)

#### Bước 4: Cập nhật Bottom Navigation (Mobile)
**File:** `src/components/layout/MobileBottomNav.tsx`

Thay đổi:
- Sử dụng `usePendingCounts` hook thay vì query riêng
- Hiển thị tổng số pending cho các module chính

### Thiết kế UI Badge

```text
┌─────────────────────────────────────┐
│ 📦 Kho & Tài sản              ▼    │
│   ├── Dashboard                    │
│   ├── Danh sách items              │
│   ├── Bổ sung đồ           🔴 5    │  ← Badge đỏ
│   ├── Phiếu giao hàng      🔴 3    │  ← Badge đỏ
│   └── Điều chỉnh kho       🔴 2    │  ← Badge đỏ
│                                     │
│ 👕 Laundry                    ▼    │
│   ├── Tổng quan                    │
│   ├── Yêu cầu giặt         🔴 4    │  ← Badge đỏ
│   └── Lô giặt                      │
│                                     │
│ 🔧 Bảo trì                   ▼    │
│   ├── Dashboard                    │
│   └── Yêu cầu bảo trì      🔴 7    │  ← Badge đỏ
└─────────────────────────────────────┘
```

### Badge Styling
- **Variant:** `destructive` (màu đỏ)
- **Size:** nhỏ gọn (h-5, min-w-5)
- **Text:** Nếu số > 99, hiển thị "99+"
- **Position:** Bên phải của text, trước chevron icon

### Thứ tự triển khai

| # | Công việc | File | Ước tính |
|---|-----------|------|----------|
| 1 | Tạo hook `usePendingCounts` | `src/hooks/usePendingCounts.ts` | 15 phút |
| 2 | Cập nhật `Sidebar.tsx` | `src/components/layout/Sidebar.tsx` | 25 phút |
| 3 | Cập nhật `MobileSidebar.tsx` | `src/components/layout/MobileSidebar.tsx` | 15 phút |
| 4 | Cập nhật `MobileBottomNav.tsx` | `src/components/layout/MobileBottomNav.tsx` | 10 phút |

**Tổng thời gian ước tính: ~1 giờ**

### Lưu ý kỹ thuật

1. **Performance:**
   - Sử dụng `select('id', { count: 'exact', head: true })` để chỉ đếm, không fetch data
   - `refetchInterval: 30000` (30 giây) để cập nhật realtime nhẹ nhàng
   - Shared query key để tránh duplicate requests

2. **Hotel filtering:**
   - Khi chọn một hotel cụ thể → chỉ đếm pending của hotel đó
   - Khi ở "All Hotels" mode → đếm tất cả

3. **RLS:**
   - Tất cả queries đều đã có filter `tenant_id` đảm bảo data isolation

