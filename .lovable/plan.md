## Chẩn đoán nguyên nhân chậm

Sau khi đọc `src/App.tsx`, `src/i18n/index.ts`, `vite.config.ts`, `MainLayout`, `RootRoute`, `package.json`, đây là các nguyên nhân chính khiến lần load đầu rất chậm:

### 1. i18n nuốt cả bundle khởi động (~250KB JSON, gzip ~60–80KB)
`src/i18n/index.ts` **eager import 40 file JSON** (vi + en × 20 namespace: rooms 20KB, inventory 20KB, laundry 18KB, superAdmin 14KB, …). Trang Landing chỉ cần namespace `landing` + `common` nhưng vẫn phải tải toàn bộ. Đây là khoản phình lớn nhất trong main chunk.

### 2. Không có `manualChunks` → vendor chunk khổng lồ
`vite.config.ts` không cấu hình `build.rollupOptions.output.manualChunks`. Các thư viện nặng đang dồn vào 1–2 chunk:
- `recharts` (~300KB), `framer-motion` (~120KB), `mermaid` (~700KB), `exceljs` (~900KB), `jspdf` + `jspdf-autotable` (~400KB), `html2canvas` (~200KB), `html5-qrcode` + `qr-scanner-wechat` (~500KB + wasm), `react-markdown` + `rehype-highlight` (~300KB).
- Khi bất kỳ route nào (kể cả lazy) import 1 lib → Rollup gom chung → các chunk lazy phình to và phải tải lại nhiều lib.

### 3. Entry eager-import quá nhiều thứ landing không cần
`App.tsx` import eager: `MainLayout`, `SuperAdminLayout`, `SuperAdminErrorBoundary`, tất cả Guards, `Toaster`, `Sonner`, `TooltipProvider`, `ThemeProvider`, `AuthProvider`, `CacheBuster`, `QueryClientProvider`. `MainLayout` lại kéo theo `HotelProvider`, `PushNotificationPrompt`, `PWAUpdatePrompt`, `FreeTrialPopup`, `AnnouncementHost`, `ShiftStatusBanner`, `GracePeriodBanner`, `SuspendedOverlay`, `ReadOnlyBanner`, `QuotaWarningBanner`, `Sidebar`, `Header`, `MobileHeader`, `MobileBottomNav`. → Khách vãng lai vào `/` (Landing) phải parse hàng trăm KB JS không dùng tới.

### 4. PWA service worker đang prompt → request 1 vòng `changelog.json` + version check
`CacheBuster` chạy cleanup SW ngay trên mọi load (preview hoặc prod mismatch). Trong production thật, khi version match thì OK; nhưng việc đăng ký SW + check vẫn block hydration của các effect khác.

### 5. Một số chi tiết nhỏ
- `docs-loader.ts` dùng `import.meta.glob('/docs/architecture/**/*.md', { eager: true })` (854KB markdown). May mắn nó nằm trong chunk lazy của `/docs` nên không ảnh hưởng landing — nhưng khi mở `/docs` thì cực nặng.
- Không có `<link rel="preconnect">` tới Supabase trong `index.html` → request auth/session đầu tiên tốn thêm DNS+TLS.
- 80 route `lazy()` nhưng nhiều route nhỏ → quá nhiều HTTP request chunk khi điều hướng (HTTP/2 vẫn nên gom).

---

## Phương án tối ưu (ưu tiên ROI cao → thấp)

### A. Lazy hóa i18n theo namespace (giảm ~60–80KB gzip khỏi entry)
- Bỏ `import` 40 JSON ở `src/i18n/index.ts`, dùng backend `i18next-resources-to-backend` hoặc `import.meta.glob('./locales/**/*.json')` không eager.
- Init i18n chỉ với `ns: ['common']`, `partialBundledLanguages: true`. Page nào cần thêm sẽ `useTranslation('rooms')` → tự lazy fetch.
- Landing chỉ load `vi/landing.json` + `vi/common.json` (≈ 8KB).

### B. Cấu hình `manualChunks` trong `vite.config.ts`
Tách rõ vendor để các route lazy không kéo theo lib nặng:
```text
react-vendor:    react, react-dom, react-router-dom
ui-vendor:       @radix-ui/*, lucide-react, cmdk, sonner
data-vendor:     @tanstack/react-query, @tanstack/react-table, @supabase/supabase-js
chart-vendor:    recharts
motion-vendor:   framer-motion
pdf-vendor:      jspdf, jspdf-autotable, html2canvas
excel-vendor:    exceljs, file-saver
qr-vendor:       html5-qrcode, qr-scanner-wechat, qr-code-styling, qrcode.react
markdown-vendor: react-markdown, rehype-*, remark-*, mermaid
```
→ Landing/Auth chỉ cần `react-vendor + ui-vendor (subset)`.

### C. Tách nhánh "anonymous landing" khỏi cây Provider lớn
- Trong `App.tsx`: tạo router con: nếu route là `/landing`, `/`, `/auth/*`, `/pay/:ref`, `/scan/document`, `/install`, `/offline` → render layout tối giản (chỉ `ThemeProvider + QueryClientProvider + Toaster`), KHÔNG render `MainLayout`/`HotelProvider`/PWA prompts.
- Hoặc đơn giản hơn: **lazy hoá `MainLayout` và `SuperAdminLayout`** (đổi `import` sang `lazy()`) để chúng chỉ tải khi user đã đăng nhập.
- Lazy hoá luôn `PushNotificationPrompt`, `PWAUpdatePrompt`, `FreeTrialPopup`, `AnnouncementHost`, `CacheBuster` (load sau idle bằng `requestIdleCallback`).

### D. Preconnect + preload tài nguyên quan trọng
Trong `index.html` thêm:
```html
<link rel="preconnect" href="https://ehjtoajnlnuvuiwkpmbp.supabase.co" crossorigin>
<link rel="dns-prefetch" href="https://ehjtoajnlnuvuiwkpmbp.supabase.co">
<link rel="preload" as="image" href="/src/assets/logo-roomqc.png">
```
Giảm 100–300ms cho request Supabase đầu tiên.

### E. Tối ưu Landing page
- `HeroSection` dùng `framer-motion` cho 4–5 element. Cân nhắc thay bằng CSS `@keyframes` (loại bỏ ~120KB framer-motion khỏi landing chunk) hoặc dùng `LazyMotion` + `domAnimation` (giảm ~70%).
- Ảnh: ép định dạng WebP + `loading="lazy"` cho mọi ảnh dưới fold.
- Inline critical CSS đã có sẵn qua Tailwind, OK.

### F. React Query defaults
Set `staleTime: 60_000`, `refetchOnWindowFocus: false` global → giảm số request lặp khi chuyển tab.

### G. CacheBuster chạy sau idle
Bọc effect trong `requestIdleCallback(() => …, { timeout: 2000 })` để không cạnh tranh CPU lúc render đầu.

### H. (Tuỳ chọn) Bật `build.cssCodeSplit: true` + `target: 'es2020'`
Giảm polyfill, tách CSS theo route.

---

## Kết quả kỳ vọng (Landing trên 4G mid-tier)
| Chỉ số | Hiện tại (ước) | Sau tối ưu |
|---|---|---|
| JS transferred (entry) | ~600–800 KB | **~150–220 KB** |
| Time to Interactive | ~4–6s | **~1.2–1.8s** |
| LCP | ~3–4s | **~1.5s** |

---

## Phạm vi triển khai (file dự kiến đụng vào)
1. `src/i18n/index.ts` — refactor sang lazy backend.
2. `vite.config.ts` — thêm `build.rollupOptions.output.manualChunks`, `cssCodeSplit`.
3. `src/App.tsx` — `lazy()` cho `MainLayout`, `SuperAdminLayout`, defer các prompts.
4. `src/components/layout/MainLayout.tsx` — lazy `PushNotificationPrompt`, `PWAUpdatePrompt`, `FreeTrialPopup`, `AnnouncementHost`.
5. `src/components/pwa/CacheBuster.tsx` — wrap `requestIdleCallback`.
6. `index.html` — preconnect Supabase.
7. `src/components/landing/HeroSection.tsx` — `LazyMotion` thay `motion`.
8. (Optional) `src/main.tsx` hoặc `App.tsx` — set React Query defaults.

## Rủi ro & Rollout
- **i18n lazy**: cần test mọi page render đúng (có loading flash ngắn). Mitigate bằng `Suspense` + cache + preload namespace cho route hiện tại.
- **manualChunks**: có thể đổi tên file → invalidate cache cũ; OK vì `CacheBuster` đã có.
- **Lazy MainLayout**: thêm 1 nhịp `Suspense` khi vào dashboard lần đầu — chấp nhận được vì đó là sau login.
- Mỗi thay đổi đi kèm bump `APP_VERSION` + `CURRENT_VERSION` + entry `changelog.json` theo convention.

## Đề xuất thứ tự thực thi (mỗi bước đo lại)
1. **Bước 1 (impact lớn nhất, ít rủi ro)**: B + D + G + lazy MainLayout/SuperAdminLayout.
2. **Bước 2**: A — lazy i18n namespace.
3. **Bước 3**: E + F — landing motion + RQ defaults.
4. (Khi rảnh) tách thêm route `/docs` để chỉ load markdown khi cần.

Bạn muốn tôi triển khai cả 3 bước hay chỉ Bước 1 trước (an toàn nhất, đã đủ giảm 50–60% TTI)?
