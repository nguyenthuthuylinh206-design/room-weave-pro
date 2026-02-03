

## Đánh giá: Tính năng Thanh toán Nhóm (Group Payment)

### TỔNG QUAN TÌNH TRẠNG HIỆN TẠI

| Thành phần | Trạng thái | Ghi chú |
|-----------|------------|---------|
| `useGroupBooking.ts` | ✅ Hoàn thành | Hook fetch thông tin nhóm + realtime |
| `GroupPaymentDialog.tsx` | ✅ Hoàn thành | UI thanh toán nhóm đầy đủ |
| BookingsPage - Badge nhóm | ✅ Hoàn thành | Hiển thị badge "Nhóm X" |
| BookingsPage - Nút TT Nhóm | ✅ Hoàn thành | Nút thanh toán nhóm |
| Thanh toán tiền mặt | ✅ Hoàn thành | Phân phối tiền cho các phòng |
| Thanh toán chuyển khoản (manual confirm) | ✅ Hoàn thành | Xác nhận thủ công hoạt động |
| **Thanh toán chuyển khoản (auto via webhook)** | ❌ **LỖI NGHIÊM TRỌNG** | Webhook không phân phối cho nhóm |

---

### VẤN ĐỀ PHÁT HIỆN

#### 1. **LỖI NGHIÊM TRỌNG: SePay Webhook không xử lý Group Payment**

**Vị trí**: `supabase/functions/sepay-webhook/index.ts` (dòng 194-277)

**Vấn đề hiện tại**:
- Khi tạo group payment, `booking_id` chỉ lưu phòng đầu tiên
- Webhook tìm thấy payment → Cập nhật **chỉ 1 booking** (phòng đầu tiên)
- **Các phòng còn lại trong nhóm không được cập nhật**

```typescript
// Hiện tại webhook chỉ làm:
if (bp.booking) {
  const currentPaid = bp.booking.amount_paid || 0;
  const newAmountPaid = currentPaid + bp.amount;
  // CHỈ UPDATE 1 BOOKING - bp.booking_id (phòng đầu tiên)
  await supabase.from('room_bookings').update({...}).eq('id', bp.booking_id);
}
```

**Kết quả sai**:
- Khách thanh toán cho 3 phòng (VD: 1.800.000đ)
- Webhook nhận được → Chỉ cập nhật phòng 101 (đầu tiên)
- Phòng 102, 103 vẫn hiển thị "Chờ TT"

---

#### 2. **Thiếu logic realtime khi webhook cập nhật group payment**

**Vấn đề**:
- Sau khi webhook xử lý, UI không tự động refresh đúng
- `useGroupBooking` subscribe theo `booking_group_id` - ổn
- Nhưng webhook không biết `booking_group_id` để invalidate đúng queries

---

### GIẢI PHÁP ĐỀ XUẤT

#### Fix 1: Cập nhật SePay Webhook để xử lý Group Payment

**File**: `supabase/functions/sepay-webhook/index.ts`

**Logic mới**:
```typescript
// Kiểm tra metadata xem có phải group payment không
const metadata = bp.metadata as Record<string, unknown> || {};
const isGroupPayment = metadata.is_group_payment === true;
const bookingIds = (metadata.booking_ids as string[]) || [bp.booking_id];

if (isGroupPayment && bookingIds.length > 1) {
  // Phân phối thanh toán cho tất cả các phòng trong nhóm
  await distributeGroupPayment(supabase, bookingIds, bp.amount);
} else {
  // Logic hiện tại cho single booking
  // ...
}
```

**Hàm phân phối**:
```typescript
async function distributeGroupPayment(
  supabase: any,
  bookingIds: string[],
  totalPaymentAmount: number
) {
  // 1. Fetch tất cả bookings trong nhóm
  const { data: bookings } = await supabase
    .from('room_bookings')
    .select('id, total_amount, amount_paid, status')
    .in('id', bookingIds)
    .order('status', { ascending: true }); // checked_out trước

  // 2. Sắp xếp ưu tiên: checked_out > checked_in > confirmed
  const sortedBookings = bookings.sort((a, b) => {
    if (a.status === 'checked_out' && b.status !== 'checked_out') return -1;
    if (b.status === 'checked_out' && a.status !== 'checked_out') return 1;
    return 0;
  });

  // 3. Phân phối tiền
  let remaining = totalPaymentAmount;
  for (const booking of sortedBookings) {
    if (remaining <= 0) break;
    
    const owed = (booking.total_amount || 0) - (booking.amount_paid || 0);
    if (owed <= 0) continue;
    
    const payForThis = Math.min(remaining, owed);
    const newAmountPaid = (booking.amount_paid || 0) + payForThis;
    const paymentStatus = newAmountPaid >= booking.total_amount ? 'paid' : 'partial';
    
    await supabase.from('room_bookings').update({
      amount_paid: newAmountPaid,
      payment_status: paymentStatus,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
    }).eq('id', booking.id);
    
    remaining -= payForThis;
  }
}
```

---

### CHI TIẾT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `supabase/functions/sepay-webhook/index.ts` | Thêm logic xử lý group payment từ metadata |

---

### CÁC CẢI THIỆN NHỎ KHÁC (Không bắt buộc)

| Mục | Mô tả | Ưu tiên |
|-----|-------|---------|
| Hiển thị nút TT Nhóm cho status khác | Hiện chỉ show khi `checked_in`, có thể show cho `confirmed` | Thấp |
| Thêm tooltip giải thích badge nhóm | UX tốt hơn | Thấp |
| Realtime toast khi group payment hoàn thành | Cải thiện trải nghiệm | Trung bình |

---

### KẾT LUẬN

**Cần sửa ngay**: SePay webhook để xử lý group payment đúng cách

**Đã hoàn thiện**: Tất cả các phần khác của feature thanh toán nhóm

