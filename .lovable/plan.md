

## Kế hoạch: Điều hướng Super Admin đúng trang

### VẤN ĐỀ HIỆN TẠI

Khi Super Admin truy cập route `/`:
- `Dashboard.tsx` chỉ kiểm tra `isTenantOwner()` → false (vì Super Admin ≠ tenant_owner)
- Không có logic cho Super Admin
- **Kết quả**: Super Admin thấy OwnerDashboard (sai)

```
Luồng hiện tại:
User → / → Dashboard.tsx → isTenantOwner? 
                            ├─ Có → OwnerDashboard ❌ (Super Admin đang vào đây)
                            └─ Không → ManagerDashboard
```

### GIẢI PHÁP

Thêm kiểm tra `isSuperAdmin()` VÀO ĐẦU TIÊN trong `Dashboard.tsx`:
- Nếu là Super Admin → Redirect tới `/super-admin`
- Nếu là Tenant Owner → OwnerDashboard  
- Nếu là Manager/Staff → ManagerDashboard

```
Luồng mới:
User → / → Dashboard.tsx → isSuperAdmin?
                            ├─ Có → Redirect /super-admin ✓
                            └─ Không → isTenantOwner?
                                        ├─ Có → OwnerDashboard
                                        └─ Không → ManagerDashboard
```

---

### CHI TIẾT THAY ĐỔI

#### File: `src/pages/Dashboard.tsx`

**Thay đổi 1**: Import thêm `isSuperAdmin` và `Navigate`

```typescript
import { Navigate } from 'react-router-dom'
import { isAdminUser, isTenantOwner, isSuperAdmin } from '@/lib/userAccess'
```

**Thay đổi 2**: Thêm kiểm tra Super Admin ngay đầu component

```typescript
export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { user } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: stats, isLoading } = useDashboardStats()
  const { isMobile } = useBreakpoint()

  // Super Admin should use their dedicated dashboard
  if (isSuperAdmin(user)) {
    return <Navigate to="/super-admin" replace />
  }

  // Check if user is owner (tenant_owner) - show executive dashboard
  const isOwner = isTenantOwner(user)

  // Owner view - Financial focus
  if (isOwner) {
    return <OwnerDashboard />
  }

  // ... rest of the component
}
```

---

### TÓM TẮT

| File | Thay đổi |
|------|----------|
| `src/pages/Dashboard.tsx` | Thêm redirect cho Super Admin tới `/super-admin` |

**Chỉ sửa 1 file**, thêm ~5 dòng code.

---

### KẾT QUẢ MONG ĐỢI

| User Role | Truy cập `/` | Kết quả |
|-----------|-------------|---------|
| **Super Admin** | `/` | Redirect → `/super-admin` |
| Tenant Owner | `/` | OwnerDashboard |
| Manager | `/` | ManagerDashboard |
| Staff | `/` | MobileDashboard (mobile) / ManagerDashboard (desktop) |

