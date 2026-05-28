# Tăng tốc gửi tin nhắn — Optimistic + Fire-and-forget

## Vấn đề hiện tại

Đo flow trong `ChatPage.tsx` + `useChat.ts`:

1. `handleSubmit` **await** `sendMessage.mutateAsync` → input bị khoá tới khi RPC trả về.
2. Tin nhắn **không hiện ngay** — phải chờ:
   - RPC `send_chat_message` (200–600ms)
   - Realtime event → `invalidateQueries` → **refetch 50 tin + join users + join attachments** (300–900ms)
3. Mỗi tin mới từ realtime cũng **refetch toàn bộ** thay vì append → tốn băng thông & gây "flash".

Kết quả: từ lúc bấm gửi đến lúc thấy tin trên màn hình thường 0.7–1.5s — chậm so với Messenger (~30ms).

## Mục tiêu

Thấy tin ngay khi nhấn Enter (<50ms), bất kể mạng. Nếu RPC fail thì rollback + báo lỗi.

## Thay đổi

### A. `useSendMessage` — Optimistic update

- Thêm `onMutate`: build 1 `ChatMessage` tạm với `id = clientMsgId`, `sender = currentUser`, `created_at = now`, `_pending: true`. `setQueryData(['chat-messages', conversationId])` push vào cuối.
- Lưu `previousMessages` để rollback trong `onError`.
- `onSuccess`: thay thế message tạm (match theo `client_msg_id` hoặc fallback theo `id` từ RPC) bằng record thật từ `data`. Không invalidate.
- `onError`: rollback + toast.
- Truyền `currentUser` vào hook (hoặc gọi `useUser()` bên trong) để có sender info.

### B. `useMessages` realtime — Patch cache thay vì invalidate

- Khi nhận `INSERT`: nếu message đã có (match `id` hoặc `client_msg_id`) → bỏ qua/merge; nếu chưa có → fetch riêng record đó + sender + attachments rồi append. Không refetch 50 tin.
- Khi nhận `UPDATE`/`DELETE`: patch in-place theo `id`.
- Vẫn giữ invalidate làm fallback cho event lạ.

### C. `handleSubmit` — Fire-and-forget

- Đổi `await sendMessage.mutateAsync(...)` → `sendMessage.mutate(...)` (không await).
- Clear `text`/`pending` ngay (đã đang làm), không cần `try/catch` await — `onError` của mutation đã handle rollback + toast.
- Bỏ điều kiện `!sendMessage.isPending` trong `canSend` để cho phép gõ + gửi liên tục nhiều tin liền.

### D. Render gợi ý trạng thái (nhẹ)

- Trong bubble tin của mình, nếu `_pending` → opacity 70% (không thêm icon để giữ tinh thần tối giản).
- Khi onSuccess thay thế → opacity về 100%.

## Phạm vi không đụng

- RPC `send_chat_message` không đổi (đã trả về message; sẵn có `client_msg_id` để de-dupe).
- Upload attachment vẫn await như cũ (an toàn) — `canSend` vẫn chặn khi `isUploading`.
- Không động `useMarkConversationRead`, group conversation, list sidebar.

## QA checklist

- Gõ + Enter liên tục 5 tin nhanh → cả 5 hiện ngay, không nhấp nháy, không trùng.
- Mạng chậm (throttle Slow 3G): tin vẫn hiện ngay, sau vài giây vẫn ở đó.
- Mạng fail (offline): tin hiện ra rồi biến mất + toast "Không gửi được".
- Mở 2 trình duyệt cùng hội thoại: tin từ A hiện ở B qua realtime (append, không reload toàn list).
- Đính kèm ảnh + text: gửi xong tin hiện đầy đủ ảnh.

## Rollout

- 1 file FE: `src/hooks/useChat.ts` (sửa `useSendMessage` + `useMessages`).
- 1 file FE: `src/pages/ChatPage.tsx` (đổi `mutateAsync` → `mutate`, bỏ chặn `isPending` trong `canSend`, thêm class opacity cho `_pending`).
- Bump `APP_VERSION` → `1.0.78` + entry changelog "Tin nhắn gửi tức thì như Messenger".
- Rollback: revert 2 file, không có migration.
