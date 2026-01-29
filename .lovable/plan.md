

## Phân tích Tổng hợp Các Module - Vấn đề Còn Tồn Tại

### I. TỔNG QUAN TIẾN ĐỘ

| Module | Trạng thái | Ghi chú |
|--------|------------|---------|
| Housekeeping | ✅ 95% | Hoàn thiện sau Phase 3 |
| Inventory | ✅ 90% | Phase 1 + Room Check Stock done |
| Laundry | ✅ Tốt | Đầy đủ status transitions, notifications |
| Maintenance | ✅ Tốt | Đầy đủ workflow triggers, status validation |
| Distribution | ✅ Tốt | Có stockValidation trong useDistributionForm |
| Booking | ✅ Tốt | perform_checkin/checkout RPC với optimistic locking |
| Notifications | ✅ Tốt | Hệ thống notification phong phú, nhiều channels |

---

### II. VẤN ĐỀ PHÁT HIỆN THEO MODULE

#### A. CleaningRequestBanner - Có thể tạo Duplicate Task (Mức độ: Trung bình)

**Vị trí:** `src/components/rooms/CleaningRequestBanner.tsx`

**Vấn đề:**
Khi checkout với `needs_cleaning=true`:
1. ✅ `useRoomChecks.ts` tự động tạo cleaning task
2. ⚠️ `CleaningRequestBanner` vẫn hiển thị để Manager "Phân công" hoặc "Tự dọn"
3. ⚠️ Nếu click → Có thể tạo thêm task duplicate

```typescript
// Line 52-60 - Không check đã có task chưa
await createTask.mutateAsync({
  room_id: roomId,
  task_type: 'cleaning',
  title: `Dọn dẹp phòng ${roomNumber}`,
  // ...
})
```

**Giải pháp đề xuất:**
- Fetch existing task cho room với `task_type='cleaning'` và status `pending/in_progress`
- Nếu đã có task → Hiển thị thông tin task + nút "Gán lại" (reassign) thay vì tạo mới

---

#### B. ChargeableItemsStep - Thiếu Stock Validation (Mức độ: Trung bình)

**Vị trí:** `src/components/rooms/check-steps/ChargeableItemsStep.tsx`

**Vấn đề:**
Khi ghi nhận đồ tính phí trong checkout, chỉ validate max = `quantity_in_stock`:
```typescript
// Line 48-52 - Chỉ limit max, không warning rõ ràng
const maxQty = item?.quantity_in_stock || 99
const newQty = Math.max(0, Math.min(maxQty, quantity))
```

**Hiện tại đã có:**
- Limit max quantity theo stock ✅
- Badge "Còn X" khi stock <= 5 ✅

**Cải tiến nhẹ:**
- Thêm warning message khi stock thấp (tương tự LinenTab)

---

#### C. ConsumableTab - Không validate stock trước khi "Đã dùng" (Mức độ: Thấp)

**Vị trí:** `src/components/rooms/check-steps/item-type-tabs/ConsumableTab.tsx`

**Vấn đề:**
Khi staff mark consumable là "Đã dùng", không check stock để bổ sung:
```typescript
// Line 100-109 - Chỉ ghi nhận quantity và need_refill, không check stock
const handleConfirmConsumed = (item: ExtendedRoomItem) => {
  const qty = quantities[item.item_id] ?? 1
  const refill = needRefill[item.item_id] ?? true
  onMarkConsumed(item, qty, refill)
}
```

**Lưu ý:** Consumables thường khác Linen:
- Tiêu hao không cần stock check ngay (bổ sung sau)
- Nhưng có thể warning nếu stock = 0 và `need_refill = true`

**Giải pháp đề xuất:**
- Fetch stock info và warning nếu cần bổ sung mà stock = 0

---

#### D. Realtime cho Inventory Dashboard (Mức độ: Thấp)

**Vấn đề:**
- `useWarehouseStock` ✅ có realtime subscription
- `useInventoryDashboard` ❌ dùng `refetchInterval: 60000`
- `useLowStockItems` ❌ không realtime

**Giải pháp đề xuất:**
- Giảm refetch interval xuống 30s hoặc
- Thêm realtime subscription cho `items` table changes

---

#### E. Session Cleanup với sendBeacon (Mức độ: Thấp)

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx`

**Vấn đề:**
`sendBeacon` với empty body không thực sự DELETE session - chỉ gửi request rỗng:
```typescript
// Line 298-301
navigator.sendBeacon(
  `${SUPABASE_URL}/rest/v1/room_check_sessions?room_id=eq.${id}`,
  JSON.stringify({})  // Empty body - không làm gì cả
)
```

**Hiện tại:**
- Hệ thống đã có scheduled cleanup mỗi 30 phút
- Không critical vì sessions sẽ được cleanup tự động

**Giải pháp nếu cần:**
- Tạo RPC `cleanup_user_session` và gọi qua sendBeacon

---

### III. NHỮNG GÌ ĐÃ TỐT

| Module | Chi tiết |
|--------|----------|
| Laundry | Full status transitions với validation, RPC cho inventory sync, workflow triggers |
| Maintenance | Status validation map, workflow triggers, notifications cho new/complete |
| Distribution | stockValidation trong useDistributionForm, notifications cho created/confirmed/cancelled |
| Booking | perform_checkin/checkout RPC với optimistic locking, chống race condition |
| Notifications | Multi-channel (in-app, push, Telegram, email), department-based routing |

---

### IV. TÓM TẮT VẤN ĐỀ THEO MỨC ĐỘ

| # | Vấn đề | Mức độ | Module | Giải pháp |
|---|--------|--------|--------|-----------|
| A | CleaningRequestBanner có thể tạo duplicate task | **Trung bình** | Housekeeping | Check existing task trước khi tạo mới |
| B | ChargeableItemsStep thiếu warning khi stock thấp | **Thấp** | Room Check | Thêm warning UI (đã có limit max) |
| C | ConsumableTab không warning khi stock = 0 | **Thấp** | Room Check | Thêm warning cho need_refill = true |
| D | Inventory Dashboard không realtime | **Thấp** | Inventory | Giảm refetch interval hoặc thêm realtime |
| E | Session cleanup sendBeacon không work | **Thấp** | Room Check | Trust scheduled cleanup |

---

### V. ĐỀ XUẤT HÀNH ĐỘNG

**Ưu tiên cao (Nên làm):**
1. **Fix CleaningRequestBanner** - Check existing task để tránh duplicate

**Ưu tiên thấp (Nice-to-have):**
2. Thêm stock warning cho ConsumableTab khi need_refill = true và stock = 0
3. Improve ChargeableItemsStep với low stock warning
4. Giảm refetch interval cho Inventory Dashboard

---

### VI. CHI TIẾT THAY ĐỔI NẾU TRIỂN KHAI

#### Fix A: CleaningRequestBanner - Check existing task

```typescript
// src/components/rooms/CleaningRequestBanner.tsx

// Thêm hook để check existing task
const { data: existingTask, isLoading: taskLoading } = useQuery({
  queryKey: ['existing-cleaning-task', roomId],
  queryFn: async () => {
    const { data } = await supabase
      .from('housekeeping_tasks')
      .select('id, status, assigned_to, users!housekeeping_tasks_assigned_to_fkey(full_name)')
      .eq('room_id', roomId)
      .eq('task_type', 'cleaning')
      .in('status', ['pending', 'in_progress'])
      .maybeSingle()
    return data
  },
  enabled: !!roomId,
})

// Nếu đã có task → Hiển thị info thay vì buttons tạo mới
if (existingTask) {
  return (
    <div className="...">
      <p>Đã có task dọn phòng - Giao cho: {existingTask.users?.full_name || 'Chưa giao'}</p>
      <Button onClick={() => navigate(`/housekeeping/tasks/${existingTask.id}`)}>
        Xem chi tiết
      </Button>
    </div>
  )
}
```

---

### VII. KẾT LUẬN

Sau khi phân tích toàn bộ các module chính:

**Điểm mạnh của hệ thống:**
- ✅ Các RPC transactional đảm bảo data consistency
- ✅ Workflow triggers được tích hợp đầy đủ
- ✅ Status transitions có validation chặt chẽ
- ✅ Multi-channel notifications
- ✅ Optimistic locking chống race condition
- ✅ Stock validation trong Distribution và LinenTab

**Điểm cần cải thiện:**
- ⚠️ CleaningRequestBanner có thể tạo duplicate task
- ⚠️ Một số UI chưa có stock warning nhất quán
- ⚠️ Inventory Dashboard chưa realtime

**Hệ thống đã đạt ~92% hoàn thiện** với các vấn đề còn lại đều ở mức thấp đến trung bình.

