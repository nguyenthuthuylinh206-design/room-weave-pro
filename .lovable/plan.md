

## Phân tích UX/UI — Bước 3: Dọn phòng & bổ sung đồ (Checkout Phase 2)

### Hiện trạng trên 390x707px

Từ text-content và code review, viewport hiển thị:
- Instruction banner (~60px)
- Progress header sticky top-0 (~56px): "0/9" + progress bar + "Tất cả OK"
- Category tabs scroll ngang (~40px): Tất cả | Ẩm thực | Điện tử | Đồ vải | Phòng tắm
- Category group header sticky top-[2.75rem] (~36px): "Ẩm thực 0/2"
- Item rows với action buttons

**Tổng header area khi scroll: ~192px / 707px = 27% viewport bị header chiếm**

---

### Vấn đề cần sửa

**1. Quá nhiều lớp sticky header — chiếm 27% viewport**
- Progress header sticky `top-0` (56px)
- Category group header sticky `top-[2.75rem]` (36px)
- Cộng instruction banner (không sticky nhưng chiếm chỗ ban đầu)
- Chỉ còn ~500px cho nội dung, scroll nhiều hơn cần thiết

**Sửa**: Gộp progress info (0/9) vào cùng hàng category tabs để tiết kiệm 1 lớp header (~40px). Bỏ sticky trên category group header — chỉ giữ 1 lớp sticky duy nhất.

**2. Instruction banner step 3 không cần thiết**
- Banner "🔄 Bước 3: Dọn phòng & bổ sung đồ" + giải thích dài 2 dòng → chiếm 60px
- Nhân viên đã biết workflow, thông tin này chỉ cần xem 1 lần
- Các action buttons trên item (Giặt/Đổi/Thêm/Hết) đã tự giải thích

**Sửa**: Thu gọn banner thành 1 dòng ngắn hoặc bỏ hẳn cho step 3+ (giữ cho step 1-2 vì phức tạp hơn).

**3. Items không có action button trông "trống" — gây nhầm lẫn**
- "Điện thoại bàn", "Điều hòa", "Máy sưởi", "Ổ cắm điện" (equipment) → chỉ hiện vòng tròn pending, không có nút gì
- Nhân viên phải đoán: tap vào đâu? Tap row = OK nhưng không rõ ràng
- So với "Ga chun" có 3 nút (Giặt/Đổi/Thêm) → trải nghiệm không đồng nhất

**Sửa**: Thêm nút "OK" text nhỏ bên phải cho items không có action khác, hoặc hiển thị hint "Bấm ✓ nếu OK" trên vòng tròn pending.

**4. Category group header "Điện tử 0/4" sticky chồng lên progress**
- `top-[2.75rem]` = 44px, progress header `top-0` height ~56px
- Category header bị đè dưới progress header → chồng 12px

**Sửa**: Nếu giữ sticky, điều chỉnh `top` offset cho khớp. Nếu gộp theo đề xuất #1, bỏ sticky category group.

**5. Nút "Tất cả OK" — nhập nhằng scope**
- Ở progress header: "Tất cả OK" → đánh dấu toàn bộ 9 items OK
- Ở step dọn phòng (phase 2), "Tất cả OK" có ý nghĩa khác: equipment đúng là OK, nhưng đồ vải/tiêu hao thường cần giặt/đổi/bổ sung
- Bấm "Tất cả OK" → bỏ qua giặt/đổi → sai workflow

**Sửa**: Ẩn "Tất cả OK" ở phase 2 checkout. Thay bằng "OK thiết bị" chỉ mark OK cho equipment/furniture, giữ đồ vải/tiêu hao chờ xử lý thủ công.

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `CategoryBasedItemsCheck.tsx` | Gộp progress count vào hàng tabs, bỏ sticky riêng cho progress. Ẩn/đổi "Tất cả OK" ở phase 2 |
| `CategoryGroup.tsx` | Bỏ sticky header, chỉ dùng border-b phân cách đơn giản |
| `CategoryItemRow.tsx` | Thêm nút "OK" text cho items không có action button (equipment) |
| `RoomCheckPage.tsx` | Thu gọn instruction banner step 3-4 thành 1 dòng |

