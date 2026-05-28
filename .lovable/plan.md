## Vấn đề

Khi mở PWA trên iPhone (chế độ standalone, đã "Add to Home Screen"), vuốt quá đầu hoặc cuối trang xuất hiện **khoảng trắng lớn** lệch hẳn với nền tối của app (xem ảnh). Có 2 nguyên nhân kết hợp:

1. `<meta name="theme-color" content="#ffffff">` đang là trắng → status bar + vùng overscroll iOS tô trắng, dù app đang ở dark mode (nền `#0f172a`).
2. Element `<html>` không có `background-color`, nên khi rubber-band lộ ra phần phía sau `<body>` thì hiện màu trắng mặc định của UA. CSS hiện tại chỉ set `bg-background` cho `body`, không cho `html`.
3. Body không phải `min-height: 100dvh` với background kế thừa → vùng dưới khi nội dung ngắn cũng trắng.

## Giải pháp (chỉ CSS + meta, không đụng logic)

### A. `index.html`
- Đổi `theme-color` thành 2 thẻ media để khớp light/dark:
  - `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">`
  - `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a">` (giá trị HSL của `--background` dark mode quy đổi sang hex).
- Đổi `apple-mobile-web-app-status-bar-style` từ `default` → `black-translucent` để status bar không vẽ dải trắng và để app vẽ tận mép trên (đã có `viewport-fit=cover` + `safe-area-top`).

### B. `src/index.css`
Thêm trong `@layer base`:

```css
html {
  background-color: hsl(var(--background));
  color-scheme: light dark;
}

/* Đảm bảo body luôn phủ kín viewport để overscroll lộ đúng màu nền */
html, body, #root {
  min-height: 100dvh;
  background-color: hsl(var(--background));
}

/* iOS PWA standalone: chặn rubber-band ở scroll cha, chỉ cho phép scroll trong các vùng nội dung */
@media (max-width: 768px) {
  html, body {
    overscroll-behavior: none; /* mạnh hơn `contain` đang có */
  }
}
```

Giữ nguyên các utility scroll hiện tại (`.scrollable-area`, `-webkit-overflow-scrolling: touch`) để bên trong các list vẫn momentum scroll bình thường.

### C. Version bump
- `src/lib/app-version.ts` → `1.0.79`
- `src/components/CacheBuster.tsx` → `CURRENT_VERSION = '1.0.79'`
- Thêm entry trong `public/changelog.json`: "Sửa khoảng trắng khi vuốt quá đầu/cuối trên PWA iOS, đồng bộ màu status bar với theme tối."

## Phạm vi không thay đổi
- Không sửa logic JS, không đụng React tree, không đổi behavior scroll bên trong các container.
- Không ảnh hưởng desktop (rule chỉ áp dụng ≤768px hoặc thuộc tính an toàn cho cả 2).

## QA checklist
- iPhone Safari (chưa add to home): vuốt overscroll → vùng bounce có màu nền dark, không trắng.
- iPhone PWA (Add to Home Screen, mở từ icon): status bar khớp màu nền, vuốt trên/dưới không lộ trắng.
- Android Chrome PWA: theme-color bar khớp nền.
- Light mode (nếu user đổi): theme-color trắng vẫn đúng.
- Trang dài có scroll: scroll trong content vẫn mượt, không bị "stuck".
- BottomSheet / Dialog không bị lệch safe-area.

## Rollback
Revert 3 file: `index.html`, `src/index.css`, version bump. Không có migration DB.

## File sẽ sửa
- `index.html`
- `src/index.css`
- `src/lib/app-version.ts`
- `src/components/CacheBuster.tsx`
- `public/changelog.json`
