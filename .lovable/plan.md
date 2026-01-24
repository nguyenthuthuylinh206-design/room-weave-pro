

## Kế hoạch: Sửa lỗi Delivery Task không hiển thị

### I. NGUYÊN NHÂN

1. **StopCard.tsx không pass `roomInfo`**: Khi gọi `deliverStop.mutate()`, chỉ truyền `roomOrderId` mà không truyền `roomInfo`, dẫn đến workflow trigger không được kích hoạt

2. **Không có workflow template**: Không có workflow nào được cấu hình trong database với trigger type `delivery_stop_completed`, nên ngay cả khi trigger được gọi, edge function cũng không tạo task

### II. GIẢI PHÁP

#### Bước 1: Cập nhật StopCard.tsx để pass roomInfo

**File:** `src/components/distribution/components/StopCard.tsx`

```typescript
interface StopCardProps {
  stop: RouteStop
  orderCode?: string      // NEW: Thêm order_code
  tenantId?: string       // NEW: Thêm tenant_id  
  hotelId?: string        // NEW: Thêm hotel_id
  canDeliver?: boolean
  // ... other props
}

const handleDeliver = () => {
  deliverStop.mutate(
    { 
      roomOrderId: stop.id,
      roomInfo: {
        room_id: stop.room_id,
        room_number: stop.room_number,
        hotel_id: hotelId,
        tenant_id: tenantId,
        order_code: orderCode,
        items: stop.items.map(i => ({
          item_name: i.item_name,
          quantity: i.quantity
        }))
      }
    },
    { onSuccess: () => onAction?.() }
  )
}
```

#### Bước 2: Cập nhật component cha truyền props

**File:** Component parent (BatchAccordion hoặc RouteDetailPage) truyền `orderCode`, `tenantId`, `hotelId` xuống `StopCard`

#### Bước 3: Thêm fallback - Tự động tạo task trong edge function

Thay vì phụ thuộc vào workflow template, sẽ thêm logic trong edge function để **tự động tạo task trực tiếp** khi nhận trigger `delivery_stop_completed`:

**File:** `supabase/functions/execute-workflow/index.ts`

Thêm xử lý đặc biệt cho `delivery_stop_completed`:
```typescript
// Nếu là delivery_stop_completed và không có workflow, tự động tạo task
if (trigger_type === 'delivery_stop_completed' && workflows.length === 0) {
  await createDeliveryConfirmationTask(supabase, event_data, tenant_id, hotel_id)
  return { success: true, message: 'Auto-created delivery confirmation task' }
}
```

#### Bước 4: Tạo function helper `createDeliveryConfirmationTask`

```typescript
async function createDeliveryConfirmationTask(
  supabase: any,
  eventData: Record<string, any>,
  tenantId: string,
  hotelId?: string
) {
  const { room_id, room_number, order_code, items, room_order_id, item_count } = eventData
  
  const title = `Xác nhận nhận hàng - P.${room_number}`
  const description = `Phiếu ${order_code} - ${item_count || items?.length || 0} items`
  
  const { error } = await supabase
    .from('housekeeping_tasks')
    .insert({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_id: room_id,
      task_type: 'delivery_confirmation',
      title,
      description,
      priority: 'high',
      assigned_to: null, // Unassigned - staff tự claim
      status: 'pending',
      distribution_order_room_id: room_order_id,
    })
  
  if (error) throw error
}
```

### III. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/distribution/components/StopCard.tsx` | Thêm props `orderCode`, `tenantId`, `hotelId` và pass `roomInfo` trong `handleDeliver()` |
| `src/components/distribution/components/BatchAccordion.tsx` (hoặc parent) | Truyền props mới xuống StopCard |
| `supabase/functions/execute-workflow/index.ts` | Thêm fallback tự động tạo task cho `delivery_stop_completed` |

### IV. KẾT QUẢ MONG ĐỢI

Sau khi triển khai:
1. NV giao hàng tap "Giao" → Delivery task được tạo tự động
2. Task hiển thị trong tab "Công việc" của NV phòng (unassigned, có thể claim)
3. Task có đầy đủ thông tin: room number, order code, số lượng items
4. Có liên kết `distribution_order_room_id` để truy vấn chi tiết items

