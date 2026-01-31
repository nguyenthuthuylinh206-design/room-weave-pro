

## Phân tích Quy trình Giao Hàng từ Kho cho Nhân viên

### I. HIỆN TRẠNG HỆ THỐNG

**Database hiện tại cho order `65ec3198...`:**

| Field | Value |
|-------|-------|
| Order Status | `pending` |
| Batch Status | `open` |
| Assigned To | `NV Linh` (staff) |
| Released At | `null` |
| Received At | `null` |

**Code logic hiện tại (RouteDetailView.tsx line 149-153):**

```typescript
onHandoverBatch={
  route.status === 'pending' && isStorekeeper && firstPendingBatch
    ? handleHandoverFirstBatch
    : undefined
}
```

**Điều kiện để hiển thị nút "Giao hàng cho nhân viên":**
1. `route.status === 'pending'` ✅ (đúng)
2. `isStorekeeper === true` ❓ (cần check user đang login)
3. `firstPendingBatch` có tồn tại ✅ (batch_status = 'open')

### II. VẤN ĐỀ PHÁT HIỆN

**Vấn đề: `isStorekeeper` check không đúng**

```typescript
// Line 51-53 RouteDetailView.tsx
const userLevel = (user as any)?.user_level_code || ''
const isStorekeeper = ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel)
```

Nếu user đang login là `staff` (NV Linh - người được phân công), họ KHÔNG phải storekeeper nên nút không hiển thị.

**Workflow chuẩn cần có:**
- Người TẠO phiếu (manager) giao cho NV (staff)
- Manager cần GIAO HÀNG cho staff trước
- Nhưng nếu manager không vào lại phiếu để giao → phiếu bị stuck ở `pending`

### III. QUY TRÌNH GIAO HÀNG CHUẨN

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 0: CHUẨN BỊ                                                             │
│ ─────────────────                                                            │
│ Ai: Quản lý kho / Manager                                                    │
│ Hành động: Tạo phiếu giao hàng từ supplement requests                        │
│ Kết quả:                                                                     │
│   - distribution_orders.status = 'pending'                                   │
│   - distribution_order_batches.status = 'open'                               │
│   - Chọn assigned_to (nhân viên sẽ giao)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: GIAO HÀNG CHO NHÂN VIÊN (Handover Batch)                             │
│ ────────────────────────────────────────────────────                         │
│ Ai: Quản lý kho / Storekeeper (user_level = manager, warehouse_manager,      │
│     storekeeper, tenant_owner)                                               │
│ Điều kiện:                                                                   │
│   - Order status = 'pending'                                                 │
│   - Batch status = 'open'                                                    │
│   - User có quyền storekeeper                                                │
│ Hành động: Click "Giao hàng cho nhân viên"                                   │
│ RPC: handover_batch(batch_id)                                                │
│ Kết quả:                                                                     │
│   - Batch status: 'open' → 'handed_over'                                     │
│   - Order status: 'pending' → 'released'                                     │
│   - KHÔNG trừ tồn kho (chỉ chuyển trạng thái)                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: NHÂN VIÊN XÁC NHẬN NHẬN HÀNG (Confirm Receive)                       │
│ ────────────────────────────────────────────────────────                     │
│ Ai: Nhân viên được phân công (assigned_to)                                   │
│ Điều kiện:                                                                   │
│   - Order status = 'released'                                                │
│   - User là assignee                                                         │
│ Hành động: Click "Xác nhận đã nhận đủ hàng"                                  │
│ RPC: confirm_receive_order(order_id)                                         │
│ Kết quả:                                                                     │
│   - Order status: 'released' → 'in_progress'                                 │
│   - Batch status: 'handed_over' → 'received'                                 │
│   - TRỪ TỒN KHO (inventory_transactions created)                            │
│   - items.quantity_in_stock giảm                                             │
│   - items.quantity_pending tăng                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: GIAO ĐẾN TỪNG PHÒNG (Deliver Stop)                                   │
│ ──────────────────────────────────────────                                   │
│ Ai: Nhân viên được phân công (assignee)                                      │
│ Điều kiện:                                                                   │
│   - Order status = 'in_progress'                                             │
│   - Room stop_status = 'pending'                                             │
│ Hành động: Click nút "GIAO" tại từng phòng                                   │
│ RPC: deliver_stop(room_order_id)                                             │
│ Kết quả:                                                                     │
│   - Stop status: 'pending' → 'delivered'                                     │
│   - room_items được cập nhật                                                │
│   - items.quantity_pending giảm                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: HOÀN THÀNH (Complete/Close)                                          │
│ ───────────────────────────────────                                          │
│ Ai: Manager/Leader                                                           │
│ Điều kiện:                                                                   │
│   - Tất cả stops đã delivered/resolved                                       │
│   - Không còn stop nào pending hoặc cannot_access                           │
│ Hành động: Click "Đóng phiếu"                                               │
│ RPC: close_route_if_complete(order_id)                                       │
│ Kết quả:                                                                     │
│   - Order status: 'in_progress' → 'completed' → 'closed'                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### IV. NGUYÊN NHÂN CHƯA CÓ NÚT "GIAO HÀNG CHO NHÂN VIÊN"

**Kịch bản lỗi:**
1. Manager tạo phiếu, assign cho staff
2. Manager ĐÓNG phiếu mà KHÔNG click "Giao hàng cho nhân viên"
3. Staff vào xem phiếu → **Không thấy nút gì** vì:
   - Staff không phải `isStorekeeper` → không có nút "Giao hàng"
   - Order không phải `released` → không có nút "Xác nhận nhận hàng"

**Vấn đề UX:**
- Manager cần QUAY LẠI phiếu để giao → dễ quên
- Staff bị stuck → không biết phải làm gì

### V. GIẢI PHÁP ĐỀ XUẤT

#### Giải pháp 1: Auto-Release khi tạo phiếu (đã có sẵn)

Khi tạo phiếu từ supplement requests, có option `auto_release`:
- Nếu `auto_release = true` → Phiếu tự động chuyển `released`
- Staff có thể nhận hàng ngay

**Đây là flow "Giao ngay" cho trường hợp đơn giản.**

#### Giải pháp 2: Hiển thị trạng thái rõ ràng hơn cho Staff

Khi staff vào phiếu đang `pending`:
- Hiển thị message: "Chờ quản lý kho giao hàng cho bạn"
- Có thể thêm nút "Nhắc nhở" để gửi notification cho manager

**Code hiện tại đã có (line 113-120 DeliveryStepWizard.tsx):**
```typescript
} else if (isAssignee) {
  return (
    <div className="flex items-center gap-3 text-amber-600">
      <Clock className="h-5 w-5" />
      <p className="text-sm">Vui lòng chờ quản lý kho giao hàng cho bạn</p>
    </div>
  )
}
```

#### Giải pháp 3: Cho phép người tạo phiếu cũng có thể giao

Mở rộng điều kiện `isStorekeeper` để include người tạo phiếu:

```typescript
const isStorekeeper = 
  ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel) ||
  user?.id === route?.created_by  // Người tạo phiếu cũng có thể giao
```

### VI. KẾ HOẠCH TRIỂN KHAI

#### 6.1. Sửa điều kiện `isStorekeeper` (RouteDetailView.tsx)

**Thay đổi:**
```typescript
// Hiện tại
const isStorekeeper = ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel)

// Sau khi sửa
const isStorekeeper = 
  ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel) ||
  user?.id === route?.created_by
```

#### 6.2. Cải thiện messaging trong DeliveryStepWizard

**Khi staff chờ:**
- Hiển thị tên người cần giao hàng (creator hoặc storekeeper)
- Có thể thêm nút "Gửi nhắc nhở" (optional, tương lai)

### VII. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `RouteDetailView.tsx` | Mở rộng điều kiện `isStorekeeper` để include `created_by` |
| `DeliveryStepWizard.tsx` | (Optional) Cải thiện message khi staff chờ |

### VIII. TEST SCENARIOS

| # | Vai trò | Order Status | Expected UI |
|---|---------|--------------|-------------|
| 1 | Manager (creator) | `pending` | Thấy nút "Giao hàng cho nhân viên" |
| 2 | Storekeeper | `pending` | Thấy nút "Giao hàng cho nhân viên" |
| 3 | Staff (assignee) | `pending` | Thấy message "Chờ quản lý kho giao..." |
| 4 | Staff (assignee) | `released` | Thấy nút "Xác nhận đã nhận đủ hàng" |
| 5 | Staff (assignee) | `in_progress` | Thấy danh sách phòng + nút "GIAO" |
| 6 | Manager | `in_progress` | Thấy progress, không có action |
| 7 | Manager | `completed` | Thấy nút "Đóng phiếu" |

### IX. TÓM TẮT QUY TRÌNH

```text
TẠO PHIẾU              GIAO CHO NV           NV NHẬN HÀNG           GIAO PHÒNG            HOÀN THÀNH
(Manager)              (Manager/Kho)         (Staff)                (Staff)               (Manager)
    │                      │                     │                      │                     │
    ▼                      ▼                     ▼                      ▼                     ▼
┌────────┐            ┌────────┐            ┌────────┐            ┌────────┐            ┌────────┐
│pending │ ────────▶ │released│ ────────▶ │in_prog │ ────────▶ │completed│ ────────▶ │closed  │
└────────┘            └────────┘            └────────┘            └────────┘            └────────┘
                      handover_              confirm_              deliver_             close_route
                      batch()                receive_order()       stop()              if_complete()

               Không trừ kho          TRỪ KHO              Cập nhật             
                                      (qty_in_stock ↓)     room_items           
                                      (qty_pending ↑)      (qty_pending ↓)      
```

