

## Lỗi hiện tại

Trang `/auth/login` (và toàn app) không load được vì Vite báo lỗi:

```
Failed to resolve import "workbox-window" from 
"../@vite-plugin-pwa/virtual:pwa-register/react"
```

### Nguyên nhân

- `src/hooks/usePWAUpdate.ts` import `useRegisterSW` từ `virtual:pwa-register/react`.
- Module ảo này (do `vite-plugin-pwa` sinh ra) gọi `await import("workbox-window")` ở runtime để đăng ký service worker.
- `package.json` đã có `vite-plugin-pwa@^1.1.0` và các package `workbox-*` (precaching, routing, strategies, expiration, cacheable-response) — **nhưng thiếu chính `workbox-window`**.
- Vite không resolve được → ném lỗi 500 ngay khi transform → app không khởi động.

## Hướng sửa

Thêm dependency `workbox-window` (cùng major với các workbox khác — `^7.4.0`) vào `package.json`. Đây là peer dependency bắt buộc của `vite-plugin-pwa` khi dùng `useRegisterSW`/`pwa-register`.

Không cần đụng `vite.config.ts`, không cần đụng `usePWAUpdate.ts`, không migration. Sau khi cài, dev server tự reload và lỗi biến mất.

## File thay đổi

| File | Thay đổi |
|---|---|
| `package.json` (qua tool cài deps) | Thêm `"workbox-window": "^7.4.0"` vào `dependencies`. |

Không có thay đổi code. Sau khi cài xong sẽ kiểm tra lại log dev-server để xác nhận hết lỗi và app load lại bình thường ở `/auth/login`.

