## Vấn đề hiện tại

Production vẫn trắng nhưng lỗi đã đổi. Console hiện tại:

```text
ReferenceError: Cannot access 'it' before initialization
at /assets/markdown-vendor-CArYqG8C.js:1:3689
```

HTML production đang preload `markdown-vendor` và `excel-vendor`; trong file `markdown-vendor` có import chéo sang `excel-vendor`:

```js
import { ... W as it ... } from "./vendor-CPMySoJX.js";
import { g as ut } from "./excel-vendor-B1cfgbTZ.js";
```

Đây là lỗi vòng lặp/TDZ do `manualChunks` vẫn tách các package trong hệ sinh thái markdown/unified/rehype/remark không đầy đủ. Một dependency chung bị Rollup đưa sang chunk khác (`excel-vendor`), khiến chunk markdown chạy trước khi binding được khởi tạo.

## Kế hoạch sửa

1. **Sửa `vite.config.ts`**
   - Giảm rủi ro runtime bằng cách bỏ tách `markdown-vendor` riêng.
   - Đưa toàn bộ `react-markdown`, `remark-*`, `rehype-*`, `highlight.js`, `refractor`, và các dependency unified liên quan về chunk `vendor` chung.
   - Giữ tách riêng chỉ cho các lib nặng thật sự ít liên quan React/Markdown: `excel-vendor`, `pdf-vendor`, `mermaid-vendor`, `charts-vendor`, `qr-vendor`.
   - Cập nhật `globIgnores`: bỏ ignore `markdown-vendor-*.js` vì chunk này sẽ không còn.

2. **Tăng version release**
   - Bump `src/lib/app-version.ts` lên `1.0.16`.
   - Bump `CURRENT_VERSION` trong `CacheBuster.tsx` nếu file này tồn tại, đúng theo memory release convention.
   - Thêm entry mới vào `public/changelog.json` mô tả sửa lỗi trắng trang production do tách chunk markdown/unified gây TDZ.

3. **Kiểm tra sau khi implement**
   - Không chạy build thủ công theo quy định hệ thống; harness sẽ build.
   - Sau khi publish lại, kiểm tra `https://roomqc.lovable.app/` và console production.
   - Nếu vẫn trắng do Service Worker cache shell cũ, bước tiếp theo sẽ là ship kill-switch/cache cleanup hoặc tăng cơ chế cache busting PWA.

## Files dự kiến sửa

- `vite.config.ts`
- `src/lib/app-version.ts`
- `src/components/CacheBuster.tsx` hoặc file chứa `CURRENT_VERSION` nếu có
- `public/changelog.json`

## Migration

Không có migration database.

## Test

Không thêm test unit vì đây là cấu hình bundling production. Kiểm chứng bằng build/publish và console runtime.

## Phần còn thiếu/rủi ro

- Nếu thiết bị người dùng đang bị Service Worker cũ giữ shell cũ, cần thêm bước cleanup SW sau khi bundle đã ổn.
- Nếu chunk `excel-vendor` tiếp tục kéo dependency dùng chung gây TDZ với chunk khác, phương án an toàn nhất là chỉ tách các route bằng dynamic import, còn `manualChunks` catch-all về `vendor`.