

## Kế hoạch Sửa Logic - Unified Room List

### I. VẤN ĐỀ PHÁT HIỆN

Sau khi phân tích code và database, tôi phát hiện **3 vấn đề logic**:

| # | Vấn đề | Nguyên nhân | Ảnh hưởng |
|---|--------|-------------|-----------|
| 1 | **Room number hiển thị `P.P101`** | Code thêm `P.` prefix vào room_number (`P.{stop.room_number}`), nhưng room_number trong DB đã có format `Pxxx` | UI hiển thị sai |
| 2 | **Không có nút "Giao hàng cho nhân viên"** | `RouteDetailView` không truyền `onHandoverBatch` cho `DeliveryStepWizard` | Warehouse manager không thể giao batch |
| 3 | **Thiếu logic Batch Handover trong UnifiedRoomList** | Khi gộp views, đã bỏ mất logic `useHandoverBatch()` từ `BatchAccordion` | Không thể chuyển từ `pending` → `released` |

### II. CHI TIẾT VẤN ĐỀ

#### 2.1. Room Number Double Prefix

**Database:**
```
room_number: 'P101', 'P301', 'P102', ...
```

**Code hiện tại (line 415 UnifiedRoomList.tsx):**
```jsx
<span>P.{stop.room_number}</span>  // → "P.P101" 
```

**Fix:**
```jsx
<span>{stop.room_number}</span>  // → "P101" 
```

#### 2.2. Missing onHandoverBatch prop

**DeliveryStepWizard** cần prop `onHandoverBatch` để hiển thị nút khi:
- `status === 'pending'`
- `isWarehouseManager === true`

**Hiện tại RouteDetailView (line 131-143):**
```tsx
<DeliveryStepWizard
  // ... 
  // onHandoverBatch=??? MISSING!
/>
```

#### 2.3. Handover Logic Flow

```text
FLOW HIỆN TẠI (lỗi):
┌─────────────────────────────────────────────────────────────────┐
│ Order pending                                                   │
│                                                                 │
│ DeliveryStepWizard:                                            │
│   "Lấy hàng theo danh sách..."                                 │
│   [Nút KHÔNG HIỆN vì onHandoverBatch undefined]                │
│                                                                 │
│ → STUCK! Không có cách chuyển sang released                    │
└─────────────────────────────────────────────────────────────────┘

FLOW CẦN SỬA:
┌─────────────────────────────────────────────────────────────────┐
│ Order pending                                                   │
│                                                                 │
│ DeliveryStepWizard:                                            │
│   "Lấy hàng theo danh sách..."                                 │
│   [Giao hàng cho nhân viên] ← Handover first batch             │
│                                                                 │
│ → Batch status: open → handed_over                             │
│ → Trigger confirm_receive_order RPC                            │
│ → Order status: pending → released                              │
└─────────────────────────────────────────────────────────────────┘
```

### III. PHƯƠNG ÁN SỬA

#### 3.1. UnifiedRoomList.tsx - Sửa room number display

**Vị trí:** Line 415

**Thay đổi:**
```diff
- <span className="text-sm font-bold shrink-0">P.{stop.room_number}</span>
+ <span className="text-sm font-bold shrink-0">{stop.room_number}</span>
```

#### 3.2. RouteDetailView.tsx - Thêm Handover Batch Logic

**Thêm import và hook:**
```tsx
import { useHandoverBatch } from '@/hooks/useRouteBatch'

// Inside component
const handoverBatch = useHandoverBatch()
```

**Thêm handler:**
```tsx
// Get first batch ID to handover
const firstPendingBatch = route?.batches?.find(b => b.status === 'open')

const handleHandoverFirstBatch = () => {
  if (!firstPendingBatch) return
  handoverBatch.mutate({ batchId: firstPendingBatch.id })
}
```

**Truyền prop cho DeliveryStepWizard:**
```tsx
<DeliveryStepWizard
  // ... existing props
  onHandoverBatch={
    route.status === 'pending' && 
    isStorekeeper && 
    firstPendingBatch 
      ? handleHandoverFirstBatch 
      : undefined
  }
  isHandingOver={handoverBatch.isPending}
/>
```

#### 3.3. UnifiedRoomList.tsx - Thêm Batch Handover trong Batch Divider (optional)

Nếu có nhiều batches, cho phép handover từng batch:

```tsx
{hasMultipleBatches && isWarehouseManager && batchStatus === 'open' && (
  <Button 
    size="sm" 
    onClick={() => handoverBatch.mutate({ batchId: batch.id })}
  >
    Giao batch này
  </Button>
)}
```

### IV. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `UnifiedRoomList.tsx` | Bỏ `P.` prefix trong room number display |
| `RouteDetailView.tsx` | Thêm `useHandoverBatch`, handler, và truyền `onHandoverBatch` prop |

### V. LOGIC TEST SCENARIOS

Sau khi sửa, cần test các flow:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Room number display | Hiển thị `P101` thay vì `P.P101` |
| 2 | WH Manager xem order pending | Thấy nút "Giao hàng cho nhân viên" |
| 3 | Click "Giao hàng cho nhân viên" | Batch chuyển `handed_over`, Order chuyển `released` |
| 4 | Assignee xem order released | Thấy nút "Xác nhận đã nhận đủ hàng" |
| 5 | Click "Xác nhận đã nhận đủ hàng" | Order chuyển `in_progress`, có thể giao từng phòng |

### VI. KẾT LUẬN

Vấn đề chính là **khi gộp views, logic Batch Handover bị mất** vì:
1. `BatchAccordion` có logic `useHandoverBatch()` nhưng không còn được render
2. `RouteDetailView` không có logic thay thế để handover batch
3. `DeliveryStepWizard` không nhận được `onHandoverBatch` prop

Cần bổ sung logic Handover Batch vào `RouteDetailView` và sửa room number display.

