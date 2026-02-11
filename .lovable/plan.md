

## Fix: 404 khi mo thong bao tren PWA mobile

### Nguyen nhan goc

Service Worker (SW) su dung `precacheAndRoute` de cache cac file tinh (JS, CSS, HTML). Tuy nhien, khi PWA mo URL `/scan-document/xxx` tu thong bao:

1. SW chan request navigation (vi da kiem soat trang)
2. SW tim trong cache file co path `/scan-document/xxx` -> khong co
3. SW gui request len server -> server cung khong co file nay (vi day la SPA, chi co `index.html`)
4. Ket qua: 404

Voi SPA (Single Page App), **tat ca** cac URL deu can duoc phan phoi file `index.html`, sau do React Router xu ly routing phia client. Can them **NavigateFallback** de SW tra ve `index.html` cho moi navigation request.

### Giai phap

Sua **1 file**: `src/sw.ts` - them catch-all navigation route tra ve `index.html` tu precache.

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/sw.ts` | Them `NavigationRoute` voi `createHandlerBoundToURL('index.html')` de moi navigation request deu duoc phan phoi `index.html`. Them `navigateFallbackDenylist` de bo qua `/~oauth` |

### Chi tiet ky thuat

Them vao `src/sw.ts` sau dong `cleanupOutdatedCaches()`:

```text
import { NavigationRoute, createHandlerBoundToURL } from 'workbox-routing';

// SPA fallback - serve index.html for all navigation requests
const navigationHandler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/~oauth/],
});
registerRoute(navigationRoute);
```

Dieu nay dam bao:
- Tat ca URL nhu `/scan-document/xxx`, `/bookings`, `/rooms` deu duoc tra ve `index.html`
- React Router se xu ly routing dung trang
- `/~oauth` duoc loai tru de khong anh huong OAuth flow
- Khong can thay doi gi o router hay component - chi can SW phan phoi dung file
