

## Đánh giá hiện trạng

### ✅ Đã làm tốt
- Checkout còn 4 bước ✓
- Chặn back sau khi báo lễ tân ✓
- Submit dialog viết lại bằng câu dễ hiểu ✓
- Phase1ConfirmStep — chỉ 1 nút "Tiếp tục" ✓
- Header back: staff → `/my-tasks`, manager → `/rooms` ✓
- Item Status Card 1 dòng + empty state ✓

### 🔴 Còn 4 vấn đề thực tế chưa hoàn thiện

#### Vấn đề 1: Bước 4 vẫn render **2 instance ItemsCheckStep** — gây nhầm lẫn nặng
File `RoomCheckPage.tsx`:
- Dòng 1390-1402: `currentStep === 2 && isCheckoutType` → render `ItemsCheckStep phase={1}`
- Dòng 1433-1447: `currentStep === 4 && isCheckoutType` → render lại `ItemsCheckStep phase={2}`

Khi cô đang ở **bước 4**, điều kiện step 2 đã false nên OK ✓. NHƯNG: **CleaningRequestStep ở bước 4** (`<CleaningRequestStep form={form} />` dòng 1446) — file này có chấm sao 1-5 hoặc các option chấm điểm? Cần kiểm tra lại — nếu vẫn có "đánh giá độ sạch 1-5 sao" thì trùng với "mức bẩn" (clean/dirty/very_dirty). Theo plan trước user yêu cầu **bỏ chấm sao** nhưng có thể bị bỏ sót trong CleaningRequestStep — cần xem & gộp UI.

#### Vấn đề 2: Header back về `/my-tasks` cho cả Manager khi Manager vào từ `/my-tasks`
Hiện logic cứng: manager → `/rooms`, staff → `/my-tasks`. Nếu Manager vào từ `/my-tasks` (họ cũng có task) → bị đẩy sang `/rooms` lệch context. Nên ưu tiên `document.referrer` / `navigate(-1)` trước, fallback theo role.

#### Vấn đề 3: Banner instruction step 4 vẫn ghi "Bước 2/2" — nhưng thanh tiến trình hiển thị "4/4"
Dòng 1340: "Bước 2/2: Ghi đồ cần thay & mức bẩn"
Dòng 1265: hiển thị "4/4"

→ Cô buồng phòng nhìn 2 con số khác nhau (2/2 vs 4/4) sẽ rối. Phải **thống nhất**: hoặc dùng `Bước 2/2 (giai đoạn 2)` với progress hiển thị giai đoạn (1=Phase1 gồm step 1-3, 2=Phase2 = step 4) → progress 50% rồi 100%, hoặc bỏ "Bước X/Y" trong banner để tránh mâu thuẫn.

#### Vấn đề 4: Submit dialog đếm "món" sai — đếm số dòng thay vì tổng số lượng
Dòng 1121: `form.watch('items_sent_to_laundry').length` — đây là số **loại đồ** (vd: khăn tắm, ga giường = 2), không phải tổng cái (vd: 5 cái). Cô buồng phòng đọc "Cần giặt: 2 món" trong khi thực tế có 5 cái → hiểu nhầm.

→ Đổi: `items.reduce((s, i) => s + (i.quantity || 0), 0)` để hiển thị tổng cái.

---

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `src/components/rooms/check-steps/CleaningRequestStep.tsx` | Đọc & rà soát: nếu còn slider/sao chấm điểm độ sạch (1-5) → bỏ, chỉ giữ 3 nút "Hơi bẩn / Bẩn / Rất bẩn". Loại bỏ trùng với `room_condition` |
| 2 | `RoomCheckPage.tsx` dòng 67-70 (StaffRoomDetailPage handleHeaderBack) | Đổi sang ưu tiên `document.referrer`: nếu referrer là `/my-tasks` hoặc `/rooms` thì dùng — nếu không có thì fallback theo role. Cùng pattern cho `handleHeaderBack` ở `StaffRoomDetailPage.tsx` |
| 3 | `RoomCheckPage.tsx` dòng 1338-1343 | Sửa banner step 4: bỏ "Bước 2/2" — thay bằng "Ghi đồ cần thay & mức bẩn" thuần (đã có "4/4" ở header rồi). HOẶC đổi progress header sang "Giai đoạn 2/2" khi `phase1Submitted` |
| 4 | `RoomCheckPage.tsx` dòng 1118-1135 | Sửa cách đếm trong dialog tóm tắt: dùng `reduce(sum, qty)` thay vì `.length` để hiển thị "Cần giặt: 5 cái" thay vì "Cần giặt: 2 món" |
| 5 | `RoomCheckPage.tsx` dòng 783, 985 (fallback navigate) | Thay `navigate('/rooms')` thành `navigate(isManager ? '/rooms' : '/my-tasks')` cho nhất quán |

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- 1 hành động/màn
- Không cho bỏ qua sau khi báo lễ tân
- Số liệu hiển thị phải khớp thực tế (tổng cái, không phải số loại)

## Kết quả mong đợi
- CleaningRequestStep & room_condition không trùng (chỉ còn 1 chỗ chọn mức bẩn)
- Cô bấm back ở header trở về đúng nơi đến (`/my-tasks` hoặc `/rooms`) bất kể role
- Banner & progress thống nhất con số (không còn 2/2 vs 4/4)
- Dialog tóm tắt hiển thị **tổng cái thực tế** chứ không phải số dòng

