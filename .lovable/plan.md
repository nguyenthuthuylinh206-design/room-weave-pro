

## Phân tích UX/UI trang Kiểm tra Phòng — Hiện trạng sau cải tiến

Sau khi review code hiện tại (đã áp dụng các fix trước đó), đánh giá trên viewport 390x707px:

---

### Đã tốt (không cần sửa)
- Bottom drawer cho form Hỏng/Mất — hoạt động đúng, không chiếm inline space
- Action buttons dùng icon 40x40px (`h-10 w-10`) — touch target đạt chuẩn
- OK button 32x32px với `animate-pulse` cho pending — trực quan
- Scroll fade indicator cho category tabs — đã có
- Sticky footer Next/Back — hoạt động đúng
- Search ẩn khi < 10 items — tiết kiệm không gian

---

### Vấn đề còn tồn tại

**1. Sticky header chồng nhau — vẫn còn**
- `CategoryBasedItemsCheck` progress header: `sticky top-12` (line 341)
- `CategoryGroup` header: `sticky top-[6.5rem]` (line 73 trong CategoryGroup.tsx)
- Trên 390px, top-12 = 48px, top-[6.5rem] = 104px → CategoryGroup nằm dưới progress header ~56px → đúng logic **nhưng** cả hai cùng sticky → khi scroll, 2 header cùng dính trên cùng chiếm ~120px. Cộng thêm Check Type Header (không sticky nhưng vẫn hiện) → tổng header area vẫn lớn.
- `top-12` (48px) giả định có header cha 48px phía trên, nhưng Check Type Header không sticky → khi scroll, progress header bị kẹt ở 48px trong khi không có gì ở trên → lãng phí 48px trống.

**Sửa**: Đổi progress header về `sticky top-0` khi Check Type Header đã scroll ra khỏi viewport. Hoặc giảm xuống `top-0` trực tiếp vì Check Type Header không sticky.

**2. Nút "Tất cả OK" — vẫn trùng lặp**
- Xuất hiện ở 2 nơi: progress header (line 395-411) VÀ CategoryGroup actions (line 508-517)
- Cả hai đều có label "Tất cả OK" → user không phân biệt scope

**Sửa**: CategoryGroup dùng label ngắn hơn: "OK ✓" hoặc chỉ icon checkmark. Progress header giữ "Tất cả OK".

**3. Main content wrapper có padding thừa**
- `<div className="p-4">` (line 1306) bọc toàn bộ form → mỗi bên có 16px padding
- Bên trong, `CategoryBasedItemsCheck` dùng `-mx-4 px-4` để mở rộng progress header → hack ngược padding cha
- CategoryItemRow chỉ có `px-2` → nội dung bị thu hẹp thêm

**Sửa**: Giảm padding wrapper xuống `p-2` hoặc `px-2 py-3`, bỏ negative margin hack.

**4. Inline consumed form vẫn inline (không dùng drawer)**
- Form "Hết" (consumed) vẫn hiển thị inline (line 372-463) với ~200px height
- Chỉ "Mất" và "Hỏng" dùng drawer
- Inconsistency: 3 loại form phức tạp nhưng chỉ 2 dùng drawer

**Sửa**: Chuyển consumed form sang drawer cho nhất quán, hoặc giữ inline nhưng thu gọn hơn (switch + quantity trên cùng 1 hàng).

**5. Border-b trên mỗi item row tạo visual noise**
- `border-b border-border last:border-b-0` (line 277) + CategoryGroup có border riêng → double border
- Khi nhiều items, các đường kẻ dày gây rối mắt

**Sửa**: Dùng `divide-y` ở container thay vì border trên từng row. Hoặc dùng khoảng cách (gap) thay border.

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `CategoryBasedItemsCheck.tsx` | Đổi sticky progress về `top-0`, giảm label "Tất cả OK" trong CategoryGroup thành icon |
| `CategoryItemRow.tsx` | Chuyển consumed form sang drawer, bỏ `border-b` trên row |
| `CategoryGroup.tsx` | Điều chỉnh `top` offset theo progress header mới |
| `RoomCheckPage.tsx` | Giảm padding wrapper `p-4` → `px-2 py-3` |

