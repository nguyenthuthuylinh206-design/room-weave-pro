

## Kế hoạch: Căn chỉnh icon liên lạc sang phải và thẳng hàng

### VẤN ĐỀ HIỆN TẠI

Sau khi bỏ `ml-auto`, các icon bị dính vào bên trái theo sau tên. Cần đưa icon sang phải nhưng vẫn thẳng hàng theo chiều dọc.

### GIẢI PHÁP

Thêm lại `ml-auto` vào container chứa các icon để đẩy chúng sang phải của card.

**Layout mong muốn:**
```text
[Avatar] [Tên] [●]                    [✈] [📞]
[Avatar] [Tên dài hơn] [●]            [✈] [📞]
[Avatar] [Tên ngắn] [●]               [✈] [📞]
                                       ↑
                                (căn thẳng hàng bên phải)
```

### THAY ĐỔI

**File: `src/components/staff/StaffCard.tsx`**

| Dòng | Trước | Sau |
|------|-------|-----|
| 98 | `<div className="flex items-center gap-0.5">` | `<div className="flex items-center gap-0.5 ml-auto flex-shrink-0">` |

- `ml-auto`: Đẩy container icon sang phải
- `flex-shrink-0`: Đảm bảo icon không bị co lại, luôn giữ kích thước cố định → thẳng hàng

