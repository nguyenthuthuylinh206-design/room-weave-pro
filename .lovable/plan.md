

## Đánh giá: 3 vấn đề chính chưa hoàn thiện

### ✅ Đã sửa tốt
- Card "Đồ dùng" 1 dòng compact ✓
- Empty state "Phòng chưa thiết lập danh sách đồ" ✓
- Submit dialog đã viết lại bằng câu dễ hiểu ✓
- Chặn back sau khi báo lễ tân ✓
- Navigate về `/my-tasks` ✓
- Phase1ConfirmStep — chỉ 1 nút "Tiếp tục" ✓

### 🔴 Vấn đề còn lại — 3 mục thực tế từ session

#### Vấn đề 1: Bước 5 vẫn còn → **vô nghĩa với checkout**
Ở `RoomCheckPage.tsx` dòng 1452-1454: bước 5 chỉ render `CleaningRequestStep` (mức bẩn). Nhưng cô **đã chọn mức bẩn ở bước 4** (qua field `room_condition` trong ItemsCheckStep / form watch). → Bước 5 hiện ra **một màn hình trống/lặp**, cô bấm "Tiếp theo" 2 lần mới hoàn thành.

→ Phải **gộp bước 5 vào bước 4** (Phase 2). Checkout chỉ còn **4 bước**: 1.Loại check → 2.Mất/hỏng → 3.Báo lễ tân → 4.Ghi đồ + mức bẩn (kết hợp ItemsCheckStep + CleaningRequestStep + nút Hoàn thành).

#### Vấn đề 2: Banner instruction bước 5 (`Đánh giá độ sạch và xác nhận tạo phiếu`) vẫn còn — **cần xóa** khi gộp bước

Dòng 1343-1348 — sẽ tự biến mất khi totalSteps giảm xuống 4.

#### Vấn đề 3: Header phòng có nút back về `/rooms` thay vì về `/my-tasks` (dòng 235)

Cô buồng phòng vào từ `/my-tasks` → bấm back ở header thì về `/rooms` (danh sách quản lý) → lệch context. Cần dùng `navigate(-1)` hoặc check role: staff → `/my-tasks`, manager → `/rooms`.

#### Vấn đề 4 (nhỏ — quan sát từ session): Không có pull-to-refresh khi banner cam đang hiển thị
Đã có `PullToRefresh` ở wrapper, OK. Bỏ qua.

---

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `RoomCheckPage.tsx` | • Giảm `totalSteps` checkout từ 5 → **4**<br>• Bước 4 (Phase 2): gộp `ItemsCheckStep phase=2` + `CleaningRequestStep` + tóm tắt số món → bấm "Hoàn thành" submit luôn<br>• Xóa toàn bộ logic step 5 (dòng 1343-1348 banner, 1450-1454 render)<br>• Logic `currentStep === totalSteps` ở dòng 1485 → bấm Hoàn thành mở dialog xác nhận |
| 2 | `StaffRoomDetailPage.tsx` | Sửa nút back ở header (dòng 235): nếu user là staff → `navigate('/my-tasks')`, manager → `navigate('/rooms')`. Hoặc dùng `navigate(-1)` ưu tiên referrer. |

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- 1 hành động/màn
- Không cho bỏ qua sau khi báo lễ tân

## Kết quả mong đợi sau khi fix

- Checkout còn **4 bước** thay vì 5 → cô bấm ít hơn 1 nút
- Bước cuối tự nhiên: vừa ghi đồ vừa chọn mức bẩn → bấm "Xong - Tạo phiếu" → xong
- Bấm back ở header phòng: staff về `/my-tasks` lấy việc tiếp, không lạc qua trang quản lý

