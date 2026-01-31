

## Kế hoạch: Căn trái các nút liên lạc trong StaffCard

### VẤN ĐỀ

Hiện tại các nút Telegram/Phone đang dùng `ml-auto` nên bị đẩy sang góc phải của card, tách rời khỏi thông tin nhân viên.

### GIẢI PHÁP

Bỏ `ml-auto` để các nút nằm liền mạch với tên và status badge.

**Layout hiện tại:**
```text
[Avatar] [Tên] [●]                              [✈] [📞]
                                                 ↑
                                          (ml-auto đẩy sang phải)
```

**Layout mới:**
```text
[Avatar] [Tên] [●] [✈] [📞]
               ↑
        (tất cả căn trái liền mạch)
```

### THAY ĐỔI

**File: `src/components/staff/StaffCard.tsx`**

| Dòng | Trước | Sau |
|------|-------|-----|
| 98 | `<div className="flex items-center gap-0.5 ml-auto">` | `<div className="flex items-center gap-0.5">` |

Chỉ cần bỏ `ml-auto` khỏi container chứa các nút liên lạc.

