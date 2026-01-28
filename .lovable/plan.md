

## Kế hoạch: Sửa lỗi Ambiguous Function Call cho Bổ sung đồ dùng

### I. NGUYÊN NHÂN LỖI

**Lỗi:** `Could not choose the best candidate function between: public.create_outbound_transaction(...)`

**Nguyên nhân:** Database có 2 phiên bản `create_outbound_transaction`:

| Phiên bản | Tham số khác biệt |
|-----------|-------------------|
| Phiên bản 1 | Không có `p_from_warehouse_id` |
| Phiên bản 2 | CÓ `p_from_warehouse_id` (optional) |

Khi gọi RPC mà không truyền `p_from_warehouse_id`, PostgreSQL không thể phân biệt được function nào cần gọi vì cả 2 đều match signature.

**So sánh code:**
- `useInventoryTransactions.ts` line 183: `p_from_warehouse_id: data.from_warehouse_id || null` - CÓ TRUYỀN
- `useRoomSupplements.ts`: KHÔNG TRUYỀN `p_from_warehouse_id`

---

### II. GIẢI PHÁP

Thêm tham số `p_from_warehouse_id: null` vào RPC call trong `useRoomSupplements.ts` để PostgreSQL xác định được function đúng.

---

### III. CHI TIẾT THAY ĐỔI

**File:** `src/hooks/useRoomSupplements.ts`

```typescript
// Line 182-193: Thêm p_from_warehouse_id

const { data: result, error } = await supabase.rpc('create_outbound_transaction', {
  p_tenant_id: tenantId,
  p_hotel_id: selectedHotel.id,
  p_transaction_category: 'room_assign',
  p_from_location: 'Kho',
  p_to_location: `Phòng ${data.room_number}`,
  p_created_by: user.id,
  p_items: rpcItems as any,
  p_related_type: 'room',
  p_related_id: data.room_id,
  p_notes: data.notes || `Bổ sung đồ dùng cho phòng ${data.room_number}`,
  // THÊM CÁC THAM SỐ OPTIONAL ĐỂ PHÂN BIỆT FUNCTION
  p_recipient_name: null,
  p_recipient_signature: null,
  p_documents: null,
  p_photos: null,
  p_from_warehouse_id: null,  // ← QUAN TRỌNG: Thêm để match function signature
})
```

---

### IV. TẠI SAO CẦN THÊM TẤT CẢ OPTIONAL PARAMS?

Khi có 2 overloaded functions với signature gần giống nhau, cách tốt nhất để PostgreSQL nhận diện đúng function là:
1. Truyền **tất cả tham số** (kể cả optional với giá trị null)
2. Hoặc loại bỏ function cũ khỏi database

Cách 1 an toàn hơn vì không cần thay đổi database schema.

---

### V. FILE CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/hooks/useRoomSupplements.ts` | Thêm các tham số optional (`p_from_warehouse_id`, `p_recipient_name`, v.v.) vào RPC call |

---

### VI. TESTING

1. Mở chi tiết phòng (route hiện tại: `/rooms/9bc582e3-...`)
2. Mở sheet "Bổ sung đồ dùng"
3. Chọn items và số lượng
4. Bấm "Xác nhận bổ sung"
5. **Kết quả mong đợi:** Toast thành công, không còn lỗi "Could not choose the best candidate function"

