

## Phân Tích Module Giặt Ủi (Laundry) - Kết Quả Kiểm Tra

### I. TỔNG QUAN ĐÁNH GIÁ

| Tiêu chí | Trạng thái | Chi tiết |
|----------|------------|----------|
| **Tạo lô giặt (Desktop)** | ✅ Tốt | 3-step wizard với validation stock đầy đủ |
| **Tạo lô giặt (Mobile)** | ⚠️ Có vấn đề | Thiếu filter `is_launderable` |
| **Nhận lô giặt** | ✅ Tốt | Status validation, rating, compensation |
| **Nhập kho từ giặt** | ✅ Tốt | RPC transactional, xử lý lost/damaged riêng |
| **Status Transitions** | ✅ Tốt | delivered → ready → received → stocked |
| **Vendor Management** | ✅ Tốt | CRUD, performance tracking, rating |
| **Inventory Sync** | ✅ Tốt | RPCs atomic cho create/return/loss |
| **Workflow Triggers** | ✅ Tốt | `LAUNDRY_BATCH_STATUS_CHANGE` |
| **Notifications** | ✅ Tốt | Manager notifications cho issues |

---

### II. VẤN ĐỀ PHÁT HIỆN

#### A. MobileBatchForm - Thiếu Filter `is_launderable` (Mức độ: **TRUNG BÌNH**)

**Vị trí:** `src/components/laundry/MobileBatchForm.tsx` (lines 75-78)

**Vấn đề:**
```typescript
// Hiện tại: Chỉ check category_id !== null
const laundrableItems = itemsData?.items?.filter(item => 
  item.category_id !== null  // ❌ Không filter is_launderable
)
```

**So sánh với Desktop:**
```typescript
// CreateBatchStep2.tsx - lines 62-74: Có filter đúng
const { data: launderableCategories } = useQuery({
  queryKey: ['launderable-categories', tenantId],
  queryFn: async () => {
    const { data } = await supabase
      .from('item_categories')
      .select('id')
      .eq('is_launderable', true)  // ✅ Filter đúng
      .eq('status', 'active')
    return data?.map(cat => cat.id) || []
  },
})

const availableItems = itemsQuery.data?.items?.filter((item) => {
  const hasStock = (item.quantity_in_stock || 0) > 0
  const isLaunderable = item.category_id && launderableCategories?.includes(item.category_id)
  return hasStock && isLaunderable  // ✅ Filter is_launderable
}) || []
```

**Tác động:**
- Mobile hiển thị TẤT CẢ items có category, bao gồm cả items không thể giặt
- Gây nhầm lẫn cho staff, có thể chọn sai items

---

#### B. MobileBatchForm - Thiếu Validation Stock (Mức độ: **THẤP**)

**Vấn đề:**
Mobile form cho phép add items mà không check stock availability:
```typescript
// Line 95-112: addItem không check stock
const addItem = (item: any) => {
  const existing = items.find(i => i.item_id === item.id)
  if (existing) {
    setItems(items.map(i => 
      i.item_id === item.id 
        ? { ...i, quantity: i.quantity + 1 }  // ❌ Không check stock
        : i
    ))
  }
  // ...
}
```

**So sánh với Desktop:**
- Desktop có `superRefine` validation check quantity vs stock

---

#### C. ReceiveItemsTable - Thiếu Compensation Logic (Mức độ: **THẤP**)

**Vấn đề:**
Khi có items mất/hỏng, `ReceiveItemsTable` hiển thị các trường nhập liệu nhưng không hiển thị giá trị bồi thường cho từng item inline.

**Hiện trạng:**
- Compensation chỉ hiển thị tổng ở bên ngoài (ReceiveBatchPage)
- User phải tự tính giá trị thiệt hại từng item

---

### III. NHỮNG GÌ ĐÃ TỐT

#### 1. RPC Transactional cho Inventory
```
✅ create_laundry_batch_with_items: Validate stock → Create batch → Update items ATOMIC
✅ create_laundry_return_transaction: Nhập kho từ giặt, sync stock+laundry
✅ create_laundry_loss_transaction: Xử lý items mất/hỏng, update quantity_total
```

#### 2. Status Validation Chặt Chẽ
```typescript
const ALLOWED_TRANSITIONS = {
  delivered: ['ready'],
  washing: ['ready'],
  ready: ['received'],
  received: ['stocked']
}
```

#### 3. Workflow Integration
```typescript
triggerWorkflow({
  triggerType: WorkflowTriggerTypes.LAUNDRY_BATCH_STATUS_CHANGE,
  eventData: { batch_id, new_status },
  tenantId, hotelId
})
```

#### 4. Quality & Timeliness Tracking
- Rating 1-5 cho quality và timeliness
- Auto-calculate timeliness rating based on delivery delay

#### 5. Vendor Performance
```
✅ get_vendor_performance RPC
✅ total_orders, total_value tracking
✅ Rating aggregation
```

---

### IV. ĐỀ XUẤT SỬA LỖI

#### Fix A: MobileBatchForm - Thêm is_launderable Filter (Ưu tiên: **CAO**)

**Thay đổi cần thực hiện:**

```typescript
// 1. Thêm query để lấy launderable categories (như CreateBatchStep2)
const { data: launderableCategories } = useQuery({
  queryKey: ['launderable-categories', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('item_categories')
      .select('id')
      .eq('is_launderable', true)
      .eq('status', 'active')
    if (error) throw error
    return data?.map(cat => cat.id) || []
  },
  enabled: !!tenantId,
})

// 2. Cập nhật filter logic
const laundrableItems = itemsData?.items?.filter(item => {
  const hasStock = (item.quantity_in_stock || 0) > 0
  const isLaunderable = item.category_id && launderableCategories?.includes(item.category_id)
  return hasStock && isLaunderable
})
```

---

#### Fix B: MobileBatchForm - Thêm Stock Validation (Ưu tiên: **TRUNG BÌNH**)

**Thay đổi cần thực hiện:**

```typescript
const addItem = (item: any) => {
  const existing = items.find(i => i.item_id === item.id)
  const currentQty = existing?.quantity || 0
  const stockAvailable = item.quantity_in_stock || 0
  
  // Check stock
  if (currentQty + 1 > stockAvailable) {
    toast.error(t('mobileBatch.insufficientStock', { name: item.name }))
    return
  }
  
  // ... rest of logic
}

const updateItem = (itemId: string, field: keyof BatchItem, value: any) => {
  // Validate quantity against stock when updating
  if (field === 'quantity') {
    const item = items.find(i => i.item_id === itemId)
    const stockAvailable = item?.item?.quantity_in_stock || 0
    if (value > stockAvailable) {
      toast.error(t('mobileBatch.maxStock', { max: stockAvailable }))
      return
    }
  }
  // ... rest of logic
}
```

---

#### Fix C: Thêm Item-level Compensation trong ReceiveItemsTable (Ưu tiên: **THẤP**)

**Thay đổi cần thực hiện:**

```typescript
// Thêm cột "Bồi thường" trong table
<TableHead className="text-right">Bồi thường</TableHead>

// Hiển thị giá trị
<TableCell className="text-right text-red-600">
  {(formItem.quantity_lost + formItem.quantity_damaged) > 0 
    ? formatCurrency((formItem.quantity_lost + formItem.quantity_damaged) * (item.item?.unit_price || 0))
    : '-'
  }
</TableCell>
```

---

### V. TÓM TẮT

| # | Vấn đề | Mức độ | File |
|---|--------|--------|------|
| A | MobileBatchForm thiếu `is_launderable` filter | **Trung bình** | `MobileBatchForm.tsx` |
| B | MobileBatchForm thiếu stock validation | Thấp | `MobileBatchForm.tsx` |
| C | ReceiveItemsTable thiếu item-level compensation | Thấp | `ReceiveItemsTable.tsx` |

---

### VI. TRẠNG THÁI MODULE

**Module Laundry đạt ~95% hoàn thiện**

**Điểm mạnh:**
- ✅ RPCs transactional đảm bảo data consistency
- ✅ Status transitions với validation
- ✅ Workflow triggers integration
- ✅ Vendor performance tracking
- ✅ Quality rating system
- ✅ Desktop form có đầy đủ validation

**Cần cải thiện:**
- ⚠️ Mobile form thiếu `is_launderable` filter
- ⚠️ Mobile form thiếu stock validation
- ⚠️ UI hiển thị compensation có thể cải thiện

---

### VII. THỰC HIỆN

| Bước | Công việc | Ước lượng |
|------|-----------|-----------|
| 1 | Fix MobileBatchForm - is_launderable filter | 5 phút |
| 2 | Fix MobileBatchForm - stock validation | 5 phút |
| 3 | Fix ReceiveItemsTable - item compensation | 5 phút |
| 4 | Test end-to-end trên mobile | 10 phút |

Tổng thời gian ước tính: **~25 phút**

