

## Kiểm tra UX/UI trang Kiểm tra Phòng (Room Check) — Phân tích & Cải tiến

### Phân tích hiện trạng (390px mobile)

Sau khi review toàn bộ code, tôi phát hiện các vấn đề UX/UI sau:

---

### Vấn đề 1: Sticky header chồng chéo — mất không gian hiển thị
- `CategoryBasedItemsCheck` có sticky progress header ở `top-12` (line 342)
- `CategoryGroup` header cũng `sticky top-0 z-10` (line 62)
- Kết hợp với Check Type Header + Step Header ở `RoomCheckPage` → trên mobile 390×707px, có tới **4 lớp header chiếm ~180-200px**, chỉ còn ~500px cho nội dung
- CategoryGroup sticky `top-0` bị trùng vị trí với progress header → đè lên nhau

**Sửa**: Điều chỉnh `top` offset cho CategoryGroup header để không chồng lên progress bar. Giảm padding/margin các header.

---

### Vấn đề 2: Nút action trên mỗi item quá nhỏ và khó bấm
- Các nút action (Giặt, Đổi, Mất, Hỏng...) dùng `h-9 px-2.5 text-xs` — trên mobile với nhiều nút, chúng bị ép sát nhau
- Checkout Phase 1 có thể hiện 3-4 nút (OK + Mất + Hỏng) trên 1 hàng → rất chật trên 390px
- Vùng tap của nút OK là toàn bộ row (click vào row = OK), nhưng điều này không rõ ràng cho người dùng

**Sửa**: Thêm nút OK rõ ràng (checkmark icon) bên trái. Tăng kích thước touch target lên tối thiểu 44px. Khi có nhiều action, hiển thị dạng 2 hàng hoặc dùng icon thay text.

---

### Vấn đề 3: Step header lặp thông tin, chiếm chỗ
- `RoomCheckPage` line 1304-1344: Step header (`Bước 2/5: Kiểm tra đồ tính phí & mất/hỏng`) hiển thị trong border box riêng
- Thông tin này đã có trong progress bar phía trên (1/5, 2/5...)
- Trên mobile, step header chiếm thêm ~48px không cần thiết

**Sửa**: Gộp step label vào progress bar header thay vì hiển thị riêng. Ẩn step header trên mobile.

---

### Vấn đề 4: Inline form (Hỏng/Mất/Hết) chiếm quá nhiều không gian
- Form "Đánh dấu hỏng" có RadioGroup + Input chi phí + Textarea + 2 nút → ~200px height
- Form "Đánh dấu mất" có hiển thị giá + Textarea + 2 nút → ~150px
- Khi mở form này, nội dung bên dưới bị đẩy xuống xa, mất context

**Sửa**: Dùng bottom sheet (drawer) thay vì inline expansion cho các form phức tạp (damaged, lost). Giữ inline cho action đơn giản (quantity adjuster).

---

### Vấn đề 5: Thanh Category tabs bị tràn không rõ ràng
- TabsList dùng `overflow-x-auto scrollbar-hide` → không có indicator rằng có thể scroll ngang
- Trên mobile, nếu có 5+ categories, user không biết còn tabs bên phải

**Sửa**: Thêm fade gradient ở cạnh phải khi còn tabs ẩn. Hoặc thêm scroll indicator nhỏ.

---

### Vấn đề 6: Nút "Tất cả OK" trùng lặp
- Có 3 nơi hiển thị "Tất cả OK": trong progress header, trong BulkActionsHeader, và trong CategoryGroup
- Gây nhầm lẫn scope (toàn bộ hay chỉ category?)

**Sửa**: Giữ lại "Tất cả OK" trong progress header (toàn bộ) và trong CategoryGroup (theo nhóm). Bỏ BulkActionsHeader.

---

### Vấn đề 7: Status indicator (circle) quá nhỏ
- Circle status 24px (`w-6 h-6`) với icon 14px bên trong — khó nhìn trên mobile
- Khi pending, chỉ là vòng tròn nét đứt mờ → user không biết cần tap vào đâu

**Sửa**: Tăng lên `w-8 h-8` với icon lớn hơn. Thêm animation nhẹ (pulse) cho pending items.

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx` | Fix sticky offset, bỏ BulkActionsHeader trùng, thêm scroll fade indicator cho tabs |
| `src/components/rooms/check-steps/item-type-tabs/CategoryItemRow.tsx` | Tăng touch target, thêm nút OK rõ ràng, chuyển form phức tạp sang bottom drawer |
| `src/components/rooms/check-steps/item-type-tabs/CategoryGroup.tsx` | Fix sticky top offset tránh chồng chéo |
| `src/pages/rooms/RoomCheckPage.tsx` | Gộp step label vào progress header trên mobile, giảm padding |

### Ưu tiên cao nhất (impact lớn nhất)
1. Fix sticky chồng chéo (mất nội dung)
2. Tăng touch target cho action buttons
3. Gộp step header để tiết kiệm không gian
4. Chuyển form Hỏng/Mất sang bottom drawer

