## Vấn đề

Sau publish, trang trắng. Console production:

```
TypeError: Cannot read properties of undefined (reading 'forwardRef')
  at radix-vendor-BsELkO4s.js
```

Đây là lỗi do `manualChunks` trong `vite.config.ts` (vừa thêm gần đây) tách:
- `react`, `react-dom`, `scheduler` → `react-vendor`
- `@radix-ui/*` → `radix-vendor`
- `framer-motion`, `react-hook-form`, `@tanstack/*` → các vendor riêng

Radix UI dùng `import * as React from 'react'` và truy cập `React.forwardRef`. Khi React bị tách sang chunk khác, namespace import bị resolve sai (undefined) ở runtime của Radix → crash trước khi React render → màn hình trắng.

Lỗi này KHÔNG xuất hiện ở dev vì Vite dev không bundle/manualChunks.

## Cách sửa (frontend-only, chỉ `vite.config.ts`)

Gộp **tất cả thư viện phụ thuộc trực tiếp vào React** vào CÙNG chunk với React, để namespace import luôn resolve đúng. Chỉ giữ tách chunk cho các lib **lazy-load** thật sự (PDF, Excel, Mermaid, Charts, QR, Markdown) — vốn là mục tiêu ban đầu để giảm initial bundle.

### Sửa `manualChunks` trong `vite.config.ts`

Chunk strategy mới:

| Chunk | Nội dung | Lý do |
|---|---|---|
| `react-core` | react, react-dom, scheduler, react-router, **@radix-ui/***, framer-motion, react-hook-form, @tanstack/*, lucide-react, i18next, react-i18next, date-fns, react-day-picker, zod, @supabase/* | Tất cả phụ thuộc React → cùng chunk → tránh lỗi forwardRef undefined |
| `excel-vendor` | exceljs | Lazy (export Excel) |
| `pdf-vendor` | jspdf, html2canvas | Lazy (in PDF) |
| `mermaid-vendor` | mermaid | Lazy (docs page) |
| `charts-vendor` | recharts, d3-* | Lazy (reports) |
| `qr-vendor` | html5-qrcode, qr-scanner-wechat, qr-code-styling, qrcode.react | Lazy (scan/QR) |
| `markdown-vendor` | react-markdown, rehype-*, remark-*, highlight.js, refractor | Lazy (docs/help) |
| `vendor` | mọi npm dep còn lại | Catch-all |

Lưu ý: react-core sẽ to hơn (~1.5–2 MB) nhưng vẫn dưới giới hạn precache 3 MB đã set, KHÔNG cần bỏ precache. Initial bundle vẫn nhỏ hơn nhiều so với trước khi tách (vì 6 chunk lazy đã tách ra).

### `globIgnores`

Giữ nguyên ignore cho 6 chunk lazy nặng (qr, pdf, excel, mermaid, charts, markdown) trong PWA precache. `react-core` và `vendor` vẫn được precache để PWA hoạt động offline.

### Bump version

- `src/lib/app-version.ts`: `1.0.14` → `1.0.15`
- `public/changelog.json`: thêm entry mô tả "Sửa lỗi màn hình trắng sau publish do tách chunk React/Radix sai"

## Rollout

1. Sửa `vite.config.ts` (chỉ phần `manualChunks`).
2. Bump version + changelog.
3. User publish lại → build chạy, không còn cảnh báo precache size, runtime không còn lỗi forwardRef.
4. Verify bằng cách mở `https://roomqc.lovable.app/` sau publish, kiểm tra console.

## Files sẽ sửa

- `vite.config.ts` (manualChunks)
- `src/lib/app-version.ts`
- `public/changelog.json`

## Rủi ro

- Initial chunk `react-core` to hơn (~+800KB so với react-vendor cũ) nhưng được gzip + cached vĩnh viễn theo hash. Trade-off chấp nhận để app load được.
- Nếu vẫn còn lỗi tương tự với lib khác (ví dụ `@hookform/resolvers`), bổ sung vào `react-core`.
