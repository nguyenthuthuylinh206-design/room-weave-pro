

## Khoá toàn bộ dịch vụ khi tài khoản bị tạm ngưng

### Vấn đề
Khi tài khoản bị tạm ngưng (grace period expired), banner đỏ hiển thị nhưng user vẫn click vào các module và sử dụng bình thường. Cần chặn truy cập, buộc gia hạn.

### Giải pháp
Thêm một overlay che phủ toàn bộ nội dung (trừ banner và trang subscription) khi `isGracePeriodExpired = true`. Chỉ cho phép truy cập `/settings/subscription` để gia hạn.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/SuspendedOverlay.tsx` | **Tạo mới** — Component overlay hiển thị thông báo khoá + nút "Gia hạn ngay" |
| 2 | `src/components/layout/MainLayout.tsx` | Thêm logic: nếu `isGracePeriodExpired` và route hiện tại không phải `/settings/subscription` → hiển thị `SuspendedOverlay` thay vì `<Outlet />` |

### Chi tiết

**1. SuspendedOverlay** — Giao diện khoá:
- Che phủ vùng main content (không che banner đỏ phía trên)
- Icon khoá + thông báo "Tài khoản đã bị tạm ngưng"
- Mô tả ngắn: "Vui lòng gia hạn gói đăng ký để tiếp tục sử dụng"
- Nút "Gia hạn ngay" → navigate `/settings/subscription`
- Style: `bg-background/80 backdrop-blur` overlay

**2. MainLayout** — Logic điều kiện:
```text
if (isGracePeriodExpired && currentPath !== '/settings/subscription')
  → render <SuspendedOverlay /> thay cho <Outlet />
else
  → render <Outlet /> bình thường
```

- Sidebar và Header vẫn hiển thị nhưng click vào menu item sẽ thấy overlay
- Trang `/settings/subscription` vẫn truy cập được để user gia hạn
- Áp dụng cho cả desktop và mobile layout

Kết quả: Khi tài khoản bị tạm ngưng → mọi trang đều bị khoá, chỉ trang gia hạn gói dịch vụ hoạt động.

