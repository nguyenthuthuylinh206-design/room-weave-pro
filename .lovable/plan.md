

## Kế hoạch: Sửa lỗi hiển thị tab "Công việc" cho Manager

### I. NGUYÊN NHÂN

| File | Dòng | Hiện tại | Vấn đề |
|------|------|----------|--------|
| `StaffManagementPage.tsx` | 26 | `isAdminUser(user)` | Chỉ check `super_admin` + `tenant_owner` |

User đang đăng nhập với `user_level_code: "manager"` nhưng `isAdminUser()` không bao gồm manager.

---

### II. GIẢI PHÁP

Thay đổi từ `isAdminUser` sang `canCreateHousekeepingTask` (đã có sẵn trong `userAccess.ts`):

```tsx
// TRƯỚC (dòng 13, 26)
import { isAdminUser } from '@/lib/userAccess'
const canManageTasks = user ? isAdminUser(user) : false

// SAU
import { canCreateHousekeepingTask } from '@/lib/userAccess'
const canManageTasks = user ? canCreateHousekeepingTask(user) : false
```

---

### III. TẠI SAO DÙNG `canCreateHousekeepingTask`?

Function này đã tồn tại và logic chính xác:
```typescript
// Dòng 150-153 trong userAccess.ts
export function canCreateHousekeepingTask(user): boolean {
  return isAdminUser(user) || isManager(user) // ✅ Bao gồm manager
}
```

---

### IV. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/pages/staff/StaffManagementPage.tsx` | Đổi import và sử dụng `canCreateHousekeepingTask` thay vì `isAdminUser` |

---

### V. KẾT QUẢ SAU SỬA

- **Super Admin**: Thấy tab "Công việc" ✅
- **Tenant Owner**: Thấy tab "Công việc" ✅
- **Manager**: Thấy tab "Công việc" ✅ (đang bị thiếu)
- **Staff**: Không thấy tab "Công việc" ✅

