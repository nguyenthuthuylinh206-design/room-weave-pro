

## Phân tích UX/UI trang Kiểm tra Phòng — Bước 4 (Checkout Step 5)

User đang ở bước cuối cùng checkout (Step 5: Review + Cleaning). Dựa trên text-content của element đã chọn và code review:

---

### Vấn đề phát hiện

**1. Bước cuối quá tải thông tin — Cleaning + Review dồn chung**
- Step 5 render `CleaningRequestStep` + `ReviewStep` trong cùng `space-y-6` (line 1472-1476)
- Trên 390px, user phải scroll qua: instruction banner → Tình trạng phòng (3 radio cards) → Priority selector → Cleaning notes → Review summary → Đánh giá sao → Ghi chú → Ảnh → Sticky footer
- Quá nhiều section liên tiếp, không có phân tách rõ ràng giữa "Dọn dẹp" và "Đánh giá"

**Sửa**: Thêm section header/divider rõ ràng giữa Cleaning và Review. Thu gọn CleaningRequestStep — bỏ radio card lớn, dùng 3 chip nhỏ ngang hàng cho room condition.

**2. Room condition cards chiếm quá nhiều không gian**
- 3 radio cards (Sạch/Bẩn nhẹ/Rất bẩn) mỗi cái có icon + label + description → chiếm ~200px vertical
- Trên mobile 390px, đây là phần chiếm nhiều viewport nhất

**Sửa**: Chuyển sang 3 chip/button ngang hàng (Sạch | Bẩn nhẹ | Rất bẩn) — chỉ cần 1 hàng ~48px.

**3. Instruction banner step 5 lặp thông tin**
- Banner "Bước 4: Xem lại & hoàn tất" + mô tả → chiếm ~60px
- Thông tin "Sau khi hoàn tất: Phòng sẽ chuyển sang trạng thái Trống" trong banner — không cần ở đây, gây nhiễu

**Sửa**: Rút gọn banner, bỏ phần giải thích trạng thái phòng.

**4. Đánh giá độ sạch (star rating) bị trùng với Room Condition**
- CleaningRequestStep đã hỏi "Tình trạng phòng" (Sạch/Bẩn/Rất bẩn)
- ReviewStep lại hỏi "Đánh giá độ sạch" (sao 1-10)
- 2 câu hỏi gần như giống nhau → nhân viên bối rối

**Sửa**: Bỏ star rating trong ReviewStep khi đã có room condition từ CleaningRequestStep. Hoặc auto-fill dựa trên condition (Sạch=8, Bẩn nhẹ=5, Rất bẩn=2).

**5. "Tóm tắt" section trong ReviewStep không hiển thị rõ**
- Chỉ hiện "OK" nếu không có vấn đề → không cho nhân viên cảm giác "đã kiểm tra xong"
- Nên hiện rõ: "✓ 25/25 đồ dùng OK" hoặc "23 OK, 1 giặt, 1 hỏng"

**Sửa**: Cải thiện ReviewStep summary với thống kê cụ thể.

**6. Sticky footer `-mx-4` không khớp với wrapper `px-2`**
- Sticky footer dùng `-mx-4` (line 1485) nhưng wrapper đã giảm xuống `px-2 py-3` (line 1306)
- Kết quả: footer bị lệch so với content area

**Sửa**: Đổi `-mx-4` thành `-mx-2` cho khớp.

---

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `CleaningRequestStep.tsx` | Chuyển Room Condition từ radio cards sang 3 chip ngang hàng, giảm chiều cao ~150px |
| `ReviewStep.tsx` | Auto-fill cleanliness score từ room condition, cải thiện summary hiển thị thống kê rõ ràng |
| `RoomCheckPage.tsx` | Rút gọn instruction banner step 5, fix sticky footer margin `-mx-4` → `-mx-2`, thêm divider giữa Cleaning và Review |

