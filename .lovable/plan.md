
# Báo cáo audit menu Phòng (Rooms)

Phạm vi: tất cả route `/rooms/*` + flow Kiểm phòng Lean + Bổ sung + Nhận hàng + Tiêu chuẩn phòng + Chi tiết phòng. Đây là **báo cáo phát hiện**, chưa sửa code. Sau khi bạn duyệt mức ưu tiên, tôi sẽ tạo các sprint sửa.

---

## A. Vấn đề NGHIÊM TRỌNG — ảnh hưởng dữ liệu / nghiệp vụ

1. **Bổ sung phòng (Replenish) ghi sổ 2 lần**  
   `RoomReplenishLeanPage` gọi cả `createRoomSupplement` (xuất kho + cộng `room_items`) **và** `submitReplenishLean` (tạo `room_check` + fan-out `room_check_issues` bucket `missing_replace`). Bucket `missing_replace` trong outbox sẽ tự tạo `distribution_request` → có nguy cơ **xuất kho 2 lần** hoặc tạo yêu cầu phân phối ảo. Cần: chọn 1 nguồn sự thật (RPC `submit_replenish_lean` tự xử inventory) hoặc đánh dấu issue ở chế độ "đã xử lý ngay" để outbox bỏ qua.

2. **Periodic check bị âm thầm xuống cấp thành daily ở bảng session**  
   `RoomCheckOverviewPage.sessionType = (checkType === 'periodic' ? 'daily' : checkType)` → 2 nhân viên cùng vào, 1 chọn daily + 1 chọn periodic vẫn share session "daily" → mất phân biệt loại kiểm, audit khó. Cần thêm `'periodic'` vào enum session hoặc tạo session với type thật.

3. **Form sửa phòng còn dùng `Card` nhiều bước**  
   Project memory `hotel-edit-form-pattern` yêu cầu Zod form 1 trang để validate. `RoomFormPage` cần rà lại chia tab/Card có giấu field nào không (445 dòng — rủi ro cao).

4. **Route `/rooms/:id` yêu cầu permission `update`**  
   `App.tsx:433`: xem chi tiết phòng cần action `update`. Nhân viên view-only không xem được chi tiết phòng → vênh với menu sidebar (cho phép vào). Cần đổi thành action `read`/mặc định.

5. **RoomCheckPage legacy 1.619 dòng vẫn được mount cho `inspection`/`room_order_id`**  
   Router fallback giữ file cũ — vẫn còn rủi ro insert rời rạc (không atomic) ở các flow chưa migrate (checkout-inspection legacy). Cần đánh dấu deprecation timeline rõ.

6. **Delivery — không hiển thị "đã giao bao nhiêu / còn lại bao nhiêu"**  
   `ItemRow` chỉ in `Đặt {quantity}`. Khi phiếu giao đã được nhận một phần, hoặc khi user mở lại link cũ, không biết delta. Dễ nhập sai số.

7. **Replenish: không validate khi `quantity_in_stock` = 0**  
   `setOne` clamp về `quantity_in_stock`, nhưng nếu prefill = `Math.min(missing, stock)` cho ra 0 thì user thấy "đồ thiếu" với qty=0 và phải tự nhớ là kho hết. Cần banner "Kho hết — chuyển sang yêu cầu nhập kho" + nút tạo distribution_request.

8. **Quick path bỏ session realtime nhưng không dọn draft Lean**  
   `handleQuickConfirm` xoá session realtime, nhưng nếu user trước đó đã làm dở trong Inspection có draft autosave 24h → lần sau mở Overview vẫn show ResumeDraftSheet "có draft" gây nhầm. Cần `clearLeanDraft(id)` sau khi quick submit.

---

## B. Vấn đề LOGIC — sai số nhỏ / lệch nghiệp vụ

9. **`isOtherSession` không tính tới `sessionType` thật**  
   Khi 1 user đang làm checkout, user khác mở daily → cùng share session → bị block dù mục đích khác. Phù hợp với spec hay không cần xác nhận.

10. **`takeOverSession` không yêu cầu lý do**  
    Manager tiếp quản session người khác mà không ghi reason → audit thiếu. Nên bắt buộc nhập lý do (giống `reopen_room_check`).

11. **Replenish không skip task khi task_id sai tenant**  
    Hook `useSubmitReplenishLean` truyền `taskId` thẳng; nếu link bị copy/share giữa tenant → RPC sẽ reject. Cần precheck phía client (`useTaskById`) báo lỗi VN sớm.

12. **Replenish gọi `useRoomSupplements(id)` không filter hotel/tenant**  
    Cần đảm bảo hook đã filter tenant_id (memory bắt buộc), nếu chưa → data leak khi user có nhiều hotel.

13. **Delivery: clamp `setOne` chỉ chặn trên qty đã đặt**  
    Nếu nhận **nhiều hơn** kế hoạch (giao bonus / hàng bù) thì không cho nhập → buộc user phải sửa phiếu phân phối trước. Đôi khi thực tế cần ghi nhận actual > ordered.

14. **Replenish/Delivery: input số dùng `parseInt` không xử lý NaN**  
    `parseInt(e.target.value || '0', 10)` — khi paste "abc" trả NaN → state hỏng (button +/- vẫn chạy nhưng hiển thị NaN). Cần `Number.isFinite` check.

15. **Tiêu chuẩn phòng (`RoomStandardsPage`) load `useItems({},1,1000)`**  
    Vượt 1000 items sẽ silently mất data (limit Postgres). Cần dùng search server-side bên trong `RoomStandardItemPicker`.

16. **RoomsPage: `useRooms(filters)` không truyền hotelId từ context**  
    Filters chỉ chứa search/floor/type/status. Hotel filter dựa vào HotelContext bên trong hook — cần verify nếu chuyển hotel realtime có invalidate query không.

17. **Reset phòng có thể chạy khi `setupRoom.isPending`**  
    Disable nút chính nhưng `AlertDialogAction` không check pending → user spam Enter có thể trigger 2 lần.

18. **`RoomDetailPage`: `room.status === 'cleaning'` hardcode**  
    State machine v2 dùng nhiều status mới (`occupied_dirty`, `vacant_dirty`, ...). Banner dọn dẹp bỏ sót — cần dùng helper `isDirtyStatus(status)`.

19. **Lean Overview: ngôn ngữ nút "Phòng ổn, gửi nhanh" vs spec memory `room-check-default-ok-ux-v1` ("Phòng OK hoàn toàn")**  
    Không nhất quán terminology — chọn 1 cụm.

20. **`RoomReplenishLeanPage` cleaning toggle chỉ là cờ — không tạo task dọn**  
    Đọc `submitReplenishLean` để xác nhận RPC có dispatch task `cleaning` khi `cleaning_requested=true`. Nếu không → cờ vô nghĩa.

---

## C. UX / Mobile — gây khó người dùng

21. **Mobile portrait: nút +/- chỉ `h-8 w-8` (32px)**  
    Dưới chuẩn 44px (Apple HIG). Cả Replenish + Delivery đều vi phạm → ngón cái dễ tap nhầm.

22. **Replenish không có "Nhận đủ tất cả"** (Delivery có)  
    UX bất đối xứng. Cần shortcut "Bổ sung toàn bộ theo gợi ý" cho missing items.

23. **Delivery: shortage banner chỉ xuất hiện khi `!fullMode && total < ordered`**  
    Khi user giảm rồi tăng lại đúng = ordered nhưng vẫn còn `fullMode=false` → banner ẩn, OK. Nhưng required note vẫn không hiện → có thể submit không note. Logic banner và required note phải đồng bộ qua 1 biến.

24. **Overview: "Bước 1/3" sai khi đi Quick path (thực tế chỉ 1 bước)**  
    Nhân viên đọc "Bước 1/3" rồi bấm Quick → bị hiểu nhầm còn 2 bước nữa. Nên đổi label động.

25. **`RoomDetailPage` desktop full-screen `h-[calc(100vh-7rem)]`**  
    Trên laptop 13" cao 768px, panel Items + Timeline scroll cụt, nhiều khoảng trắng. Cần giới hạn `max-h` thay vì `h` cứng.

26. **RoomsPage Tabs Lưới/Danh sách/Lịch/Sơ đồ** trên màn 868×667 (current viewport)  
    4 tab + filter + density control = tràn ngang ở laptop nhỏ. Cần wrap hoặc gom Density vào popover.

27. **`RoomFormPage`** trên mobile có MobileRoomFormPage riêng — nguy cơ schema lệch giữa 2 file. Cần share Zod schema.

28. **`RoomStandardsPage`**: số lượng input không validate min/max realtime — gõ `0` rồi blur → reject âm thầm.

29. **Lean Overview & Replenish/Delivery KHÔNG có breadcrumb / back to room detail**  
    Chỉ có "Quay lại" navigate(-1). Nếu user vào từ deep link (notification), back về null → trắng trang.

30. **`returnTo` query không validate**  
    Replenish/Delivery `params.get('returnTo')` rồi navigate trực tiếp → open redirect rủi ro (nếu ai chèn `https://evil.com`). Cần whitelist path nội bộ.

---

## D. Hiệu năng / Realtime

31. **`useRoom(id)` được gọi 5+ lần trên cùng 1 luồng** (Detail, Overview, Inspection, Review, Replenish, Delivery)  
    Đảm bảo `staleTime` đủ để chia sẻ cache. Cần verify trong `useRooms.ts`.

32. **`LeanInspectionPage` enrich items qua extra query `items` table**  
    Mỗi lần vào tốn round-trip. Có thể join sẵn ở RPC `get_room_detail` để trả `item_type/is_chargeable/asset_group`.

33. **`RoomsPage` 4 view (`floor`/`map`/`grid`/`list`) mount theo viewMode** — tốt. Nhưng `RoomTapeChart` và `RoomFloorMapView` không lazy import → bundle ban đầu nặng.

34. **Realtime session conflict** chỉ subscribe `room_check_sessions` filter room_id; không filter tenant → channel có thể leak cross-tenant nếu RLS lỏng. Cần verify.

---

## E. Khoảng trống Test

- Không có unit test cho `RoomReplenishLeanPage` flow (double bookkeeping #1).
- Không có integration test cho RoomCheckRouter các nhánh (`?type=delivery`, `?lean=0`, không có cfg).
- Không có test cho `setOne` clamp khi `quantity_in_stock=0`.

---

## Đề xuất ưu tiên xử lý

| Sprint | Nội dung | Thời lượng |
|---|---|---|
| **S1 Critical** | #1 (double-bookkeeping), #2 (periodic session), #4 (permission read), #6 (delivery delta), #8 (quick clear draft) | 1 ngày |
| **S2 UX mobile** | #21 (touch target), #22 (quick fill), #19 (terminology), #24 (step label), #29 (back fallback) | 0.5 ngày |
| **S3 Hardening** | #14 (NaN), #15 (>1000), #18 (status v2), #30 (open redirect), #34 (tenant filter) | 0.5 ngày |
| **S4 Cleanup** | Xoá legacy `RoomCheckPage.tsx` sau pilot, share Zod schema #27, test #E | 1 ngày |

---

## Câu hỏi cần bạn quyết

1. Bắt đầu sửa từ **Sprint 1 (Critical)** luôn, hay bạn muốn tôi đào sâu thêm phần nào (vd: kiểm RPC `submit_replenish_lean` có dispatch cleaning task hay không)?
2. Vấn đề #4 (permission xem chi tiết phòng) — đổi sang `read` hay giữ `update` (theo policy hiện tại)?
3. Có cần tôi chạy thử preview để **chụp lại** UX problem trên mobile (đo touch target thật) không?

