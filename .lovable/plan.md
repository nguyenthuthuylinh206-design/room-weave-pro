
## Hiểu lại yêu cầu

1. **Câu từ phải dễ hiểu hơn** — viết như nói chuyện với cô buồng phòng thật, không dùng từ kỹ thuật ("Phase 1/2", "inspection", "milestone")
2. **Sau khi báo lễ tân → BẮT BUỘC làm tiếp bước 2**, KHÔNG có nút "Tạm dừng" / "Làm sau"
3. Lý do bắt buộc: nếu cô bỏ giữa chừng, ca sau không biết phòng cần dọn gì → tạo task thiếu thông tin

## Điều chỉnh kế hoạch

### Đổi cách gọi tên (tiếng Việt thuần, dễ hiểu)

| Từ kỹ thuật cũ | Câu dễ hiểu mới |
|---|---|
| Phase 1 — Kiểm tra mất hỏng | **"Bước 1/2: Xem khách có làm mất hay hỏng đồ không"** |
| Phase 2 — Ghi chú bổ sung | **"Bước 2/2: Ghi chú đồ cần thay & dọn"** |
| Hoàn tất Phase 1 → Báo lễ tân | **"Xong - Báo lễ tân thu tiền khách"** |
| Tiếp tục Phase 2 | **"Tiếp tục: Ghi đồ cần thay"** |
| State machine | (không gọi tên với user) |
| NextActionCard | (không gọi tên với user) |

### Bỏ hoàn toàn nút "Tạm dừng / Làm sau"

Sau khi xong Bước 1, màn hình tóm tắt CHỈ có **1 nút duy nhất**: "Tiếp tục ghi đồ cần thay →"

Không có cách nào thoát ra giữa chừng (trừ nút back hệ thống — sẽ cảnh báo "Bạn cần hoàn thành cả 2 bước trước khi rời đi").

### Màn hình tóm tắt sau Bước 1 (viết lại)

```text
┌─────────────────────────────────┐
│ ✅ Đã báo cho lễ tân            │
│                                 │
│ Khách làm mất:                  │
│   • 1 khăn tắm — 50.000đ        │
│ Khách làm hỏng:                 │
│   • Không có                    │
│                                 │
│ Lễ tân sẽ thu của khách:        │
│   50.000đ                       │
│                                 │
│ ─────────────────────────────   │
│ Giờ kiểm tra tiếp đồ nào cần    │
│ thay, giặt, bổ sung để tạo      │
│ phiếu cho ca sau đến dọn.       │
│                                 │
│ [  Tiếp tục →  ]                │
└─────────────────────────────────┘
```

### Bước 2 — viết lại label

```text
┌─────────────────────────────────┐
│ Bước 2/2 — Ghi đồ cần thay      │
│ Ca sau sẽ mang đồ đến dọn       │
├─────────────────────────────────┤
│ Phòng bẩn mức nào?              │
│ [ Hơi bẩn ] [ Bẩn ] [ Rất bẩn ] │
│                                 │
│ Chăn ga gối khăn:               │
│ Chăn        [Còn dùng] [Giặt]   │
│                          [Thay] │
│ Ga giường   [Còn dùng] [Giặt]   │
│                          [Thay] │
│ Khăn tắm    [Còn dùng] [Giặt]   │
│                          [Thay] │
│                                 │
│ Đồ tiêu dùng (dầu gội, nước...):│
│ Dầu gội     [Còn] [Hết - bổ sung]│
│ Nước suối   [Còn] [Hết - bổ sung]│
│                                 │
│ Ghi chú thêm: [_____________]   │
│                                 │
│ [  Xong - Tạo phiếu cho ca sau ]│
└─────────────────────────────────┘
```

### Màn hình kết thúc

```text
┌─────────────────────────────────┐
│ ✅ Hoàn tất kiểm tra phòng 101  │
│                                 │
│ Đã tạo phiếu dọn:               │
│   • Mức bẩn: Bẩn                │
│   • 3 món cần giặt              │
│   • 2 món cần bổ sung           │
│                                 │
│ Ca dọn sẽ nhận thông báo ngay.  │
│                                 │
│ [  Đi phòng tiếp theo  ]        │
│ [  Về danh sách công việc  ]    │
└─────────────────────────────────┘
```

### Cảnh báo khi cô bấm back giữa chừng

Sau Bước 1, nếu cô bấm nút back trình duyệt / nút back app:
```
⚠️ Chưa xong việc
Bạn vừa báo mất/hỏng cho lễ tân nhưng 
chưa ghi đồ cần thay. Ca sau sẽ không 
biết mang gì đến dọn.

[ Quay lại làm tiếp ]  [ Vẫn thoát ]
```

## Files sẽ sửa/tạo (cập nhật)

| File | Thay đổi |
|---|---|
| `src/hooks/useRoomNextAction.ts` (MỚI) | Logic xác định bước tiếp theo cho phòng |
| `src/components/rooms/NextActionCard.tsx` (MỚI) | Card "Việc cần làm" hiển thị ở `/rooms/:id` |
| `src/components/rooms/StaffRoomDetailPage.tsx` | Bỏ Card "Đồ dùng trong phòng" mâu thuẫn + bỏ Alert checkout trùng + render NextActionCard |
| `src/pages/RoomCheck.tsx` | Đọc `?step=1\|2`, render đúng UI từng bước, chặn back giữa chừng |
| `src/components/rooms/CheckoutStep1.tsx` (MỚI) | UI bước 1 — chỉ các action mất/hỏng |
| `src/components/rooms/CheckoutStep1Summary.tsx` (MỚI) | Màn tóm tắt sau bước 1, **chỉ 1 nút "Tiếp tục →"** |
| `src/components/rooms/CheckoutStep2.tsx` (MỚI) | UI bước 2 — mức bẩn + đồ vải + đồ tiêu dùng |
| `src/components/rooms/RoomConditionPicker.tsx` (MỚI) | 3 nút Hơi bẩn / Bẩn / Rất bẩn |
| `src/components/rooms/CheckoutDoneScreen.tsx` (MỚI) | Màn kết thúc với 2 nút điều hướng |
| `src/hooks/useCreateCleaningTask.ts` (MỚI) | Tạo `housekeeping_task` cleaning + đính danh sách đồ |
| `src/i18n/locales/vi/rooms.json` | Toàn bộ chuỗi mới bằng tiếng Việt thuần |

## Quy tắc viết câu (áp dụng cho mọi label mới)

1. Không dùng từ Anh: "phase", "inspection", "checkout" → "bước", "kiểm tra", "khách trả phòng"
2. Câu chủ động, ngắn: "Báo lễ tân thu tiền" thay vì "Hoàn tất quy trình thông báo lễ tân"
3. Giải thích "vì sao" ngay dưới tiêu đề: "Ca sau sẽ mang đồ đến dọn" (cô hiểu mục đích → làm cẩn thận hơn)
4. Nút action luôn dùng động từ + kết quả: "Xong - Tạo phiếu cho ca sau" thay vì "Submit"
