

## Phan tich logic Kho va Tai san - Cac van de phat hien

### Bug 1: `useDeleteTransaction` thieu invalidate `warehouse-stock` (NGHIEM TRONG)

**File**: `src/hooks/useInventoryTransactions.ts` line 267-271

Khi xoa giao dich, RPC `delete_inventory_transaction` hoan nguyen so luong trong ca bang `items` va `warehouse_stock`. Nhung `onSuccess` chi invalidate `inventory-transactions`, `inventory-dashboard`, `items`, `low-stock-items` -- **thieu `warehouse-stock` va `warehouses-with-stats`**.

Hau qua: Sau khi xoa giao dich, UI hien thi ton kho theo kho cu (stale) cho den khi user reload trang.

**Fix**: Them 2 dong invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
queryClient.invalidateQueries({ queryKey: ['warehouses-with-stats'] })
```

### Bug 2: `low_stock_count` trong `useWarehousesWithStats` tinh sai

**File**: `src/hooks/useWarehouses.ts` line 107

```typescript
low_stock_count: stocks.filter((s: any) => s.quantity <= (s.minimum_stock || 0)).length
```

Van de: `warehouse_stock` join khong select `minimum_stock` (line 82-85 chi select `quantity` va `item.unit_price`). Nen `s.minimum_stock` luon la `undefined`, fallback ve `0`. Tat ca item co `quantity = 0` se duoc dem la low_stock, nhung item co quantity > 0 va duoi minimum_stock se KHONG duoc dem.

**Fix**: Them `minimum_stock` vao select:
```typescript
warehouse_stock (
  quantity,
  minimum_stock,
  item:item_id (unit_price)
)
```

### Bug 3: `useLowStockByWarehouse` dung PostgREST filter khong hop le

**File**: `src/hooks/useWarehouseStock.ts` line 154

```typescript
.or('quantity.lte.minimum_stock,quantity.eq.0')
```

PostgREST `.lte()` so sanh voi gia tri cu the (literal), KHONG ho tro so sanh giua 2 column. `quantity.lte.minimum_stock` se co parse `minimum_stock` nhu mot string, khong phai column reference. Query nay co the tra ve ket qua sai hoac loi.

**Fix**: Dung RPC hoac fetch tat ca roi filter client-side:
```typescript
// Option 1: Filter client-side
const { data, error } = await supabase
  .from('warehouse_stock')
  .select(`*, item:item_id (...)`)
  .eq('warehouse_id', warehouseId)

// Then filter:
return (data || []).filter(s => s.quantity <= (s.minimum_stock || 0) || s.quantity === 0)
```

### Bug 4: `useItemWarehouseStock` filter hotel tren relation khong hoat dong

**File**: `src/hooks/useWarehouseStock.ts` line 73-75

```typescript
if (selectedHotel?.id) {
  query = query.eq('warehouse.hotel_id', selectedHotel.id)
}
```

PostgREST filtering tren embedded resource (`warehouse.hotel_id`) chi filter cac warehouse records, nhung van tra ve warehouse_stock rows voi `warehouse: null`. Code da xu ly bang `.filter(s => s.warehouse !== null)` (line 81), nhung dieu nay co nghia la query van fetch du lieu khong can thiet tu DB.

**Muc do**: Nho - da co workaround. Khong can fix ngay.

### Bug 5: Transfer form cho phep submit khi overstock

**File**: `src/pages/inventory/TransferPage.tsx` line 320

```typescript
<Button type="submit" size="sm" disabled={isLoading || hasOverstock || !fromWarehouseId}>
```

Van de: `hasOverstock` chi check client-side. Khong co server-side validation trong RPC `create_warehouse_transfer`. Neu stock thay doi giua luc check va luc submit, co the tao transfer vuot qua ton kho.

**Muc do**: Trung binh - can kiem tra RPC co validate khong. Neu RPC da validate thi OK.

### Ke hoach fix (3 bug chinh)

1. **Fix `useDeleteTransaction` invalidation** - Them `warehouse-stock` va `warehouses-with-stats` vao invalidate list
2. **Fix `useWarehousesWithStats` select** - Them `minimum_stock` vao warehouse_stock select
3. **Fix `useLowStockByWarehouse` filter** - Chuyen sang client-side filter thay vi PostgREST cross-column comparison

**Files thay doi**: `src/hooks/useInventoryTransactions.ts`, `src/hooks/useWarehouses.ts`, `src/hooks/useWarehouseStock.ts`

