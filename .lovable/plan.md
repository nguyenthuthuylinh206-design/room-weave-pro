## Mục tiêu
Đổi toast thông báo tin nhắn mới sang phong cách Messenger: avatar thật của người gửi, tên đậm, dòng preview ngay dưới, bấm cả thẻ là mở chat. Áp dụng cho cả mobile và desktop.

## Thay đổi UI (trong `src/components/chat/ChatNotificationListener.tsx`)

Bố cục mới (1 hàng, giống Messenger):
```text
[Avatar 40px]  Nguyễn Văn A                      2 phút
               Tin nhắn preview tối đa 2 dòng…
               (nếu nhóm) trong "Lễ tân ca sáng"
```

Chi tiết:
- **Avatar**: `Avatar` shadcn 40px, dùng `sender.avatar_url`, fallback = chữ cái đầu tên. Nếu là nhóm, đè 1 chip nhỏ góc dưới-phải hiển thị icon `Users` để vẫn nhận biết được context.
- **Hàng 1**: tên người gửi (`font-semibold text-sm`) + thời điểm "vừa xong" (`text-[11px] text-muted-foreground`).
- **Hàng 2**: preview tin nhắn `line-clamp-2`, `text-sm text-muted-foreground`. Nếu có đính kèm và body trống → "📷 Ảnh" / "📎 Tệp đính kèm" (tùy `attachment_type` nếu có, mặc định "Đính kèm").
- **Hàng 3 (chỉ nhóm)**: `trong "Tên nhóm"` — `text-xs text-muted-foreground/80`.
- **Toàn bộ card clickable**: bấm bất kỳ đâu trên toast → `setLauncherOpen(true)` + `openPopup(conversationId)` + `toast.dismiss(id)`. Bỏ nút "Mở chat" rời (giảm rối, đúng pattern Messenger).
- **Style toast**: dùng `unstyled: true` + className tùy chỉnh để render card phẳng, padding `p-3`, `rounded-lg border bg-card shadow-lg`, viền trái 3px `border-l-primary` giữ phân biệt như hiện tại.
- **Vị trí**: giữ `top-center` mobile / `bottom-right` desktop.
- **Duration**: 6s, có thể hover-pause (mặc định của sonner).
- **Icon-only fallback** chỉ khi không có avatar_url.

## Phần KHÔNG đổi
- Logic dedup, kiểm tra member/muted/popup-đang-mở, route `/chat`: giữ nguyên.
- Notification bell và logic gửi push: không thay đổi.
- Cách lấy sender/conv: giữ nguyên (đã đủ dữ liệu).

## Files sẽ sửa
- `src/components/chat/ChatNotificationListener.tsx` — rewrite phần render toast theo bố cục trên.
- `src/index.css` — chỉnh `.chat-message-toast` để hỗ trợ `unstyled` card (bỏ padding mặc định, giữ shadow + border-left).
- `src/lib/app-version.ts` → `1.0.74`.
- `public/changelog.json` → thêm entry 1.0.74 "Toast tin nhắn theo phong cách Messenger".

## QA checklist
- Mobile 390px: card không tràn ngang, avatar tròn rõ, line-clamp đúng 2 dòng.
- Desktop: hiển thị bottom-right, không che FAB chat.
- Chat 1-1 vs nhóm: nhóm hiện badge Users + dòng `trong "..."`; 1-1 không có.
- Bấm bất kỳ chỗ nào trên card → mở popup chat đúng conversation, toast tự đóng.
- Avatar lỗi → fallback chữ cái đầu hoạt động.
- Tin có ảnh, không body → hiện "📷 Ảnh".

## Rollback
Revert 1 file `ChatNotificationListener.tsx` + dòng CSS `.chat-message-toast` về 1.0.72.