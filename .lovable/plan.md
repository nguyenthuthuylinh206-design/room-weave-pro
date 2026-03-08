

## Ket qua kiem tra phan phieu giao hang (Distribution)

Sau khi review day du cac file: `useDistributionOrders.ts`, `useRouteBatch.ts`, `useRoomDistributionHistory.ts`, `useDistributionForm.ts`, cac component trong `src/components/distribution/`, phat hien cac van de sau:

---

### Bug 1: `useRouteBatch` - Thieu invalidation `warehouse-stock` va `warehouses-with-stats` (TRUNG BINH)

**Files**: `src/hooks/useRouteBatch.ts`

Nhieu mutation trong `useRouteBatch` thay doi ton kho (thong qua RPC) nhung KHONG invalidate `warehouse-stock` va `warehouses-with-stats`:

- **`useHandoverBatch`** (line 209-219): RPC `handover_batch` tru ton kho de xuat hang, nhung chi invalidate `items`. Thieu `warehouse-stock`, `warehouses-with-stats`.
- **`useReturnToStock`** (line 451-457): RPC `return_to_stock_for_stop` tra hang ve kho, chi invalidate `items`. Thieu `warehouse-stock`, `warehouses-with-stats`.
- **`useHandoverStop`** (line 494-499): RPC `handover_stop_create_next_route` tra hang ve kho roi tao route moi, KHONG invalidate `items`, `warehouse-stock`, `warehouses-with-stats`.
- **`useConfirmReceiveOrder`** (line 618-622): RPC `confirm_receive_order` tru ton kho, KHONG invalidate `items`, `warehouse-stock`, `warehouses-with-stats`.

**Fix**: Them invalidation `warehouse-stock`, `warehouses-with-stats`, va `items` (neu thieu) vao `onSuccess` cua 4 mutations nay.

---

### Bug 2: `useDistributionForm.setQuantityForAllRooms` - Stale closure (NHO)

**File**: `src/components/distribution/hooks/useDistributionForm.ts` line 197-219

`setQuantityForAllRooms` su dung `allocations` truc tiep trong callback cua `setAllocations(() => ...)`. Mac du dung functional update, callback khong nhan `prev` ma doc `allocations` tu closure → co the bi stale khi goi lien tiep.

```typescript
setAllocations(() => 
  selectedRoomIds.map(roomId => {
    const existing = allocations.find(a => a.room_id === roomId) // ← stale!
    ...
  })
)
```

**Fix**: Doi sang `setAllocations(prev => ...)` va dung `prev` thay vi `allocations`.

---

### Bug 3: `autoFillMissingItemsForRoom` - Thieu dependency `allocations` (NHO)

**File**: `src/components/distribution/hooks/useDistributionForm.ts` line 346-446

`autoFillMissingItemsForRoom` doc `allocations` ben trong callback de check `alreadyAllocated`, nhung dependency array chi co `[getRemainingStock]`. Ket qua: khi da them item vao phong, goi auto-fill lai co the tinh sai vi doc `allocations` cu.

**Fix**: Them `allocations` vao dependency array.

---

### Bug 4: `useRejectRoomDelivery` va `useUndoRoomDelivery` - Thieu `warehouse-stock` invalidation (NHO)

**File**: `src/hooks/useRoomDistributionHistory.ts`

- `useRejectRoomDelivery` (line 203-208): RPC `reject_room_delivery` tra hang ve kho nhung chi invalidate `items`, thieu `warehouse-stock`, `warehouses-with-stats`.
- `useUndoRoomDelivery` (line 238-244): RPC `undo_room_delivery_confirmation` rollback ton kho nhung thieu `warehouse-stock`, `warehouses-with-stats`.

**Fix**: Them invalidation.

---

### Bug 5: `useRoomDistributionHistory` - Query khong co limit (NHO)

**File**: `src/hooks/useRoomDistributionHistory.ts` line 36-69

Query fetch tat ca distribution order rooms cho 1 phong ma khong co `.limit()`. Voi phong co nhieu don giao hang (>100), co the cham.

**Fix**: Them `.limit(50)` vi du lam giao dien chi hien thi lich su gan nhat.

---

### Ke hoach fix (5 items)

1. **Fix `useRouteBatch` invalidation** - Them `warehouse-stock`, `warehouses-with-stats`, `items` vao `useHandoverBatch`, `useReturnToStock`, `useHandoverStop`, `useConfirmReceiveOrder`
2. **Fix `useRoomDistributionHistory` invalidation** - Them `warehouse-stock`, `warehouses-with-stats` vao `useRejectRoomDelivery`, `useUndoRoomDelivery`
3. **Fix `setQuantityForAllRooms` stale closure** - Doi sang dung `prev` parameter
4. **Fix `autoFillMissingItemsForRoom` dependency** - Them `allocations` vao dependency array
5. **Fix `useRoomDistributionHistory` limit** - Them `.limit(50)`

**Files thay doi**: `src/hooks/useRouteBatch.ts`, `src/hooks/useRoomDistributionHistory.ts`, `src/components/distribution/hooks/useDistributionForm.ts`

