

## Quy trình hoàn chỉnh: Báo cáo đồ thiếu → Tạo phiếu giao hàng → Giao việc cho nhân viên

### Hiểu đúng quy trình nghiệp vụ

Bạn hoàn toàn đúng! Flow logic phải là:

```text
Room Check phát hiện đồ thiếu
          ↓
Tạo Supplement Request (yêu cầu bổ sung)
          ↓
Manager/Supervisor xem xét & duyệt
          ↓
Tạo Distribution Order (phiếu giao hàng) với các item cần bổ sung
          ↓
Gán nhân viên thực hiện giao hàng
          ↓
Nhân viên lấy đồ từ kho → Giao đến phòng
          ↓
Xác nhận giao hàng hoàn thành
          ↓
Supplement Request chuyển sang "Completed"
```

### So sánh với hệ thống hiện tại

| Bước | Hiện tại | Cần sửa |
|------|----------|---------|
| 1. Tạo request | ✅ Có | - |
| 2. Duyệt request | ✅ Có nhưng lỗi logic | Duyệt = tạo Distribution Order |
| 3. Tạo Distribution Order | ❌ Chưa có | **Thêm mới** |
| 4. Gán nhân viên | ❌ Chưa có | **Thêm mới** |
| 5. Giao hàng | ✅ Có (Distribution system) | Tái sử dụng |
| 6. Hoàn thành | ❌ Thiếu liên kết | **Thêm mới** |

---

### Kế hoạch triển khai

#### Phase 1: Sửa flow "Duyệt yêu cầu bổ sung"

##### 1.1 Thay thế nút "Duyệt & Xuất kho" → "Duyệt & Tạo phiếu giao"

**File:** `src/components/supplements/SupplementRequestSheet.tsx`

**Logic mới:**
1. Khi duyệt, KHÔNG tạo outbound transaction trực tiếp
2. Thay vào đó, tạo Distribution Order với:
   - `rooms`: 1 phòng (room_id từ request)
   - `items`: danh sách items từ request
   - `notes`: link tới supplement request
3. Cập nhật `supplement_request.status = 'approved'` 
4. Lưu `distribution_order_id` vào `supplement_request` (cần thêm column)

##### 1.2 Thêm column mới vào database

```sql
ALTER TABLE supplement_requests 
ADD COLUMN distribution_order_id uuid REFERENCES distribution_orders(id);
```

##### 1.3 Dialog chọn nhân viên giao hàng

Khi duyệt, hiển thị dialog cho phép:
- Xem danh sách items cần giao
- Chọn nhân viên thực hiện (dropdown)
- Xác nhận tạo phiếu giao

```text
┌─────────────────────────────────────────────────┐
│   Duyệt & Tạo phiếu giao hàng                   │
├─────────────────────────────────────────────────┤
│  Mã yêu cầu: SUP-20260130-001                   │
│  Phòng: 205                                     │
│                                                 │
│  📦 Items cần giao:                             │
│  ├── Khăn tắm lớn x2                            │
│  ├── Dầu gội x3                                 │
│  └── Bàn chải đánh răng x1                      │
│                                                 │
│  👤 Gán cho nhân viên:                          │
│  [▼ Chọn nhân viên              ]               │
│    ├── Nguyễn Văn A (Tầng 1-3)                  │
│    ├── Trần Thị B (Tầng 4-6)                    │
│    └── Không gán (tự nhận)                      │
│                                                 │
│  [Hủy]                    [Tạo phiếu giao hàng] │
└─────────────────────────────────────────────────┘
```

---

#### Phase 2: Liên kết Distribution Order → Supplement Request

##### 2.1 Thêm `related_supplement_request_id` vào `distribution_orders`

```sql
ALTER TABLE distribution_orders 
ADD COLUMN supplement_request_id uuid REFERENCES supplement_requests(id);
```

##### 2.2 Khi Distribution Order hoàn thành → Auto cập nhật Supplement Request

**File:** `src/hooks/useDistributionOrders.ts`

Trong `useCompleteRoomDelivery`:
- Kiểm tra nếu order có `supplement_request_id`
- Cập nhật `supplement_request.status = 'completed'`
- Cập nhật `supplement_request.completed_at`

---

#### Phase 3: Hook mới để tạo Distribution từ Supplement Request

**File mới:** `src/hooks/useCreateDistributionFromSupplement.ts`

```typescript
export function useCreateDistributionFromSupplement() {
  return useMutation({
    mutationFn: async (data: {
      supplementRequestId: string
      assignedTo?: string
    }) => {
      // 1. Fetch supplement request details
      const { data: request } = await supabase
        .from('supplement_requests')
        .select('*, room:rooms(id, room_number)')
        .eq('id', data.supplementRequestId)
        .single()
      
      // 2. Create distribution order via RPC
      const { data: result } = await supabase.rpc('create_distribution_order', {
        p_tenant_id: request.tenant_id,
        p_hotel_id: request.hotel_id,
        p_created_by: userId,
        p_assigned_to: data.assignedTo || null,
        p_rooms: [{
          room_id: request.room_id,
          items: request.items.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity,
          }))
        }],
        p_notes: `Bổ sung theo yêu cầu ${request.request_code}`,
      })
      
      // 3. Update supplement request with distribution order ID
      await supabase
        .from('supplement_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          distribution_order_id: result.order_id,
        })
        .eq('id', data.supplementRequestId)
      
      return result
    },
  })
}
```

---

#### Phase 4: UI hiển thị trạng thái liên kết

##### 4.1 Trong Supplement Request Sheet

Khi đã có `distribution_order_id`:
- Hiển thị badge "Đã tạo phiếu giao"
- Link đến chi tiết phiếu giao
- Hiển thị trạng thái giao hàng realtime

```text
┌─────────────────────────────────────────────────┐
│  SUP-20260130-001             [Đã duyệt]        │
├─────────────────────────────────────────────────┤
│  Phòng: 205                                     │
│  Loại: Đồ mất                                   │
│                                                 │
│  📦 Phiếu giao hàng: DIST-20260130-015          │
│  ├── Trạng thái: Đang giao                      │
│  ├── Nhân viên: Nguyễn Văn A                    │
│  └── [Xem chi tiết phiếu giao →]                │
│                                                 │
│  📋 Items:                                      │
│  ├── Khăn tắm lớn x2    [✓ Đã giao]             │
│  ├── Dầu gội x3         [⏳ Đang giao]          │
│  └── Bàn chải x1        [⏳ Đang giao]          │
└─────────────────────────────────────────────────┘
```

##### 4.2 Trong Distribution Order Detail

Nếu order được tạo từ supplement request:
- Hiển thị badge "Từ yêu cầu bổ sung"
- Link về supplement request gốc

---

### Sơ đồ flow hoàn chỉnh

```text
                    ┌──────────────────┐
                    │   ROOM CHECK     │
                    │ Phát hiện đồ    │
                    │ thiếu/mất/hỏng   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ SUPPLEMENT       │
                    │ REQUEST          │
                    │ Status: pending  │
                    └────────┬─────────┘
                             │
                   Manager duyệt & chọn nhân viên
                             │
                             ▼
           ┌─────────────────┴─────────────────┐
           │                                    │
           ▼                                    ▼
  ┌──────────────────┐              ┌──────────────────┐
  │ SUPPLEMENT       │              │ DISTRIBUTION     │
  │ REQUEST          │◄────────────►│ ORDER            │
  │ Status: approved │   linked     │ Status: pending  │
  └──────────────────┘              └────────┬─────────┘
                                             │
                                    Nhân viên nhận nhiệm vụ
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ DISTRIBUTION     │
                                    │ ORDER            │
                                    │ Status: in_progress │
                                    └────────┬─────────┘
                                             │
                                    Lấy đồ từ kho → Giao đến phòng
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ DISTRIBUTION     │
                                    │ ORDER            │
                                    │ Status: completed │
                                    └────────┬─────────┘
                                             │
                                    Auto-update status
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ SUPPLEMENT       │
                                    │ REQUEST          │
                                    │ Status: completed │
                                    └──────────────────┘
```

---

### Thứ tự triển khai

| # | Công việc | File | Ước tính |
|---|-----------|------|----------|
| 1 | Migration: Thêm column `distribution_order_id` | Database migration | 5 phút |
| 2 | Hook: `useCreateDistributionFromSupplement` | Tạo file mới | 30 phút |
| 3 | Dialog: Chọn nhân viên khi duyệt | `SupplementRequestSheet.tsx` | 45 phút |
| 4 | Hook: Sửa `useCompleteRoomDelivery` để auto-complete supplement request | `useDistributionOrders.ts` | 20 phút |
| 5 | UI: Hiển thị liên kết trong Sheet | `SupplementRequestSheet.tsx` | 30 phút |
| 6 | UI: Badge "Từ yêu cầu bổ sung" trong Distribution | Component mới | 15 phút |

**Tổng thời gian ước tính: ~2.5 giờ**

---

### Câu hỏi xác nhận

Trước khi triển khai, cần xác nhận:

1. **Kho xuất**: Khi tạo Distribution Order, có cần chọn kho xuất cụ thể không? Hay dùng kho mặc định?

2. **Nhiều phòng**: Nếu có nhiều Supplement Requests cùng lúc, có muốn gom thành 1 Distribution Order không?

3. **Xuất kho thời điểm nào?**: 
   - Khi tạo Distribution Order (trừ kho ngay)?
   - Hay khi nhân viên nhận đồ từ kho (có bước xác nhận)?

