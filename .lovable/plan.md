

## Sửa trang /settings/profile (mobile)

### Vấn đề phát hiện
1. **Thiếu trường SĐT** — desktop có, mobile không có
2. **Thiếu trường URL ảnh đại diện** — desktop có, mobile không
3. **Email cho sửa được** — desktop disable (đúng), mobile cho edit (sai — update bảng `users` không sync với `auth.users`, gây lệch dữ liệu)
4. **Cấp bậc hiển thị raw** `tenant_owner` thay vì **"Chủ khách sạn"**
5. **Khách sạn hiển thị UUID** thay vì tên khách sạn (dữ liệu `user.hotel.name` đã có sẵn từ `useUser`)
6. **Vị trí hiển thị UUID** — `useUser` chưa join bảng `positions`
7. **Mật khẩu yếu** — schema mobile chỉ min 6 ký tự, desktop yêu cầu 8+ với chữ hoa/thường/số/ký tự đặc biệt → không đồng nhất, kém bảo mật
8. **Trùng lặp** — `MobileUserProfilePage` viết lại schema/logic riêng thay vì dùng `useProfile` + `profileFormSchema` như desktop

### Phương án sửa (an toàn, không đổi DB/logic)

**A. `MobileUserProfilePage.tsx` — refactor dùng chung hook/schema với desktop**
- Dùng `useProfile()` thay cho gọi `supabase.from('users').update()` trực tiếp (thống nhất logic, có toast/invalidate sẵn)
- Dùng `profileFormSchema` và `changePasswordSchema` từ `src/lib/validations/user.schemas.ts` (thống nhất validation)
- Bỏ trường email khỏi form (để hiển thị read-only như desktop)
- **Thêm trường**: SĐT, URL ảnh đại diện
- **Sửa hiển thị thông tin hiện tại**:
  - Cấp bậc: dùng `getUserLevelLabel(user)` từ `lib/userAccess.ts` → "Chủ khách sạn" / "Quản lý" / "Nhân viên"
  - Khách sạn: hiển thị `user.hotel?.name` (đã có sẵn)
  - Vị trí: ẩn nếu chưa join được tên (xem mục B)
- Xác nhận mật khẩu: dùng `changePasswordSchema` mạnh (8+, hoa/thường/số/ký tự đặc biệt) — đồng nhất với desktop

**B. `useUser.ts` — bổ sung join position (1 dòng, an toàn)**
- Thêm `position:positions!users_position_id_fkey(id, name)` vào select
- Hiển thị `user.position?.name` ở mobile profile
- Không đổi shape khác, không ảnh hưởng component nào đang dùng `user`

**C. Không đụng**
- DB schema, RLS, RPC
- Desktop ProfileForm (đã đúng)
- Logic update profile (đã có sẵn `useProfile`)

### Phạm vi file
- Sửa: `src/components/settings/MobileUserProfilePage.tsx` (refactor lớn)
- Sửa: `src/hooks/useUser.ts` (thêm join position)

### Kết quả
- Mobile và desktop đồng nhất về trường, validation, label tiếng Việt
- Hiển thị "Chủ khách sạn" / tên khách sạn / tên vị trí thay vì code/UUID
- Mật khẩu mạnh hơn, đồng nhất với desktop
- Không còn cho sửa email lệch giữa `users` và `auth.users`

