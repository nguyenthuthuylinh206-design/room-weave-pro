

## Cải thiện group labels trong menu Cài đặt — rõ ràng hơn

### Vấn đề
Group labels hiện tại quá mờ (`text-muted-foreground/80`), quá nhỏ (`11px`), và đường kẻ mảnh (`bg-border/60`) → khó phân biệt các nhóm.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/Sidebar.tsx` | Tăng độ rõ ràng của group labels |

### Chi tiết styling mới

```tsx
{showGroup && (
  <div className="pt-4 pb-1 px-3 first:pt-1">
    <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
      {child.group}
    </span>
  </div>
)}
```

Thay đổi cụ thể:
- **Font size**: `text-[11px]` → `text-xs` (12px) — lớn hơn, dễ đọc
- **Màu chữ**: `text-muted-foreground/80` → `text-foreground/70` — đậm hơn hẳn, dùng foreground thay vì muted
- **Uppercase + tracking**: Thêm lại `uppercase tracking-wide` để tạo cảm giác "section header" rõ ràng
- **Bỏ đường kẻ ngang**: Loại bỏ div `h-px bg-border/60` — uppercase text đã đủ phân biệt, đường kẻ mờ chỉ làm rối thêm
- **Spacing**: Tăng `pt-3` → `pt-4` để khoảng cách giữa các nhóm lớn hơn

