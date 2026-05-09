## Mục tiêu
Đổi thương hiệu app sang **RoomQc** (đồng nhất 1 cách viết) và thay logo + favicon bằng ảnh user vừa upload (chữ R cách điệu hình cánh cửa, nền xanh navy + chấm vàng).

## Phạm vi đổi tên
Hiện codebase đang lẫn lộn 3 tên: `RoomQC`, `RoomWeave`, `Room Weave Pro`. Sẽ chuẩn hóa toàn bộ về **RoomQc** (giữ casing user yêu cầu).

Các file sẽ chỉnh:
- `index.html` — title, author, apple-mobile-web-app-title, og:title, twitter:title, favicon link
- `public/manifest.webmanifest` — `name`, `short_name`
- `vite.config.ts` — PWA `name`, `short_name`
- `src/sw.ts` — push notification title
- `src/i18n/locales/{vi,en}/common.json` — `appName`, `copyright`
- `src/pages/InstallPage.tsx`, `src/components/pwa/InstallPWA.tsx`, `src/components/pwa/InstallGuideSheet.tsx`
- `src/pages/MorePage.tsx` — footer brand
- `src/pages/settings/TelegramSettingsPage.tsx`, `src/components/settings/telegram/AutoLinkGroupDialog.tsx`
- `supabase/functions/telegram-webhook/index.ts` — các message bot
- `README.md`, `index.html` meta description nếu cần

## Logo & Favicon
1. Copy `user-uploads://Thiết_kế_chưa_có_tên.jpg` → `src/assets/logo-roomqc.png` (dùng cho UI in-app, import ES6) và `public/logo.png` (cho meta/manifest).
2. Tạo bộ icon PWA bằng ImageMagick từ logo gốc, ghi đè các file trong `public/`:
   - `favicon.ico`, `apple-touch-icon.png` (180×180)
   - `icon-72/96/128/144/152/192/384/512.png`
3. `index.html`: thay `<link rel="icon">` (đang trỏ Google Storage) bằng `/favicon.ico` + thêm `<link rel="icon" type="image/png" sizes="32x32" href="/icon-96x96.png">`.
4. Thay logo hiển thị trong app (nếu có component header dùng text "RoomWeave"/emoji) bằng `<img src={logo} />` — sẽ rà thêm ở `Layout.tsx`, `LandingNavbar.tsx`, `MorePage.tsx`.

## Bump version để PWA tự cache-bust
- `src/lib/app-version.ts`: `1.0.3` → `1.0.4`, cập nhật ngày, thêm entry `public/changelog.json`: "Đổi thương hiệu thành RoomQc + logo mới".

## Không thay đổi
- Domain `room-weave-pro.lovable.app` (chỉ Lovable mới đổi được)
- Tên repo, project ID
- Database/RLS/business logic

## Test/QA
- Build pass, không còn chuỗi `RoomWeave|Room Weave|Room Weave Pro` trong source (`rg` check).
- Mở `/install`, `/more`, landing, settings telegram — thấy "RoomQc" + logo mới.
- Manifest + favicon load đúng (Network tab).
- iOS PWA: sau bump version, CacheBuster sẽ wipe & reload.

## Files dự kiến
**Sửa:** index.html, public/manifest.webmanifest, vite.config.ts, src/sw.ts, src/lib/app-version.ts, public/changelog.json, 2 file common.json, InstallPage.tsx, InstallPWA.tsx, InstallGuideSheet.tsx, MorePage.tsx, TelegramSettingsPage.tsx, AutoLinkGroupDialog.tsx, telegram-webhook/index.ts, Layout.tsx + LandingNavbar.tsx (nếu có brand text).

**Tạo:** src/assets/logo-roomqc.png, public/logo.png, bộ icon PWA mới trong public/.

Xác nhận để mình triển khai? (Đặc biệt: tên cuối cùng là **RoomQc** — chữ "c" thường — đúng chứ, hay bạn muốn **RoomQC** viết hoa?)