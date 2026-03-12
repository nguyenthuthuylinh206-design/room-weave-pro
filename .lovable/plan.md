

## Tự động tạo hóa đơn khi checkout

### Phân tích hiện trạng

Hiện tại có 3 nơi gọi `perform_checkout` RPC:
1. **GroupCheckoutDialog.tsx** - `performCheckout()` (line 598-675)
2. **RoomBookingDialog.tsx** - `handleCheckout()` và `handlePayAndCheckout()` (line 566-628, 631-727)
3. **BookingsPage.tsx** - `handleCheckoutBooking()` và `handlePayAndCheckout()` (line 725-790, 793-890)

Sau khi RPC thành công, không có nơi nào tạo `guest_invoices` record.

### Giải pháp

Tạo một **helper function** `createInvoiceAfterCheckout()` dùng chung, gọi sau khi `perform_checkout` RPC thành công. Function này sẽ:

1. Đọc booking data mới nhất từ DB (sau khi RPC đã cập nhật `total_amount`, `amount_paid`, etc.)
2. Tạo line items từ cost breakdown (tiền phòng, phụ thu checkout trễ, phí dịch vụ, phí đền bù)
3. Gọi `generate_guest_invoice_number` RPC
4. Insert vào `guest_invoices` với status = `issued`

### Thay đổi cụ thể

| File | Thay đổi |
|------|----------|
| `src/lib/invoiceHelpers.ts` | **MỚI** - Helper `createInvoiceAfterCheckout(bookingId, tenantId, hotelId, userId)` |
| `src/components/bookings/GroupCheckoutDialog.tsx` | Sau vòng `for` checkout thành công (line 656), gọi helper cho mỗi booking đã checkout |
| `src/components/rooms/RoomBookingDialog.tsx` | Sau `perform_checkout` thành công (line 584, 681), gọi helper |
| `src/pages/bookings/BookingsPage.tsx` | Sau `perform_checkout` thành công (line 745, 853), gọi helper |

### Logic `createInvoiceAfterCheckout`

```typescript
async function createInvoiceAfterCheckout({
  bookingId, tenantId, hotelId, userId
}) {
  // 1. Fetch booking mới nhất (đã có total_amount chính xác từ RPC)
  const booking = await supabase.from('room_bookings')
    .select('*, room:rooms(room_number)')
    .eq('id', bookingId).single()

  // 2. Fetch service charges + consumables cho line items
  const services = await supabase.from('booking_service_charges')...
  const consumables = await supabase.from('chargeable_consumptions')...

  // 3. Build line items
  const lineItems = [
    { description: `Tiền phòng ${room_number}`, quantity: nights, unit_price: room_price, amount: subtotal_room },
    ...lateCheckoutCharge > 0 ? [{ description: 'Phụ thu checkout trễ', ... }] : [],
    ...damageCharges > 0 ? [{ description: 'Phí đền bù thiệt hại', ... }] : [],
    ...services.map(s => ({ description: s.service_name, ... })),
    ...consumables.map(c => ({ description: c.item_name, ... })),
  ]

  // 4. Generate number + insert
  const invoiceNumber = await supabase.rpc('generate_guest_invoice_number', ...)
  await supabase.from('guest_invoices').insert({
    tenant_id, hotel_id, booking_id: bookingId,
    invoice_number, guest_name, guest_phone, guest_address,
    room_number, check_in_date, check_out_date,
    line_items, subtotal, vat_rate, vat_amount,
    service_fee_rate, service_fee_amount, total_amount,
    deposit_amount, amount_paid,
    status: 'issued', issued_at: new Date().toISOString(),
    created_by: userId,
  })
}
```

Tạo invoice là fire-and-forget (`.catch(console.error)`), không block checkout flow. Nếu tạo invoice thất bại, checkout vẫn thành công.

