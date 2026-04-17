

## Sửa scroll lag/stuck trên PWA standalone (iOS + Android)

### Khảo sát đã làm
- `index.html`: viewport `width=device-width, initial-scale=1.0` — **thiếu `viewport-fit=cover`**
- `src/index.css`: 
  - Có `-webkit-overflow-scrolling: touch` cho `*` mobile (OK)
  - Có `overscroll-behavior: contain` cho `html, body` mobile (OK)
  - **`html, body { overflow-x: hidden; max-width: 100vw }`** — `100vw` gây lỗi trên iOS, cần `100%`
  - **`* { max-width: 100% }`** — quy tắc quá rộng, có thể chặn scroll container con; đã có exception nhưng vẫn rủi ro
  - `touch-action: manipulation` set trên `body` — ổn nhưng không cần thiết, có thể bỏ
  - Có safe-area utility class nhưng **layout gốc không áp dụng**
- `MainLayout.tsx` (mobile): `min-h-screen` + `overflow-y-auto` lồng nhau — `100vh` trên iOS standalone gây jump
- `MobileLayout.tsx`: `min-h-screen` — tương tự
- `MobileBottomNav` fixed bottom + `pb-16/pb-20` trên main — OK nhưng chưa cộng safe-area-bottom
- Không thấy `vite-plugin-pwa` / service worker trong project — chỉ có `manifest.webmanifest` thuần (không gây vấn đề)

### Phương án sửa (an toàn, chỉ CSS + layout, không đụng logic/data)

**1. `index.html`** — bật safe area
- Đổi viewport: `width=device-width, initial-scale=1.0, viewport-fit=cover`

**2. `src/index.css`** — sửa core scroll
- `html, body`: bỏ `max-width: 100vw` (đổi sang `100%`), giữ `overflow-x: hidden`, **bỏ `touch-action: manipulation` trên body** (giữ trên button/link cụ thể nếu cần)
- **Bỏ `* { max-width: 100% }`** — quá rủi ro, không cần thiết khi đã có `overflow-x: hidden` ở root
- Thêm utility `.h-dvh` / `.min-h-dvh` (dùng `100dvh`) để layout dùng thay `h-screen` / `min-h-screen` ở mobile
- Thêm `overscroll-behavior-y: contain` cho `body` (đã có ở `.scrollable-area`, mở rộng)
- Đảm bảo mọi `.overflow-y-auto`, `.overflow-auto` mặc định có `-webkit-overflow-scrolling: touch` (thêm rule global)
- Safe-area helper cho bottom nav: `.pb-safe { padding-bottom: calc(4rem + env(safe-area-inset-bottom)) }`

**3. `src/components/layout/MainLayout.tsx`** (nhánh mobile)
- Đổi `min-h-screen` → `min-h-dvh` (hoặc inline `style={{ minHeight: '100dvh' }}`)
- Wrapper ngoài cùng: thêm `style={{ paddingTop: 'env(safe-area-inset-top)' }}` cho header area
- `<main>` mobile: dùng `pb-safe` thay `pb-16` để cộng safe-area-bottom

**4. `src/components/layout/MobileLayout.tsx`**
- Đổi `min-h-screen` → `min-h-dvh`
- `<main className="pb-20">` → `pb-safe-20` (custom: `calc(5rem + env(safe-area-inset-bottom))`)

**5. `src/components/layout/MobileBottomNav.tsx`** (kiểm tra, sửa nếu cần)
- Bottom nav fixed: thêm `padding-bottom: env(safe-area-inset-bottom)` để không bị che bởi home indicator iOS

**6. `public/manifest.webmanifest`** (kiểm tra)
- Xác nhận `"display": "standalone"` — nếu chưa có thì thêm

### KHÔNG đụng
- Logic JS, hooks, state, data
- Service worker (project không có vite-plugin-pwa, OK)
- Routing, components nghiệp vụ
- `touch-action` ở các element specific (canvas, swiper, scanner) — giữ nguyên
- Không thêm `vite-plugin-pwa` (theo guideline Lovable, gây vấn đề trong preview iframe)

### Phạm vi file thay đổi
| File | Thay đổi |
|---|---|
| `index.html` | Thêm `viewport-fit=cover` |
| `src/index.css` | Bỏ `max-width:100vw` & `* max-width:100%`, bỏ `touch-action` trên body, thêm utility `min-h-dvh` / `pb-safe` / global momentum scroll |
| `src/components/layout/MainLayout.tsx` | `min-h-screen` → `min-h-dvh`, safe-area top, `pb-safe` cho main mobile |
| `src/components/layout/MobileLayout.tsx` | `min-h-screen` → `min-h-dvh`, padding bottom safe-area |
| `src/components/layout/MobileBottomNav.tsx` | Thêm `padding-bottom: env(safe-area-inset-bottom)` |
| `public/manifest.webmanifest` | Verify `display: standalone` (chỉ kiểm tra) |

### Kết quả mong đợi
- iOS Safari PWA standalone: không còn jump khi address bar ẩn/hiện (dvh)
- Momentum scroll mượt trên iOS (đã có, củng cố thêm)
- Không còn rubber-band kẹt ở edge (overscroll contain)
- Không bị home indicator che bottom nav (safe-area)
- Không có rủi ro chặn scroll do `max-width: 100vw` hoặc `* max-width: 100%`

