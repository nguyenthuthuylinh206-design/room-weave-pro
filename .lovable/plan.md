

## Kế hoạch: Phân biệt số thông báo theo vai trò (Nhân viên vs Quản lý)

### VẤN ĐỀ HIỆN TẠI

Hook `usePendingCounts` hiện đếm **TẤT CẢ** các phiếu pending theo `tenant_id` và `hotel_id`, không phân biệt theo người được giao:

```typescript
// Hiện tại - đếm tất cả
let distributionsQuery = supabase
  .from('distribution_orders')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('status', ['pending', 'released', 'in_progress'])
if (hotelId) distributionsQuery = distributionsQuery.eq('hotel_id', hotelId)
```

**Kết quả**: Nhân viên và Quản lý đều thấy số 9 (tất cả phiếu), trong khi đúng ra:
- **Nhân viên**: Chỉ thấy phiếu **được giao cho họ**
- **Quản lý/Owner**: Thấy **tất cả** phiếu (để giám sát)

---

### CẤU TRÚC DỮ LIỆU

| Bảng | Column lọc | Logic cho Staff |
|------|-----------|-----------------|
| `distribution_orders` | `assigned_to` | `assigned_to = user.id` |
| `housekeeping_tasks` | `assigned_to` | `assigned_to = user.id` |
| `maintenance_requests` | `requested_by` | Không lọc (staff tạo yêu cầu, không xử lý) |
| `supplement_requests` | `requested_by` | Không lọc (staff tạo yêu cầu) |
| `laundry_requests` | `requested_by` | Không lọc (staff tạo yêu cầu) |

---

### GIẢI PHÁP

#### Sửa file: `src/hooks/usePendingCounts.ts`

**Thay đổi:**

1. Import thêm `useUser` và helper functions:
```typescript
import { useUser } from '@/hooks/useUser'
import { isStaff } from '@/lib/userAccess'
```

2. Lấy thông tin user hiện tại:
```typescript
const { user, tenantId } = useUser()
const isStaffUser = isStaff(user)
```

3. Thêm filter `assigned_to` cho các bảng phù hợp khi user là Staff:

```typescript
// Distribution Orders - Staff chỉ thấy phiếu được giao cho mình
let distributionsQuery = supabase
  .from('distribution_orders')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('status', ['pending', 'released', 'in_progress'])
if (hotelId) distributionsQuery = distributionsQuery.eq('hotel_id', hotelId)
if (isStaffUser && user?.id) {
  distributionsQuery = distributionsQuery.eq('assigned_to', user.id)
}

// Housekeeping Tasks - Staff chỉ thấy task được giao cho mình
let tasksQuery = supabase
  .from('housekeeping_tasks')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('status', ['pending', 'assigned'])
if (hotelId) tasksQuery = tasksQuery.eq('hotel_id', hotelId)
if (isStaffUser && user?.id) {
  tasksQuery = tasksQuery.eq('assigned_to', user.id)
}
```

4. Update queryKey để cache đúng theo user:
```typescript
queryKey: ['pending-counts-all', tenantId, selectedHotel?.id, isAllHotelsMode, user?.id, isStaffUser],
```

---

### KẾT QUẢ MONG ĐỢI

| Vai trò | Phiếu giao hàng | Công việc | Các module khác |
|---------|-----------------|-----------|-----------------|
| **Staff** | Chỉ phiếu được giao (`assigned_to = me`) | Chỉ task được giao | Tất cả (vì staff là người tạo request) |
| **Manager** | Tất cả phiếu | Tất cả tasks | Tất cả |
| **Owner** | Tất cả phiếu | Tất cả tasks | Tất cả |

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/usePendingCounts.ts` | Thêm logic lọc theo `assigned_to` cho Staff |

**Chỉ 1 file cần sửa**, không ảnh hưởng đến UI hoặc các component khác.

