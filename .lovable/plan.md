

## Kế hoạch: Xây dựng logic Thanh toán Chung cho Đặt phòng Nhóm

### TÌNH TRẠNG HIỆN TẠI

| Chức năng | Trạng thái |
|-----------|------------|
| Đặt nhiều phòng cùng lúc | ✅ Có - sử dụng `booking_group_id` |
| Chia tiền cọc đều cho các phòng | ✅ Có - trong `useBookingForm.ts` |
| Checkout từng phòng riêng | ✅ Có - hoạt động tốt |
| Thanh toán riêng từng phòng | ✅ Có - qua `BookingPaymentDialog` |
| **Hiển thị badge nhóm** | ✅ Hoàn thành - Phase 1 |
| **Thanh toán chung cả nhóm** | ✅ Hoàn thành - Phase 2 |
| **Checkout chung cả nhóm** | ❌ Chưa có - Phase 3 (tương lai) |

### VẤN ĐỀ THỰC TẾ

Khi 1 khách đặt 3 phòng cho gia đình:
- Hiện tại: Phải checkout 3 lần, thanh toán 3 lần riêng biệt
- Mong muốn: 
  - **Option 1**: Checkout từng phòng nhưng thanh toán gộp 1 lần cuối
  - **Option 2**: Checkout tất cả cùng lúc và thanh toán gộp

---

### GIẢI PHÁP ĐỀ XUẤT

#### Phase 1: Nhận diện và Hiển thị Group Booking (Quick Win)

**1.1. Hiển thị badge nhóm trong danh sách booking**

| File | Thay đổi |
|------|----------|
| `BookingsPage.tsx` | Thêm badge "Nhóm X phòng" nếu có `booking_group_id` |
| Query | Fetch thêm count phòng trong cùng group |

```tsx
// Trong bảng booking, hiển thị:
<div>
  <p className="font-medium">{booking.room?.room_number}</p>
  {booking.booking_group_id && (
    <Badge variant="outline" className="text-[10px]">
      Nhóm {groupRoomCount} phòng
    </Badge>
  )}
</div>
```

**1.2. Group cùng khách gần nhau trong danh sách**

Sắp xếp bookings theo `booking_group_id` để các phòng cùng nhóm hiển thị liền kề.

---

#### Phase 2: Thanh toán Chung cho Group (Core Feature)

**2.1. Thêm GroupPaymentDialog mới**

| Component | Mô tả |
|-----------|-------|
| `GroupPaymentDialog.tsx` | Dialog tổng hợp tất cả phòng trong nhóm |

```text
┌──────────────────────────────────────────────────┐
│  Thanh toán nhóm - Nguyễn Văn A (3 phòng)       │
├──────────────────────────────────────────────────┤
│  Phòng 101 - Superior                           │
│  ├─ Tiền phòng: 2 đêm × 800.000đ = 1.600.000đ  │
│  ├─ Phụ thu: 200.000đ                          │
│  └─ Tổng: 1.800.000đ    [Đã checkout ✓]        │
│                                                  │
│  Phòng 102 - Deluxe                             │
│  ├─ Tiền phòng: 2 đêm × 1.000.000đ = 2.000.000đ│
│  └─ Tổng: 2.000.000đ    [Đang ở]               │
│                                                  │
│  Phòng 103 - Suite                              │
│  ├─ Tiền phòng: 2 đêm × 1.500.000đ = 3.000.000đ│
│  └─ Tổng: 3.000.000đ    [Đang ở]               │
├──────────────────────────────────────────────────┤
│  TỔNG CỘNG NHÓM:              6.800.000đ        │
│  Đã thanh toán:              -1.000.000đ        │
│  ────────────────────────────────────────        │
│  CÒN PHẢI THU:                5.800.000đ        │
├──────────────────────────────────────────────────┤
│  [Tiền mặt]  [Chuyển khoản]                     │
│                                                  │
│  ☑ Checkout tất cả phòng đang ở sau thanh toán  │
│                                                  │
│  [Hủy]                     [Xác nhận thanh toán]│
└──────────────────────────────────────────────────┘
```

**2.2. Hook mới: useGroupBooking**

```typescript
// src/hooks/useGroupBooking.ts

export function useGroupBooking(bookingGroupId: string | null) {
  return useQuery({
    queryKey: ['group-booking', bookingGroupId],
    queryFn: async () => {
      if (!bookingGroupId) return null

      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          *,
          room:rooms(room_number, room_type)
        `)
        .eq('booking_group_id', bookingGroupId)
        .order('room:rooms(room_number)')

      if (error) throw error
      
      // Tính tổng cho cả nhóm
      const totalAmount = data.reduce((sum, b) => sum + (b.total_amount || 0), 0)
      const totalPaid = data.reduce((sum, b) => sum + (b.amount_paid || 0), 0)
      const remainingAmount = totalAmount - totalPaid
      
      return {
        bookings: data,
        totalAmount,
        totalPaid,
        remainingAmount,
        roomCount: data.length,
        guestName: data[0]?.guest_name,
        allCheckedOut: data.every(b => b.status === 'checked_out'),
        someCheckedIn: data.some(b => b.status === 'checked_in'),
      }
    },
    enabled: !!bookingGroupId,
  })
}
```

**2.3. Cập nhật BookingsPage với Group Actions**

```tsx
// Thêm nút "Thanh toán nhóm" khi có booking_group_id
{booking.booking_group_id && booking.status === 'checked_in' && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleGroupPayment(booking.booking_group_id)}
  >
    <Users className="h-3 w-3 mr-1" />
    TT Nhóm
  </Button>
)}
```

---

#### Phase 3: Checkout Chung cho Group (Advanced)

**3.1. GroupCheckoutDialog**

Cho phép checkout tất cả phòng trong nhóm cùng lúc:
- Kiểm tra tất cả phòng đã được inspect
- Tổng hợp tất cả damage charges
- Tính tổng late checkout surcharge cho từng phòng
- 1 QR thanh toán duy nhất cho toàn bộ

**3.2. RPC function: perform_group_checkout**

```sql
CREATE OR REPLACE FUNCTION perform_group_checkout(
  p_booking_group_id UUID,
  p_checkout_details JSONB -- Array of {booking_id, late_charge, damage_charge}
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB := '[]'::JSONB;
BEGIN
  FOR v_booking IN 
    SELECT * FROM room_bookings WHERE booking_group_id = p_booking_group_id
  LOOP
    -- Perform individual checkout logic
    -- ...
    -- Accumulate results
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

### FLOW NGƯỜI DÙNG SAU KHI TRIỂN KHAI

```text
┌─────────────────────────────────────────────────────────────────┐
│                   GROUP BOOKING WORKFLOW                        │
└─────────────────────────────────────────────────────────────────┘

[Khách đặt 3 phòng] → booking_group_id được tạo
        │
        ▼
[Danh sách booking hiển thị badge "Nhóm 3 phòng"]
        │
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
  [THANH TOÁN RIÊNG]                           [THANH TOÁN CHUNG]
  Bấm checkout từng phòng                      Bấm "TT Nhóm" trên bất kỳ phòng nào
  → Dialog checkout riêng                      → GroupPaymentDialog
  → Thanh toán riêng                           → Xem tổng hợp tất cả phòng
        │                                      → 1 QR thanh toán
        │                                      → ☑ Auto checkout sau thanh toán
        │                                              │
        ├──────────────────────────────────────────────┤
        ▼                                              ▼
  [Lặp lại cho phòng tiếp]                    [Tất cả checkout cùng lúc]
```

---

### CHI TIẾT THAY ĐỔI PHASE 1 + 2 (Ưu tiên triển khai)

| File | Thay đổi |
|------|----------|
| `src/hooks/useGroupBooking.ts` | **MỚI** - Hook lấy thông tin nhóm booking |
| `src/components/bookings/GroupPaymentDialog.tsx` | **MỚI** - Dialog thanh toán chung |
| `src/pages/bookings/BookingsPage.tsx` | Thêm badge nhóm, nút TT Nhóm |
| `src/hooks/useBookingPayments.ts` | Thêm mutation cập nhật nhiều booking cùng lúc |

---

### LOGIC THANH TOÁN CHUNG

```typescript
// Trong GroupPaymentDialog.tsx

const handleGroupPayment = async (amount: number) => {
  const { bookings, totalPaid } = groupData
  
  // 1. Tạo 1 payment record với metadata chứa danh sách booking_ids
  const payment = await createPayment.mutateAsync({
    ...
    metadata: {
      is_group_payment: true,
      booking_ids: bookings.map(b => b.id),
      guest_name: bookings[0].guest_name,
    }
  })
  
  // 2. Khi thanh toán thành công, chia tiền cho các booking
  // Ưu tiên trả hết nợ phòng đã checkout trước
  let remainingPayment = amount
  for (const booking of bookings.sort(b => b.status === 'checked_out' ? -1 : 1)) {
    const bookingOwed = booking.total_amount - booking.amount_paid
    const payForThis = Math.min(remainingPayment, bookingOwed)
    
    if (payForThis > 0) {
      await updateBookingAmountPaid(booking.id, payForThis)
      remainingPayment -= payForThis
    }
    
    if (remainingPayment <= 0) break
  }
  
  // 3. Nếu chọn auto-checkout, thực hiện checkout các phòng checked_in
  if (autoCheckout) {
    for (const booking of bookings.filter(b => b.status === 'checked_in')) {
      await performCheckout(booking.id, ...)
    }
  }
}
```

---

### ƯU TIÊN TRIỂN KHAI

| Ưu tiên | Chức năng | Lý do |
|---------|-----------|-------|
| 1 | Hiển thị badge nhóm | Dễ nhận biết group booking |
| 2 | GroupPaymentDialog | Giải quyết nhu cầu thanh toán chung |
| 3 | Auto-checkout sau thanh toán | Tiện lợi, giảm thao tác |
| 4 | GroupCheckoutDialog | Advanced, có thể làm sau |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Checkout 3 lần | Checkout 1 lần hoặc 3 lần (tùy chọn) |
| Thanh toán 3 lần | Thanh toán 1 lần cho cả nhóm |
| Khách phải đợi xử lý từng phòng | Xử lý nhanh hơn |
| Nhân viên thao tác nhiều | Giảm thao tác, ít sai sót |

