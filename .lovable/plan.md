

## Kế hoạch: Sửa lỗi vòng lặp redirect cho Super Admin

### NGUYÊN NHÂN

Có sự **không nhất quán** giữa 2 cách kiểm tra Super Admin:

```text
Dashboard.tsx
    └── useUser() → trả về user từ bảng `users` có `user_level_code`
    └── isSuperAdmin(user) → ĐÚNG → redirect tới /super-admin

SuperAdminLayout.tsx  
    └── useSuperAdminAuth() → dùng useAuth() → auth user không có `user_level_code`
    └── check user_level_code → KHÔNG CÓ → redirect về /
    └── VÒNG LẶP VÔ TẬN
```

### GIẢI PHÁP

Thống nhất cách kiểm tra Super Admin bằng cách sửa `useSuperAdminAuth.ts` để dùng `useUser()` thay vì `useAuth()` trực tiếp, vì `useUser()` trả về dữ liệu đầy đủ từ bảng `users`.

---

### CHI TIẾT THAY ĐỔI

#### File: `src/hooks/useSuperAdminAuth.ts`

**Thay đổi chính:**
- Import và sử dụng `useUser()` thay vì chỉ dùng `useAuth()`
- Import `isSuperAdmin` từ `userAccess.ts` để thống nhất logic

| Mục | Trước | Sau |
|-----|-------|-----|
| Lấy user data | `useAuth()` (auth user) | `useUser()` (user từ DB) |
| Check super admin | `(user as any).user_level_code === 'super_admin'` | `isSuperAdmin(user)` từ userAccess |
| Loading state | `loading` từ auth | `loading` từ auth + `isLoading` từ useUser |

**Code mới:**

```typescript
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { isSuperAdmin } from '@/lib/userAccess';

export function useSuperAdminAuth() {
  const { loading: authLoading, signOut: authSignOut } = useAuth();
  const { user, isLoading: userLoading } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isLoading = authLoading || userLoading;
  const isSuperAdminUser = isSuperAdmin(user);

  useEffect(() => {
    // Wait for both auth and user data to load
    if (isLoading) return;

    // Check if user exists
    if (!user) {
      toast({
        title: 'Yêu cầu đăng nhập',
        description: 'Vui lòng đăng nhập để truy cập cổng quản trị.',
        variant: 'destructive',
      });
      navigate('/auth/login');
      return;
    }

    // Check if user is super admin
    if (!isSuperAdminUser) {
      toast({
        title: 'Truy cập bị từ chối',
        description: 'Bạn không có quyền truy cập cổng quản trị viên cấp cao.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  }, [user, isLoading, isSuperAdminUser, navigate, toast]);

  const signOut = useCallback(async () => {
    await authSignOut();
    navigate('/auth/login');
  }, [authSignOut, navigate]);

  return { 
    user, 
    isLoading,
    signOut,
    isSuperAdmin: isSuperAdminUser,
  };
}
```

---

### TÓM TẮT

| File | Thay đổi |
|------|----------|
| `src/hooks/useSuperAdminAuth.ts` | Dùng `useUser()` + `isSuperAdmin()` từ userAccess thay vì check trực tiếp trên auth user |

**Chỉ sửa 1 file, ~30 dòng code**

---

### KẾT QUẢ MONG ĐỢI

| User Role | Truy cập `/super-admin` | Kết quả |
|-----------|-------------------------|---------|
| Super Admin | `/super-admin` | Truy cập thành công, không còn flicker |
| Tenant Owner | `/super-admin` | Redirect về `/` với toast "Truy cập bị từ chối" |
| Manager/Staff | `/super-admin` | Redirect về `/` với toast "Truy cập bị từ chối" |
| Chưa đăng nhập | `/super-admin` | Redirect về `/auth/login` |

