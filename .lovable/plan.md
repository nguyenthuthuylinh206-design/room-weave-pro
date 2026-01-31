

## Kế hoạch: Ẩn badge tổng khi menu đã mở rộng

### VẤN ĐỀ HIỆN TẠI

Khi menu **Kho & Tài sản** mở rộng:
- Badge tổng (3) vẫn hiển thị trên header
- Badge con (3) hiển thị trên "Phiếu giao hàng"  
- **Trùng lặp thông tin** → rối mắt

### LOGIC CẦN THAY ĐỔI

| Trạng thái menu | Badge trên menu cha | Badge trên menu con |
|-----------------|---------------------|---------------------|
| **Thu gọn** (collapsed) | ✅ Hiện tổng số | ❌ Ẩn (không thấy) |
| **Mở rộng** (expanded) | ❌ Ẩn | ✅ Hiện chi tiết |

### GIẢI PHÁP

Thêm điều kiện `!isExpanded` khi render badge trên menu cha:

```typescript
// Chỉ hiện badge tổng khi menu CHƯA mở rộng
{!isExpanded && parentBadgeCount > 0 && (
  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
    {parentBadgeCount > 99 ? '99+' : parentBadgeCount}
  </Badge>
)}
```

---

### CHI TIẾT THAY ĐỔI

#### File: `src/components/layout/Sidebar.tsx`

**Dòng 444-448** (hiện tại):
```typescript
{parentBadgeCount > 0 && (
  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
    {parentBadgeCount > 99 ? '99+' : parentBadgeCount}
  </Badge>
)}
```

**Thay đổi thành:**
```typescript
{!isExpanded && parentBadgeCount > 0 && (
  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
    {parentBadgeCount > 99 ? '99+' : parentBadgeCount}
  </Badge>
)}
```

---

### KẾT QUẢ MONG ĐỢI

**Menu thu gọn:**
```
[📦] Kho & Tài sản    [3] ▸
```

**Menu mở rộng:**
```
[📦] Kho & Tài sản        ▼
    ├ Bảng điều khiển
    ├ Danh sách tài sản
    ├ Phiếu giao hàng    [3]   ← Chỉ hiện badge ở đây
    └ ...
```

---

### TÓM TẮT

| File | Thay đổi |
|------|----------|
| `src/components/layout/Sidebar.tsx` | Thêm `!isExpanded &&` trước điều kiện render badge cha |

**Chỉ sửa 1 dòng code**, không ảnh hưởng logic khác.

