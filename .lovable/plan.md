# Chat nội bộ RoomQC — MVP v1

Phạm vi đã chốt: **DM 1-1** + **Nhóm tự tạo** trong cùng hotel; Text + emoji + @mention + đính kèm ảnh/file + reply/thread + reaction + typing + read receipts; **Push mọi tin nhắn** (trừ kênh muted), kết hợp in-app noti & badge realtime.

---

## A. Kiến trúc & logic nghiệp vụ

- **Scope hội thoại**: ràng buộc `hotel_id` bắt buộc. Mọi thành viên phải có dòng trong `user_hotels` cho cùng hotel đó (kiểm tra ở RPC `create_conversation` + `add_member`).
- **Loại hội thoại**: `direct` (đúng 2 thành viên, unique key sắp xếp 2 user_id để tránh tạo trùng) hoặc `group` (≥ 2 thành viên, có name, có creator là admin).
- **Trạng thái đọc**: lưu `last_read_message_id` trên `conversation_members` → unread = đếm message > id đó. Read receipts chi tiết lưu trong `message_reads` (chỉ insert khi user mở thread, để giảm ghi).
- **Typing**: dùng Supabase Realtime **Broadcast** (ephemeral, không ghi DB) theo channel `conv-{id}`.
- **@mention**: parse `@username` ở client + lưu `mentioned_user_ids uuid[]` trên `messages` để fan-out noti ưu tiên.
- **Reply/thread**: cột `parent_message_id` self-reference; UI thread dạng side sheet trên desktop, full-screen trên mobile.
- **Reactions**: bảng `message_reactions(message_id, user_id, emoji)` unique.
- **Soft delete**: `deleted_at`; hiển thị "Tin nhắn đã xoá". Cho phép edit trong 15 phút (`edited_at`).
- **Mute**: per-conversation flag trong `conversation_members.muted_until` → skip push.
- **Rate-limit push**: edge function dedupe theo `(recipient_id, conversation_id)` trong 30s — nếu đã có push pending cùng conv, gộp thành "X tin nhắn mới".
- **Offline tolerant**: composer autosave draft 24h theo conversation_id (localStorage), gửi lại khi online; gửi tin = optimistic UI với `client_msg_id` để dedupe.

## B. Schema / migration

Bảng mới (đều có `tenant_id`, GRANT cho `authenticated` + `service_role`, RLS, realtime publication):

- `conversations(id, tenant_id, hotel_id, type, name, created_by, last_message_at, last_message_preview, created_at, updated_at)`
- `conversation_members(conversation_id, user_id, role[admin|member], last_read_message_id, muted_until, joined_at)` — PK (conv, user).
- `messages(id, tenant_id, conversation_id, sender_id, body, parent_message_id, mentioned_user_ids uuid[], client_msg_id, edited_at, deleted_at, created_at)`
- `message_attachments(id, message_id, storage_path, mime_type, size_bytes, width, height, created_at)`
- `message_reactions(message_id, user_id, emoji)` PK (3 cột).
- `message_reads(message_id, user_id, read_at)` PK (2 cột).
- Trigger `after insert on messages`: update `conversations.last_message_at` + preview; gọi edge `notify-new-message` qua `pg_net` async.
- Trigger ngăn `update messages.body` sau 15 phút.
- Storage bucket **private** `chat-attachments`, RLS: chỉ member của conversation đọc/ghi (path = `{conversation_id}/{message_id}/...`).
- Index: `messages(conversation_id, created_at desc)`, GIN trên `body` (FTS tiếng Việt unaccent) để search.

## C. RPC / API / Edge

- `create_direct_conversation(_peer_user_id)` — atomic, trả về conv hiện có nếu đã tồn tại.
- `create_group_conversation(_hotel_id, _name, _member_ids uuid[])` — validate tất cả member thuộc hotel.
- `send_message(_conversation_id, _body, _parent_id, _client_msg_id, _attachments jsonb)` — atomic insert + attachments + dedupe theo `client_msg_id`.
- `mark_conversation_read(_conversation_id, _up_to_message_id)` — update `last_read_message_id`, insert `message_reads` cho các @mention.
- `toggle_reaction(_message_id, _emoji)`.
- `set_conversation_mute(_conversation_id, _muted_until)`.
- `add_members / remove_member / leave_conversation / rename_group` (chỉ admin).
- Edge function `notify-new-message`: nhận `message_id`, load recipients (members \ sender, lọc muted), fan-out:
  - Insert `in_app_notifications` (type `message`).
  - Gọi `send-push-notification` (Web Push) — kèm dedupe key.
  - Tôn trọng `notification_preferences` của user.
- View `v_user_conversations` cho list sidebar (kèm unread_count, last_message_preview, peer info).

## D. UI / Components

Route mới: `/chat`, `/chat/:conversationId` (và `?thread=:messageId`).

- **Desktop**: 2 cột — sidebar list hội thoại (search, tab DM / Nhóm, unread badge) + khung chat (header peer/group, message list virtual scroll, composer sticky bottom). Thread mở side sheet phải.
- **Mobile**: list full screen → tap vào mở conversation full screen; bottom nav giữ nguyên (chèn vào "More" theo permission). Composer cố định trên bàn phím (visual viewport).
- Components mới:
  - `ChatSidebar`, `ConversationListItem`, `ConversationView`, `MessageList` (virtual với `@tanstack/react-virtual`), `MessageBubble`, `MessageComposer` (mention autocomplete, emoji picker nhẹ, attach), `AttachmentPreview`, `ReactionBar`, `TypingIndicator`, `ThreadPanel`, `NewConversationDialog`, `GroupSettingsSheet`.
- **NotificationBell mở rộng**: thêm tab "Tin nhắn" + badge tách riêng (`useUnreadChatCount`); click vào tin nhắn deep-link `/chat/:id`.
- Hooks: `useConversations`, `useMessages(convId)` (infinite), `useChatRealtime(convId)`, `useTypingBroadcast`, `useChatDraft` (autosave 24h), `useUnreadChatCount`.
- Tuân thủ design system: minimalist, semantic colors, padding compact, không emoji ở tab.

## E. Permission / role

- Permission mới: `view_chat`, `send_chat_message` (mặc định cấp cho Owner / Manager / Staff).
- DM: bất kỳ 2 user cùng hotel.
- Nhóm: ai cũng tạo được; chỉ admin mới đổi tên / xoá member; creator mặc định admin.
- RLS: `member of conversation` (qua security definer `is_conversation_member(_conv, auth.uid())` để tránh recursion). Sender chỉ insert message với `sender_id = auth.uid()` và phải là member.
- Storage RLS: path prefix = conversation_id, check membership.

## F. Test cases

Vitest + SQL tests:
- Tạo DM 2 lần với cùng peer → trả về cùng conversation.
- Insert message → trigger update `last_message_at` + preview.
- User ngoài hotel KHÔNG select/insert được vào conversation (RLS).
- `send_message` dedupe theo `client_msg_id`.
- Edit > 15 phút → reject.
- `mark_conversation_read` set đúng `last_read_message_id`, unread_count về 0.
- Mute → edge function `notify-new-message` skip recipient.
- Push dedupe trong 30s → chỉ 1 push được gửi cho nhiều message liên tiếp.
- Attachment upload với path sai conversation → bị chặn.

## G. Rollout

- **Phase 1 (MVP)**: schema + RPC + UI DM + nhóm + realtime + push (1 sprint).
- **Phase 2**: search FTS tiếng Việt, reaction picker đầy đủ, image gallery, ghim tin nhắn.
- **Phase 3**: bridge với task QC (deep-link "Mở task"), kênh tự động theo bộ phận (đã loại khỏi MVP nhưng giữ schema mở rộng).
- **Feature flag**: `settings.chat.enabled` per-tenant (mặc định ON cho tenant đang dùng).
- **PWA push**: hướng dẫn iOS user "Thêm vào màn hình chính" để nhận push (đã có infra `push_subscriptions` + `send-push-notification`).
- **QA checklist**: iOS Safari 16.4+ PWA, Android Chrome, desktop Chrome/Edge/Safari; tab ẩn → vẫn nhận push; nhiều tab cùng mở → không duplicate noti; mất mạng → composer giữ draft, gửi lại khi online.
- **Rollback**: tắt `settings.chat.enabled`; route `/chat` ẩn; giữ schema để khôi phục.

```text
[ Sender ] --send_message RPC--> [ DB: messages ]
                                     |  (trigger)
                       +-------------+-------------+
                       v                           v
              [ Realtime → members ]      [ pg_net → edge notify-new-message ]
                                                   |
                                       +-----------+-----------+
                                       v                       v
                          [ in_app_notifications ]    [ Web Push fan-out (dedupe 30s) ]
```

**Khả thi: cao.** Toàn bộ phụ thuộc đã có trong codebase (Supabase Realtime, push infra, PWA, RLS, tenant isolation, UI primitives). MVP ước tính 1 sprint.
