

## Fix: Thong bao chi mo trang chu thay vi trang camera

### Nguyen nhan goc

Trong `DocumentScanner.tsx`, khi gui push notification, truong URL duoc gui la `url`:

```text
body: {
  url: '/scan-document/xxx',   // <-- Sai ten truong
}
```

Nhung edge function `send-push-notification` chi doc truong `action_url` (dong 408):

```text
url: payload.action_url || '/'   // <-- action_url = undefined -> fallback ve '/'
```

Ket qua: notification luon chua URL = `/`, nen khi an vao se mo trang chu.

### Giai phap

Chi can sua **1 dong** trong `DocumentScanner.tsx`: doi `url` thanh `action_url`.

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/components/bookings/DocumentScanner.tsx` | Doi `url:` thanh `action_url:` trong body gui push notification |

### Chi tiet

```text
// Truoc (SAI)
url: `/scan-document/${data.id}`,

// Sau (DUNG)
action_url: `/scan-document/${data.id}`,
```

Khong can thay doi gi khac - edge function va service worker da xu ly dung san.

