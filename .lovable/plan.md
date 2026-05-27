## Mục tiêu
Sửa màn hình `/chat` theo hướng ổn định cho PWA/mobile thực tế: danh sách hội thoại gọn, mở đúng 1 hội thoại, không tự “sổ” quá nhiều tin nhắn ra màn hình, không làm layout mobile bị loạn sau khi gửi/quay lại.

## Những gì có thể reuse
- Reuse `ChatPage.tsx`: đã có sidebar, conversation pane, bubble grouping, composer và attachment.
- Reuse `useChat.ts`: đã có hook `useConversations`, `useMessages`, `useSendMessage`, realtime invalidate.
- Reuse bảng/view hiện tại: `v_user_conversations`, `messages`, `conversation_members`, RPC `mark_conversation_read`, `send_chat_message`.

## Những gì cần refactor
1. **Mobile layout của ChatPage**
   - Tách trạng thái list/conversation rõ hơn trên mobile.
   - Đổi chiều cao container từ công thức cố định `h-[calc(100dvh-8rem)]` sang layout an toàn hơn theo viewport mobile để tránh bị kẹp trong PWA.
   - Header/list row giữ compact, không để nội dung làm giãn khung.

2. **Tối ưu phần tin nhắn**
   - Không render “bung” 200 tin ngay trong khung nhỏ.
   - Giảm số tin ban đầu còn khoảng 50 tin mới nhất, vẫn sắp xếp đúng từ cũ đến mới trong cửa sổ hiển thị.
   - Sau này nếu cần lịch sử đầy đủ sẽ thêm nút “Tải tin cũ hơn”, nhưng lượt này ưu tiên dọn lỗi đang rối.

3. **Chống trùng/loạn realtime trong UI**
   - Dedupe tin nhắn theo `id` trong `useMessages` trước khi render để tránh realtime/refetch tạo duplicate tạm thời.
   - Dedupe attachment theo `id` trong mỗi message.
   - Query key giữ theo `conversationId`, không tự kéo message của hội thoại khác.

4. **Cải thiện scroll behavior**
   - Chỉ auto-scroll xuống cuối khi mở hội thoại hoặc có tin mới ở cuối.
   - Tránh mỗi refetch làm giật vị trí đọc.
   - Khi gửi tin xong mới kéo xuống cuối.

## Những gì cần thêm mới
- Không thêm màn hình mới.
- Có thể thêm helper nhỏ trong `ChatPage.tsx`/`useChat.ts` để normalize/dedupe dữ liệu chat.
- Bump release theo convention: `APP_VERSION` và `public/changelog.json` lên bản mới.

## Rủi ro migration
- Không cần migration trong lượt sửa này vì lỗi đang nằm ở cách query/render/layout.
- Nếu sau khi kiểm tra vẫn còn duplicate từ database thật, bước tiếp theo mới cần migration cleanup unique constraint cho DM/member. Hiện chưa nên đụng DB để tránh rủi ro production.

## Kiến trúc / logic nghiệp vụ
- `/chat` là list-first trên mobile: chưa chọn hội thoại thì chỉ hiện danh sách; đã chọn thì chỉ hiện khung chat.
- Mỗi hội thoại chỉ được render 1 lần theo `conversation.id`.
- Mỗi tin nhắn chỉ render 1 lần theo `message.id`.
- Tin mới nhất nằm cuối khung chat; không đẩy toàn bộ lịch sử ra làm rối giao diện.

## Schema / migration
- Không thêm migration.

## API / RPC / server actions
- Không đổi RPC hiện tại.
- Chỉ chỉnh client query `messages`: lấy giới hạn mới nhất, normalize lại thứ tự hiển thị.

## UI screens / components
- Sửa `src/pages/ChatPage.tsx`:
  - Container mobile ổn định hơn trong PWA.
  - List và conversation pane không chen nhau.
  - Message area compact, không render quá nhiều dòng ban đầu.
  - Back button mobile rõ, quay về list không làm mất trạng thái.

- Sửa `src/hooks/useChat.ts`:
  - Limit tin nhắn ban đầu thấp hơn.
  - Dedupe message/attachment.
  - Đảm bảo query vẫn filter đúng conversation.

## Permission / role rules
- Không đổi quyền.
- Vẫn dựa trên RLS/RPC hiện tại.

## Test cases
- Mobile 390px `/chat`: chỉ hiện danh sách khi chưa chọn hội thoại.
- Chọn hội thoại: chỉ hiện đúng hội thoại đó, không hiện list bên cạnh.
- Gửi 2 tin liên tiếp: không duplicate, không bung toàn bộ lịch sử.
- Bấm back: quay về list, không reset/loạn layout.
- Desktop: sidebar + pane vẫn hoạt động bình thường.

## Rollout notes
- Đây là hotfix UI/client, ít rủi ro hơn migration.
- Sau khi publish cần PWA cache bump theo version để người dùng nhận bundle mới.
- Nếu user PWA vẫn kẹt bản cũ, dùng nút “Xoá cache & tải lại” đã thêm ở bản trước.