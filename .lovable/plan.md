

## Kế hoạch: Quy trình giao nhận hàng hoàn chỉnh A → Z

### I. QUY TRÌNH TỔNG QUAN (END-TO-END)

```
[A] TẠO PHIẾU GIAO → [B] DUYỆT XUẤT KHO → [C] NV KHO GIAO BATCH → [D] NV GIAO NHẬN BATCH
→ [E] NV GIAO ĐẾN PHÒNG → [F] TẠO TASK XÁC NHẬN → [G] NV PHÒNG XÁC NHẬN NHẬN HÀNG  
→ [H] TẠO TASK DỌN PHÒNG/BỔ SUNG → [I] HOÀN TẤT → [J] ĐÓNG ROUTE
```

---

### II. CHI TIẾT TỪNG BƯỚC

#### [A] TẠO PHIẾU GIAO (Distribution Order)
- **Ai thực hiện:** Quản lý kho / Manager
- **Input:** Danh sách phòng + items cần giao
- **Output:** Distribution Order với status = `pending`
- **File liên quan:** `useCreateDistributionOrder`

#### [B] DUYỆT XUẤT KHO (Release Order)
- **Ai thực hiện:** Quản lý kho
- **Action:** Set status = `released`, tạo batches
- **Inventory impact:** Trừ `quantity_in_stock`, cộng `quantity_in_transit`
- **File liên quan:** `useReleaseDistributionOrder`

#### [C] NV KHO GIAO BATCH (Handover Batch)
- **Ai thực hiện:** Nhân viên kho (Storekeeper)
- **Action:** Gọi RPC `handover_batch`
- **Output:** Batch status = `handed_over`
- **UI:** `BatchAccordion.tsx` → Button "Giao batch"

#### [D] NV GIAO NHẬN BATCH (Receive Batch)
- **Ai thực hiện:** Nhân viên được giao (Assignee)
- **Action:** Gọi RPC `receive_batch`
- **Output:** Batch status = `received`
- **UI:** `BatchAccordion.tsx` → Button "Nhận batch"

#### [E] NV GIAO ĐẾN PHÒNG (Deliver Stop)
- **Ai thực hiện:** Assignee
- **Action:** Gọi RPC `deliver_stop`
- **Output:** `stop_status = 'delivered'`
- **QUAN TRỌNG:** Đây là lúc trigger tạo Task xác nhận nhận hàng

#### [F] TẠO TASK XÁC NHẬN NHẬN HÀNG (NEW - Auto)
- **Trigger:** Khi `deliver_stop` thành công
- **Action:** Tự động tạo `housekeeping_task` với:
  ```typescript
  {
    task_type: 'delivery_confirmation', // NEW TYPE
    title: 'Xác nhận nhận hàng - P.{room_number}',
    description: '{order_code} - {item_count} items',
    priority: 'high',
    assigned_to: null, // Unassigned - ai đến phòng đó claim
    room_id: ...,
    metadata: { distribution_order_room_id: ... }
  }
  ```
- **UI:** Task hiển thị trong `StaffTasksTab` → Tab "Chờ nhận"

#### [G] NV PHÒNG XÁC NHẬN NHẬN HÀNG (Confirm Delivery)
- **Ai thực hiện:** Nhân viên phòng đang ở phòng đó
- **Flow:**
  1. NV thấy task trong danh sách công việc
  2. Claim task (nếu chưa được gán)
  3. Tap "Bắt đầu" → status = `in_progress`
  4. Kiểm tra đồ, xác nhận số lượng
  5. Tap "Xác nhận nhận đủ" → gọi RPC `confirm_delivery_from_room_check`
  6. Task status = `completed`
- **Alternative:** Nếu thiếu hàng → Reject với lý do

#### [H] TẠO TASK TIẾP THEO (Optional - Auto)
- **Trigger:** Khi task xác nhận hoàn thành
- **Điều kiện:** Dựa trên room status và booking
- **Các trường hợp:**
  - Room đang `cleaning` → Tạo task "Hoàn thành dọn phòng"
  - Room đang `vacant` → Tạo task "Bổ sung đồ dùng"
  - Room có booking sắp check-in → Tạo task "Chuẩn bị check-in"

#### [I] HOÀN TẤT (Complete)
- **Khi:** Tất cả stops đều `delivered` hoặc `resolved`
- **Action:** Order status = `completed`

#### [J] ĐÓNG ROUTE (Close Route)
- **Ai thực hiện:** Leader/Manager
- **Action:** Order status = `closed`
- **Condition:** Tất cả batches đều `done`

---

### III. THAY ĐỔI DATABASE

#### 1. Thêm task_type mới
```sql
-- Thêm 'delivery_confirmation' vào housekeeping_tasks.task_type enum
ALTER TABLE housekeeping_tasks 
DROP CONSTRAINT IF EXISTS housekeeping_tasks_task_type_check;

ALTER TABLE housekeeping_tasks 
ADD CONSTRAINT housekeeping_tasks_task_type_check 
CHECK (task_type IN ('checkout_inspection', 'cleaning', 'checkin_prep', 'amenity_request', 'delivery_confirmation', 'other'));
```

#### 2. Thêm cột liên kết
```sql
-- Liên kết task với distribution_order_room
ALTER TABLE housekeeping_tasks 
ADD COLUMN distribution_order_room_id UUID REFERENCES distribution_order_rooms(id);
```

---

### IV. THAY ĐỔI CODE

#### 1. Cập nhật types
**File:** `src/types/housekeeping.types.ts`
```typescript
export type TaskType = 'checkout_inspection' | 'cleaning' | 'checkin_prep' | 
                       'amenity_request' | 'delivery_confirmation' | 'other'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  // ...existing
  delivery_confirmation: 'Xác nhận nhận hàng',
}

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  // ...existing
  delivery_confirmation: 'PackageCheck',
}
```

#### 2. Trigger tạo task khi deliver_stop
**File:** `src/hooks/useRouteBatch.ts` - trong `useDeliverStop`
```typescript
onSuccess: async (result) => {
  // Existing invalidations...
  
  // NEW: Trigger workflow to create delivery confirmation task
  await triggerWorkflow({
    triggerType: 'delivery_stop_completed',
    eventData: {
      room_order_id: result.room_order_id,
      room_id: roomOrderId, // Need to pass this
      room_number: ...,
      order_code: ...,
      items: [...],
    },
    tenantId: user.tenant_id,
    hotelId: hotelId,
  })
}
```

#### 3. Xử lý task xác nhận trong TaskCard
**File:** `src/components/housekeeping/TaskCard.tsx`
- Thêm icon `PackageCheck` cho `delivery_confirmation`
- Thay "Hoàn thành" bằng "Xác nhận nhận hàng" cho task type này
- Khi click → Mở modal xác nhận với danh sách items

#### 4. Component mới: DeliveryConfirmationModal
**File:** `src/components/housekeeping/DeliveryConfirmationModal.tsx`
```typescript
interface DeliveryConfirmationModalProps {
  taskId: string
  roomOrderId: string
  items: { item_name: string; quantity: number }[]
  onConfirm: () => void
  onReject: (reason: string) => void
}
```
- Hiển thị danh sách items cần xác nhận
- Nút "Nhận đủ" và "Thiếu hàng"

#### 5. Xóa PendingDeliveriesSection khỏi RoomCheck
**File:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`
- Xóa component `PendingDeliveriesSection`
- Logic xác nhận nhận hàng giờ nằm trong Task system

#### 6. Cập nhật StaffTasksTab
**File:** `src/components/housekeeping/StaffTasksTab.tsx`
- Thêm filter riêng cho `delivery_confirmation` tasks
- Hiển thị badge đặc biệt cho tasks này

---

### V. WORKFLOW AUTOMATION (OPTIONAL)

#### Template: "Giao hàng → Tạo task xác nhận"
```json
{
  "name": "Tự động tạo task xác nhận nhận hàng",
  "trigger_type": "delivery_stop_completed",
  "conditions": [],
  "actions": [
    {
      "action_type": "create_housekeeping_task",
      "config": {
        "task_type": "delivery_confirmation",
        "priority": "high",
        "assignment_mode": "auto_rotate",
        "due_at_offset": 30,
        "title_template": "Xác nhận nhận hàng - P.{{room_number}}",
        "description_template": "Phiếu {{order_code}} - {{item_count}} items"
      }
    }
  ]
}
```

---

### VI. UI/UX FLOW CHO NHÂN VIÊN

#### A. Nhân viên kho (Storekeeper)
1. Vào Distribution Orders → Chọn order
2. Giao từng batch cho NV giao hàng

#### B. Nhân viên giao hàng (Delivery)
1. Nhận batch từ kho
2. Đi đến từng phòng, tap "Đã giao đến phòng"
3. Không cần xác nhận - task tự tạo cho NV phòng

#### C. Nhân viên phòng (Housekeeping Staff)
1. Vào tab "Công việc" 
2. Thấy task "Xác nhận nhận hàng - P.101" trong danh sách
3. Claim task (nếu unassigned)
4. Tap "Bắt đầu" → Đến phòng
5. Kiểm tra đồ, tap "Xác nhận nhận đủ" hoặc "Thiếu hàng"
6. Task hoàn thành → Có thể có task tiếp theo

---

### VII. THỨ TỰ TRIỂN KHAI

| Phase | Nội dung | Priority |
|-------|----------|----------|
| 1 | Database migration: thêm task_type + column | High |
| 2 | Update types + hooks | High |
| 3 | DeliveryConfirmationModal component | High |
| 4 | Update TaskCard cho task type mới | High |
| 5 | Trigger tạo task trong useDeliverStop | High |
| 6 | Xóa PendingDeliveriesSection | Medium |
| 7 | Workflow template | Low |
| 8 | Update StaffTasksTab với filter mới | Medium |

---

### VIII. KẾT QUẢ MONG ĐỢI

| Metric | Hiện tại | Sau triển khai |
|--------|----------|----------------|
| Tracking xác nhận | Không rõ ràng | Có task ID, timestamp, người thực hiện |
| Workflow tiếp theo | Manual | Có thể auto-trigger |
| Visibility cho manager | Phải vào từng phòng | Xem dashboard tasks |
| Mobile UX | Nằm trong RoomCheck | Nằm trong Tasks tab, rõ ràng hơn |
| Reject flow | Không có | Có lý do, notification |

