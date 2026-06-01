## Mục tiêu
Trong `ChatPopupWindow`, phân biệt hành vi nút gọi giữa desktop và mobile:
- **Desktop**: chỉ gọi qua Telegram. Nút chỉ hiển thị khi peer có `telegram_username`. Không bao giờ fallback sang `tel:`.
- **Mobile**: cho phép chọn giữa Telegram và số điện thoại khi có cả hai. Nếu chỉ có một, render link trực tiếp.

## Thay đổi (1 file)
`src/components/chat/ChatPopupWindow.tsx`

### Logic
Thay biến `callUrl` chung bằng 2 biến rõ ràng:
```ts
const tgUrl = conv?.peer?.telegram_username ? `https://t.me/${conv.peer.telegram_username}` : null
const telUrl = conv?.peer?.phone ? `tel:${conv.peer.phone}` : null
```

### Desktop (header popup)
- Chỉ render nút `<a>` Phone khi `tgUrl` tồn tại, href = `tgUrl`, `target="_blank"`.
- aria-label/title: "Gọi qua Telegram".

### Mobile (header full-screen)
- Nếu `tgUrl && telUrl`: render `DropdownMenu` với trigger là nút Phone (h-10 w-10), 2 `DropdownMenuItem`:
  - "Gọi qua Telegram" → `window.open(tgUrl, '_blank', 'noopener')`
  - "Gọi số điện thoại" → `window.location.href = telUrl`
- Nếu chỉ `tgUrl`: render `<a href={tgUrl} target="_blank">` như hiện tại.
- Nếu chỉ `telUrl`: render `<a href={telUrl}>` (không `target`), label "Gọi số điện thoại".
- Nếu không có gì: ẩn nút.

### Import bổ sung
`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` từ `@/components/ui/dropdown-menu`.

## Không đụng tới
- `useChat.ts` (peer đã có `phone` + `telegram_username`).
- Logic chat / DB / hook khác.

## QA
- Desktop: peer chỉ có phone → không có nút. Peer có telegram → click mở t.me/...
- Mobile: peer có cả hai → bấm Phone hiện menu 2 lựa chọn. Peer chỉ phone → bấm mở dialer. Peer chỉ telegram → mở Telegram.
