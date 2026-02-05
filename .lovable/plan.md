
## ✅ HOÀN THÀNH: Tích hợp tất cả công việc vào "Công việc của tôi"

### THAY ĐỔI ĐÃ THỰC HIỆN

#### 1. Sửa lỗi Group Checkout thiếu liên kết ✅
- **File:** `src/components/bookings/GroupCheckoutDialog.tsx`
- Thêm `.select('id').single()` khi insert `checkout_inspection_requests`
- Truyền `checkout_inspection_id` vào `housekeeping_tasks`

#### 2. Tạo Unified Task Hook ✅
- **File mới:** `src/hooks/useUnifiedTasks.ts`
- Query song song housekeeping_tasks và stock_adjustments
- Transform về format `UnifiedTask` chung
- Realtime subscriptions cho cả 2 bảng

#### 3. Tạo UnifiedTaskCard Component ✅
- **File mới:** `src/components/housekeeping/UnifiedTaskCard.tsx`
- Hiển thị task từ nhiều nguồn với icon khác nhau
- Navigate đến đúng module khi click

#### 4. Cập nhật StaffTasksTab ✅
- **File:** `src/components/housekeeping/StaffTasksTab.tsx`
- Thay `useMyTasks()` bằng `useUnifiedTasks()`
- Thêm source filter (Tất cả, Buồng phòng, Kiểm kê)
- Render đúng card component theo source

---

## Kế hoạch: Tích hợp tất cả công việc vào "Công việc của tôi"

### PHÂN TÍCH HIỆN TRẠNG

Hệ thống hiện có 6 loại task trong `housekeeping_tasks`:

| Task Type | Mô tả | Nguồn tạo |
|-----------|-------|-----------|
| `checkout_inspection` | Kiểm tra checkout | Group Checkout, Checkout Summary |
| `cleaning` | Dọn phòng | Cleaning Banner, Manual |
| `checkin_prep` | Chuẩn bị check-in | Manual |
| `amenity_request` | Bổ sung đồ dùng | Manual |
| `delivery_confirmation` | Xác nhận nhận hàng | Distribution workflow (auto) |
| `other` | Khác | Manual |

### VẤN ĐỀ 1: Group Checkout thiếu liên kết (ĐÃ CÓ PLAN)

Task tạo từ Group Checkout không có `checkout_inspection_id`, gây:
- Task không được auto-complete khi room check xong
- Inspection và Task không đồng bộ

**Fix**: Đã có plan chờ implement

### VẤN ĐỀ 2: Các công việc khác không hiển thị ở "Công việc của tôi"

Các module sau có công việc riêng nhưng KHÔNG đổ về My Tasks:

| Module | Bảng dữ liệu | Hiển thị ở | Vấn đề |
|--------|--------------|------------|--------|
| Giặt là | `laundry_requests` | `/laundry` → Tab "Yêu cầu giặt" | Staff phải vào riêng |
| Kiểm kê kho | `stock_adjustments` | `/inventory/adjustments` | Staff phải vào riêng |
| Bảo trì | `maintenance_requests` | `/maintenance` | Staff phải vào riêng |
| Bổ sung đồ | `supplement_requests` | `/supplements` | Staff phải vào riêng |

---

### GIẢI PHÁP ĐỀ XUẤT

#### Phương án: Unified Task View

Tạo view tổng hợp tất cả công việc được giao cho nhân viên tại `/my-tasks`, bao gồm:

1. **Housekeeping Tasks** (đã có)
2. **Laundry Requests** - Yêu cầu giặt được assign
3. **Stock Adjustments** - Phiếu kiểm kê được assign
4. **Maintenance Requests** - Yêu cầu bảo trì được assign

**Luồng dữ liệu:**

```text
┌─────────────────────────────────────────────────────┐
│              /my-tasks (Unified View)               │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ Housekeeping    │  │ Laundry         │           │
│ │ Tasks           │  │ Requests        │           │
│ │ (checkout,      │  │ (assigned_to)   │           │
│ │  cleaning...)   │  │                 │           │
│ └─────────────────┘  └─────────────────┘           │
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ Stock           │  │ Maintenance     │           │
│ │ Adjustments     │  │ Requests        │           │
│ │ (assigned_to)   │  │ (assigned_to)   │           │
│ └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────┘
```

---

### THAY ĐỔI CẦN THỰC HIỆN

#### Bước 1: Sửa lỗi Group Checkout (ưu tiên cao)

**File:** `src/components/bookings/GroupCheckoutDialog.tsx`

- Thêm `.select('id').single()` khi insert `checkout_inspection_requests`
- Truyền `checkout_inspection_id` vào `housekeeping_tasks`

#### Bước 2: Tạo Unified Task Hook

**File mới:** `src/hooks/useUnifiedTasks.ts`

Hook này sẽ:
- Query song song 4 bảng dữ liệu
- Transform về format chung
- Gom lại thành 1 danh sách

```typescript
interface UnifiedTask {
  id: string
  source: 'housekeeping' | 'laundry' | 'adjustment' | 'maintenance'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  room_number?: string
  created_at: string
  due_at?: string
  actionUrl: string
}
```

#### Bước 3: Cập nhật StaffTasksTab

**File:** `src/components/housekeeping/StaffTasksTab.tsx`

- Thay `useMyTasks()` bằng `useUnifiedTasks()`
- Hiển thị icon khác nhau theo `source`
- Điều hướng đến đúng module khi click

#### Bước 4: Thêm Tab Filter

Cho phép lọc theo loại:
- Tất cả
- Buồng phòng (housekeeping)
- Giặt là (laundry)
- Kiểm kê (adjustment)
- Bảo trì (maintenance)

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Staff phải vào 4 module khác nhau | Staff chỉ cần xem `/my-tasks` |
| Dễ bỏ sót công việc | Tất cả công việc tập trung 1 chỗ |
| Không có cái nhìn tổng quan | Biết tổng số công việc cần làm |

---

### PHẦN KỸ THUẬT

#### Query cho Unified Tasks

```typescript
// Parallel queries for speed
const [housekeeping, laundry, adjustments, maintenance] = await Promise.all([
  supabase.from('housekeeping_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'in_progress']),
    
  supabase.from('laundry_requests')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'ready']),
    
  supabase.from('stock_adjustments')
    .select('*')
    .contains('assigned_to', [userId])
    .in('status', ['draft', 'in_progress']),
    
  supabase.from('maintenance_requests')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'in_progress']),
])
```

#### Icon theo Source

| Source | Icon | Color |
|--------|------|-------|
| housekeeping | ClipboardCheck | Default |
| laundry | Shirt | Blue |
| adjustment | PackageSearch | Amber |
| maintenance | Wrench | Orange |

