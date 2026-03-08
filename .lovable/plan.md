

## Ket qua kiem tra cac phan con lai

Sau khi review them cac hooks: `useBookingActions`, `useBookingPayments`, `useStockAdjustments`, `useHousekeepingTasks`, `useSupplementRequests`, `useDistributionOrders`, `useUsers`, `useShiftManagement`, `useRooms`, phat hien cac van de sau:

---

### Bug 1: `useUpdateBookingAmountPaid` - Race condition (NGHIEM TRONG)

**File**: `src/hooks/useBookingPayments.ts` line 271-296

Pattern read-then-write tuong tu nhu da fix trong `useRoomChecks`:
```
1. SELECT amount_paid FROM room_bookings
2. newAmountPaid = amount_paid + amountToAdd
3. UPDATE room_bookings SET amount_paid = newAmountPaid
```

Neu 2 thanh toan xay ra dong thoi (VD: cash + bank transfer callback), cai sau ghi de cai truoc. Ket qua: mat tien thanh toan.

**Fix**: Dung `amount_paid + amountToAdd` truc tiep trong SQL, hoac tao RPC atomic. Vi PostgREST khong ho tro `SET amount_paid = amount_paid + X`, can tao RPC:

```sql
CREATE OR REPLACE FUNCTION update_booking_amount_paid(
  p_booking_id uuid, p_amount_to_add numeric, p_total_amount numeric
) RETURNS void AS $$
  UPDATE room_bookings 
  SET amount_paid = COALESCE(amount_paid, 0) + p_amount_to_add,
      payment_status = CASE 
        WHEN COALESCE(amount_paid, 0) + p_amount_to_add >= p_total_amount THEN 'paid' 
        ELSE 'partial' 
      END,
      paid_at = CASE 
        WHEN COALESCE(amount_paid, 0) + p_amount_to_add >= p_total_amount THEN now() 
        ELSE NULL 
      END
  WHERE id = p_booking_id;
$$ LANGUAGE sql;
```

---

### Bug 2: `useApproveAdjustment` - Thieu invalidation `warehouse-stock` va `warehouses-with-stats` (TRUNG BINH)

**File**: `src/hooks/useStockAdjustments.ts` line 423-427

Khi duyet phieu kiem ke, DB trigger `stock_adjustment_items_apply` cap nhat ca `items.quantity_in_stock` VA `warehouse_stock`. Nhung `onSuccess` chi invalidate `items`, `inventory-dashboard`, thieu `warehouse-stock` va `warehouses-with-stats`.

**Fix**: Them 2 dong invalidate.

---

### Bug 3: `useApproveSupplementRequest` - Thieu invalidation `warehouse-stock` (NHO)

**File**: `src/hooks/useSupplementRequests.ts` line 318-322

Khi duyet va tao outbound transaction, `create_outbound_transaction` RPC tru `warehouse_stock`. Nhung `onSuccess` chi invalidate `items`, `inventory-transactions`, thieu `warehouse-stock` va `warehouses-with-stats`.

**Fix**: Them invalidation.

---

### Bug 4: `useConfirmBookingPayment` - Khong cap nhat `amount_paid` tren booking (TRUNG BINH)

**File**: `src/hooks/useBookingPayments.ts` line 202-227

`useConfirmBookingPayment` chi update `booking_payments.payment_status = 'completed'` nhung KHONG goi `useUpdateBookingAmountPaid` de cap nhat `room_bookings.amount_paid`. Ket qua: thanh toan da xac nhan nhung booking van hien thi "chua thanh toan".

**Luu y**: Co the logic nay duoc xu ly o noi goi `useConfirmBookingPayment`, can kiem tra caller. Nhung ban than mutation khong dam bao consistency.

---

### Bug 5: `useCancelTask` - Khong validate trang thai truoc khi huy (NHO)

**File**: `src/hooks/useHousekeepingTasks.ts` line 462-471

Bat ky task nao (ke ca da `completed`) deu co the bi update thanh `cancelled`. Thieu check `.in('status', ['pending', 'in_progress', 'assigned'])`.

**Fix**: Them filter status:
```typescript
.eq('id', taskId)
.in('status', ['pending', 'in_progress', 'assigned'])
```

---

### Ke hoach fix (4 bug chinh)

1. **Fix `useUpdateBookingAmountPaid` race condition** - Tao RPC atomic de update `amount_paid`
2. **Fix `useApproveAdjustment` invalidation** - Them `warehouse-stock`, `warehouses-with-stats`
3. **Fix `useApproveSupplementRequest` invalidation** - Them `warehouse-stock`, `warehouses-with-stats`
4. **Fix `useCancelTask` status validation** - Them filter `.in('status', [...])`

Bug 4 (`useConfirmBookingPayment`) can kiem tra them caller truoc khi fix de tranh duplicate logic.

**Files thay doi**: `src/hooks/useBookingPayments.ts`, `src/hooks/useStockAdjustments.ts`, `src/hooks/useSupplementRequests.ts`, `src/hooks/useHousekeepingTasks.ts` + migration SQL cho RPC moi.

