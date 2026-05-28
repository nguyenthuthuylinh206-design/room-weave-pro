# Plan: Chat widget kiểu Facebook (danh sách + popup nổi)

## Mục tiêu
Thay cửa sổ chat lớn 760px hiện tại bằng 1 widget nhỏ bottom-right (~280px) chỉ hiển thị danh sách hội thoại đã có, có chấm online. Click 1 hội thoại sẽ bung 1 popup chat ~320px×420px nổi bên trái widget. Có thể mở nhiều popup song song (giới hạn 3), thu nhỏ/đóng từng cái.

## A. Kiến trúc / logic

- 3 component mới trong `src/components/chat/`:
  - `ChatLauncher.tsx` — ô danh sách 280×~420px ở bottom-right. Hiện danh sách hội thoại (reuse `useConversations`), chấm online, badge unread, ô tìm kiếm, nút collapse/đóng.
  - `ChatPopupWindow.tsx` — 1 popup chat đơn lẻ (header avatar + tên + minimize + close, body reuse `ConversationView`).
  - `ChatPopupManager.tsx` — context + stack quản lý các popup đang mở (max 3, mở thêm sẽ đẩy popup cũ nhất ra), render xếp ngang phải→trái cạnh launcher.
- Hook `useOnlinePresence(userIds)` — reuse `staff_status`/`useOnShiftStaffList` đã có để biết user nào online (chấm xanh/xám). Nếu chưa đủ data, fallback dùng `last_seen` trong `users`.
- Ẩn toàn bộ widget khi route bắt đầu bằng `/chat` (như hiện tại). Chỉ hiện ở breakpoint `lg+` (PC), mobile vẫn dùng `/chat`.

## B. Schema / migration
Không cần migration. Tái sử dụng bảng `conversations`, `messages`, `conversation_members`, `staff_status` đã có.

## C. API / RPC
Không thêm RPC mới. Dùng lại `useConversations`, `useMessages`, `useSendMessage`, `usePendingCounts`.

## D. UI / Components

### ChatLauncher (collapsed)
- Nút tròn 48px bottom-right, icon `MessageCircle`, badge unread.

### ChatLauncher (expanded) — kiểu ảnh mẫu
```text
┌─────────────────────────┐
│ Tin nhắn          – ×  │  header semantic (bg-card border-b)
├─────────────────────────┤
│ [Tìm hội thoại...]     │
├─────────────────────────┤
│ ● Hỗ trợ Skyhotel    2 │  ● xanh = online, badge unread
│ ○ LeTan1               │
│ ○ LeTan2               │
│ ● DonPhong1            │
└─────────────────────────┘
```
- Dùng semantic tokens (`bg-background`, `border`, `text-foreground`, `text-primary`), không hardcode màu nâu.
- Row: avatar + tên + chấm online + badge unread. Click → mở `ChatPopupWindow` qua manager.

### ChatPopupWindow
- 320×420px, fixed bottom-0, xếp ngang phải sang trái: `right: 304px + index*328px`.
- Header: avatar + tên + nút `–` (minimize → thu thành tab nhỏ 200×32px ngay trên launcher) + `×` (close).
- Body: reuse `ConversationView` (đã export từ ChatPage).
- Click vào tab minimized → expand lại.

## E. Permission
Như chat hiện tại — chỉ user đã đăng nhập, filter theo tenant_id qua RLS.

## F. Test
- Mở 1 hội thoại → popup hiện, gửi tin nhắn OK.
- Mở 4 hội thoại liên tiếp → tối đa 3 popup, popup cũ nhất bị đẩy ra.
- Minimize/restore/close hoạt động độc lập từng popup.
- Vào `/chat` → toàn bộ widget ẩn.
- Breakpoint < lg → ẩn hoàn toàn.
- Badge unread launcher = tổng `chatUnread` từ `usePendingCounts`.

## G. Rollout
- Xoá `DesktopChatWindow` cũ khỏi `MainLayout`, thay bằng `<ChatPopupProvider><ChatLauncher /><ChatPopupStack /></ChatPopupProvider>`.
- Bump `APP_VERSION` → `1.0.65`, thêm entry `public/changelog.json`: "Chat widget kiểu Facebook: danh sách nhỏ + popup nổi nhiều cuộc cùng lúc".
- Không có breaking change DB. Component cũ xoá hẳn vì user chọn "thay thế hoàn toàn".

## Files dự kiến
- **Tạo**: `src/components/chat/ChatLauncher.tsx`, `ChatPopupWindow.tsx`, `ChatPopupManager.tsx`, `useOnlinePresence.ts` (hoặc reuse hook on-shift sẵn có).
- **Sửa**: `src/components/layout/MainLayout.tsx`, `src/lib/app-version.ts`, `public/changelog.json`.
- **Xoá**: `src/components/chat/DesktopChatWindow.tsx`.
- **Không đụng**: `ChatPage.tsx` (chỉ import lại `ConversationView` đã export sẵn), DB, edge functions.
