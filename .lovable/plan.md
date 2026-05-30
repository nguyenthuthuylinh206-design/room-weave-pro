## Cập nhật bộ màu Slate Professional

Toàn bộ component đã dùng semantic token (`bg-primary`, `text-success`, `border-border`...) nên **chỉ cần sửa 1 file** `src/index.css` — không động vào component nào.

### File cập nhật

**`src/index.css`** — `:root` (light) + `.dark` (dark mode):

| Token | HSL mới | HEX |
|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` |
| `--foreground` | `222 47% 11%` | `#0F172A` |
| `--muted` | `210 40% 96%` | `#F1F5F9` |
| `--muted-foreground` | `215 19% 35%` | `#475569` |
| `--border` / `--input` | `213 27% 84%` | `#CBD5E1` |
| `--primary` / `--ring` | `217 91% 50%` | `#2563EB` |
| `--accent` | `217 91% 50%` | `#2563EB` (gộp với primary, bỏ cyan chói) |
| `--success` | `142 72% 29%` | `#15803D` |
| `--warning` | `26 90% 37%` | `#B45309` |
| `--destructive` | `0 72% 51%` | `#DC2626` |
| `--sidebar-background` | `222 47% 11%` | `#0F172A` |
| `--sidebar-accent` | `217 33% 17%` | hover item |
| `--sidebar-primary` | `217 91% 50%` | item active |
| `chart-1..5` | blue / green / amber / red / purple | bảng phân biệt rõ |

Dark mode chỉnh tương ứng:
- `--background`: `222 47% 11%` (#0F172A)
- `--card` / `--popover`: `217 33% 17%`
- `--border` / `--input`: `217 33% 25%`
- `--muted-foreground`: `215 20% 70%`
- Primary/Success/Warning/Destructive giữ cùng hue, sáng hơn để tương phản trên nền tối

### Phiên bản

Bump `APP_VERSION` `1.1.2` → `1.1.3` trong `src/lib/app-version.ts` + entry mới trong `public/changelog.json` ("Cập nhật bảng màu Slate Professional — tăng tương phản, dễ đọc").

### Rủi ro & rollout

- **Không ảnh hưởng logic**, chỉ thay biến CSS.
- Các component dùng utility cứng (`text-green-600`, `text-red-600`) theo memory **vẫn giữ nguyên** — bảng màu Tailwind default đã đủ tương phản trên nền trắng mới.
- Có thể rollback nhanh bằng revert 1 file.

### QA checklist

1. Sidebar đen-navy, item active xanh `#2563EB`.
2. Nút primary: nền xanh `#2563EB`, chữ trắng — đọc rõ.
3. Badge trạng thái OK / Lỗi / Cảnh báo tương phản tốt trên nền trắng.
4. Bảng (table) có viền `#CBD5E1` phân tách rõ row.
5. Dark mode: nền `#0F172A`, card nổi trên nền, chữ trắng đọc rõ.
