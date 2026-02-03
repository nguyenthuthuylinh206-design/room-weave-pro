

## Kế hoạch: Tối ưu hiệu suất xác nhận hoàn tất kiểm tra phòng

### VẤN ĐỀ HIỆN TẠI

Khi nhấn "Xác nhận hoàn tất" kiểm tra phòng (checkout), hệ thống thực hiện **rất nhiều tác vụ tuần tự (sequential)**, mỗi tác vụ phải chờ tác vụ trước hoàn thành:

| Bước | Tác vụ | Số lượng queries |
|------|--------|------------------|
| 1 | Lấy thông tin phòng | 1 |
| 2 | Lấy unit_price cho từng item consumed | N (số items) |
| 3 | Insert room_checks | 1 |
| 4 | Xóa ảnh cũ từ 10 checks trước | 10+ |
| 5 | processCheckoutCheck (bao gồm nhiều sub-tasks) | 10-20+ |
| 6 | Apply itemQuantities | 1-2 |
| 7 | Update last_checked_at cho room_items | 1 |
| 8 | Gửi notifications | 5-10 |
| 9 | Trigger workflows | 1-2 |

**Ước tính tổng**: 30-50+ database queries tuần tự, mỗi query mất ~50-200ms.

#### Chi tiết processCheckoutCheck (bước 5):
```text
1. Loop qua laundry items → updateLaundryQuantities (N queries)
2. Loop qua lost items → createLostItemTransaction (2N queries: select + insert + update)
3. Loop qua consumed items → createConsumedItemTransaction (2N queries)
4. applyRoomItemChanges (2 queries)
5. completeCheckoutInspection (1-2 queries)
6. Update room status (1 query)
7. sendCleaningRequestNotifications (3-5 queries)
8. Create housekeeping_task (1 query)
9. createSupplementRequestFromCheck (nhiều queries)
10. createLaundryRequestFromCheck (nhiều queries)
11. createMaintenanceForDamagedItems (nhiều queries)
```

---

### GIẢI PHÁP ĐỀ XUẤT

#### Phương án 1: Tối ưu hóa song song (Parallel Processing)

Nhóm các tác vụ độc lập và chạy song song bằng `Promise.all()` hoặc `Promise.allSettled()`.

**Thay đổi trong `useRoomChecks.ts`:**

```typescript
// TRƯỚC: Tuần tự
const item1 = await createLostItemTransaction(params1)
const item2 = await createLostItemTransaction(params2)
const item3 = await createLostItemTransaction(params3)

// SAU: Song song
await Promise.all([
  createLostItemTransaction(params1),
  createLostItemTransaction(params2),
  createLostItemTransaction(params3),
])
```

**Nhóm có thể chạy song song:**
- Tất cả `createLostItemTransaction` cho các items
- Tất cả `createConsumedItemTransaction` cho các items  
- `updateLaundryQuantities` cho các items
- Notifications (đã dùng `Promise.allSettled`)
- Non-blocking tasks (workflow trigger, cleanup ảnh cũ)

---

#### Phương án 2: Background Processing (Đề xuất cho tương lai)

Tách các tác vụ không cần kết quả ngay lập tức ra background:

```text
Foreground (User cần đợi):
├── Insert room_checks ✓
├── Update room status ✓
└── Complete checkout inspection ✓

Background (Không cần đợi):
├── Create inventory transactions
├── Update item quantities  
├── Create laundry/supplement requests
├── Send notifications
├── Trigger workflows
└── Cleanup old photos
```

---

#### Phương án 3: Quick Win - Tối ưu ngay

| Vị trí | Thay đổi | Tiết kiệm |
|--------|----------|-----------|
| `enrichItemsWithPrice` | Batch fetch thay vì N queries | ~(N-1) × 100ms |
| `createLostItemTransaction` | Batch tất cả items cùng lúc | ~(N-1) × 150ms |
| `createConsumedItemTransaction` | Batch tất cả items cùng lúc | ~(N-1) × 150ms |
| `updateLaundryQuantities` | Batch update | ~(N-1) × 100ms |
| Cleanup old photos | Move to background | ~500ms |
| Non-critical notifications | Fire and forget | ~300ms |

---

### KẾ HOẠCH THỰC HIỆN (Quick Win)

#### 1. Batch fetch unit_price (thay vì N queries riêng lẻ)

**File**: `src/hooks/useRoomChecks.ts` (dòng 714-730)

```typescript
// TRƯỚC: N queries tuần tự
consumedItemsWithPrice = await Promise.all(
  consumedItemsWithPrice.map(async (item) => {
    const { data: itemData } = await supabase
      .from('items')
      .select('unit_price')
      .eq('id', item.item_id)
      .maybeSingle()
    return { ...item, unit_price: itemData?.unit_price || 0 }
  })
)

// SAU: 1 query duy nhất
const itemIds = consumedItemsWithPrice.map(i => i.item_id)
const { data: itemsWithPrices } = await supabase
  .from('items')
  .select('id, unit_price')
  .in('id', itemIds)

const priceMap = Object.fromEntries(
  (itemsWithPrices || []).map(i => [i.id, i.unit_price || 0])
)
consumedItemsWithPrice = consumedItemsWithPrice.map(item => ({
  ...item,
  unit_price: priceMap[item.item_id] || 0,
}))
```

---

#### 2. Batch create inventory transactions

**File**: `src/hooks/useRoomChecks.ts` - Tạo hàm mới

```typescript
// Thay vì N lần createLostItemTransaction() tuần tự
async function createLostItemTransactionsBatch(params: {
  items: LostItem[]
  tenantId: string
  hotelId: string
  roomNumber: string
  checkId: string
  userId: string
}) {
  const { items, tenantId, hotelId, roomNumber, checkId, userId } = params
  if (items.length === 0) return
  
  // 1. Batch fetch current quantities (1 query)
  const { data: currentItems } = await supabase
    .from('items')
    .select('id, quantity_in_stock, quantity_lost, unit_price')
    .in('id', items.map(i => i.item_id))
  
  const itemMap = Object.fromEntries(
    (currentItems || []).map(i => [i.id, i])
  )
  
  // 2. Build batch transactions
  const transactions = items.map(item => {
    const current = itemMap[item.item_id]
    if (!current) return null
    
    const quantityBefore = current.quantity_in_stock || 0
    const quantityAfter = Math.max(0, quantityBefore - item.quantity)
    
    return {
      tenant_id: tenantId,
      hotel_id: hotelId,
      transaction_code: generateTransactionCode('LOST'),
      transaction_type: 'out',
      transaction_category: 'lost',
      item_id: item.item_id,
      quantity: item.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_price: current.unit_price || 0,
      total_value: (current.unit_price || 0) * item.quantity,
      from_location: `Phòng ${roomNumber}`,
      to_location: 'Mất/Thất lạc',
      related_type: 'room_check',
      related_id: checkId,
      notes: `Mất trong khi kiểm tra checkout phòng ${roomNumber}`,
      created_by: userId,
    }
  }).filter(Boolean)
  
  // 3. Batch insert transactions (1 query)
  if (transactions.length > 0) {
    await supabase.from('inventory_transactions').insert(transactions)
  }
  
  // 4. Batch update items quantities (1 query)
  // Sử dụng Promise.all cho mỗi update (hoặc chuyển sang stored procedure)
  await Promise.all(items.map(async (item) => {
    const current = itemMap[item.item_id]
    if (!current) return
    
    await supabase.from('items').update({
      quantity_lost: (current.quantity_lost || 0) + item.quantity,
      quantity_in_stock: Math.max(0, (current.quantity_in_stock || 0) - item.quantity),
    }).eq('id', item.item_id)
  }))
}
```

---

#### 3. Move cleanup và notifications to fire-and-forget

```typescript
// Cleanup old photos - không cần await
if (recentChecks && recentChecks.length > 1) {
  // Fire and forget - không block user
  cleanupOldPhotos(recentChecks.slice(1), deleteImage).catch(err => 
    console.error('Cleanup failed:', err)
  )
}

// Workflow trigger - đã có .catch(), bỏ await
triggerWorkflow({ ... }).catch(err => console.error('Workflow failed:', err))
// Không có await phía trước
```

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau (ước tính) |
|--------|-------|----------------|
| Thời gian submit checkout | 5-15 giây | 1-3 giây |
| Số queries tuần tự | 30-50 | 10-15 |
| UX | Spinner chờ lâu | Phản hồi nhanh |

---

### CHI TIẾT FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/hooks/useRoomChecks.ts` | Batch fetch prices, batch create transactions, fire-and-forget cleanup |
| `src/pages/rooms/RoomCheckPage.tsx` | (Không cần sửa) |

---

### LƯU Ý

- Giữ nguyên logic business, chỉ tối ưu cách thực thi
- Các tác vụ "fire-and-forget" vẫn có error logging để debug
- Có thể mở rộng thêm bằng cách dùng database stored procedure cho batch operations
- Test kỹ trên môi trường staging trước khi deploy

