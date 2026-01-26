

## Kế hoạch: Sửa lỗi "Xác nhận bổ sung" và làm rõ workflow bổ sung đồ dùng

### I. VẤN ĐỀ PHÁT HIỆN

Có **2 lỗi chính** cần sửa:

#### Lỗi 1: PGRST201 - Ambiguous FK relationship

**File:** `src/utils/notificationRecipients.ts`

Bảng `user_hotels` có 2 FK đến bảng `users`:
- `user_hotels_user_id_fkey` - user được gán vào hotel
- `user_hotels_assigned_by_fkey` - người gán user vào hotel

Khi query không chỉ định rõ FK, Supabase trả về lỗi:
```
PGRST201: Could not embed because more than one relationship was found for 'user_hotels' and 'users'
```

**Các function bị ảnh hưởng:**
- `getManagersOfHotel()` - line 12-32
- `getHotelStaff()` - line 98-117

#### Lỗi 2: Workflow bổ sung đồ dùng chưa rõ ràng

**Hiện trạng:**
1. User mở `RoomSupplementSheet` (từ `StaffRoomDetailPage` hoặc `MobileRoomDetailPage`)
2. Chọn items và số lượng muốn bổ sung
3. Bấm "Xác nhận bổ sung"
4. `useCreateRoomSupplement` gọi RPC `create_outbound_transaction`
5. Sau thành công, cập nhật `room_items`

**Vấn đề tiềm ẩn:**
- Không có validation `type="button"` cho các nút +/- trong `SupplementItemCard`
- Không có guard clause chống double-submit
- Logic update `room_items` sau transaction có thể fail silent

---

### II. GIẢI PHÁP

#### Sửa lỗi 1: Chỉ định FK cụ thể trong query

**File:** `src/utils/notificationRecipients.ts`

```typescript
// getManagersOfHotel - Line 12-32
export async function getManagersOfHotel(hotelId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('user_hotels')
    .select(`
      user_id,
      users!user_hotels_user_id_fkey(id, full_name, email, user_level_code)
    `)
    .eq('hotel_id', hotelId);

  if (error) {
    console.error('Error fetching hotel managers:', error);
    return [];
  }

  // Filter managers từ kết quả
  return data
    ?.filter(item => (item.users as any)?.user_level_code === 'manager')
    ?.map(item => ({
      id: (item.users as any).id,
      full_name: (item.users as any).full_name,
      email: (item.users as any).email,
    })) || [];
}

// getHotelStaff - Line 98-117
export async function getHotelStaff(hotelId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('user_hotels')
    .select(`
      user_id,
      users!user_hotels_user_id_fkey(id, full_name, email)
    `)
    .eq('hotel_id', hotelId);

  if (error) {
    console.error('Error fetching hotel staff:', error);
    return [];
  }

  return data?.map(item => ({
    id: (item.users as any).id,
    full_name: (item.users as any).full_name,
    email: (item.users as any).email,
  })) || [];
}
```

#### Sửa lỗi 2: Cải thiện RoomSupplementSheet

**File:** `src/components/rooms/RoomSupplementSheet.tsx`

**a) Thêm guard clause chống double-submit:**
```typescript
const handleSubmit = () => {
  // Guard against double submit
  if (createSupplement.isPending) return
  
  const items = Object.entries(selectedItems)
    .filter(([_, qty]) => qty > 0)
    // ... rest of logic
}
```

**b) Thêm `type="button"` cho các nút trong SupplementItemCard:**
```typescript
<Button
  type="button"  // THÊM
  variant="outline"
  size="icon"
  className="h-8 w-8"
  disabled={selectedQuantity <= 0}
  onClick={() => onQuantityChange(-1)}
>
  <Minus className="h-4 w-4" />
</Button>
```

**c) Thêm feedback rõ ràng khi submit thành công/thất bại:**
```typescript
// Trong useCreateRoomSupplement
onSuccess: (result, variables) => {
  // ... existing invalidation logic
  toast.success(`Đã bổ sung ${result.total_quantity} đồ dùng`, {
    description: `Phòng ${variables.room_number} - Mã GD: ${result.transaction_code}`,
  })
},
onError: (error: Error) => {
  toast.error('Lỗi bổ sung đồ dùng', {
    description: error.message,
  })
},
```

---

### III. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/utils/notificationRecipients.ts` | Sửa `getManagersOfHotel()` và `getHotelStaff()` - chỉ định FK |
| `src/components/rooms/RoomSupplementSheet.tsx` | Thêm guard double-submit, `type="button"` |
| `src/hooks/useRoomSupplements.ts` | Cải thiện error handling và feedback |

---

### IV. WORKFLOW SAU KHI SỬA

```text
1. User mở RoomSupplementSheet
   ↓
2. Hiển thị 2 tab: "Thiếu tiêu chuẩn" và "Tiêu hao"
   ↓
3. User điều chỉnh số lượng bằng nút +/- (có type="button")
   ↓
4. Bấm "Xác nhận bổ sung (X món)"
   ↓
5. Guard check: isPending? → Return early nếu đang xử lý
   ↓
6. Validate: hasStockIssue? → Disable nút nếu vượt kho
   ↓
7. Call RPC create_outbound_transaction
   ↓
8. Success: 
   - Tạo inventory_transaction (xuất kho)
   - Update room_items (tăng quantity)
   - Toast success với mã giao dịch
   - Invalidate queries
   - Đóng sheet
   ↓
9. Error:
   - Toast error với message cụ thể
   - Không đóng sheet (cho user thử lại)
```

---

### V. TESTING CHECKLIST

1. ✅ Bấm +/- không gây submit form
2. ✅ Bấm "Xác nhận" 2 lần liên tiếp chỉ tạo 1 transaction
3. ✅ Cảnh báo hiển thị khi chọn số lượng > tồn kho
4. ✅ Toast thành công hiển thị số lượng và mã giao dịch
5. ✅ Notifications gửi đến managers không bị lỗi PGRST201
6. ✅ `room_items` được cập nhật đúng sau bổ sung

