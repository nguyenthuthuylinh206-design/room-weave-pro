
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

### II. TIẾN ĐỘ THỰC HIỆN

#### ✅ PHASE 1 - Critical Fixes (HOÀN THÀNH)

| # | Vấn đề | Trạng thái | Chi tiết |
|---|--------|------------|----------|
| E | Delete transaction không rollback warehouse_stock | ✅ **DONE** | Updated RPC `delete_inventory_transaction` để rollback cả `warehouse_stock` |
| - | Duplicate code trong `useApproveItem` và `useApproveAdjustment` | ✅ **DONE** | Removed duplicate stock update logic - DB trigger `stock_adjustment_items_apply` xử lý việc này |

**Lưu ý về vấn đề D (Adjustment không sync warehouse_stock):**
- Sau khi phân tích, phát hiện rằng `stock_adjustments` và `stock_adjustment_items` **KHÔNG có column warehouse_id**
- Đây là **design limitation có chủ đích** - kiểm kê hiện tại áp dụng cho global stock, không per-warehouse
- Trigger `stock_adjustment_items_apply` đã tự động update `items.quantity_in_stock` khi approve
- **Không cần fix** - nếu cần multi-warehouse adjustment sẽ cần migration lớn trong tương lai

---

### III. NHỮNG GÌ ĐÃ HOẠT ĐỘNG TỐT

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
| Distribution Order Stock Validation | ✅ Tốt | `useDistributionForm.ts` có `stockValidation` kiểm tra stock trước submit |
| Delete Transaction | ✅ Tốt | RPC `delete_inventory_transaction` rollback cả `items` và `warehouse_stock` |

---

### IV. VẤN ĐỀ CÒN TỒN TẠI (Phase 2 & 3)

#### A. Room Check - Stock Validation khi Thay Đồ ✅ DONE

**Đã triển khai:**
1. Fetch `quantity_in_stock` khi load room items trong `ItemsCheckStep.tsx`
2. Pass `stockMap` vào `LinenTab` component  
3. Hiển thị available stock trong UI khi chọn "Thêm" hoặc "Đổi"
4. Warning khi số lượng yêu cầu > stock hiện có (amber highlight + message)

---

#### B. Inbound từ Adjustment - Thiếu warehouse_id (Ưu tiên: Thấp)

**Vị trí:** `src/components/inventory/MobileInboundForm.tsx`

**Vấn đề:**
Khi prefill từ adjustment (bổ sung hàng thiếu), không có `to_warehouse_id` từ adjustment.

**Giải pháp đề xuất:**
Pass `warehouseId` từ adjustment page khi navigate đến inbound form

---

#### C. Low Stock Alert - Không trigger từ Room Check (Ưu tiên: Thấp)

**Vấn đề:**
Khi room check consume items, inventory giảm nhưng không trigger low stock workflow.

**Giải pháp đề xuất:**
Thêm low stock check sau khi room check consume items

---

#### D. Realtime Subscription - Chỉ có cho warehouse_stock (Ưu tiên: Thấp)

**Vấn đề:**
- ✅ `useWarehouseStock` có realtime subscription
- ❌ `useInventoryDashboard` không có realtime (dùng refetchInterval: 60000)

**Giải pháp đề xuất:**
Thêm realtime subscription hoặc giảm refetch interval xuống 30s cho dashboard

---

### V. TÓM TẮT VẤN ĐỀ THEO MỨC ĐỘ

| # | Vấn đề | Mức độ | Trạng thái |
|---|--------|--------|------------|
| E | Delete transaction không rollback warehouse_stock | **Cao** | ✅ DONE |
| - | Duplicate code approve adjustment | **Cao** | ✅ DONE |
| D | Adjustment không sync warehouse_stock | **Cao** | ℹ️ Design limitation - không cần fix |
| B | Distribution không validate stock | **Trung bình** | ✅ Đã có sẵn trong `useDistributionForm` |
| A | Room Check không validate stock khi replace | **Trung bình** | ✅ DONE |
| C | Inbound từ Adjustment thiếu warehouse_id | **Thấp** | 🔲 TODO |
| F | Room Check không trigger low stock workflow | **Thấp** | 🔲 TODO |
| G | Dashboard không realtime | **Thấp** | 🔲 TODO |

---

### VI. ĐỀ XUẤT HÀNH ĐỘNG TIẾP THEO

**Phase 2 - Medium Fixes:**
1. Thêm stock validation trong `ItemsCheckStep.tsx`

**Phase 3 - Nice-to-Have:**
2. Thêm low stock trigger cho room check
3. Pass warehouse_id khi prefill từ adjustment
4. Improve realtime cho dashboard
