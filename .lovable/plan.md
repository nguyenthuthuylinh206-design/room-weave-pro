

## Kế hoạch: Sửa lỗi dữ liệu kiểm tra phòng không đẩy về Group Checkout khi thanh toán

### VẤN ĐỀ ĐÃ XÁC ĐỊNH

Khi nhân viên hoàn thành kiểm tra phòng trong quy trình Group Checkout, dữ liệu về đồ mất/hỏng **KHÔNG được hiển thị đúng** khi lễ tân tính tiền checkout. Có **2 nguyên nhân chính**:

---

### NGUYÊN NHÂN 1: Sai tên field khi đọc dữ liệu

**Dữ liệu thực tế trong database:**
```text
items_lost = [{ estimated_value: 5000, ... }]    // Dùng estimated_value
items_damaged = [{ damage_cost: 75000, ... }]   // Dùng damage_cost
```

**Code hiện tại đang đọc SAI:**

**File 1: `src/hooks/useGroupCheckoutCalculations.ts` (dòng 66-90)**
```typescript
// Process lost items - SAI
charge_amount: item.charge_amount || 0  // ❌ Phải là: item.estimated_value

// Process damaged items - SAI  
charge_amount: item.charge_amount || 0  // ❌ Phải là: item.damage_cost
```

**File 2: `src/components/bookings/GroupCheckoutDialog.tsx` (dòng 169-175)**
```typescript
damageCharge = [...lost, ...damaged].reduce((sum, item) => 
  sum + (item.charge_amount || 0) * (item.quantity || 1), 0  // ❌ SAI
)
```

**So sánh với code đúng trong `RoomBookingDialog.tsx`:**
```typescript
// Đúng - mapping correct field names
charge_amount: item.estimated_value || 0,  // For lost items
charge_amount: item.damage_cost || 0,      // For damaged items
```

---

### NGUYÊN NHÂN 2: Thiếu Realtime subscription cho room_checks

**Hiện trạng:**
- `checkout_inspection_requests` đã có realtime
- `room_checks` **CHƯA được thêm vào realtime publication**

**Hậu quả:**
- Khi nhân viên submit room check → Data lưu vào `room_checks`
- Group Checkout Dialog chỉ listen `checkout_inspection_requests`
- Khi inspection status đổi → `refetchInspections()` chạy
- Nhưng query `room_checks` vẫn có thể miss data mới nhất do timing

---

### GIẢI PHÁP

#### Bước 1: Sửa field mapping trong `useGroupCheckoutCalculations.ts`

```typescript
// Sửa hàm fetchDamageItems (dòng 66-90)

// Process lost items - ĐÚNG
damageItems.push({
  item_id: item.item_id,
  item_name: item.item_name || 'Unknown',
  item_type: 'lost',
  quantity: item.quantity || 1,
  charge_amount: item.estimated_value || 0,  // ✅ SỬA: estimated_value
  notes: item.notes,
})

// Process damaged items - ĐÚNG
damageItems.push({
  item_id: item.item_id,
  item_name: item.item_name || 'Unknown',
  item_type: 'damaged',
  quantity: item.quantity || 1,
  charge_amount: item.damage_cost || 0,  // ✅ SỬA: damage_cost
  damage_type: item.damage_type,
  notes: item.notes,
})
```

#### Bước 2: Sửa field mapping trong `GroupCheckoutDialog.tsx`

```typescript
// Sửa dòng 169-175 trong inspectionStatuses query

let damageCharge = 0
if (roomCheck) {
  const lost = roomCheck.items_lost as any[] || []
  const damaged = roomCheck.items_damaged as any[] || []
  
  // Tính lost với estimated_value
  const lostTotal = lost.reduce((sum, item) => 
    sum + (item.estimated_value || 0) * (item.quantity || 1), 0
  )
  
  // Tính damaged với damage_cost  
  const damagedTotal = damaged.reduce((sum, item) => 
    sum + (item.damage_cost || 0) * (item.quantity || 1), 0
  )
  
  damageCharge = lostTotal + damagedTotal
}
```

#### Bước 3: Thêm room_checks vào realtime publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_checks;
```

#### Bước 4: Thêm realtime subscription cho room_checks

Trong `GroupCheckoutDialog.tsx`, thêm subscription cho room_checks:

```typescript
// Subscribe to room_checks changes as well
const roomIds = groupData.bookings.map(b => b.room_id)

const roomChecksChannel = supabase
  .channel(`group-roomchecks-realtime-${bookingGroupId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'room_checks',
      filter: `room_id=in.(${roomIds.join(',')})`,
    },
    (payload) => {
      console.log('[GroupCheckout Realtime] Room check inserted:', payload)
      refetchInspections() // Refetch to get latest damage data
    }
  )
  .subscribe()
```

---

### THAY ĐỔI CHI TIẾT

| # | File | Thay đổi |
|---|------|----------|
| 1 | `useGroupCheckoutCalculations.ts` | Sửa `item.charge_amount` thành `item.estimated_value` cho lost items và `item.damage_cost` cho damaged items |
| 2 | `GroupCheckoutDialog.tsx` | Sửa logic tính damageCharge dùng đúng field names |
| 3 | Database Migration | `ALTER PUBLICATION supabase_realtime ADD TABLE public.room_checks;` |
| 4 | `GroupCheckoutDialog.tsx` | Thêm realtime subscription cho `room_checks` table |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| `damageCharge = 0` (do đọc sai field) | `damageCharge = 80000` (75000 hỏng + 5000 mất) |
| Lễ tân không thấy phụ thu | Lễ tân thấy đầy đủ phụ thu khi thanh toán |
| Phải đợi 10s polling | Realtime update ngay khi nhân viên submit |

**Flow sau khi sửa:**

```text
Nhân viên submit room check
    ↓
room_checks insert: { items_lost: [{estimated_value: 5000}], items_damaged: [{damage_cost: 75000}] }
    ↓
Realtime: room_checks INSERT event → refetchInspections()
    ↓
Query room_checks → Đọc đúng: estimated_value, damage_cost
    ↓
UI cập nhật: damageCharge = 80.000đ
    ↓
Lễ tân thấy "Phụ thu đền bù: 80.000đ" trong thanh toán
```

