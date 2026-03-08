

## Ket qua kiem tra logic cac trang khac

Sau khi review cac hooks chinh: `useRoomChecks`, `useLaundryBatches`, `useMaintenanceRequests`, `useStockAdjustments`, `usePurchaseOrders`, `useBookingActions`, `useSupplementRequests`, `useCreateDistributionFromSupplements`, toi phat hien cac van de sau:

---

### Bug 1: `useReceiveLaundryBatch` - Non-atomic multi-step update (TRUNG BINH)

**File**: `src/hooks/useLaundryBatches.ts` line 166-284

Mutation nay thuc hien 3 buoc rieng le (update batch → update tung item trong vong for → insert notification) ma KHONG dung transaction. Neu buoc 2 fail giua chung, batch da chuyen sang `received` nhung chi mot so items duoc update `quantity_returned`.

**Fix**: Chuyen sang RPC de dam bao atomic. Tuy nhien do da co RPC `create_laundry_return_transaction` cho buoc stock-in, bug nay chi anh huong den `laundry_batch_items` metadata (quantity_returned, quantity_lost...). Muc do anh huong thuc te: thap-trung binh.

**Recommendation**: Giu nguyen nhung them try/catch bao quanh toan bo de rollback batch status neu items update fail.

---

### Bug 2: `useRoomChecks` - Race condition khi update `items.quantity_in_stock` (NGHIEM TRONG)

**File**: `src/hooks/useRoomChecks.ts` line 524-558 (`createLostItemTransaction`) va line 571-604 (`createConsumedItemTransaction`)

Pattern:
```
1. SELECT quantity_in_stock FROM items WHERE id = X
2. Calculate quantityAfter = quantity_in_stock - quantity
3. UPDATE items SET quantity_in_stock = quantityAfter WHERE id = X
```

Neu 2 room check chay dong thoi cho cung 1 item, ca 2 doc cung gia tri `quantity_in_stock`, va cai sau ghi de ket qua cua cai truoc. Vi du: stock = 100, check A tru 5, check B tru 3 → ket qua dung la 92, nhung thuc te co the la 97 (B ghi de A).

**Fix**: Dung `UPDATE items SET quantity_in_stock = quantity_in_stock - $quantity` thay vi read-then-write. Hoac tot hon: chuyen sang RPC.

Tuong tu cho `updateLaundryQuantities` (line 474-511) cung co pattern read-then-write.

---

### Bug 3: `useApprovePO` - Thieu status validation (NHO)

**File**: `src/hooks/usePurchaseOrders.ts` line 191-233

`useApprovePO` khong validate trang thai hien tai truoc khi approve. Bat ky PO nao (ke ca da `received`, `cancelled`) deu co the bi update thanh `approved`. So sanh voi `useDeletePO` da co validation.

**Fix**: Them check `status === 'submitted'` truoc khi approve.

---

### Bug 4: `useReceivePO` - Thieu `warehouse-stock` invalidation da co, NHUNG thieu `warehouses-with-stats` (NHO)

**File**: `src/hooks/usePurchaseOrders.ts` line 365-375

`onSuccess` da invalidate `warehouse-stock` (tot), nhung thieu `warehouses-with-stats` va `inventory-dashboard`.

**Fix**: Them:
```typescript
queryClient.invalidateQueries({ queryKey: ['warehouses-with-stats'] })
queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
```

---

### Bug 5: `useStockInFromLaundry` - Thieu invalidate `warehouse-stock` va `warehouses-with-stats` (TRUNG BINH)

**File**: `src/hooks/useLaundryBatches.ts` line 563-568

Khi nhap kho tu lo giat, `onSuccess` invalidate `items`, `inventory-transactions`, `dashboard-stats` nhung thieu `warehouse-stock` va `warehouses-with-stats`. RPC `create_laundry_return_transaction` cap nhat warehouse_stock, nhung UI se khong refresh.

**Fix**: Them invalidate `warehouse-stock` va `warehouses-with-stats`.

---

### Bug 6: `useMaintenanceRequests` - Query khong co limit (NHO)

**File**: `src/hooks/useMaintenanceRequests.ts` line 62-141

Query fetch tat ca maintenance requests ma khong co `.limit()`. Voi du lieu lon (>1000 rows), se bi gioi han 1000 rows mac dinh cua Supabase va khong co pagination.

**Fix**: Them `.limit(200)` hoac implement pagination tuong tu `useLaundryBatches`.

---

### Ke hoach fix (5 bug uu tien)

1. **Fix race condition trong `useRoomChecks`** - Doi sang `quantity_in_stock = quantity_in_stock - N` pattern cho `createLostItemTransaction`, `createConsumedItemTransaction`, va `updateLaundryQuantities`
2. **Fix `useStockInFromLaundry` invalidation** - Them `warehouse-stock`, `warehouses-with-stats`
3. **Fix `useReceivePO` invalidation** - Them `warehouses-with-stats`, `inventory-dashboard`
4. **Fix `useApprovePO` status validation** - Them check `status === 'submitted'`
5. **Fix `useMaintenanceRequests` missing limit** - Them `.limit(200)`

**Files thay doi**: `src/hooks/useRoomChecks.ts`, `src/hooks/useLaundryBatches.ts`, `src/hooks/usePurchaseOrders.ts`, `src/hooks/useMaintenanceRequests.ts`

