## Mục tiêu
Sửa nhóm lỗi hiện có gây màn `Unexpected Application Error`, đồng thời tối ưu mobile portrait để không còn tràn ngang, header/bottom nav gọn hơn và các màn vận hành chính dễ dùng hơn trên iPhone/Android nhỏ.

## Phân tích hiện trạng

### 1) Có thể reuse
- `ChunkErrorBoundary` và `src/lib/chunk-reload.ts` đã có logic nhận diện lỗi chunk/module script và reload cache.
- `MainLayout`, `MobileHeader`, `MobileBottomNav`, `HotelSwitcher` là lớp layout mobile trung tâm, sửa ở đây sẽ tác động rộng mà không phải sửa từng màn.
- `MobileRoomsDashboard`, `GeneralSettingsPage`, `UsageModeSelector`, `HotelQcModeSettings`, `HotelPhotoEvidenceSettings` đã có cấu trúc mobile cơ bản.
- Design tokens trong `index.css` đã có dark theme, safe-area, `pb-safe`, `min-h-dvh`.

### 2) Cần refactor
- React Router đang dùng data router nhưng chưa có `errorElement` chung, nên lỗi render/lazy route vẫn rơi vào default UI `Unexpected Application Error` thay vì fallback tiếng Việt và xử lý reload chunk.
- `ChunkErrorBoundary` bọc ngoài `RouterProvider` chưa đủ cho lỗi route do React Router tự bắt bên trong.
- `MobileHeader` hiện dễ tràn ngang vì vừa hiển thị tên khách sạn bên trái, vừa render `HotelSwitcher` đầy đủ ở cụm action bên phải.
- `HotelSwitcher` bản mobile đang dùng width/popover desktop (`w-full lg:w-[320px]`, popover `w-[400px]`) và status badge nền, không tối ưu cho màn 390–414px.
- Một số container mobile cần `min-w-0`, `max-w-full`, `overflow-hidden`, sticky footer tốt hơn để tránh lệch/tràn.

### 3) Cần thêm mới
- `RouteErrorBoundary` dùng `useRouteError()` để thay màn lỗi mặc định của React Router:
  - Nếu là lỗi chunk/module script: purge caches + reload, hoặc hiển thị CTA “Tải lại phiên bản mới”.
  - Nếu là lỗi thường: hiển thị lỗi tiếng Việt gọn, có nút “Tải lại trang”, không tự reload nhầm.
- Biến thể mobile/compact cho `HotelSwitcher` để dùng trong header:
  - Một dòng, truncate tên khách sạn.
  - Popover/sheet width theo viewport: `calc(100vw - 1rem)`.
  - Không dùng badge nền cho status, chỉ text semantic theo chuẩn UI.
- Mobile layout hardening:
  - Chặn x-overflow ở `#root`, body và các shell chính.
  - Header dùng grid cố định: chuông / hotel switcher / menu, không đẩy layout ngang.
  - Bottom nav giảm padding/min-width, label truncate, giữ 5 item.
- Tối ưu nhanh 2 màn trong ảnh:
  - `GeneralSettingsPage`: padding mobile nhất quán, card compact, action footer không tràn, section heading không làm lệch ngang.
  - `MobileRoomsDashboard`: card phòng có `min-w-0`, status text không đẩy width, action buttons responsive.

### 4) Rủi ro migration
- Không có schema/migration.
- Rủi ro chính là tác động layout toàn app mobile vì sửa `MobileHeader`/`HotelSwitcher`; sẽ giới hạn bằng prop `variant="mobile"` để desktop giữ nguyên.
- PWA/iOS cache: cần bump version/changelog để thiết bị nhận bản mới theo quy ước release.

## Kế hoạch triển khai

### A. Kiến trúc / logic nghiệp vụ
1. Thêm route-level error boundary cho React Router để thay thế default `Unexpected Application Error`.
2. Tái sử dụng `isChunkLoadError()` và `purgeCachesAndReload()` hiện có, tránh tạo logic reload mới.
3. Giữ lỗi nghiệp vụ/render thường ở fallback tiếng Việt, không tự reload để tránh loop.
4. Tối ưu mobile layout ở shell chung trước, sau đó chỉnh các màn cụ thể trong ảnh.

### B. Schema / migration
- Không thêm migration.
- Không thay đổi database/RLS/RPC.

### C. API / RPC / server actions
- Không thêm API/RPC/server action.
- Không thay đổi mutation hiện có.

### D. UI screens / components
Sẽ sửa/tạo các file chính:
- Tạo `src/components/RouteErrorBoundary.tsx`
  - Fallback tiếng Việt cho React Router.
  - Detect chunk error và gọi reload cache.
- Sửa `src/App.tsx`
  - Gắn `errorElement` cho các nhánh route chính hoặc wrapper route phù hợp.
  - Giữ `ChunkErrorBoundary` ngoài cùng như lớp bảo vệ bổ sung.
- Sửa `src/components/layout/MobileHeader.tsx`
  - Header mobile không còn double hotel name.
  - Dùng layout grid/flex có `min-w-0`, không tràn ngang.
- Sửa `src/components/layout/HotelSwitcher.tsx`
  - Thêm prop mobile compact, popover width responsive.
  - Truncate tên khách sạn, status dùng semantic text thay badge nền ở mobile.
- Sửa `src/components/layout/MobileBottomNav.tsx`
  - Giảm nguy cơ overflow: item `min-w-0 flex-1`, label truncate, touch target vẫn đủ.
- Sửa `src/index.css`
  - Bổ sung guard overflow cho `#root` và mobile shell.
- Sửa `src/pages/settings/GeneralSettingsPage.tsx`
  - Compact mobile: `px-3/space-y-3`, section header `min-w-0`, action footer wrap/sticky hợp lý.
- Sửa `src/components/settings/UsageModeSelector.tsx`, `HotelQcModeSettings.tsx`, `HotelPhotoEvidenceSettings.tsx`
  - Thêm `min-w-0`, text wrap/truncate đúng, giảm padding mobile.
- Sửa `src/components/rooms/MobileRoomsDashboard.tsx`
  - Card/list không đẩy ngang, status/chips gọn, actions responsive.
- Bump `src/lib/app-version.ts` và thêm entry `public/changelog.json` theo quy ước release.

### E. Permission / role rules
- Không thay đổi quyền.
- Mobile bottom nav vẫn filter theo permission hiện có, giữ tối đa 5 item và More.

### F. Test cases / QA
- Kiểm tra route lỗi chunk/module script không còn hiện default `Unexpected Application Error`.
- Kiểm tra lỗi render thường vẫn hiện fallback lỗi tiếng Việt, không auto reload.
- Mobile viewport 390x844 và 414x756:
  - `/settings/general`: không tràn ngang, header không bị kéo lệch, footer/nút không che nội dung.
  - `/rooms`: card phòng không tràn, bottom nav không đẩy ngang, label không overlap.
- Desktop quick check để đảm bảo `HotelSwitcher` desktop không đổi layout.
- Không chạy build thủ công; harness sẽ kiểm tra build/typecheck.

### G. Rollout notes
- Đây là thay đổi frontend-only, rollback bằng cách revert các file UI/error-boundary/version/changelog.
- Thiết bị iOS PWA đang cache bản cũ có thể cần mở lại/tải lại một lần để nhận bản mới; từ bản này route error boundary sẽ xử lý tốt hơn các lỗi chunk sau deploy.
- Sau khi triển khai, nên publish ngay để người dùng mobile nhận fix cache/runtime.