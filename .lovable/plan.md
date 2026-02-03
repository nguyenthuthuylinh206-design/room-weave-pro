

## Kế hoạch: Thay icon bằng text cho các nút action

### VẤN ĐỀ HIỆN TẠI

Trong file `CategoryItemRow.tsx`, các nút action (Giặt, Đổi, Thêm, Mất, Hỏng...) hiện tại:
- Hiển thị **icon + text** trên desktop (`sm:inline`)
- Chỉ hiển thị **icon** trên mobile (`hidden sm:inline` cho text)

```tsx
// Dòng 365-366 hiện tại:
<Icon className="h-3.5 w-3.5" />
<span className="hidden sm:inline">{config.label}</span>
```

### GIẢI PHÁP

Bỏ icon, chỉ giữ lại text để dễ nhận biết chức năng hơn:

```tsx
// Thay đổi thành:
<span className="text-xs font-medium">{config.label}</span>
```

### CHI TIẾT THAY ĐỔI

**File:** `src/components/rooms/check-steps/item-type-tabs/CategoryItemRow.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 365-366 | `<Icon className="h-3.5 w-3.5" />` + `<span className="hidden sm:inline">` | Chỉ giữ `<span>{config.label}</span>` |

**Kết quả mong đợi:**

```text
TRƯỚC (mobile):
[🧺] [🔄] [➕] [🚫] [🔧]

SAU (mobile):
[Giặt] [Đổi] [Thêm] [Mất] [Hỏng]
```

### LỢI ÍCH

1. **Dễ nhận biết** - User không cần đoán icon nghĩa gì
2. **Nhất quán** - Giống nhau trên mọi kích thước màn hình
3. **Accessibility** - Text rõ ràng hơn icon

