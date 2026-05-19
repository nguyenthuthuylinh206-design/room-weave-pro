## Đánh giá: Còn cải thiện gì sau 1.0.18?

Sau khi rà soát `vite.config.ts`, `App.tsx`, `index.html`, `i18n/index.ts`, `route-prefetch.ts` và `MainLayout.tsx`, dưới đây là các điểm còn có thể cải thiện. Tôi chia thành 3 nhóm theo ROI và rủi ro.

### Nhóm 1 — Nên làm (ROI cao, rủi ro thấp)

1. **`<html lang="en">` → `<html lang="vi">`** trong `index.html`. App đã khoá 100% tiếng Việt nhưng thẻ HTML vẫn khai báo `en`, ảnh hưởng SEO + accessibility (screen reader đọc giọng Anh).
2. **Thêm `<link rel="modulepreload">` cho `MainLayout` + `Dashboard`** trong `index.html`. Hiện `MainLayout` được `lazy()` (do tách shell cho landing), nên user đã đăng nhập phải chờ thêm 1 round-trip để tải shell trước khi thấy Dashboard. Preload sẽ song song hoá việc này với `main.tsx`.
3. **Giảm `EAGER_KEYS` i18n** — đang eager 11 namespace (~80–120KB). Các namespace `hotels`, `landing` ít dùng ở flow chính có thể chuyển lại lazy. Giữ `common`, `auth`, `navigation`, `dashboard`, `rooms`, `inventory`, `bookings`, `settings`, `notifications`.
4. **Bổ sung `bookings` namespace vào eager** (đang quên — kế hoạch ghi nhưng chưa thêm). Khi vào trang `/bookings` vẫn nháy key code.
5. **Service worker `runtimeCaching` cho i18n JSON** — namespace lazy hiện không được SW cache, mỗi lần PWA cold start lại fetch. Thêm `StaleWhileRevalidate` cho `/locales/vi/*.json`.

### Nhóm 2 — Cân nhắc (ROI vừa, có rủi ro)

6. **Bật React Query `placeholderData: keepPreviousData`** ở các hook list page (rooms, bookings, inventory). Khi đổi filter / điều hướng, UI không bị flash skeleton.
7. **Prefetch dữ liệu React Query khi `onPointerDown`** (không chỉ chunk JS). Hiện chỉ prefetch chunk; user vẫn chờ 200–500ms query. Có thể thêm `queryClient.prefetchQuery` cho 3 trang phổ biến nhất.
8. **`MainLayout` đang lazy** → bỏ lazy cho user đã login (giữ lazy cho path public). Hoặc đơn giản nhất: dùng `modulePreload` (mục 2).

### Nhóm 3 — Không nên làm bây giờ

- Tách lại `manualChunks` (mermaid/xlsx/jspdf) — đã từng gây TDZ ở 1.0.15/1.0.16, comment trong vite.config cảnh báo rõ. Bỏ qua.
- Bật React Router `unstable_viewTransition` — Safari cũ buggy.
- Refactor query keys toàn bộ — phạm vi quá lớn.

### Kế hoạch triển khai (nếu duyệt Nhóm 1)

**File sửa:**
- `index.html` — đổi `lang="vi"`, thêm `modulepreload` cho `MainLayout` + `Dashboard`.
- `src/i18n/index.ts` — bỏ `hotels`, `landing` khỏi EAGER; thêm `bookings`.
- `vite.config.ts` — thêm `runtimeCaching` rule cho `locales/vi/*.json` trong `injectManifest` (hoặc trong `sw.ts` nếu dùng custom SW).
- `src/sw.ts` — thêm route caching cho i18n JSON nếu đang dùng custom strategy.
- `src/lib/app-version.ts` → `1.0.19`.
- `public/changelog.json` → entry "Tinh chỉnh ngôn ngữ HTML, preload shell, cache i18n".

**Không thay đổi:** DB, RPC, permission, UI screens.

**Test:**
- Lighthouse: lang attribute pass, không còn warning "page-has-no-lang".
- Network: vào Dashboard sau login chỉ tải 1 lần `MainLayout` chunk song song với main.
- Offline: reload trang `/bookings` ở chế độ máy bay — không còn flash key code.

### Câu hỏi cho bạn

Bạn muốn tôi:
- **(a)** Làm hết Nhóm 1 (5 mục, ~10 phút, rủi ro thấp)?
- **(b)** Làm Nhóm 1 + Nhóm 2 (8 mục, có refactor hook React Query)?
- **(c)** Chỉ làm các mục cụ thể bạn chọn?
