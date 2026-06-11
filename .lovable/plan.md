# Plan: Dọn `MultiRoleManagerDialog` & siết multi-role

## Bối cảnh

`src/components/users/MultiRoleManagerDialog.tsx` hiển thị checkbox đủ 5 vai trò (gồm `super_admin` cấp 100, `owner` cấp 80) cho bất kỳ ai mở dialog, chỉ dựa vào RLS Postgres để chặn. UX sai (lộ tồn tại Super Admin, hiển thị checkbox tick được rồi báo lỗi), và mô hình "multi-role tự do" mâu thuẫn với spec 4-tier đã chốt ở `docs/architecture/01-modules/users-permissions.md` (1 user = 1 `user_level_code`).

Grep toàn repo: **không có file nào import** `MultiRoleManagerDialog`. Đây là dead code — giống `ChangeLevelDialog` đã xoá ở lượt trước.

## Quyết định

Đi theo phương án **"Siết theo 4-tier"** đã chọn:

1. **Xoá `MultiRoleManagerDialog.tsx`** — không còn entry point, không cần migrate UI.
2. **Giữ nguyên đường duy nhất sửa vai trò = `UserFormDialog`**, vốn đã:
   - Lọc `getAvailableUserLevels()` theo cấp actor (`tenant_owner`/`manager` chỉ thấy `manager | staff`).
   - Không bao giờ render `super_admin` (đã loại ở `useAvailableUserLevels`).
   - Đi qua Edge Function `create-user`/`update-user` (type union không có `super_admin`) → RPC `can_create_user` / `can_manage_user` → RLS `user_roles`.
3. **Bổ sung 1 ràng buộc còn thiếu**: chặn user tự sửa cấp của chính mình ở `UserFormDialog` (nếu chưa có) — kiểm tra `targetUser.id === currentUser.id` thì disable trường "Cấp người dùng".

## Phạm vi file

| Hành động | File | Ghi chú |
|---|---|---|
| Xoá | `src/components/users/MultiRoleManagerDialog.tsx` | Dead code, 0 usage |
| Kiểm tra & vá nếu thiếu | `src/components/users/UserFormDialog.tsx` | Self-edit guard cho `user_level` |
| Không động | RLS `user_roles`, RPC `can_create_user/can_manage_user`, Edge Functions | Đã đủ lớp phòng vệ |

## Không làm trong plan này

- Không sửa schema/RLS (đã đúng).
- Không đụng `useEffectivePermissions` (vẫn dùng cho hiển thị permission của 1 role).
- Không tạo replacement dialog — multi-role không nằm trong spec 4-tier.

## Test / QA

1. Mở `/settings/users` với role `tenant_owner` → Sửa user manager → form chỉ có `manager | staff`, không có `owner`/`super_admin`.
2. Mở chính mình → trường "Cấp người dùng" disabled, helper text "Không thể tự thay đổi cấp của mình".
3. Grep `MultiRoleManagerDialog` sau khi xoá → 0 kết quả, build pass.
4. Mobile `/settings/users` (390px) → vẫn dùng `MobileUserCard` → menu Edit gọi cùng `UserFormDialog` → behaviour giống desktop.

## Rollback

Xoá file là git-tracked; revert commit nếu phát hiện component này thực ra được lazy-import động (đã grep, không có — rủi ro ~0).

## Bước tiếp theo sau khi approve

1. `rm src/components/users/MultiRoleManagerDialog.tsx`.
2. Xem `UserFormDialog.tsx`, thêm self-edit guard nếu còn thiếu.
3. Báo lại file đã sửa + xác nhận build.
