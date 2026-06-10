## Vấn đề hiện tại

Mobile `/settings/users` (`MobileUserManagementPage.tsx`) chỉ là 1 list phẳng + 3 ô stats + search. So với desktop (`UsersPage.tsx`) thì **thiếu rất nhiều**:

- ❌ Không có 3 tab: **Người dùng / Vai trò / Cấu hình Quyền**
- ❌ Không có UserStatsCards (5 chỉ số chuẩn) — đang tự đếm 3 ô thủ công, sai nhãn
- ❌ Không có filter (cấp độ, trạng thái, khách sạn, chức vụ, bộ phận, "do tôi tạo")
- ❌ Không có 2 view-mode: **Phân cấp (hierarchy)** & **Bảng**
- ❌ Hiển thị `hotel_id.substring(0,8)...` (UUID rút gọn) thay vì tên khách sạn → đúng là "chưa chuẩn"
- ❌ Không có nút Thêm trong context khi không có quyền (đang luôn show)
- ❌ Không vào được Vai trò & Cấu hình Quyền trên mobile

## Mục tiêu

Mobile = bản desktop, được sắp xếp lại cho 390px portrait. Dùng lại đúng các component nghiệp vụ desktop, chỉ thay layout/spacing.

## Thiết kế

### A. Cấu trúc trang `MobileUserManagementPage`

```text
┌─ MobileDetailHeader: "Người dùng & Phân quyền"
│  ├─ back → /settings
│  └─ action Plus → mở UserFormDialog (chỉ owner/manager)
├─ Sticky tab bar (3 tab, full-width, h-10, không icon — theo Core "no icons in tabs")
│  [ Người dùng | Vai trò | Cấu hình Quyền ]
├─ TabsContent "users":
│   ├─ UserStatsCards (grid 2 cột trên mobile, mỗi ô tap để filter)
│   ├─ MobileUserFilters (Sheet): nút "Bộ lọc" + chip hiển thị filter đang bật
│   ├─ Search input (h-9)
│   ├─ View toggle nhỏ (Phân cấp / Bảng) — h-8 segmented
│   └─ Danh sách:
│        - Phân cấp: reuse <UserHierarchyView> (nó đã responsive khá tốt)
│        - Bảng: thay bằng list card mobile (avatar + tên + chip role +
│          email + tên khách sạn thật + chevron). Tap card mở Sheet
│          UserDetail với các action Sửa / Phân quyền / Đổi mật khẩu.
├─ TabsContent "roles": reuse <RolesOverviewTab> (đã ổn mobile, chỉ padding)
└─ TabsContent "permissions": reuse <PermissionConfigurationTab>
   (kèm preSelectedUserId truyền từ "Phân quyền" trong card)
```

### B. Component thay đổi / thêm mới

| File | Hành động |
|---|---|
| `src/components/settings/MobileUserManagementPage.tsx` | **Rewrite** — dùng `<Tabs>` + reuse `UserManagementTab` logic |
| `src/components/users/MobileUserCard.tsx` | **Mới** — card 1 user cho mobile (thay row UUID hiện tại) |
| `src/components/users/MobileUserFiltersSheet.tsx` | **Mới** — Sheet chứa toàn bộ filter của `UserFilters` |
| `src/components/users/UserStatsCards.tsx` | **Tweak** — thêm prop `compact` để render grid-2 trên mobile |
| `src/pages/users/UsersPage.tsx` | Không đổi (vẫn rẽ nhánh `isMobile`) |

### C. Hiển thị tên khách sạn (fix lỗi UUID)

Trong `useUsers` đã có `user.hotel` (join). Nếu chưa có, thêm select join `hotel:hotels(name)` ở hook. Card mobile hiển thị `user.hotel?.name` thay vì cắt UUID.

### D. Quyền

- Nút Thêm chỉ hiện khi `user_level_code ∈ {tenant_owner, manager}` (dùng cùng điều kiện `canAddUser` của desktop).
- Tab "Cấu hình Quyền" chỉ hiện cho owner/manager.

### E. Mobile UX chuẩn dự án

- Tap target ≥ 44px (`h-11` cho row card, `h-9` cho input/button).
- Không icon/emoji trong TabsList (Core rule).
- Status dùng màu chữ semantic (`text-amber-600` cho Chủ, `text-blue-600` Quản lý, `text-muted-foreground` Nhân viên) — không bg.
- Pull-to-refresh giữ nguyên ở tab "Người dùng".
- Sheet bottom cho Filter + UserDetail (đã có pattern).

## Kỹ thuật

- Reuse `useUsers`, `useCreateUser`, `useUpdateUser`, `UserFormDialog`, `UserHierarchyView`, `RolesOverviewTab`, `PermissionConfigurationTab` — **không** viết lại logic.
- State: `activeTab`, `viewMode`, `filters`, `searchQuery`, `selectedUser`, `editingUser`, `isFilterSheetOpen`, `preSelectedUserId` — giống desktop `UserManagementTab`.
- `useBreakpoint` đã có; route hiện đã rẽ nhánh — chỉ rewrite component mobile.

## Test / QA

- Owner thấy đủ 3 tab + nút Thêm; Staff chỉ thấy tab "Người dùng", ẩn nút Thêm.
- Filter theo cấp độ, khách sạn, "do tôi tạo" hoạt động.
- Tap stats card filter đúng nhóm.
- Tên khách sạn hiển thị thật, không phải UUID.
- Switch Phân cấp ↔ Bảng giữ filter & search.
- Pull-to-refresh invalidate `['users']`.
- Test trên 390x844 (iPhone 12), 360x800 (Android), 320x568 (iPhone SE).

## Phạm vi không đụng tới

- Desktop `UsersPage` & `UserManagementTab` giữ nguyên.
- Schema DB & RLS không đổi.
- Edge functions không đổi.

## Rollback

Chỉ ảnh hưởng client; revert 4 file mobile (2 mới + 1 rewrite + 1 tweak optional) là xong.
