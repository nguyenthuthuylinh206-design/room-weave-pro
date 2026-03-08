

## Kết quả kiểm tra logic liên module: Kho - Phòng - Giặt là - Bảo trì

### Tổng quan

Đã review cross-module logic giữa 4 hệ thống: `items` (tồn kho tổng), `warehouse_stock` (tồn kho theo kho), `room_items` (đồ trong phòng), laundry, và maintenance. Phát hiện **3 vấn đề** cần fix.

---

### Bug 1: `atomic_item_to_laundry` / `atomic_item_lost` / `atomic_item_consumed` KHÔNG cập nhật `warehouse_stock` (TRUNG BÌNH)

**Vấn đề**: Khi Room Check (daily/checkout), các RPC atomic chỉ cập nhật bảng `items` (tổng):
- `atomic_item_to_laundry`: trừ `quantity_in_stock`, cộng `quantity_in_laundry` trong `items`
- `atomic_item_lost`: trừ `quantity_in_stock`, cộng `quantity_lost` trong `items`  
- `atomic_item_consumed`: trừ `quantity_in_stock` trong `items`

**Nhưng KHÔNG trừ `warehouse_stock.quantity`** tương ứng. Kết quả: bảng `items` và `warehouse_stock` bị lệch nhau theo thời gian. Ví dụ: item có 100 trong kho, checkout mất 5 → `items.quantity_in_stock = 95` nhưng `warehouse_stock.quantity` vẫn = 100.

**Fix**: Cập nhật 3 RPC để trừ `warehouse_stock` tương ứng. Cần thêm parameter `p_warehouse_id` (kho mặc định của hotel) hoặc tự lookup trong RPC.

---

### Bug 2: `useCreateRoomCheck` thiếu invalidation `warehouse-stock` và `warehouses-with-stats` (NHỎ)

**File**: `src/hooks/useRoomChecks.ts` line 932-948

`onSuccess` invalidate `items` nhưng KHÔNG invalidate `warehouse-stock` và `warehouses-with-stats`. Sau khi fix Bug 1 (cập nhật warehouse_stock trong RPC), cần thêm invalidation để UI kho cập nhật.

**Fix**: Thêm 2 dòng invalidation.

---

### Bug 3: `items_replaced` chỉ cập nhật `room_items`, KHÔNG cập nhật `items` hoặc `warehouse_stock` (NHỎ)

**Vấn đề**: Khi nhân viên đánh dấu "đồ thay thế" (items_replaced) trong Room Check, code chỉ tăng `room_items.quantity` (số lượng đồ trong phòng). Nhưng không trừ `items.quantity_in_stock` hay `warehouse_stock.quantity`.

**Phân tích**: Đây có thể là **by design** nếu items_replaced chỉ là ghi nhận (đồ đã được đưa vào phòng từ Distribution Order trước đó, đã trừ kho rồi). Cần xác nhận:
- Nếu items_replaced là ghi nhận từ distribution → OK, không cần fix
- Nếu items_replaced là trực tiếp lấy từ kho → Cần trừ kho

---

### Các phần ĐÃ KIỂM TRA - KHÔNG CÓ LỖI

1. **Checkout → Cleaning → Housekeeping Task**: Logic đúng. Checkout tự tạo cleaning task, chuyển room status sang `cleaning`.
2. **Checkout → Laundry Request → Draft Batch**: Logic đúng. Đồ gửi giặt tạo laundry_request, auto-add vào draft batch.
3. **Checkout → Supplement Request**: Logic đúng. Đồ tiêu hao/mất tạo supplement_request.
4. **Checkout → Maintenance Request**: Logic đúng. Chỉ tạo cho equipment/furniture, priority mapping chính xác.
5. **Maintenance Check → Room Status**: Logic đúng. `maintenance → vacant` với guard `.eq('status', 'maintenance')`.
6. **Laundry Return → Items**: `create_laundry_return_transaction` RPC xử lý auto-repair nếu `quantity_in_laundry` bị lệch, đảm bảo constraint `items_quantities_valid`.
7. **Daily Check → Laundry + Supplement Requests**: Logic đúng, tạo request song song.

---

### Kế hoạch fix

1. **Migration SQL**: Cập nhật 3 RPC (`atomic_item_to_laundry`, `atomic_item_lost`, `atomic_item_consumed`) để cũng trừ `warehouse_stock` - lookup kho mặc định của hotel từ item.
2. **Cache invalidation**: Thêm `warehouse-stock` và `warehouses-with-stats` vào `onSuccess` của `useCreateRoomCheck`.
3. **Xác nhận `items_replaced`**: Cần user xác nhận có phải by design không trước khi fix.

**Files thay đổi**: 
- `supabase/migrations/` (new migration SQL)
- `src/hooks/useRoomChecks.ts`

