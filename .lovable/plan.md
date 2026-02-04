
## Phân tích: Chức năng Checkout Nhóm thiếu so với Checkout Cơ bản

### SO SÁNH CHI TIẾT

| Chức năng | Checkout Cơ bản (CheckoutSummaryDialog) | Checkout Nhóm (GroupCheckoutDialog) |
|-----------|----------------------------------------|-------------------------------------|
| **RPC perform_checkout** | CO - Dùng RPC với đầy đủ params | THIEU - Dùng update trực tiếp |
| **Tính phụ thu checkout trễ** | CO - Bảng phụ thu 4 mức (0%, 30%, 50%, 100%) | THIEU - Không tính |
| **Điều chỉnh phụ thu** | CO - Có thể miễn/điều chỉnh + ghi note | THIEU |
| **Phí đền bù (Damage Charges)** | CO - Chi tiết từng item, điều chỉnh được | THIEU - Chỉ hiển thị tổng |
| **Điều chỉnh phí đền bù** | CO - Từng item, yêu cầu note nếu giảm | THIEU |
| **Biên bản thiệt hại** | CO - In được | THIEU |
| **Dịch vụ sử dụng (Consumables)** | CO - Tính từ chargeable_consumptions | THIEU - Không tính |
| **VAT & Service Fee** | CO - Hiển thị % và số tiền | THIEU - Không tính |
| **Subtotal breakdown** | CO - Chi tiết từng loại | THIEU - Chỉ hiển thị tổng tiền phòng |
| **Gửi notification checkout** | CO - triggerRoomCheckoutNotification | THIEU |
| **Cập nhật notes** | CO - Lưu lý do điều chỉnh vào booking | THIEU |
| **Payment status** | CO - Update payment_status, paid_at | THIEU |
| **Hourly/Monthly support** | CO - Tính phí vượt giờ, chiết khấu tháng | THIEU |
| **Xác nhận cuối cùng** | CO - Hiển thị "Còn lại" rõ ràng, yêu cầu xác nhận | THIEU - Checkout thẳng |

---

### CHI TIẾT CÁC CHỨC NĂNG BỊ THIẾU

#### 1. KHÔNG DÙNG RPC `perform_checkout` (QUAN TRỌNG NHẤT)

**Checkout cơ bản:**
```typescript
const { error } = await supabase.rpc('perform_checkout', {
  p_booking_id: actionBooking.id,
  p_room_id: actionBooking.room_id,
  p_late_checkout_charge: adjustedLateCharge,
  p_service_charges: serviceCharges,
  p_subtotal: costBreakdown.subtotal,
  p_vat_amount: costBreakdown.vatAmount,
  p_service_fee_amount: costBreakdown.serviceFeeAmount,
  p_total_amount: costBreakdown.totalAmount,
  p_damage_charges: damageCharges,
  p_damage_notes: damageAdjustmentNote,
  p_damage_items: JSON.stringify(adjustedDamageItems),
})
```

**Checkout nhóm (thiếu):**
```typescript
// Chỉ update đơn giản
await supabase.from('room_bookings').update({
  status: 'checked_out',
  actual_check_out: now,
}).eq('id', bookingId)
```

**Hậu quả:**
- Không cập nhật `late_checkout_charge`
- Không cập nhật `service_charges`
- Không cập nhật `total_amount` cuối cùng
- Không lưu `damage_charges` và `damage_items`
- Không cập nhật `payment_status`

#### 2. KHÔNG TÍNH PHỤ THU CHECKOUT TRỄ

Checkout cơ bản có bảng phụ thu:
```
| Thời gian      | % phụ thu |
|----------------|-----------|
| Trước 12:00    | 0%        |
| 12:00 - 15:00  | 30%       |
| 15:00 - 18:00  | 50%       |
| Sau 18:00      | 100%      |
```

Checkout nhóm: **KHÔNG CÓ** - checkout lúc 17:00 vẫn không tính phụ thu 50%

#### 3. KHÔNG HIỂN THỊ/ĐIỀU CHỈNH PHÍ ĐỀN BÙ CHI TIẾT

Checkout cơ bản có `DamageChargesSection`:
- Hiển thị từng item mất/hỏng
- Điều chỉnh phí từng item
- Nút "Miễn phí" / "Reset"
- Yêu cầu note nếu giảm phí
- In biên bản xác nhận

Checkout nhóm: Chỉ hiển thị tổng `+{inspection.damageCharge}` không thể điều chỉnh

#### 4. KHÔNG TÍNH DỊCH VỤ SỬ DỤNG (Consumables)

Checkout cơ bản:
```typescript
const consumablesTotal = await calculateServiceChargesFromConsumables(booking.id)
const { data: chargeableTotal } = await supabase
  .rpc('get_booking_chargeable_total', { p_booking_id: booking.id })
```

Checkout nhóm: **KHÔNG TÍNH** - minibar, đồ uống trả phí không được cộng vào hóa đơn

#### 5. KHÔNG GỬI NOTIFICATION CHECKOUT

Checkout cơ bản:
```typescript
triggerRoomCheckoutNotification({
  tenantId,
  hotelId: actionBooking.hotel_id,
  roomId: actionBooking.room_id,
  roomNumber: actionBooking.room?.room_number || '',
})
```

Checkout nhóm: **KHÔNG GỬI** - Housekeeping không nhận được thông báo dọn phòng

#### 6. KHÔNG CÓ DIALOG XÁC NHẬN CUỐI CÙNG

Checkout cơ bản: Hiển thị dialog chi tiết với:
- Bảng kê chi phí đầy đủ
- Số tiền còn lại nổi bật
- Nút "Cho trả phòng (nợ X)" vs "Thu tiền & Trả phòng"
- Yêu cầu xác nhận trước khi thực hiện

Checkout nhóm: Bấm nút → Checkout thẳng, không có bước xác nhận cuối

---

### KẾ HOẠCH SỬA LỖI

#### File 1: `src/components/bookings/GroupCheckoutDialog.tsx`

**1. Thêm tính toán chi phí đầy đủ cho từng phòng:**
```typescript
// Thêm state cho cost breakdown từng phòng
const [bookingCosts, setBookingCosts] = useState<Map<string, BookingCostBreakdown>>()

// Fetch chi phí khi chọn phòng
const calculateRoomCosts = async (bookingId: string) => {
  const booking = groupData.bookings.find(b => b.id === bookingId)
  if (!booking) return

  // Tính late checkout charge
  const actualTime = format(new Date(), 'HH:mm')
  const lateCharge = calculateLateCheckoutCharge(actualTime, booking.room_price)

  // Get consumables
  const consumablesTotal = await calculateServiceChargesFromConsumables(bookingId)
  const { data: chargeableTotal } = await supabase
    .rpc('get_booking_chargeable_total', { p_booking_id: bookingId })

  // Get damage items
  const damageItems = await fetchDamageItems(booking.room_id)

  // Calculate full breakdown
  const costBreakdown = calculateBookingCost({
    roomPrice: booking.room_price,
    nights,
    lateCheckoutCharge: lateCharge,
    serviceCharges: consumablesTotal + chargeableTotal,
    damageCharges: totalDamageCharge,
    damageItems,
    // ...
  })

  setBookingCosts(prev => new Map(prev).set(bookingId, costBreakdown))
}
```

**2. Thêm Dialog xác nhận trước checkout:**

Tạo component mới `GroupCheckoutConfirmDialog.tsx`:
```typescript
// Hiển thị chi tiết từng phòng:
// - Phụ thu checkout trễ (có thể điều chỉnh)
// - Phí đền bù (có thể điều chỉnh từng item)
// - Dịch vụ sử dụng
// - VAT, Service Fee
// - Subtotal, Total, Remaining
// - Nút Confirm / Cancel
```

**3. Sửa `performCheckout` để dùng RPC:**
```typescript
const performCheckout = async (bookingIds: string[]) => {
  for (const bookingId of bookingIds) {
    const booking = groupData.bookings.find(b => b.id === bookingId)
    const costBreakdown = bookingCosts.get(bookingId)
    
    // Use RPC with full params
    await supabase.rpc('perform_checkout', {
      p_booking_id: bookingId,
      p_room_id: booking.room_id,
      p_late_checkout_charge: costBreakdown.lateCheckoutCharge,
      p_service_charges: costBreakdown.serviceCharges,
      p_subtotal: costBreakdown.subtotal,
      p_vat_amount: costBreakdown.vatAmount,
      p_service_fee_amount: costBreakdown.serviceFeeAmount,
      p_total_amount: costBreakdown.totalAmount,
      p_damage_charges: costBreakdown.damageCharges,
      p_damage_items: JSON.stringify(costBreakdown.damageItems),
    })
    
    // Send notification
    await triggerRoomCheckoutNotification({
      tenantId, hotelId, roomId: booking.room_id, roomNumber: booking.room.room_number
    })
  }
}
```

**4. Thêm hiển thị phí chi tiết cho từng phòng:**
- Late checkout charge (có icon cảnh báo nếu > 0)
- Damage charges (click để xem chi tiết + điều chỉnh)
- Consumables total
- Subtotal per room

#### File 2: `src/components/bookings/GroupCheckoutConfirmDialog.tsx` (MỚI)

Dialog xác nhận cuối cùng với:
- Tổng hợp tất cả phòng đã chọn
- Chi tiết phụ thu từng phòng (có thể điều chỉnh)
- Chi tiết phí đền bù (có thể điều chỉnh + in biên bản)
- Tổng cần thu cho toàn bộ nhóm
- Nút "Checkout (nợ X)" và "Thu tiền & Checkout"

---

### PRIORITY ORDER

| # | Chức năng | Độ quan trọng | Lý do |
|---|-----------|---------------|-------|
| 1 | Dùng RPC `perform_checkout` | CRITICAL | Dữ liệu không được cập nhật đầy đủ |
| 2 | Tính phụ thu checkout trễ | HIGH | Mất doanh thu |
| 3 | Tính/hiển thị phí đền bù chi tiết | HIGH | Không thể điều chỉnh, không có biên bản |
| 4 | Tính dịch vụ sử dụng | HIGH | Minibar không được tính |
| 5 | Dialog xác nhận cuối cùng | MEDIUM | Tránh checkout nhầm |
| 6 | Gửi notification | MEDIUM | Housekeeping không biết dọn phòng |
| 7 | VAT/Service Fee breakdown | LOW | Hiện tại chưa dùng (rate = 0) |

---

### KẾT QUẢ MONG ĐỢI

| Metric | Hiện tại | Sau khi sửa |
|--------|----------|-------------|
| Phụ thu checkout trễ | Không tính | Tính đúng theo bảng |
| Phí đền bù | Chỉ hiển thị tổng | Chi tiết, điều chỉnh được |
| Dịch vụ minibar | Không tính | Cộng vào hóa đơn |
| Xác nhận checkout | Không có | Yêu cầu xác nhận |
| Notification | Không gửi | Gửi đến housekeeping |
| Data integrity | Thiếu nhiều trường | Đầy đủ như checkout cơ bản |
