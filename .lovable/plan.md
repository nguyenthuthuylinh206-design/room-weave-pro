

## Trạng thái hiện tại — đã hoàn thiện

✅ `roomCheckConfig.ts` — daily có đầy đủ `missing/damaged/empty`
✅ `CleaningRequestStep` — phân biệt `mode: daily | checkout`, không ép `needs_cleaning` cho daily sạch
✅ `RoomCheckPage` dialog — tách 3 nhánh: checkout / daily-sạch / daily-bẩn
✅ `useRoomChecks.processDailyCheck` — chỉ tạo cleaning task khi `room_condition !== 'clean'`
✅ Banner step 2 daily — đã đúng nghiệp vụ "Thiếu/Hỏng/Hết"
✅ Auto-tạo supplement request khi có shortage + consumed
✅ Phòng daily không đổi trạng thái (giữ `occupied`)

## Còn 3 điểm chưa khớp giữa UI ↔ Downstream

### 🟡 Vấn đề 1: ReviewStep (step 3 daily) chưa hiển thị tình trạng vệ sinh phòng
File `ReviewStep.tsx` — hiện chỉ dùng `room_condition` để auto-fill `cleanliness_score` (dòng 175-177), **không hiện ra cho cô review** trước khi submit. Cô làm xong step 2 chọn "Bẩn nhẹ" → sang step 3 không thấy lại → dễ submit nhầm.

→ Thêm 1 dòng tóm tắt trong ReviewStep cho daily: "Tình trạng phòng: **Sạch / Bẩn nhẹ / Rất bẩn**" + nếu không sạch thì hiện "→ Sẽ tạo phiếu lau dọn cho buồng phòng".

### 🟡 Vấn đề 2: Daily check có damage nhưng KHÔNG tạo task bảo trì
Trong `processDailyCheck` (dòng 161-195) chỉ xử lý `room_condition` để tạo cleaning task. Nhưng nếu cô bấm **"Hỏng"** cho linen/equipment trong daily → `items_damaged` có data nhưng **không có flow nào tạo maintenance_request hoặc thông báo bảo trì**.

→ Bổ sung: nếu `items_damaged.length > 0` trong daily → tự tạo `maintenance_request` (priority theo `damage_level` nếu có, mặc định `medium`) cho bộ phận bảo trì.

### 🟡 Vấn đề 3: Dialog daily-sạch vẫn hiển thị summary "Cần giặt / Cần thay" nếu cô lỡ bấm
Dialog dòng 1171-1178 (daily + clean) chỉ hiển thị "không cần dọn lại" — tốt. Nhưng nếu cô lỡ chọn "Sạch" mà ở step 2 lại có đánh dấu **Thiếu (missing)** hoặc **Hỏng (damaged)** → dialog không cảnh báo gì, dễ bỏ sót.

→ Trong nhánh daily-sạch của dialog, thêm cảnh báo nhỏ nếu có `items_missing` hoặc `items_damaged`: "⚠️ Có X đồ cần bổ sung / Y đồ hỏng — sẽ tự gửi yêu cầu cho kho/bảo trì".

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `ReviewStep.tsx` | Thêm block tóm tắt vệ sinh phòng cho daily (chỉ hiện khi `checkType === 'daily'` và đã chọn `room_condition`). Hiển thị label màu + footnote tạo task. |
| 2 | `useRoomChecks.ts` (sau dòng 195) | Thêm logic auto-tạo `maintenance_requests` khi daily có `items_damaged.length > 0`. Title: `Báo hỏng từ kiểm tra hằng ngày phòng X`, status: `pending`, type: `repair`. |
| 3 | `RoomCheckPage.tsx` dialog dòng 1171-1178 | Trong nhánh daily-sạch, thêm dòng cảnh báo nếu `items_missing.length > 0` hoặc `items_damaged.length > 0`. |

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- Daily không đổi trạng thái phòng
- 1 màn / 1 hành động, không phình bước
- Nếu daily có damage → vẫn tạo maintenance task song song với cleaning task (nếu có)

## Kết quả mong đợi
- ReviewStep daily hiện rõ tình trạng vệ sinh trước khi submit
- Daily báo hỏng → tự sinh phiếu bảo trì (không bị "rơi" data như hiện tại)
- Dialog daily-sạch cảnh báo rõ nếu vẫn còn đồ thiếu/hỏng cần xử lý

