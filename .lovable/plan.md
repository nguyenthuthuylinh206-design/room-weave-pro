

## Vấn đề

Cột "Tình trạng" trong tab "Phân bổ phòng" hiện **chưa có logic thật**:

- DB: `room_items.condition` default `'good'`, có 4 giá trị (`good|fair|poor|damaged`)
- **636/636 records** trong DB đều = `'good'` → cột này luôn hiển thị "Tốt" cho mọi phòng
- **Không có UI nào** để cập nhật condition
- Khi room check phát hiện đồ hỏng/mất, dữ liệu được ghi vào `room_checks.items_damaged` / `items_lost` (JSONB) — **không hề đụng đến `room_items.condition`**
- Trigger `room_items_update_inventory` chỉ sync số lượng, không sync tình trạng

→ Cột này là **field chết**, gây hiểu nhầm cho người dùng.

## Hướng sửa — Đề xuất phương án A (khuyên dùng)

**Bỏ cột "Tình trạng"** ở bảng phân bổ phòng, thay bằng cột có nghĩa hơn dựa trên dữ liệu thực:

### Cột mới: "Lần kiểm tra cuối" (Last checked)
- Lấy từ `room_items.last_checked_at` (đã có sẵn trong DB)
- Hiển thị thời gian tương đối (`5 ngày trước`)
- Nếu > 30 ngày → màu `text-amber-600` (cần kiểm tra)
- Nếu chưa từng check → "Chưa kiểm tra" màu `text-muted-foreground`

### Bổ sung cột "Vấn đề gần đây"
- Đếm số lần item này bị ghi nhận trong `room_checks.items_damaged` / `items_lost` của phòng đó trong **30 ngày gần nhất**
- Nếu = 0 → "—"
- Nếu > 0 → "X lần hỏng/mất" màu `text-red-600`, click → mở dialog chi tiết (optional, có thể giai đoạn 2)

### Bảng mới sẽ là:
```
Phòng | Loại phòng | SL | Lần kiểm tra cuối | Vấn đề gần đây | Phân bổ lúc
101   | Standard   | 2  | 5 ngày trước      | —              | 2 tháng trước
102   | Standard   | 2  | 45 ngày trước ⚠   | 1 lần hỏng     | 3 tháng trước
```

## Phương án B (nếu muốn giữ cột Tình trạng "thật")

Làm cho cột Tình trạng có ý nghĩa bằng cách **tự động cập nhật `room_items.condition`** từ room_checks:

1. Tạo trigger `sync_room_item_condition_from_check`:
   - Sau mỗi `room_checks` insert/update
   - Parse `items_damaged` JSONB → set `condition = 'damaged'` cho `room_items` tương ứng
   - Parse `items_lost` JSONB → giảm quantity, log thành transaction
2. Backfill dữ liệu cũ: chạy 1 migration quét tất cả `room_checks` để cập nhật condition hiện tại
3. Giữ nguyên UI hiện tại, lúc đó "Tốt/Hỏng/Mất" sẽ phản ánh đúng

**Phức tạp hơn**, cần migration + trigger + backfill. Nhưng đem lại "tình trạng từng món ở từng phòng" đúng nghĩa.

## Phương án C (đơn giản nhất)

Chỉ **ẩn cột "Tình trạng"** vì nó vô nghĩa, không thêm gì khác.

## Files thay đổi

| Phương án | Files |
|---|---|
| A | `src/pages/items/ItemDetailPage.tsx` (đổi cột) + `src/hooks/useItems.ts` (query thêm `last_checked_at` + count vấn đề từ `room_checks`) |
| B | Migration mới (trigger + backfill) + giữ nguyên FE |
| C | Chỉ `src/pages/items/ItemDetailPage.tsx` (xóa 1 cột) |

## Câu hỏi

Bạn chọn phương án nào? **A** (gợi ý — thông tin có ý nghĩa nhất với data hiện có), **B** (làm cột Tình trạng đúng nghĩa, phức tạp hơn), hay **C** (chỉ ẩn đi)?

