

## Kế hoạch: Cải thiện giao diện danh sách giao dịch nhóm

### I. CÁC VẤN ĐỀ HIỆN TẠI

| Vấn đề | Mô tả |
|--------|-------|
| Child rows trống | Nhiều `TableCell` rỗng khi mở rộng, gây cảm giác thưa thớt |
| Thiếu visual hierarchy | Không rõ đâu là header nhóm, đâu là item con |
| Icon nhỏ | Chevron 3.5x3.5 khó nhấn và không nổi bật |
| Thiếu tổng quan | Chỉ hiện "3 sản phẩm" thay vì preview items |

---

### II. GIẢI PHÁP THIẾT KẾ MỚI

#### A. Compact Nested List Style

Thay vì hiện child rows như table rows riêng biệt, hiển thị danh sách items ngay trong cell khi expand:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▼ IN-240125-001  │ Nhập │ 3 sản phẩm           │ +45  │ NCC ABC → Kho │ Admin │ 25/01 │
├──────────────────────────────────────────────────────────────────────────────┤
│                  │      │ ┌────────────────────────────────────────────────┐ │
│                  │      │ │ • Khăn tắm lớn              x20              │ │
│                  │      │ │ • Dầu gội đầu               x15              │ │
│                  │      │ │ • Bàn chải đánh răng        x10              │ │
│                  │      │ └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### B. Inline Expand với Animation

- Khi click vào row → Mở rộng phần chi tiết ngay bên dưới (không phải child rows)
- Sử dụng `Collapsible` từ Radix UI
- Animation mượt với `animate-accordion-down`

---

### III. CODE CHANGES

#### File: `src/components/inventory/GroupedTransactionRow.tsx`

**Thay đổi chính:**

1. **Header row đẹp hơn:**
   - Icon expand lớn hơn (h-5 w-5)
   - Hiển thị preview 2-3 item names thay vì chỉ "N sản phẩm"
   - Badge count nhỏ gọn

2. **Expanded content:**
   - Render trong 1 row với `colSpan={8}` 
   - Danh sách items dạng compact list (không phải table rows)
   - Background nhẹ `bg-muted/5` để phân biệt
   - Border trái `border-l-2 border-primary` để visual hierarchy

3. **Item list trong expand:**
   - Layout compact: `[Image] [Name] [Qty]` trên 1 dòng
   - Grid 2 cột nếu nhiều items
   - Icon Eye nhỏ ở cuối mỗi item

**Code structure:**

```tsx
// Group Header Row - cải thiện
<TableRow className={cn(
  "hover:bg-muted/30 cursor-pointer border-b",
  isExpanded && "bg-muted/10 border-b-0"
)}>
  <TableCell colSpan={3}>
    <div className="flex items-center gap-2">
      <ChevronRight className={cn(
        "h-4 w-4 transition-transform",
        isExpanded && "rotate-90"
      )} />
      <span className="font-mono text-xs">{code}</span>
      <span className="text-xs text-muted-foreground">
        • {items.slice(0, 2).map(i => i.item_name).join(', ')}
        {items.length > 2 && ` +${items.length - 2}`}
      </span>
    </div>
  </TableCell>
  ...
</TableRow>

// Expanded Content - inline list
{isExpanded && (
  <TableRow className="bg-muted/5">
    <TableCell colSpan={8} className="p-0">
      <div className="border-l-2 border-primary ml-6 pl-4 py-2">
        <div className="grid gap-1">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm py-1 hover:bg-muted/20 rounded px-2">
              <div className="flex items-center gap-2">
                {t.item_images?.[0] && <img ... />}
                <span>{t.item_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={quantityColor}>
                  {t.transaction_type === 'in' ? '+' : '-'}{t.quantity}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TableCell>
  </TableRow>
)}
```

---

### IV. VISUAL IMPROVEMENTS

| Element | Trước | Sau |
|---------|-------|-----|
| Expand icon | `h-3.5 w-3.5` button ghost | `h-4 w-4` với rotate animation |
| Group header | "3 sản phẩm" | Preview names + badge count |
| Child rows | Nhiều TableRow riêng biệt | 1 TableRow với inline list |
| Visual hierarchy | Không có | Border-left primary color |
| Spacing | Loose (nhiều cells trống) | Compact (grid layout) |
| Hover state | Chỉ row | Row + từng item trong expand |

---

### V. MOBILE CONSIDERATIONS

Trên mobile, cũng cần cập nhật `MobileTransactionCard` để hỗ trợ grouped view:
- Card header với expand icon
- Expandable content bên trong card
- Swipe actions vẫn hoạt động

---

### VI. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/inventory/GroupedTransactionRow.tsx` | Redesign hoàn toàn layout |
| `src/components/inventory/MobileTransactionCard.tsx` | Thêm grouped variant (optional) |

