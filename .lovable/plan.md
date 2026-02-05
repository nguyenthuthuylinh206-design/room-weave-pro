
## Kế hoạch: Sửa lỗi tạo phiếu giao hàng từ Supplement Request

### VẤN ĐỀ ĐÃ XÁC ĐỊNH

**Lỗi**: `PGRST203 - Could not choose the best candidate function`

**Nguyên nhân**: Database có 2 versions của RPC `create_distribution_order`:
- Version 6 params: `(p_tenant_id, p_hotel_id, p_created_by, p_assigned_to, p_rooms, p_notes)`
- Version 8 params: `(p_tenant_id, p_hotel_id, p_created_by, p_assigned_to, p_rooms, p_notes, p_auto_release, p_supplement_request_ids)`

Khi hook `useCreateDistributionFromSupplement.ts` gọi RPC với 6 params, PostgreSQL không thể quyết định dùng version nào vì cả 2 đều có thể match (version 8 có default values cho 2 params cuối).

### SO SÁNH CÁC HOOKS

| Hook | Params | Trạng thái |
|------|--------|------------|
| `useDistributionOrders.ts` | 8 params (có `p_auto_release`, `p_supplement_request_ids`) | OK |
| `useCreateDistributionFromSupplements.ts` | 8 params (có `p_auto_release`, `p_supplement_request_ids`) | OK |
| `useCreateDistributionFromSupplement.ts` | 6 params (thiếu 2 params) | LOI |

---

### GIẢI PHÁP

**File**: `src/hooks/useCreateDistributionFromSupplement.ts`

Thêm 2 params còn thiếu để tránh function overloading ambiguity:

**Trước (dòng 42-55)**:
```typescript
const { data: result, error: createError } = await supabase.rpc('create_distribution_order', {
  p_tenant_id: tenant.id,
  p_hotel_id: request.hotel_id,
  p_created_by: user.id,
  p_assigned_to: assignedTo || null,
  p_rooms: [{
    room_id: request.room_id,
    items: requestItems.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
    })),
  }],
  p_notes: `Bổ sung theo yêu cầu ${request.request_code}`,
})
```

**Sau**:
```typescript
const { data: result, error: createError } = await supabase.rpc('create_distribution_order', {
  p_tenant_id: tenant.id,
  p_hotel_id: request.hotel_id,
  p_created_by: user.id,
  p_assigned_to: assignedTo || null,
  p_rooms: [{
    room_id: request.room_id,
    items: requestItems.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
    })),
  }],
  p_notes: `Bổ sung theo yêu cầu ${request.request_code}`,
  p_auto_release: !!assignedTo, // Auto release nếu có assigned
  p_supplement_request_ids: [supplementRequestId], // Truyền supplement request ID
})
```

---

### THAY ĐỔI CHI TIẾT

| # | Thay đổi | Lý do |
|---|----------|-------|
| 1 | Thêm `p_auto_release: !!assignedTo` | Tự động release phiếu nếu có chọn nhân viên |
| 2 | Thêm `p_supplement_request_ids: [supplementRequestId]` | Để RPC có thể xử lý link ngược (nếu có logic) |

---

### BONUS: Loại bỏ Code Thừa

Vì RPC version 8 có thể tự động cập nhật `supplement_request_id` trong `distribution_orders`, có thể loại bỏ bước thủ công ở dòng 74-84 trong hook. Tuy nhiên, để an toàn, giữ lại bước update supplement request status thủ công vì RPC chính chỉ link distribution order đến supplement requests.

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Lỗi PGRST203 khi ấn "Duyệt & Tạo phiếu giao" | Tạo phiếu giao hàng thành công |
| Status 300 từ API | Status 200 từ API |
| Toast "Lỗi tạo phiếu giao hàng" | Toast "Đã duyệt yêu cầu và tạo phiếu giao hàng" |
