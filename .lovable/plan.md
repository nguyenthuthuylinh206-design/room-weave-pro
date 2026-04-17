
## Đã rà soát toàn bộ luồng — phát hiện 6 vấn đề thực tế

### 🔴 Vấn đề 1: Trang chi tiết phòng vẫn còn UI mâu thuẫn (chưa fix)

Tại `StaffRoomDetailPage.tsx` dòng 296-387: Card "Đồ dùng trong phòng" vẫn hiển thị "✅ Đầy đủ đồ dùng — 0 đồ dùng" khi phòng chưa setup chuẩn. Đây là **gốc rễ vấn đề user phàn nàn từ đầu** nhưng chưa được fix. Còn cả grid 4 ô loại đồ vô nghĩa khi toàn số 0.

**Ngay phía dưới** dòng 429-439 còn 1 Alert "Khách vừa trả phòng — cần kiểm tra" trùng với CheckoutInspectionBanner ở dòng 282-290 (chỉ ẩn khi có `pendingInspection`, nhưng case `room.status='check_out'` nhưng inspection chưa tạo → 2 banner cùng hiện).

### 🔴 Vấn đề 2: Có **2 nút khởi động checkout** cùng lúc

Banner cam ở trên có nút "Bắt đầu kiểm tra" + Nút fixed bottom "Kiểm tra checkout" → cô bấm cái nào? Vi phạm nguyên tắc "1 hành động tại 1 thời điểm" đã thống nhất.

### 🟡 Vấn đề 3: Dialog "Xác nhận hoàn tất" (cuối Bước 2) còn từ kỹ thuật cũ

Dòng 1097-1111: vẫn hiện "Đánh giá độ sạch: 5/5 sao", "Trạng thái đồ dùng: Đầy đủ", "Thiếu X vật phẩm". Cô buồng phòng không cần thông tin này — họ vừa làm xong sẽ nhớ. Nên rút gọn còn: "Tạo phiếu cho ca dọn phòng tiếp theo?" + tóm tắt ngắn (mức bẩn + số món cần giặt/bổ sung).

### 🟡 Vấn đề 4: Bước 5 (Review cuối) vẫn yêu cầu chấm điểm "độ sạch 1-5 sao"

Dòng 1409-1417: `ReviewStep` + `cleanliness_score`. Cô buồng phòng vừa khai báo ở Bước 2 "Hơi bẩn/Bẩn/Rất bẩn" rồi — sao lại phải chấm sao thêm 1 lần nữa? Trùng lặp.

### 🟡 Vấn đề 5: Nút "Quay lại" giữa Bước 4 (Phase 2) → Bước 3 (Confirm)

Cô đã bấm "Báo lễ tân" rồi mà bấm Back vẫn quay về được màn confirm cũ. Theo yêu cầu user "BẮT BUỘC làm tiếp, không bỏ qua" — cần **chặn back** sau khi `phase1Submitted = true` (chỉ cho back trong Phase 2 thôi, không quay về Phase 1).

### 🟡 Vấn đề 6: Sau khi xong vẫn navigate về `/rooms` (danh sách)

Dòng 870: cô buồng phòng staff về `/rooms` chứ không về `/my-tasks` (nơi cô lấy task). Nên để cô về `/my-tasks` để bốc task tiếp theo, hoặc thêm 2 nút lựa chọn ở màn done.

---

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `StaffRoomDetailPage.tsx` | • Khi `totalItemsInRoom === 0`: hiển thị "Phòng chưa thiết lập danh sách đồ chuẩn" + nút "Liên hệ quản lý / Thêm đồ" thay vì "Đầy đủ đồ dùng — 0"<br>• Rút gọn Item Status Card thành **1 dòng**: "✅ Đầy đủ 24 món" hoặc "⚠️ Thiếu 3/24 món"<br>• **Bỏ grid 4 ô** loại đồ ở tab Tổng quan (đã có ở tab "Đồ trong phòng")<br>• **Xóa Alert dòng 429-439** (trùng với Banner)<br>• **Ẩn nút fixed bottom "Kiểm tra checkout"** khi đã có `CheckoutInspectionBanner` ở trên (chỉ giữ 1 nút) |
| 2 | `RoomCheckPage.tsx` | • Sửa `handleBack` (dòng 746-760): nếu `currentStep === 4` (Phase 2) và `phase1Submitted = true` thì **không cho back về step 3** — chỉ cho back trong nội bộ Phase 2<br>• Sửa Submit Dialog (dòng 1095-1137): thay nội dung kỹ thuật bằng "Tạo phiếu cho ca dọn phòng tiếp theo?" + tóm tắt mức bẩn + số món<br>• Sửa nút "Hoàn thành" thành "Xong - Tạo phiếu cho ca sau"<br>• Sau khi submit thành công (dòng 866-871): hiển thị toast + navigate cho staff về `/my-tasks` thay vì `/rooms` |
| 3 | `RoomCheckPage.tsx` (Bước 5 checkout) | Bỏ phần `ReviewStep` chấm sao (dòng 1413-1414) — chỉ giữ `CleaningRequestStep` (mức bẩn cô đã chọn ở đó). Thêm tóm tắt "Sẽ tạo phiếu: X món giặt, Y món bổ sung, mức bẩn: Z" để cô xem trước khi bấm Hoàn thành |

## Quy tắc giữ nguyên

- Tiếng Việt thuần (đã làm tốt ở Phase1ConfirmStep)
- Không có nút "Bỏ qua / Tạm dừng" sau khi báo lễ tân
- 1 hành động tại 1 thời điểm
- Không hiển thị thông tin mâu thuẫn

## Kết quả mong đợi

- Vào trang phòng → chỉ thấy **1 banner cam** + **1 nút bắt đầu** (không còn 2 nút)
- Phòng chưa setup đồ → không còn câu sai "Đầy đủ — 0 món"
- Sau khi báo lễ tân → KHÔNG quay lui được (đảm bảo quy trình)
- Dialog xác nhận cuối → câu hỏi rõ ràng "Tạo phiếu cho ca sau?" thay vì check-list kỹ thuật
- Xong → về thẳng `/my-tasks` lấy việc tiếp
