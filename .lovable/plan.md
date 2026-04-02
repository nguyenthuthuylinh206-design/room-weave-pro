

## Fix: Chỉ highlight 1 item tại 1 thời điểm

### Vấn đề
Khi mở "Bảo trì" (expanded → `bg-primary`), "Quản lý Nhân sự" cũng sáng xanh vì route `/staff` đang active. Hai mục cùng xanh → khó nhìn.

### Giải pháp
Khi có menu đang **expanded**, các item khác không có children (hoặc đang đóng) chỉ dùng style nhẹ (`bg-accent`) thay vì `bg-primary` cho active state.

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/Sidebar.tsx` | Điều chỉnh logic highlight cho non-expandable items |

### Chi tiết

**Non-expandable items (dòng 513-518):** Khi có item khác đang expanded, giảm highlight xuống `bg-accent`:

```tsx
const anyExpanded = expandedItems.length > 0

// Non-expandable item:
isActive && !anyExpanded
  ? 'bg-primary text-primary-foreground'
  : isActive && anyExpanded
    ? 'bg-accent text-accent-foreground font-semibold'
    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
```

**Parent items (dòng 426-432):** Giữ nguyên — expanded = `bg-primary`, hasActiveChild khi đóng = `bg-accent`.

Kết quả: Khi mở Bảo trì → chỉ Bảo trì sáng xanh, Quản lý Nhân sự chỉ highlight nhẹ.

