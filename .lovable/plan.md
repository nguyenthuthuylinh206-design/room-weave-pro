

## Ẩn module không có quyền + Toast cho action không có quyền

### Vấn đề hiện tại
1. **Sidebar/MobileBottomNav/MorePage**: đã filter theo `hasModuleAccess` (kiểm tra quyền module) → nhưng vẫn còn vấn đề:
   - `MobileBottomNav` các tab `Home`, `Tasks`, `More` không filter → luôn hiện
   - `Bookings` ở `MobileBottomNav` chỉ check module nhưng không kiểm tra `roles` (staff được mặc định cho phép)
2. **AccessDenied page to đùng** (`src/components/auth/AccessDenied.tsx`) hiện ra khi:
   - User click vào URL trực tiếp
   - User click vào con item mà module cha có quyền view nhưng action create/update bị chặn (ví dụ: thấy danh sách phòng nhưng không có quyền `rooms.create` → click "Thêm phòng" → trang to đùng)
3. **Sidebar children**: đã filter `hasChildAccess` cho VIEW/CREATE → có vẻ đã ẩn đúng, nhưng do `MOBILE NAV` + một số trường hợp child không khớp `getRequiredAction` (vd "newPO", "addVendor", "addRoom") sẽ rơi vào nhánh `'view'` mặc định → vẫn hiện sai action

### Phương án (chia 2 lớp, an toàn dữ liệu)

**Lớp 1 — ẨN (module/page chính không có quyền)**
- **Sidebar.tsx**: giữ logic hiện tại (đã đúng), nhưng sửa `getRequiredAction` để nhận diện đúng các key tạo mới: `addItem`, `addRoom`, `addVendor`, `newPO`, `newBatch`, `addNewVendor`, `addVendor` → trả `'create'` thay vì rơi xuống `'view'`. Như vậy nếu user không có `can_create` thì các nút "Thêm mới" trong sidebar tự ẩn.
- **MobileBottomNav.tsx**: 
  - Tab `Bookings`/`Rooms` đang check module → giữ nguyên
  - Bổ sung: nếu sau khi filter còn <5 tab thì tự co lại (đã có sẵn flex-around → OK, không cần làm gì thêm)
- **MorePage (mobile + desktop)**: đã filter sẵn → giữ nguyên

**Lớp 2 — TOAST thay vì AccessDenied page (cho child page)**
- Tạo component mới `PermissionToast` (dùng `sonner` toast) thay cho `AccessDenied`:
  - Hiển thị toast đỏ ngắn gọn: "Bạn không có quyền với chức năng này. Liên hệ quản lý."
  - Tự động `navigate(-1)` (quay lại trang trước) sau khi toast hiện
  - Nếu không có history → `navigate('/')`
- Sửa `PermissionRoute.tsx`:
  - Khi `!hasPermission` và **không có** `fallback` → render `PermissionToast` thay cho `AccessDenied`
  - Vẫn cho phép truyền `fallback` riêng nếu cần (giữ tương thích)
- `AccessDenied` lớn vẫn giữ cho `RoleGuard` (trường hợp role không khớp — hiếm hơn) hoặc xoá nếu không còn ai dùng. **Plan: giữ file, chỉ đổi `PermissionRoute` dùng toast.**

### Phạm vi file
- Sửa `src/components/layout/Sidebar.tsx` — bổ sung từ khoá nhận diện action `create`
- Sửa `src/components/auth/PermissionRoute.tsx` — thay `AccessDenied` mặc định bằng `PermissionToast`
- Tạo mới `src/components/auth/PermissionToast.tsx` — toast + auto navigate back

### Không đụng
- Logic phân quyền RPC `has_user_permission`
- DB, RLS, hooks
- `RoleGuard` (vẫn dùng `AccessDenied` cho trường hợp role mismatch)
- `AccessDenied.tsx` (giữ lại, không xoá để tránh lỗi import khác)

### Kết quả UX
- Trang chính không có quyền → **không xuất hiện trong sidebar/bottom nav/more**
- Lỡ vào URL trực tiếp / click sub-item không quyền → **toast đỏ nhỏ + auto quay lại** (không còn trang to đùng)
- Owner/Super admin: không đổi gì, vẫn full quyền

