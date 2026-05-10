## Mục tiêu

Thêm route `/docs` trong app để duyệt và đọc toàn bộ ~50 file Markdown trong `docs/architecture/` (kèm Mermaid diagrams), trực tiếp từ trình duyệt. Không cần tải file về máy.

---

## UX

Layout 2 cột (desktop) / drawer (mobile):

```text
┌─────────────────────────────────────────────────────┐
│ DOCS  [search...]                          [print]  │
├──────────────┬──────────────────────────────────────┤
│ 00 Context   │  # Tiêu đề trang                     │
│ 01 Modules   │                                      │
│  ├ bookings  │  Markdown render + Mermaid SVG       │
│  ├ rooms     │  - Heading anchors                   │
│  └ ...       │  - Code highlight                    │
│ 02 Data      │  - Table                             │
│ 03 Flows     │  - Mermaid (zoom/pan)                │
│ ...          │                                      │
└──────────────┴──────────────────────────────────────┘
```

- **Sidebar tree**: nhóm theo thư mục (00-context, 01-modules, ...), thu/mở.
- **Search**: lọc tên file + heading (client-side).
- **TOC bên phải** (desktop ≥1280px): danh sách H2/H3 trong trang.
- **Breadcrumb**: `Docs / 01-modules / bookings`.
- **Permalink anchor** cho heading.
- **Dark/light** theo theme app.
- **Quyền truy cập**: chỉ Super Admin (tài liệu nội bộ kỹ thuật).

---

## Cách phục vụ file Markdown

`docs/architecture/` nằm ngoài `public/`, Vite không serve trực tiếp. Hai phương án:


| Phương án                                  | Ưu                                                           | Nhược                                                         |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| **A. import.meta.glob** (chọn)             | Build-time, không cần copy, type-safe, hot-reload khi sửa md | Bundle vào JS (~vài trăm KB nén — chấp nhận được cho 50 file) |
| B. Copy `docs/` → `public/docs/` rồi fetch | Lazy load từng file                                          | Cần script đồng bộ, dễ lệch                                   |


→ Dùng **A**: `import.meta.glob('/docs/architecture/**/*.md', { query: '?raw', import: 'default', eager: false })` và lazy-load từng file khi click.

Cần thêm `docs/` vào `vite.config.ts` `server.fs.allow` (mặc định Vite cho phép root project).

---

## Kiến trúc kỹ thuật

### Files mới

```text
src/pages/docs/
  DocsLayout.tsx          # 2-col layout + sidebar + breadcrumb
  DocsViewer.tsx          # Render markdown + mermaid
  DocsIndex.tsx           # Trang /docs (README.md)
  components/
    DocsSidebar.tsx       # Tree navigation
    DocsSearch.tsx        # Command palette style search
    MarkdownRenderer.tsx  # react-markdown + remark-gfm + rehype
    MermaidBlock.tsx      # Render code block lang=mermaid → SVG
    DocsTOC.tsx           # Right-side heading TOC
  lib/
    docs-loader.ts        # import.meta.glob + slug parser
    docs-tree.ts          # Build folder tree từ paths
    headings.ts           # Extract H1/H2/H3 cho TOC + search
```

### Routes (thêm vào `src/App.tsx`)

```text
/docs                    → DocsIndex (README.md)
/docs/*                  → DocsViewer (path = file relative)
```

Bọc `<PermissionRoute module="settings">` (hoặc tạo guard riêng `<RoleGuard roles={['owner','super_admin']}>`).

### Dependencies cần cài

- `react-markdown` — render markdown
- `remark-gfm` — table, task list, strikethrough
- `rehype-slug` + `rehype-autolink-headings` — anchor heading
- `rehype-highlight` — code highlight (đã có `highlight.js`?)
- `mermaid` — render diagram

(Kiểm tra `package.json` trước khi cài để tránh trùng.)

### Mermaid render

`MermaidBlock`: nhận `code: string`, gọi `mermaid.render(id, code)` trả SVG inject `dangerouslySetInnerHTML`. Theme: `mermaid.initialize({ theme: isDark ? 'dark' : 'default' })`. Lazy import `mermaid` để không nặng bundle khi user không xem docs.

### Search

Index client: parse mọi md tại load đầu → `[{ path, title, headings[] }]`. Dùng `cmdk` (đã có shadcn `command`) để hiện palette `Cmd+K`.

---

## Phạm vi

**Có**:

- Route `/docs` + sidebar + viewer + Mermaid + search + TOC + quyền truy cập.
- Hot-reload khi chỉnh `.md` trong `docs/architecture/`.
- Print-friendly CSS (ẩn sidebar khi `@media print`).

**Không**:

- Edit markdown trong UI.
- Export PDF/ZIP (đã loại trong câu hỏi trước).
- Versioning / Git history.
- I18n cho UI viewer (chỉ tiếng Việt).

---

## Test cases

1. Mở `/docs` → hiển thị README.md với sidebar đầy đủ 10 nhóm thư mục.
2. Click `01-modules/bookings.md` → URL đổi thành `/docs/01-modules/bookings`, render đúng nội dung.
3. File chứa Mermaid (`05-state-machines/room-status.md`) → diagram render thành SVG, không lỗi lexer.
4. `Cmd+K` → search "permission" → list các file chứa keyword, click → mở đúng file + scroll heading.
5. Refresh ở `/docs/03-flows/payment-vietqr-sepay` → vẫn render đúng (SPA fallback).
6. Login bằng staff → `/docs` → redirect Unauthorized.
7. Theme toggle dark/light → Mermaid + code highlight đổi theme.
8. Mobile viewport → sidebar thành drawer, hamburger mở.

---

## Rollout

1. Cài deps + tạo `docs-loader.ts` + skeleton route.
2. MarkdownRenderer + MermaidBlock + sidebar tree.
3. Search + TOC + quyền truy cập + print CSS.
4. QA 8 test cases.

Ước lượng: **1 build chính**.

---

## Rủi ro

- **Bundle size**: 50 file MD ~500KB raw, dynamic import từng file → không sao. Mermaid runtime ~700KB → lazy load chỉ khi gặp diagram đầu tiên.
- **Mermaid lexer lỗi với emoji**: docs không nên có emoji trong diagram (đã tuân thủ).
- **Hot reload**: Vite watch `docs/` mặc định OK, nhưng cần verify không bị ignore bởi `.vite` config.

---

## Câu hỏi mở (sẽ giả định nếu không trả lời)

- Quyền truy cập: **Super Admin** (mặc định).
- Vị trí menu: thêm 1 link "Tài liệu kỹ thuật" trong **More page** + mục settings (không gắn vào sidebar chính để giữ tối giản).
- Print: bật, ẩn sidebar.