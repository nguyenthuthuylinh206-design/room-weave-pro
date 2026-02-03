

## Kế hoạch: Gộp TT Nhóm & CO Nhóm vào nút Check-out

### THAY ĐỔI

| Trước | Sau |
|-------|-----|
| 3 nút: Check-out, TT Nhóm, CO Nhóm | 1 nút: Check-out (tự động nhận diện nhóm) |

---

### CHI TIẾT THAY ĐỔI

#### 1. Sửa hàm `handleCheckOutClick` (dòng 444-548)

Thêm logic kiểm tra booking nhóm ở đầu hàm:

```typescript
const handleCheckOutClick = async (booking: BookingWithRoom) => {
  // Kiểm tra xem có phải booking nhóm không
  const isGroupBooking = booking.booking_group_id && 
    groupCounts && 
    groupCounts[booking.booking_group_id] > 1

  if (isGroupBooking) {
    // Mở GroupCheckoutDialog thay vì individual checkout
    setSelectedGroupId(booking.booking_group_id!)
    setShowGroupCheckoutDialog(true)
    return
  }

  // ... giữ nguyên logic checkout đơn lẻ hiện tại ...
}
```

#### 2. Xóa nút "TT Nhóm" khỏi block `confirmed` (dòng 1246-1260)

Xóa toàn bộ block:
```tsx
{booking.booking_group_id && groupCounts && groupCounts[booking.booking_group_id] > 1 && (
  <Button ... TT Nhóm ... />
)}
```

#### 3. Xóa nút "TT Nhóm" và "CO Nhóm" khỏi block `checked_in` (dòng 1284-1312)

Xóa toàn bộ block điều kiện với 2 nút TT Nhóm và CO Nhóm.

---

### KẾT QUẢ UI

**Trước:**
```
[Check-out] [TT Nhóm] [CO Nhóm]   ← 3 nút riêng, khó hiểu
```

**Sau:**
```
[Check-out]                        ← 1 nút duy nhất
  │
  ├── Booking đơn → Mở CheckoutSummaryDialog (như cũ)
  └── Booking nhóm → Mở GroupCheckoutDialog (tích hợp thanh toán + checkout)
```

---

### LUỒNG NGƯỜI DÙNG

```text
Bấm "Check-out" trên bất kỳ booking nào
       │
       ├── Là booking nhóm?
       │     └── CÓ → Mở GroupCheckoutDialog
       │            ├── Hiển thị tất cả phòng trong nhóm
       │            ├── Chọn phòng checkout (hoặc tất cả)
       │            ├── Gán nhân viên kiểm tra
       │            ├── Thanh toán tích hợp
       │            └── Checkout batch
       │
       └── KHÔNG → Mở CheckoutSummaryDialog (như hiện tại)
```

---

### FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/pages/bookings/BookingsPage.tsx` | Sửa hàm `handleCheckOutClick` + Xóa 3 nút TT Nhóm và CO Nhóm |

