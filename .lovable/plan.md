## Vấn đề

Trên `roomqc.com` (PWA, iOS) màn hình hiện ra mặc định trắng-trên-đen của React Router:
> "Unexpected Application Error! l.map is not a function"

Stack trỏ vào `PricingSection` trên bundle cũ `vendor-B-ZsE4...`. Tức là PWA của khách đang chạy **bundle cũ** mà ở phiên bản đó `t('pricing.*.features', { returnObjects: true })` trả về không phải array (i18n cache lệch giữa các locale), gây `.map` trên `undefined`. Phiên bản code hiện tại đã có `Array.isArray` guard, nhưng người dùng vẫn chết app vì:

1. **Không có errorElement** cho các route public quan trọng (`/landing`, `/auth/*`, `/payment-qr/*`, `/i/*`, `/scan-document/*`, `/onboarding`, `/docs`) → React Router rơi về fallback xấu xí, không có nút thoát, không xoá được cache PWA.
2. **Một component nhỏ lỗi → cả trang chết**: không có ErrorBoundary cấp section trên Landing Page.
3. **PWA cache bám lâu**: khi bundle JS lỗi runtime (không phải chunk-load), `chunk-reload` không kích hoạt → người dùng kẹt mãi với bản cũ.

## Mục tiêu

Khi bất kỳ chỗ nào trên app (đặc biệt landing/auth – chỗ khách hàng đầu tiên nhìn thấy) ném lỗi runtime:
- **Không bao giờ** hiện màn "Unexpected Application Error!" mặc định.
- Luôn có **CTA tiếng Việt** rõ ràng: "Tải lại" và "Xoá cache & tải lại" (purge SW + caches).
- Một section lỗi (ví dụ Pricing) **không làm chết toàn trang** — chỉ section đó bị thay bằng placeholder gọn, các section khác vẫn dùng được.

## Phạm vi sửa

### 1. `src/App.tsx` — gắn `errorElement` cho mọi route public
Thêm `errorElement: <RouteErrorBoundary />` vào:
- `/landing`
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/change-password`, `/auth/callback`
- `/unauthorized`
- `/payment-qr/:paymentId`
- `/i/:token`
- `/scan-document/:sessionId`
- `/onboarding`
- `/docs` (đã không có)

### 2. `src/components/RouteErrorBoundary.tsx` — thêm hard-reset CTA
Trong nhánh "Lỗi render khác" (không phải chunk, không phải RouteResponse) bổ sung:
- Thông điệp ngắn: "Ứng dụng gặp lỗi tạm thời".
- Nút **"Tải lại"** (`location.reload()`).
- Nút **"Xoá cache & tải lại"** → gọi `purgeCachesAndReload()` (đã có sẵn, dọn `caches`, unregister SW, cache-bust URL). Đây là "phao cứu sinh" cho khách PWA bị kẹt bundle cũ.
- Log `console.error(error)` để debug trên Server Logs nếu có.

### 3. `src/components/SectionErrorBoundary.tsx` — mới
ErrorBoundary class component nhẹ, nhận `fallback` (mặc định `null` để section lỗi "biến mất" thay vì chết trang). Dùng để bọc từng section trên `LandingPage`:
```tsx
<SectionErrorBoundary name="pricing"><PricingSection /></SectionErrorBoundary>
<SectionErrorBoundary name="features"><FeaturesSection /></SectionErrorBoundary>
... (Hero, Testimonials, FAQ, CTA, Footer)
```
Component log lỗi ra console kèm tên section, không phá UX.

### 4. `src/pages/LandingPage.tsx` — bọc từng section
Bọc tất cả các section bằng `SectionErrorBoundary`. Hero giữ nguyên không bọc (luôn ổn) để vẫn có nội dung hiển thị.

### 5. Bump version + changelog
- `src/lib/app-version.ts` → `1.0.61`
- `public/changelog.json` entry mới: "Chống crash toàn trang khi 1 section lỗi (PWA stale bundle)"

## Không động tới

- Không thêm `vite-plugin-pwa` mới, không đổi service worker (project hiện không dùng SW thật).
- Không sửa i18n keys (vấn đề gốc đã được fix bằng `Array.isArray` từ bản trước; phần này chỉ là **lớp phòng thủ** cho khách PWA bị kẹt bản cũ).
- Không migration, không RPC.

## QA checklist

- Mở `/landing` (chưa đăng nhập), giả lập throw trong `PricingSection` (`throw new Error('x')`) → các section khác vẫn hiển thị, không thấy màn "Unexpected Application Error".
- Vào `/auth/login` rồi force throw → thấy màn RouteErrorBoundary tiếng Việt + 2 nút Tải lại / Xoá cache.
- Bấm "Xoá cache & tải lại" trên iOS PWA → app reload và lấy bundle mới (kiểm bằng `APP_VERSION` trong console).
- Vẫn chạy được `/payment-qr/:id` và `/i/:token` khi auth chưa load.

## File sẽ tạo/sửa

- **tạo**: `src/components/SectionErrorBoundary.tsx`
- **sửa**: `src/App.tsx`, `src/components/RouteErrorBoundary.tsx`, `src/pages/LandingPage.tsx`, `src/lib/app-version.ts`, `public/changelog.json`
