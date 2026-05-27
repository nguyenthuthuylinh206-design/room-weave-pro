## Vấn đề thực tế đang gây "loạn"

Trên sidebar `/chat` (ảnh selected element của bạn) mỗi hội thoại đang xuất hiện 2–3 lần, ví dụ:
```
B2 Nhân Viên Buồng 2 — Bạn: Hú
NLNV Linh — Bạn: hus
NLNV Linh — Bạn: hus       ← trùng
B2 Nhân Viên Buồng 2 — Bạn: Hú   ← trùng
B2 Nhân Viên Buồng 2 — Bạn: Hú   ← trùng
```
Console cũng cảnh báo `two children with the same key b3ce9f78-...`.

### Nguyên nhân gốc
View `public.v_user_conversations` join với `conversation_members` nên **mỗi member của hội thoại tạo ra 1 row** (viewer_id khác nhau).
- `useConversations()` trong `src/hooks/useChat.ts` chỉ filter `tenant_id` + optional `hotel_id`, **không filter `viewer_id`** → nhận về tất cả các bản ghi của mọi thành viên cùng tenant → conversation nào có N thành viên hiện ra N lần.
- `usePendingCounts.chatQuery` cũng thiếu `viewer_id` → số badge "Tin nhắn" trên Sidebar/MobileBottomNav cộng dồn unread của người khác → đếm sai (thường cao gấp nhiều lần).
- `useUnreadChatCount()` đã filter `viewer_id` đúng nên không bị, nhưng đang không được dùng cho badge.

Trước đây không lộ vì RLS của view (security_invoker) đủ chặt; có vẻ policy hiện tại cho phép user thấy member rows của hotel mình nên rò ra → lộ duplicate. Dù policy có siết lại sau này, **client vẫn phải filter `viewer_id = me`** cho đúng ngữ nghĩa "danh sách của tôi".

## Phạm vi sửa (chỉ frontend, không động schema)

### 1. `src/hooks/useChat.ts` — `useConversations()`
- Thêm `.eq('viewer_id', user.id)` vào query `v_user_conversations`.
- Phòng hờ: `Array.from(new Map(convs.map(c => [c.id, c])).values())` để dedupe theo `id` trước khi return.

### 2. `src/hooks/usePendingCounts.ts` — `chatQuery`
- Thêm `.eq('viewer_id', user.id)` để badge chat chỉ cộng unread của chính mình.

### 3. `src/pages/ChatPage.tsx` — phòng vệ render
- Khi map `visibleConvs`, dùng key `${c.id}` (đã có) — nhưng vì đã dedupe ở hook nên không cần thay đổi gì thêm. Giữ nguyên.

### 4. Runtime error "Failed to fetch RootRoute.tsx"
Đây là lỗi HMR/chunk cũ do dev server cache, không liên quan code; sau khi sửa và bump version, `CacheBuster` sẽ tự reload. Không cần đụng `RootRoute.tsx`.

## QA checklist
- Mở `/chat` với tài khoản có nhiều hội thoại nhóm → mỗi hội thoại chỉ 1 row.
- Console không còn cảnh báo duplicate key.
- Badge "Tin nhắn" ở Sidebar và MobileBottomNav khớp với tổng `unread_count` của riêng mình (so với số chấm trong từng row).
- Tạo hội thoại nhóm 3 người, gửi tin từ A → B chỉ thấy badge +1, C cũng +1, A không tăng.

## File sẽ sửa
- `src/hooks/useChat.ts`
- `src/hooks/usePendingCounts.ts`
- `src/lib/app-version.ts` (bump `1.0.60`)
- `public/changelog.json` (entry fix)

Không migration, không RPC, không đụng UI khác.
