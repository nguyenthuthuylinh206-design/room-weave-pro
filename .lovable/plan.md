

## Bối cảnh từ ảnh

Phiếu `DIS-20260418-075429-5747` đã ở trạng thái **"Đang giao"** (released), nhưng:
- Toast đỏ: **"Hàng chưa được xác nhận nhận - vui lòng xác nhận nhận hàng trước"**
- Nút **GIAO** ở phòng P101 vẫn bấm được → bấm vào báo lỗi trên
- Wizard hiển thị: Chuẩn bị ✅ → Nhận hàng ✅ → Giao hàng (current) → Hoàn thành

## Phân tích vấn đề

Đây là **luồng tự giao** (self-assign): cô vừa là người tạo phiếu vừa là người giao (Nguyễn Thị Thuỳ Linh — assignee, nhưng người tạo `nguyễn thành` ≠ assignee → KHÔNG phải self-assign thực sự).

→ Đúng quy trình:
1. **Storekeeper bấm "Giao batch"** → trạng thái `pending` → `released` ✅ (đã làm)
2. **Assignee (Thuỳ Linh) bấm "Xác nhận nhận hàng"** → `released` → `in_progress` ❌ **CHƯA LÀM**
3. **Assignee bấm GIAO từng phòng** → đánh dấu delivered

Vấn đề: Wizard đang hiển thị bước "Giao hàng" như đã active nhưng thực tế chưa qua bước "Xác nhận nhận hàng". UI cho phép bấm GIAO phòng → backend chặn → toast lỗi.

## Nguyên nhân code

Đọc `RouteDetailView.tsx`:
```ts
onConfirmReceive={route.status === 'released' && isAssignee ? handleConfirmReceive : undefined}
```

Người đang xem (`nguyễn thành`) **KHÔNG phải assignee** (`Thuỳ Linh`) → `isAssignee = false` → nút "Xác nhận nhận hàng" KHÔNG hiện cho họ.

Đồng thời `UnifiedRoomList` truyền `isAssignee={isAssignee}` xuống — nhưng nút GIAO ở P101 vẫn enable → có thể logic enable nút GIAO trong UnifiedRoomList/RoomCard chưa check trạng thái `in_progress` + `isAssignee` đúng → user creator (storekeeper) bấm vào → backend reject.

## Kế hoạch sửa

### 1. Disable nút GIAO khi chưa "Xác nhận nhận hàng"

Trong `UnifiedRoomList.tsx` (và component con render nút GIAO của từng phòng):
- Chỉ enable nút **GIAO** khi `orderStatus === 'in_progress'` **AND** `isAssignee === true`
- Khi `orderStatus === 'released'`: hiển thị nút disabled + tooltip *"Chờ nhân viên xác nhận nhận hàng"*

### 2. Thông báo rõ ràng cho người đang xem

Trong `DeliveryStepWizard` ở bước "Giao hàng" khi `status === 'released'`:
- Nếu là **assignee** → hiện nút lớn **"Xác nhận đã nhận hàng"** (đã có)
- Nếu là **creator/storekeeper** (không phải assignee) → hiện thông báo:
  > *"Đang chờ Thuỳ Linh xác nhận nhận hàng. Bạn có thể nhắc nhân viên mở phiếu này và bấm 'Xác nhận đã nhận hàng'."*
- Nếu là **người khác** → ẩn cả 2

### 3. Sửa progress bar bước hiện tại

Wizard đang tô bước "Giao hàng" như current khi `status === 'released'` — đúng về mặt flow nhưng gây hiểu lầm. Đổi:
- `status === 'released'` → bước **"Nhận hàng"** vẫn là current (chưa hoàn thành đến khi assignee xác nhận)
- `status === 'in_progress'` → bước **"Giao hàng"** mới là current

### 4. (Optional) Cho phép storekeeper xác nhận thay nếu cần

Thêm nút phụ ở DeliveryStepWizard: *"Xác nhận thay nhân viên"* cho storekeeper/manager — dùng khi nhân viên không có thiết bị truy cập. Confirm dialog: *"Bạn xác nhận đã trao tay hàng trực tiếp cho Thuỳ Linh? Hành động này sẽ ghi log."*

## Files cần sửa

| File | Thay đổi |
|---|---|
| `src/components/distribution/components/DeliveryStepWizard.tsx` | Sửa step active khi `released`; thêm message cho creator; thêm nút "Xác nhận thay" cho leader |
| `src/components/distribution/components/UnifiedRoomList.tsx` (và RoomCard con) | Disable nút GIAO khi `orderStatus !== 'in_progress'` hoặc `!isAssignee`; thêm tooltip giải thích |
| `src/components/distribution/components/RouteDetailView.tsx` | Truyền thêm prop `canConfirmOnBehalf` (leader) xuống wizard nếu chọn làm option 4 |

## Câu hỏi xác nhận

1. **Có cần option "Xác nhận thay nhân viên"** cho storekeeper/manager không?  
   - Có → tiện khi NV không kịp bấm  
   - Không → giữ luồng nghiêm ngặt, NV phải tự xác nhận
2. **Disable nút GIAO khi chưa xác nhận** có OK không, hay vẫn cho bấm rồi hiện toast như hiện tại?  
   (Khuyến nghị: disable + tooltip — tránh tạo lỗi không cần thiết)

