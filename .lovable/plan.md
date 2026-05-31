## Vấn đề

Tab **Lịch giá theo ngày** (`/settings/pricing?tab=daily`) hiển thị dropdown "Chọn hạng phòng" trống mặc dù DB đã có 8 `room_types` (4 cho mỗi tenant, `hotel_id = NULL`, `status = active`).

## Nguyên nhân

Trong `PricingDailyPage.tsx` (dòng 53–57), `useRoomTypes()` trả về toàn bộ hạng phòng của tenant. Filter `visibleTypes` cho phép `rt.hotel_id = null` đi qua, nên nguyên tắc không sai. Nhưng:

1. Dropdown thực tế trống → khả năng cao `useRoomTypes` trả mảng rỗng vì:
   - Hook không truyền filter `status = 'active'` nhưng cũng không lọc inactive (không phải lỗi này).
   - **`useRoomTypes` không filter theo `hotel_id`** nhưng cũng không phải lý do trống.
   - Thực tế: hook chạy đúng, nhưng UI hiển thị "Chọn hạng phòng" placeholder vì state `selectedRoomTypeId` chưa được set, và **dropdown render đúng list** — vậy nếu user nói "chưa có hạng phòng" → có thể họ thấy:
     - dropdown rỗng (no items in SelectContent), HOẶC
     - placeholder "Chọn hạng phòng" mà không tự chọn cái đầu.

2. Một khả năng khác: `selectedHotel` chưa được set (user chưa pick hotel) → hiện Alert "Vui lòng chọn khách sạn" (dòng 312). Nhưng user đã ở route `tab=daily` nên có thể đã qua check này.

## Mục tiêu

- Đảm bảo dropdown luôn liệt kê đầy đủ hạng phòng của tenant (kể cả khi `hotel_id = NULL` — vốn áp dụng cho mọi hotel).
- Hiển thị empty state rõ ràng kèm CTA "Tạo hạng phòng" khi thực sự không có dữ liệu, thay vì dropdown im lặng.
- Tự động chọn hạng phòng đầu tiên (đã có effect ở dòng 73–75 — verify còn chạy đúng).

## Thay đổi

### A. Logic
- Trong `PricingDailyPage.tsx`:
  - Thêm log debug tạm thời để xác nhận `roomTypes.length` và `visibleTypes.length`.
  - Thêm empty state UI khi `!loadingTypes && visibleTypes.length === 0`: panel với icon + dòng "Chưa có hạng phòng cho khách sạn này" + nút "Tạo hạng phòng" link tới `/settings/categories?tab=rooms` hoặc `/rooms/standards`.
  - Giữ filter `hotel_id` nhưng cho phép cả `rt.hotel_id === null` (đã đúng).

### B. UI
- Thay placeholder Select bằng disabled state khi list rỗng + tooltip "Tạo hạng phòng trước".
- Disable cả 2 nút "Quản lý gói giá" và "Chỉnh sửa đồng loạt" (đã có guard `!selectedRoomTypeId`).

### C. Không đổi
- Schema, RPC, hooks `useRoomTypes` / `usePricingDaily` — không sửa.

### F. Test cases
1. Tenant có ≥1 room_type với `hotel_id = NULL` → dropdown liệt kê tất cả, auto chọn cái đầu.
2. Tenant chưa có room_type → hiển thị empty panel với CTA tạo mới.
3. Hạng phòng có `hotel_id` khác hotel đang chọn → không hiện trong list.
4. Chuyển hotel khác (tất cả room_types đều `hotel_id = NULL`) → list giữ nguyên.

### G. Rollout
- Bump `APP_VERSION` `1.1.25`, changelog: "Sửa lỗi tab Lịch giá theo ngày không hiển thị hạng phòng + thêm empty state."
- Không cần migration.

## File sẽ sửa
- `src/pages/settings/PricingDailyPage.tsx` — empty state + log debug ngắn.
- `src/lib/app-version.ts`, `public/changelog.json`.

## Câu hỏi cần xác nhận
Bạn đang thấy chính xác hiện tượng nào?
- (a) Dropdown bấm vào không có option nào.
- (b) Dropdown có option nhưng không tự chọn → grid trống.
- (c) Trang hiện Alert đỏ "Vui lòng chọn khách sạn".

Nếu là (a) sẽ làm theo plan trên. Nếu (b)/(c) sẽ điều chỉnh hướng fix tương ứng.
