## Bối cảnh
Sau khi đọc toàn bộ chain từ tạo phiếu → xuất kho → nhân viên nhận → giao phòng → đóng phiếu, thấy có **3 bug nghiêm trọng** + **6 bug cao/trung bình** đan xen giữa RPC và client. Vấn đề lớn nhất là **tồn kho bị trừ 3 lần** cho cùng một mặt hàng do mỗi RPC trong chain đều tự đụng vào `quantity_in_stock` thay vì chỉ chuyển bucket.

## Tóm tắt vòng đời hiện tại (file:line ở phụ lục)

| Bước | Status | RPC | Stock tác động |
|---|---|---|---|
| Tạo phiếu | `pending` / `released` | `create_distribution_order` | `in_stock -= q`, `pending += q` |
| Trưởng kho Xuất | `pending → released` | `handover_batch` | `in_stock -= q`, `in_use += q` ❌ trừ lần 2 |
| NV xác nhận nhận | `released → in_progress` | `confirm_receive_order` | `in_stock -= q`, `total -= q` ❌ trừ lần 3 |
| NV giao phòng | giữ / `→ completed` | `deliver_stop` | `pending -= q`, `in_use += q` |
| Đóng phiếu | `completed → closed` | `close_route_if_complete` | — |

## Bug list (ưu tiên fix)

### 🔴 Critical
1. **Triple stock deduction** — `quantity_in_stock` bị trừ 3 lần (create + handover + confirm_receive). Tồn kho âm sâu khi nhân viên xác nhận nhận hàng.
2. **`create_distribution_order` không tạo batch** — `handover_batch` đòi batch có sẵn → phiếu mới luôn fail ở bước Xuất kho với "Batch not found" (chỉ phiếu cũ được backfill mới chạy được).
3. **`cancel_distribution_order` lạc hậu** — không nhận `released`, không hoàn `quantity_in_use`, không hoàn item của phòng đã giao một phần → leak tồn kho.

### 🟠 High
4. **Overload `confirm_receive_order`** — còn 1-param + 3-param cùng tồn tại → "Could not choose function" khi PostgREST chọn nhầm.
5. **`handover_batch` không guard role** — bất kỳ user authenticated nào biết `batch_id` đều xuất được kho. Chỉ UI chặn.
6. **Auto-confirm im lặng** trong `UnifiedRoomList.handleDeliver` — bỏ qua bước "Tôi đã nhận đủ hàng", khiến triple-deduct xảy ra sát nhau, không có race guard, và nhân viên không có khoảnh khắc đối chiếu vật lý.
7. **`useCreateDistributionFromSupplement` (số ít)** cập nhật `supplement_requests` 2 lần (RPC + client) → race.

### 🟡 Medium
8. **Label `released` = "Chờ xuất kho"** (trong `orderPresentation.getDisplayStatus`) trùng với `pending` → trưởng kho nhầm.
9. **`close_route_if_complete` không hoàn `quantity_in_use`** cho stop `cannot_access/resolved` → tồn kho kẹt vĩnh viễn.
10. **Hook cũ `useCompleteRoomDelivery` + RPC `complete_room_delivery`** vẫn xuất → nếu UI nào còn gọi sẽ gây double-deduct lần thứ 4.
11. **Hai hook list khác filter** (`useRoutesWithFilters` vs `useDistributionOrders.get_distribution_orders_filtered`) → list trên cùng trang lệch nhau.

### 🟢 Low
12. Người tạo không phải kho bị kẹt ở `completed` (không thấy nút đóng).
13. Không có audit log cho state transitions.

---

## Kế hoạch sửa

### A. State machine + Stock semantics — **1 migration tổng**

Đây là phần xương sống. Quy ước lại stock buckets:

```
quantity_in_stock     = vật lý còn trong kho có thể lấy
quantity_pending      = đã ghi danh phiếu, vẫn còn nằm trong kho (chưa giao tay)
quantity_in_use       = đã xuất khỏi kho cho NV cầm, chưa giao tới phòng
quantity_total        = tổng quản lý = in_stock + pending + in_use
```

Mỗi RPC chỉ chuyển 1 bucket sang bucket khác. Không RPC nào được sửa `quantity_total` (nó là invariant tổng).

1. **`create_distribution_order` v3** — chỉ `in_stock → pending` (giữ nguyên). **Thêm**: tự tạo 1 row trong `distribution_order_batches` (`status='open'`, `batch_number=1`) → fix BUG-3. Snapshot tất cả `quantity_in_stock` đủ mới INSERT.
2. **`handover_batch` v2** — đổi semantic: chỉ chuyển `pending → in_use`, **bỏ** dòng `in_stock -= qty_actual`. Vẫn ghi `inventory_transactions` `staff_assign`. Thêm guard role (`tenant_owner`/`manager`/`warehouse_manager`/`storekeeper` qua `has_role` hoặc check `position.user_level_code`) → fix BUG-1, BUG-5.
3. **`confirm_receive_order` v4** — **drop 1-param overload còn sót** (`DROP FUNCTION IF EXISTS confirm_receive_order(uuid)`), **bỏ** dòng `in_stock -= qty`. Chỉ set status + `received_at/received_by` + chuyển batch sang `received`. Không đụng item buckets. → fix BUG-1, BUG-4.
4. **`deliver_stop` v3** — đổi semantic: `in_use -= q, total -= q` (item đã rời tay nhân viên vào phòng → ra khỏi hệ thống kho, vào tài sản phòng). Bỏ `pending -=`. Ghi `inventory_transactions` `room_deliver` như cũ. → đồng bộ với bucket mới.
5. **`cancel_distribution_order` v2** — nhận thêm `released`/`in_progress`. Restore đúng bucket:
   - phiếu `pending` → `pending → in_stock`
   - phiếu `released` → `in_use → in_stock` (đã ra khỏi kho thì hoàn về)
   - phiếu `in_progress` → hoàn các stop còn `pending/cannot_access` từ `in_use → in_stock`; stop đã `delivered` thì giữ nguyên (item đã ở phòng). → fix BUG-2, BUG-9.
6. **`close_route_if_complete` v2** — nếu còn stop `cannot_access/resolved` chưa giao, hoàn `in_use → in_stock` cho phần đó trước khi đóng. → fix BUG-9.
7. **Drop `complete_room_delivery`** + xoá hook `useCompleteRoomDelivery` để chống regression. → fix BUG-10.
8. **Audit**: dùng helper `log_state_transition` đã có (theo memory Foundation Hardening Phase 1) tại mỗi RPC handover/confirm/deliver/close/cancel. → fix BUG-13(audit).

Migration kèm sẵn **data repair** một lần:
- Tính lại `quantity_in_stock = quantity_total - quantity_pending - quantity_in_use` cho mọi item của tenant có phiếu `released` hoặc `in_progress` trong 30 ngày qua, log số chênh ra `inventory_adjustment_log` (loại `auto_repair_v2`).

### B. Client cleanup

1. **`UnifiedRoomList.tsx`**:
   - Bỏ `canDeliverStops` cho phép `orderStatus === 'released'` → chỉ cho phép khi `in_progress`.
   - Bỏ block auto-confirm im lặng trong `handleDeliver`; thay bằng dialog xác nhận `"Bạn chưa xác nhận đã nhận đủ hàng. Xác nhận bây giờ?"`. → fix BUG-6.
2. **`NextActionCard.tsx`**: nút "Tôi đã nhận đủ hàng" phải là bước rõ ràng, có badge "Bắt buộc trước khi giao".
3. **`orderPresentation.getDisplayStatus`**: đổi label `released` → `"Đã xuất kho — chờ NV nhận"`. → fix BUG-7.
4. **`useCreateDistributionFromSupplement`** (số ít): bỏ block `supabase.from('supplement_requests').update(...)` ở line 65 (RPC đã làm). → fix BUG-5.
5. **`useDistributionOrders.useCompleteRoomDelivery`**: xoá export + xoá mọi import.
6. **`useRouteFilters` vs `useDistributionOrders` list**: chuẩn hoá về 1 hook `useDistributionOrdersList` ăn cùng filter set; deprecate cái còn lại. → fix BUG-11.
7. **`getPendingTask`**: thêm case `status='completed' && isCurrentUserCreator` → priority 2, hiển thị "Chờ trưởng kho đóng phiếu" + nút "Đóng phiếu" nếu user là storekeeper. → fix BUG-12.
8. **`DistributionOrderQuickDialog.canCancel`**: cho phép `released` ngoài `pending/in_progress`.

### C. Versioning & memory

- `APP_VERSION` → `1.1.15`, changelog entry mô tả 3 critical + state machine v2.
- Cập nhật mem://features/inventory/stock-deduction-rules + tạo `mem://features/inventory/distribution-lifecycle-v2` ghi rõ buckets + state machine 5-stage.

## Test cases bắt buộc

1. **Stock invariance**: tạo 1 phiếu 10 cái → handover → confirm receive → deliver 1 phòng → kiểm `total = in_stock + pending + in_use` ở mọi bước, không đổi cho tới `deliver_stop` (deliver mới trừ `total`).
2. **Phiếu mới có batch**: tạo phiếu, query `distribution_order_batches` phải có 1 row `status='open'`. Handover thành công ngay không cần backfill.
3. **Cancel ở `released`**: cancel hoàn 100% về `in_stock`.
4. **Cancel ở `in_progress`** sau khi giao 1/3 phòng: 2/3 hoàn về `in_stock`, 1/3 đã giao không hoàn.
5. **Confirm receive overload**: PostgREST không lỗi "Could not choose function".
6. **Auto-confirm bị chặn**: NV nhấn Giao khi chưa confirm → hiện dialog, không tự gọi RPC.
7. **Role guard**: gọi `handover_batch` bằng user không phải kho → lỗi `INSUFFICIENT_PERMISSION`.
8. **Close không kẹt stock**: stop `cannot_access` được hoàn `in_use → in_stock` khi close.
9. **Filter list đồng bộ**: list page và route filter trả cùng số phiếu cho cùng filter.

## Rollback
- 1 migration ngược: khôi phục RPC bản cũ + restore `quantity_in_stock` từ `inventory_adjustment_log` loại `auto_repair_v2`.
- Client: revert 8 file (UnifiedRoomList, NextActionCard, orderPresentation, useCreateDistributionFromSupplement, useDistributionOrders, useRouteFilters, getPendingTask, DistributionOrderQuickDialog).

## Câu hỏi trước khi bấm Build

**Bạn muốn mình triển khai:**
- (A) **Full** — toàn bộ A+B+C trong 1 đợt (1 migration lớn + sửa 8 file client). An toàn nhất vì stock semantics phải đi cùng nhau.
- (B) **Chia 2 phase** — Phase 1: fix 3 critical + drop overload (BUG 1,2,3,4); Phase 2: UX/role guard/label (BUG 5–13). Phase 1 mở rộng tới khi prod ổn thì làm Phase 2.

Nếu không trả lời, mình mặc định đi theo **A (full)** vì BUG-1 đang làm tồn kho âm thực tế ở mỗi phiếu mới.
