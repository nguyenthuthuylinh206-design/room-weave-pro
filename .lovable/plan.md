

## Accordion sidebar — chỉ mở 1 menu tại 1 thời điểm + animation mượt

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/Sidebar.tsx` | Sửa `toggleExpanded` thành accordion + thêm CSS transition cho submenu |

### Chi tiết

**1. Sửa `toggleExpanded` (dòng 319-323):**
```typescript
const toggleExpanded = (titleKey: string) => {
  setExpandedItems((prev) =>
    prev.includes(titleKey) ? [] : [titleKey]
  )
}
```
Chỉ cho phép tối đa 1 item expanded. Click mở B → A tự đóng.

**2. Thêm animation mượt cho submenu (dòng 449-497):**

Thay `{isExpanded && <div>...}` bằng CSS transition sử dụng `grid-rows` trick:

```tsx
<div
  className={cn(
    "grid transition-[grid-template-rows] duration-300 ease-in-out",
    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
  )}
>
  <div className="overflow-hidden">
    <div className="ml-4 space-y-1 border-l border-border pl-4 py-1">
      {/* children render giữ nguyên */}
    </div>
  </div>
</div>
```

Kỹ thuật `grid-rows-[0fr] → grid-rows-[1fr]` cho phép animate height từ 0 đến auto một cách mượt mà, không cần JS đo height.

**3. Animate chevron icon:**
```tsx
<ChevronDown className={cn(
  "h-4 w-4 transition-transform duration-300",
  isExpanded ? "rotate-0" : "-rotate-90"
)} />
```
Dùng 1 icon `ChevronDown` thay vì toggle giữa `ChevronDown`/`ChevronRight`, xoay bằng CSS.

