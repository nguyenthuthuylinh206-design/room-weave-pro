
## Kế hoạch: Sửa lỗi Task không hiển thị trong "Công việc của tôi"

### I. NGUYÊN NHÂN GỐC RỄ

Có **2 hệ thống quản lý task riêng biệt nhưng KHÔNG ĐƯỢC ĐỒNG BỘ**:

| Hệ thống | Bảng dữ liệu | Nơi hiển thị |
|----------|--------------|--------------|
| Checkout Inspection | `checkout_inspection_requests` | CheckoutSummaryDialog |
| Housekeeping Tasks | `housekeeping_tasks` | **"Công việc của tôi"** |

**Luồng hiện tại bị lỗi:**
1. Manager yêu cầu kiểm tra checkout → Tạo record trong `checkout_inspection_requests`
2. Gửi notification cho nhân viên
3. **KHÔNG tạo record trong `housekeeping_tasks`**

**Kết quả:** Nhân viên nhận notification nhưng mở "Công việc của tôi" → **Không thấy task nào!**

---

### II. GIẢI PHÁP

Khi tạo `checkout_inspection_requests`, **CŨNG phải tạo** `housekeeping_tasks` tương ứng.

---

### III. CHI TIẾT THAY ĐỔI

#### File: `src/hooks/useCheckoutInspection.ts`

Cập nhật mutation `createInspection` để tạo cả 2 records:

```typescript
// src/hooks/useCheckoutInspection.ts - createInspection mutation

mutationFn: async ({ tenantId, hotelId, roomId, assignedTo, notes }) => {
  // 1. Tạo checkout_inspection_requests như cũ
  const { data: inspection, error } = await supabase
    .from('checkout_inspection_requests')
    .insert({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_id: roomId,
      booking_id: bookingId,
      requested_by: user.id,
      assigned_to: assignedTo,
      status: 'pending',
      notes,
    })
    .select()
    .single()
  
  if (error) throw error
  
  // 2. TẠO THÊM housekeeping_tasks để hiển thị trong "Công việc của tôi"
  const { error: taskError } = await supabase
    .from('housekeeping_tasks')
    .insert({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_id: roomId,
      booking_id: bookingId,
      assigned_to: assignedTo,
      requested_by: user.id,
      task_type: 'checkout_inspection',
      title: 'Kiểm tra checkout',
      priority: 'medium',
      status: 'pending',
      checkout_inspection_id: inspection.id, // Liên kết để đồng bộ
    })
  
  if (taskError) {
    console.error('Error creating housekeeping task:', taskError)
    // Không throw - vẫn trả về inspection
  }
  
  return inspection
}
```

#### File: `src/hooks/useCheckoutInspection.ts` 

Cập nhật `cancelInspection` để hủy cả `housekeeping_tasks`:

```typescript
// cancelInspection mutation
mutationFn: async (inspectionId: string) => {
  // 1. Hủy checkout_inspection_requests
  const { error } = await supabase
    .from('checkout_inspection_requests')
    .update({ status: 'cancelled' })
    .eq('id', inspectionId)
  
  if (error) throw error
  
  // 2. HỦY housekeeping_tasks liên quan (nếu có)
  await supabase
    .from('housekeeping_tasks')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('checkout_inspection_id', inspectionId)
}
```

#### Database Migration

Thêm column `checkout_inspection_id` vào bảng `housekeeping_tasks` để liên kết 2 hệ thống:

```sql
-- Thêm column liên kết
ALTER TABLE housekeeping_tasks 
ADD COLUMN IF NOT EXISTS checkout_inspection_id UUID REFERENCES checkout_inspection_requests(id);

-- Index cho performance
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_checkout_inspection 
ON housekeeping_tasks(checkout_inspection_id) 
WHERE checkout_inspection_id IS NOT NULL;
```

#### Fix notification URL

Cập nhật URL trong notification từ `/rooms/{roomId}` thành `/my-tasks`:

```typescript
// src/components/bookings/CheckoutSummaryDialog.tsx
// Thay đổi actionUrl trong các notification

actionUrl: `/my-tasks`, // Thay vì /rooms/${roomId}
```

---

### IV. WORKFLOW SAU KHI SỬA

```text
1. Manager tạo yêu cầu kiểm tra checkout
   ↓
2. Tạo checkout_inspection_requests (status: pending)
   ↓
3. TẠO housekeeping_tasks với checkout_inspection_id (MỚI)
   ↓
4. Gửi notification với URL /my-tasks
   ↓
5. Nhân viên mở "Công việc của tôi" → Thấy task ✓
   ↓
6. Nhân viên bấm "Kiểm tra phòng" → Chuyển đến /rooms/{id}/check?type=checkout
   ↓
7. Hoàn thành kiểm tra → Auto-update cả 2 bảng
```

---

### V. TẠO DATA CHO RECORD HIỆN TẠI

Với `checkout_inspection_requests` đã tồn tại nhưng chưa có `housekeeping_tasks`:

```sql
-- Tạo housekeeping_tasks cho các checkout_inspection_requests đang pending
INSERT INTO housekeeping_tasks (
  tenant_id, hotel_id, room_id, booking_id, assigned_to, requested_by,
  task_type, title, priority, status, checkout_inspection_id, created_at
)
SELECT 
  cir.tenant_id,
  cir.hotel_id,
  cir.room_id,
  cir.booking_id,
  cir.assigned_to,
  cir.requested_by,
  'checkout_inspection',
  'Kiểm tra checkout',
  'medium',
  cir.status,
  cir.id,
  cir.created_at
FROM checkout_inspection_requests cir
WHERE cir.status IN ('pending', 'in_progress')
  AND NOT EXISTS (
    SELECT 1 FROM housekeeping_tasks ht 
    WHERE ht.checkout_inspection_id = cir.id
  );
```

---

### VI. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/hooks/useCheckoutInspection.ts` | Thêm tạo `housekeeping_tasks` trong `createInspection` và hủy trong `cancelInspection` |
| `src/components/bookings/CheckoutSummaryDialog.tsx` | Sửa `actionUrl` trong notifications thành `/my-tasks` |
| Database Migration | Thêm column `checkout_inspection_id` vào `housekeeping_tasks` |

---

### VII. TESTING

1. Manager mở CheckoutSummaryDialog → Gửi yêu cầu kiểm tra cho nhân viên
2. Kiểm tra database: Có record trong cả `checkout_inspection_requests` VÀ `housekeeping_tasks`
3. Nhân viên mở "Công việc của tôi" → **Thấy task hiển thị**
4. Bấm "Kiểm tra phòng" → Chuyển đến form checkout check
5. Hoàn thành → Task biến mất khỏi danh sách
