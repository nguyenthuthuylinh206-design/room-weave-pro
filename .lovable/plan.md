# Chat dạng cửa sổ thu/mở trên mobile

## Vấn đề hiện tại
- Trên desktop (`lg+`): `ChatLauncher` đã là cửa sổ thu/mở ở góc phải. OK.
- Trên mobile: tab "Tin nhắn" ở bottom nav điều hướng sang trang `/chat` → mất context trang đang dùng.

Mong muốn: tab "Tin nhắn" mở/thu một panel nổi như Messenger, không rời trang.

## Giải pháp

### A. Kiến trúc state
- Tách `ChatPopupProvider` ra khỏi `ChatLauncher`, đưa lên `MainLayout` để cả `MobileBottomNav` và `ChatLauncher` cùng dùng chung.
- Thêm vào provider hai state mới: `launcherOpen: boolean` + `toggleLauncher()`.

### B. ChatLauncher responsive
- Bỏ ràng buộc `lg:flex` / `hidden`. Hiển thị ở cả mobile lẫn desktop.
- Desktop (`lg+`): giữ nguyên — nút tròn góc phải + panel 280×440 phía trên nút.
- Mobile (`<lg`):
  - Bỏ nút tròn FAB (vì đã có tab "Tin nhắn" ở bottom nav đảm nhiệm vai trò mở).
  - Khi `launcherOpen = true`: panel slide-up full-width, cao ~70vh, bo góc trên, nằm trên `MobileBottomNav` (z-index cao hơn nav).
  - Header có nút `Minus` để thu, nút `X` để đóng — cả hai đều set `launcherOpen = false`.
  - Backdrop mờ nhẹ phía sau panel; tap ngoài đóng panel.

### C. ChatPopupWindow mobile
- Mobile: hiển thị 1 popup duy nhất, dạng sheet full-width chiếm gần full màn (giống Messenger mở 1 conversation), header có nút back để đóng/quay lại launcher.
- Desktop: giữ nguyên 320×440 stack tối đa 3.

### D. MobileBottomNav
- Tab `chat`: thay `navigate('/chat')` bằng `toggleLauncher()`.
- Trạng thái active của tab dựa vào `launcherOpen` (không dựa vào pathname).
- Badge unread giữ nguyên (đọc từ `pendingCounts.chatUnread`).
- Ẩn launcher khi pathname bắt đầu `/chat` để tránh trùng lặp (giữ logic cũ).

### E. /chat route
- Vẫn giữ route `/chat` (truy cập qua link "Xem toàn màn hình" trong popup, hoặc bookmark). Không xóa.

## Files

**Sửa:**
- `src/components/chat/ChatPopupContext.tsx` — thêm `launcherOpen` + `toggleLauncher` + `setLauncherOpen`.
- `src/components/chat/ChatLauncher.tsx` — bỏ `lg:flex` exclusive, thêm variant mobile (sheet slide-up + backdrop), dùng `launcherOpen` từ context thay state nội bộ.
- `src/components/chat/ChatPopupWindow.tsx` — responsive: mobile full-screen sheet, desktop popup như cũ.
- `src/components/layout/MainLayout.tsx` — bọc `ChatPopupProvider` quanh `{children}` + `ChatLauncher`.
- `src/components/layout/MobileBottomNav.tsx` — tab chat dùng `toggleLauncher()` + active state theo `launcherOpen`.
- `src/lib/app-version.ts` + `src/components/shared/CacheBuster.tsx` + `public/changelog.json` — bump version.

**Không tạo file mới, không migration, không thay đổi API/RPC, không đụng DB.**

## Test QA

1. Mobile: tap "Tin nhắn" ở bottom nav → panel slide-up, tab active.
2. Tap lại tab "Tin nhắn" hoặc nút `Minus`/`X` → panel thu xuống, vẫn ở trang gốc.
3. Tap vào 1 hội thoại → mở `ChatPopupWindow` full-screen mobile; nút back trở về launcher list.
4. Tap backdrop → đóng panel.
5. Desktop (`lg+`): hành vi cũ giữ nguyên (nút tròn + popup stack).
6. Badge unread cập nhật đồng thời trên tab và header launcher.
7. Khi vào `/chat` (full page): launcher tự ẩn.

## Rollout
- Không breaking change DB/API.
- Bump `APP_VERSION` + `CURRENT_VERSION` + thêm entry `changelog.json` theo convention.
