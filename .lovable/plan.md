

## Vấn đề

Bấm nút **"Tiếp"** / **"Tiếp tục kiểm tra"** trên thẻ task (ở `/my-tasks`) không resume đúng phần việc đang dở mà bắt chọn lại từ đầu.

### Nguyên nhân

`RoomCheckPage` đã có sẵn cơ chế resume hoàn chỉnh:
- `?resume=true` → tự động khôi phục step + dữ liệu form từ `localStorage["room-check-{roomId}"]` mà **không hỏi**.
- Không có flag → hoặc hiện dialog hỏi resume, hoặc reset về step 1/2.

Nhưng `handleContinue` trong `TaskCard.tsx` (dòng 103–117) và `StaffTaskRow.tsx` (dòng 90–102) điều hướng tới `/rooms/:id/check?type=...` **thiếu `&resume=true`** → luôn bị hỏi lại hoặc bắt chọn lại type/step.

Riêng task `cleaning` trong `handleContinue` còn điều hướng về `/rooms/${room_id}` (trang chi tiết phòng) — sai. Task cleaning đang in_progress thì "Tiếp" phải mở lại `CleaningCompleteDialog` để nhân viên hoàn tất chứ không nhảy ra trang phòng.

## Hướng sửa

### 1. Thêm `&resume=true` cho mọi điều hướng "Tiếp"

Trong `handleContinue` (cả `TaskCard.tsx` và `StaffTaskRow.tsx`), với 3 loại task vào `RoomCheckPage`:
- `checkout_inspection` → `/rooms/${id}/check?type=checkout&resume=true&inspection=...`
- `checkin_prep` → `/rooms/${id}/check?type=checkin&resume=true`
- `amenity_request` → `/rooms/${id}/check?type=replenish&resume=true`

`RoomCheckPage` sẽ thấy `shouldAutoResume = true`, đọc `localStorage` và nhảy thẳng vào đúng step + dữ liệu nhân viên đã nhập trước đó. Không hỏi, không reset.

### 2. Thêm `&resume=true` cho `handleStart` luôn

Khi task đã `in_progress` mà nhân viên thoát ra rồi quay lại bấm "Bắt đầu" (trường hợp edge của StaffTaskRow), cần resume đúng. Vì `handleStart` chỉ chạy khi `isPending` nên thực ra chỉ cần đảm bảo: lần đầu vào không có save → flag `resume=true` không gây hại (RoomCheckPage chỉ resume nếu có data trong localStorage). Vẫn truyền cờ này để thống nhất.

### 3. Sửa "Tiếp" cho task `cleaning`

Đổi từ `navigate('/rooms/${room_id}')` sang **mở `CleaningCompleteDialog`** (đã có sẵn `showCleaningComplete` state + dialog ở cuối component). Hành vi giống nút hoàn tất cũ — nhân viên có thể chọn "Mở phòng ngay" hoặc "Kiểm tra nhanh" để kết thúc công việc dọn.

### 4. Đặt nhãn nút thống nhất

Bỏ nhãn "Tiếp" rút gọn cho cleaning. Sau khi cleaning đi qua dialog, các task còn lại đều là inspection-style, dùng nhãn **"Tiếp tục kiểm tra"** cho 3 loại inspection và **"Hoàn tất dọn"** cho cleaning để rõ ý.

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/components/housekeeping/TaskCard.tsx` | `handleContinue`: thêm `&resume=true` cho 3 task inspection; cleaning → mở `CleaningCompleteDialog` thay vì navigate. `handleStart`: thêm `&resume=true`. Đổi nhãn nút cho cleaning thành "Hoàn tất dọn". |
| `src/components/housekeeping/StaffTaskRow.tsx` | Đồng bộ logic y hệt: `handleContinue` + `handleStart` thêm `resume=true`; cleaning mở dialog; nhãn nút phù hợp. |

Không sửa `RoomCheckPage`, không migration, không hook. Cơ chế resume sẵn có chỉ cần được "bật" đúng lúc.

