

## Phân tích Chi tiết Inventory Flow

### I. TỔNG QUAN KIẾN TRÚC INVENTORY

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INVENTORY FLOW ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  INBOUND    │    │  OUTBOUND   │    │  TRANSFER   │    │ ADJUSTMENT  │      │
│  │ (Nhập kho)  │    │ (Xuất kho)  │    │ (Chuyển kho)│    │ (Kiểm kê)   │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │                  │              │
│         ▼                  ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    inventory_transactions (Giao dịch)                     │  │
│  │   - transaction_type: in | out | transfer | adjust                       │  │
│  │   - quantity_before, quantity_after                                       │  │
│  └───────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│                                  ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                              items (Tồn kho)                              │  │
│  │   - quantity_total: Tổng số lượng                                         │  │
│  │   - quantity_in_stock: Tồn kho hiện có                                    │  │
│  │   - quantity_in_laundry: Đang giặt                                        │  │
│  │   - minimum_stock, reorder_point: Ngưỡng cảnh báo                        │  │
│  └───────────────────────────────┬──────────────────────────────────────────┘  │
│                                  │                                              │
│                                  ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                       warehouse_stock (Multi-warehouse)                   │  │
│  │   - quantity: Tồn kho tại từng kho                                        │  │
│  │   - minimum_stock: Ngưỡng cảnh báo per warehouse                         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### II. NHỮNG GÌ ĐÃ HOẠT ĐỘNG TỐT

| Component | Trạng thái | Chi tiết |
|-----------|------------|----------|
| Inbound Transaction | ✅ Tốt | RPC `create_inbound_transaction` xử lý đúng, update cả `items` và `warehouse_stock` |
| Outbound Transaction | ✅ Tốt | RPC `create_outbound_transaction` có low stock detection, trigger workflow |
| Warehouse Transfer | ✅ Tốt | `useCreateWarehouseTransfer` invalidate đúng queries |
| Low Stock Alert Dashboard | ✅ Tốt | `LowStockAlert.tsx` hiển thị critical/warning items |
| Low Stock Workflow | ✅ Tốt | Trigger `INVENTORY_LOW_STOCK` khi xuất kho dưới ngưỡng |
| Query Invalidation | ✅ Tốt | Cả inbound/outbound đều invalidate đầy đủ related queries |
| Realtime Warehouse Stock | ✅ Tốt | `useWarehouseStock` có realtime subscription |
| Draft Auto-Save | ✅ Tốt | Cả `MobileInboundForm` và `MobileOutboundForm` đều có localStorage draft |
| Stock Adjustment Flow | ✅ Tốt | Full flow: create → assign → check → complete → approve |
| Adjustment Workflow Triggers | ✅ Tốt | Triggers cho created, started, completed, approved, rejected |
| Per-item Approval | ✅ Tốt | `useApproveItem` cho phép duyệt từng item riêng lẻ |
| Investigation Flow | ✅ Tốt | Workflow cho items có chênh lệch cần điều tra |

---

### III. VẤN ĐỀ PHÁT HIỆN

#### A. Room Check - Không validate stock trước khi Replace (Ưu tiên: Trung bình)

**Vị trí:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

**Vấn đề:**
Khi staff chọn "Thay đổi đồ vải" (change) hoặc "Bổ sung đồ" (add):
```typescript
// Line 247-262 - Không check quantity_in_stock trước
} else if (status === 'change') {
  setLaundryItems(prev => [...prev, {...}]);
  setReplacedItems(prev => [...prev, {...}]);  // ← Không validate stock
  toast({ title: 'Thay đổi đồ vải', description: `${quantity}x ${item.item_name}` });
}
```

**Hậu quả:**
- Cho phép replace nhiều hơn stock hiện có
- Có thể dẫn đến negative stock sau khi submit
- Khác với `MobileOutboundForm.tsx` đã có validation stock

**Giải pháp đề xuất:**
1. Fetch `quantity_in_stock` cho items trong room
2. Hiển thị available stock trong UI
3. Warning/block khi quantity vượt stock

---

#### B. Distribution Order - Không validate stock per warehouse (Ưu tiên: Trung bình)

**Vị trí:** `src/hooks/useDistributionOrders.ts`

**Vấn đề:**
`useCreateDistributionOrder` không validate stock trước khi tạo:
```typescript
// Line 66-82 - Không check warehouse stock
mutationFn: async (data: CreateDistributionData) => {
  const { data: result, error } = await supabase.rpc('create_distribution_order', {
    // ... items without stock validation
  })
}
```

**Khác biệt:**
- `MobileOutboundForm` ✅ có `useMultipleWarehouseStock` để validate
- `CreateDistributionPage` ❓ cần kiểm tra xem có validate không

**Giải pháp đề xuất:**
1. Thêm stock validation trong UI trước submit
2. Hoặc RPC validate và trả về error nếu insufficient stock

---

#### C. Inbound từ Adjustment - Thiếu warehouse_id (Ưu tiên: Thấp)

**Vị trí:** `src/components/inventory/MobileInboundForm.tsx`

**Vấn đề:**
Khi prefill từ adjustment (bổ sung hàng thiếu):
```typescript
// Line 86-101 - Prefill from adjustment nhưng không có warehouse info
defaultValues: {
  transaction_category: 'purchase',
  from_location: hasPrefill ? 'Bổ sung kiểm kê' : '',
  to_location: t('inventory:mobileForm.inbound.toPlaceholder'),
  items: hasPrefill ? prefillFromAdjustment.items : [],
  // ... KHÔNG có to_warehouse_id từ adjustment
}
```

**Giải pháp đề xuất:**
Pass `warehouseId` từ adjustment page khi navigate đến inbound form

---

#### D. Stock Adjustment - Không update warehouse_stock (Ưu tiên: Cao)

**Vị trí:** `src/hooks/useStockAdjustments.ts` - Line 406-442, 674-681

**Vấn đề:**
Khi approve adjustment, code update `items.quantity_in_stock` nhưng KHÔNG update `warehouse_stock`:
```typescript
// Line 409-414 trong useApproveAdjustment
const { error: updateError } = await supabase
  .from('items')
  .update({ quantity_in_stock: item.actual_quantity })  // ← Chỉ update items
  .eq('id', item.item_id)
// ❌ KHÔNG có update warehouse_stock
```

**Hậu quả:**
- `items.quantity_in_stock` và `warehouse_stock.quantity` bị out of sync
- Dashboard stats có thể không chính xác
- Multi-warehouse reports sai số liệu

**Giải pháp đề xuất:**
1. Update cả `warehouse_stock` khi approve adjustment
2. Hoặc sử dụng DB trigger để tự động sync
3. Hoặc adjustment phải gắn với warehouse cụ thể

---

#### E. Delete Transaction - Không rollback warehouse_stock (Ưu tiên: Cao)

**Vị trí:** `src/hooks/useInventoryTransactions.ts` - Line 246-285

**Vấn đề:**
`useDeleteTransaction` gọi RPC `delete_inventory_transaction` nhưng cần verify RPC có rollback `warehouse_stock` không:
```typescript
// Line 252-265
const { data, error } = await supabase.rpc('delete_inventory_transaction', {
  p_transaction_id: transactionId
})
// Cần verify RPC này có rollback warehouse_stock hay không
```

**Giải pháp đề xuất:**
Verify và update RPC nếu cần thiết

---

#### F. Low Stock Alert - Không trigger từ Room Check (Ưu tiên: Thấp)

**Vấn đề:**
Khi room check consume items, inventory giảm nhưng không trigger low stock workflow:
- `processCheckoutCheck()` trong `useRoomChecks.ts` tạo inventory transaction
- Nhưng không check và trigger `INVENTORY_LOW_STOCK` như `useCreateOutboundTransaction` làm

**Giải pháp đề xuất:**
Thêm low stock check sau khi room check consume items

---

#### G. Realtime Subscription - Chỉ có cho warehouse_stock (Ưu tiên: Thấp)

**Vấn đề:**
- ✅ `useWarehouseStock` có realtime subscription
- ❌ `useInventoryDashboard` không có realtime
- ❌ `useLowStockItems` không có realtime

**Hiện trạng:**
Dashboard dùng `refetchInterval: 60000` (1 phút) thay vì realtime

**Giải pháp đề xuất:**
Thêm realtime subscription hoặc giảm refetch interval xuống 30s cho dashboard

---

### IV. TÓM TẮT VẤN ĐỀ THEO MỨC ĐỘ

| # | Vấn đề | Mức độ | File cần sửa |
|---|--------|--------|--------------|
| D | Adjustment không sync warehouse_stock | **Cao** | `useStockAdjustments.ts` hoặc DB RPC |
| E | Delete transaction không rollback warehouse_stock | **Cao** | Verify `delete_inventory_transaction` RPC |
| A | Room Check không validate stock khi replace | **Trung bình** | `ItemsCheckStep.tsx` |
| B | Distribution không validate stock per warehouse | **Trung bình** | `useDistributionOrders.ts` hoặc UI |
| C | Inbound từ Adjustment thiếu warehouse_id | **Thấp** | `MobileInboundForm.tsx` |
| F | Room Check không trigger low stock workflow | **Thấp** | `useRoomChecks.ts` |
| G | Dashboard không realtime | **Thấp** | `useInventoryDashboard.ts` |

---

### V. FLOW ĐỀ XUẤT SAU CẢI TIẾN

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         IMPROVED INVENTORY FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐                                                            │
│  │    INBOUND      │ ← validate warehouse exists                                │
│  │  (Nhập kho)     │ → update items + warehouse_stock                          │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│  ┌────────▼────────┐                                                            │
│  │    OUTBOUND     │ ← ✅ validate stock per warehouse                         │
│  │   (Xuất kho)    │ → ✅ trigger low stock workflow                           │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│  ┌────────▼────────┐                                                            │
│  │   ROOM CHECK    │ ← ✨ validate stock before replace (MỚI)                  │
│  │ (Kiểm tra phòng)│ → ✨ trigger low stock workflow (MỚI)                     │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│  ┌────────▼────────┐                                                            │
│  │  DISTRIBUTION   │ ← ✨ validate stock per warehouse (MỚI)                   │
│  │ (Phiếu giao)    │ → update items + warehouse_stock                          │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│  ┌────────▼────────┐                                                            │
│  │   ADJUSTMENT    │ ← validate against warehouse (if multi-wh)                │
│  │   (Kiểm kê)     │ → ✨ update items + warehouse_stock (MỚI)                 │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│  ┌────────▼────────┐                                                            │
│  │    DASHBOARD    │ ← ✨ realtime subscription (optional)                     │
│  │  (Tổng quan)    │                                                            │
│  └──────────────────┘                                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### VI. ĐỀ XUẤT HÀNH ĐỘNG

**Phase 1 - Critical Fixes (1-2 ngày):**
1. Verify và fix `delete_inventory_transaction` RPC rollback warehouse_stock
2. Update `useApproveAdjustment` / DB trigger để sync warehouse_stock

**Phase 2 - Medium Fixes (2-3 ngày):**
3. Thêm stock validation trong `ItemsCheckStep.tsx`
4. Thêm stock validation trong Distribution Order flow

**Phase 3 - Nice-to-Have (1-2 ngày):**
5. Thêm low stock trigger cho room check
6. Improve realtime cho dashboard

