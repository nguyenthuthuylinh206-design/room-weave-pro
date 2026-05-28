## Vấn đề

Trang `/auth/callback` hiển thị "Đang xác thực..." mãi không chuyển. Nguyên nhân ở `useFirstAccessibleRoute`:

- Khi load xong nhưng `permissions` trả về mảng rỗng (RPC `get_user_permissions_summary` chưa cấu hình cho user, hoặc lỗi mạng cache lại), hook trả `firstAccessibleRoute = null`.
- `AuthCallback.tsx` có điều kiện `if (firstAccessibleRoute === null) return` → chờ vô hạn, không có timeout, không có fallback.
- Kết quả: user staff như "Nhân Viên Buồng Tám" bị kẹt sau khi đăng nhập (khớp với auth-logs: login thành công nhưng không thấy navigate).

## Cách sửa

### A. `src/hooks/useFirstAccessibleRoute.ts`
- Khi đã `!isLoading` mà `permissions` rỗng → KHÔNG trả `null` nữa. Trả thẳng `/unauthorized` (hành vi cũ đã có sẵn ở cuối hàm, chỉ cần bỏ nhánh `return null` ở dòng 38–40).
- Chỉ giữ `null` cho trạng thái thật sự đang loading.

### B. `src/pages/auth/AuthCallback.tsx`
- Thêm safety timeout 8s: nếu sau 8s vẫn chưa redirect được (ví dụ RPC permissions lỗi/treo), điều hướng fallback:
  - Có `user.tenant_id && user.hotel_id` → `/` (Dashboard, RoleGuard sẽ chặn nếu không có quyền).
  - Ngược lại → `/auth/login`.
- Hiển thị thêm dòng phụ "Đang tải quyền truy cập..." và nút "Đăng nhập lại" sau 5s để user không bị mắc kẹt.

### C. Log chẩn đoán
- Thêm `console.warn('[AuthCallback] permissions empty or stuck', { hasUser, permissionsLen, firstAccessibleRoute })` khi rơi vào fallback để lần sau debug nhanh.

## Không đụng tới
- `AuthContext`, `useUser`, `useUserModulePermissions`, RLS, RPC — giữ nguyên để tránh ảnh hưởng các user khác đang chạy bình thường.
- Logic auto-login PWA.

## QA
1. Đăng nhập tài khoản staff "Nhân Viên Buồng Tám" → phải redirect vào trang được phép trong < 3s, không kẹt.
2. Đăng nhập owner/super_admin → vẫn vào `/`.
3. User mới chưa onboard → vẫn vào `/onboarding`.
4. User `must_change_password` → vẫn vào `/auth/change-password`.
5. Ngắt mạng giữa chừng (devtools offline) → sau 8s rơi vào fallback, không trắng màn hình mãi.

## File sẽ sửa
- `src/hooks/useFirstAccessibleRoute.ts`
- `src/pages/auth/AuthCallback.tsx`
- `src/lib/app-version.ts` (bump → 1.0.75)
- `public/changelog.json` (thêm entry 1.0.75)
