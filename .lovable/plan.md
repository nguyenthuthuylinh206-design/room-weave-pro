## Mục tiêu
Cho phép mỗi user tự chọn các module nào sẽ xuất hiện trên thanh menu ngang dưới (MobileBottomNav). Các module không chọn sẽ nằm trong trang "Thêm" như hiện tại.

## Cách hoạt động

- Home và "Thêm" luôn cố định ở 2 đầu (không cho ẩn).
- Ở giữa hiện tối đa 3 slot tùy biến (tổng 5 nút). User chọn từ pool: Tasks, Đặt phòng, Phòng, Giặt là, Bảo trì, Kho, Báo cáo, Khách sạn, Nhân viên, Nhà cung cấp, Bổ sung đồ, Đơn mua hàng.
- Mặc định (chưa cấu hình): giữ nguyên logic hiện tại — tự chọn theo permission từ ALL_TABS.
- User chỉ chọn được tab mình có quyền truy cập.

## Lưu trữ

- LocalStorage key `mobile-bottom-nav:v1:{userId}` lưu mảng `string[]` id tab đã chọn (max 3).
- Lưu local-only (không cần migration DB). Đồng bộ qua `storage` event để các tab cùng device cập nhật.

## Files

### Mới
- `src/hooks/useMobileNavPreferences.ts` — đọc/ghi preference từ localStorage, expose `selectedIds`, `setSelectedIds`, `isCustomized`, `reset()`. Key gắn `user.id`.
- `src/components/mobile/MobileNavCustomizeSheet.tsx` — bottom Sheet, hiện list module có thể chọn (lọc theo `useUserModulePermissions` + role privileged), checkbox tối đa 3, nút "Khôi phục mặc định" và "Lưu". Vô hiệu hóa checkbox khi đã đủ 3.

### Sửa
- `src/components/layout/MobileBottomNav.tsx` — đọc `useMobileNavPreferences`. Nếu `isCustomized`, build `effectiveNavItems = [home, ...selected (lọc lại theo quyền), more]`. Nếu chưa, giữ logic hiện tại.
- `src/pages/mobile/MorePage.tsx` — thêm 1 item trong "LIÊN KẾT NHANH": "Tùy chỉnh thanh điều hướng" (icon `LayoutGrid` hoặc `SlidersHorizontal`) mở `MobileNavCustomizeSheet`.

## UI sheet (tóm tắt)

- Header: "Tùy chỉnh thanh dưới" + mô tả "Chọn tối đa 3 mục hiển thị giữa Home và Thêm".
- List: từng row có icon + label + checkbox bên phải. Row disabled nếu user không có quyền (hiện badge "Không có quyền").
- Counter: "Đã chọn x/3".
- Footer sticky: nút "Khôi phục mặc định" (ghost) + "Lưu" (primary, sticky).

## Không thay đổi
- Quyền truy cập, RLS, routing.
- MorePage grid vẫn hiện đầy đủ module — đây là menu tổng hợp.

## Test thủ công
- Chọn 0/1/2/3 mục → bottom nav cập nhật ngay.
- Reset → quay về danh sách filter theo permission cũ.
- User không có quyền 1 module: không thấy trong sheet; nếu preference cũ có id đó, lọc bỏ runtime.
- Đổi user (logout/login khác): preference độc lập theo `user.id`.
