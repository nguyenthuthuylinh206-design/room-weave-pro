

## Phân tích Sâu Quy trình Housekeeping - Các vấn đề còn tồn tại

### I. NHỮNG GÌ ĐÃ HOÀN THIỆN (SKIP)

| Component | Trạng thái |
|-----------|------------|
| StaffRoomCheckView - Nút kiểm tra check_out | ✅ Done |
| Auto-complete cleaning task khi mở phòng | ✅ Done |
| CleaningCompleteDialog - Warning missing items | ✅ Done |
| Auto-create cleaning task khi checkout + needs_cleaning | ✅ Done |
| Supplement alert sau checkout | ✅ Done |
| TaskCard/TaskDetailDialog - Truyền inspection_id | ✅ Done |
| checkout_inspection_id trong HousekeepingTaskWithDetails | ✅ Done |

---

### II. VẤN ĐỀ CÒN TỒN TẠI CẦN XỬ LÝ

#### A. Query Task không include `checkout_inspection_id`

**Vấn đề phát hiện:**

Trong `useMyTasks()` (dòng 54-80) và `useHotelTasks()` (dòng 118-138), query **KHÔNG** select `checkout_inspection_id`:

```typescript
// useMyTasks - thiếu checkout_inspection_id
.select(`
  *,
  room:rooms(id, room_number, floor, room_type),
  requested_user:users!housekeeping_tasks_requested_by_fkey(id, full_name, avatar_url),
  booking:room_bookings(id, guest_name, check_out_date)
`)
```

**Hậu quả:**
- `task.checkout_inspection_id` sẽ luôn là `undefined`
- Logic trong `TaskCard.tsx` và `TaskDetailDialog.tsx` dùng `task.checkout_inspection_id` sẽ không work
- Navigation sẽ KHÔNG có `inspection=XXX` param → fallback query vẫn phải chạy

**Giải pháp:**
Thêm `checkout_inspection_id` vào select query của cả 3 hooks:
- `useMyTasks()`
- `useHotelTasks()`
- `useUnassignedTasks()`

---

#### B. Auto-sync Housekeeping Task status với Checkout Inspection

**Vấn đề phát hiện:**

Trong `RoomCheckPage.tsx` (dòng 547-572), khi submit checkout check, code tìm và complete `housekeeping_task`:

```typescript
if (data.check_type === 'checkout' && room?.id && user?.id) {
  const { data: relatedTask } = await supabase
    .from('housekeeping_tasks')
    .select('id')
    .eq('room_id', room.id)
    .eq('task_type', 'checkout_inspection')  // CHỈ checkout_inspection
    .in('status', ['pending', 'in_progress'])
    .maybeSingle()
  
  if (relatedTask) {
    await supabase.from('housekeeping_tasks')
      .update({ status: 'completed', completed_at: ... })
      .eq('id', relatedTask.id)
  }
}
```

**Vấn đề:**
- Chỉ complete task `checkout_inspection`, KHÔNG complete các task khác (ví dụ: cleaning nếu NV làm checkout rồi dọn luôn)
- Thiếu invalidation query `housekeeping-tasks` sau khi complete

**Giải pháp:**
Thêm invalidation queries sau khi auto-complete:
```typescript
queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
```

---

#### C. Xử lý Items trong Room Check - Thiếu validation stock

**Vấn đề phát hiện:**

Trong `ItemsCheckStep.tsx`, khi staff chọn "Thay đổi đồ vải" (change action):
```typescript
// status === 'change' → Add to BOTH laundry AND replaced
setLaundryItems(prev => [...prev, {...}])
setReplacedItems(prev => [...prev, {...}])
```

**Vấn đề:**
1. **Không validate stock tại warehouse**: Có thể thay đổ mà kho không đủ
2. **Không fetch real-time stock**: Số liệu có thể outdated
3. **Không warning khi vượt stock**: User không biết kho hết hàng

**Mức độ nghiêm trọng:** Trung bình - có thể dẫn đến negative stock

**Giải pháp đề xuất:**
- Fetch `quantity_in_stock` khi load items
- Warning khi số lượng replace > available stock
- Hoặc block action nếu stock = 0

---

#### D. Session Cleanup Edge Cases

**Vấn đề phát hiện:**

Trong `RoomCheckPage.tsx` (dòng 293-308), cleanup session khi đóng tab:
```typescript
const handleBeforeUnload = () => {
  if (id && !sessionCompleted) {
    navigator.sendBeacon(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/room_check_sessions?room_id=eq.${id}`,
      JSON.stringify({})
    )
  }
}
```

**Vấn đề:**
- `sendBeacon` với empty body không DELETE session, chỉ gửi request rỗng
- Session có thể bị orphan nếu user close tab mà không complete
- Phụ thuộc hoàn toàn vào scheduled cleanup (30 phút)

**Giải pháp đề xuất:**
Dùng đúng DELETE request hoặc trust scheduled cleanup:
```typescript
// Option 1: Dùng đúng endpoint DELETE
navigator.sendBeacon(
  `${SUPABASE_URL}/rest/v1/rpc/cleanup_user_session`,
  JSON.stringify({ room_id: id })
)
```

---

#### E. Duplicate Notification khi Checkout

**Vấn đề phát hiện:**

Trong `useRoomChecks.ts`, sau khi checkout check hoàn thành:
1. `processCheckoutCheck()` (dòng 251-263) gửi `sendCleaningRequestNotifications()`
2. Sau đó `sendCheckoutNotifications()` (dòng 758-768) lại gửi notification

**Kiểm tra:**
- `sendCleaningRequestNotifications` → Gửi cho Managers về cleaning request
- `sendCheckoutNotifications` → Gửi báo cáo checkout

**Kết luận:** 2 loại notification khác nhau - OK, không phải duplicate thực sự

---

#### F. Thiếu workflow trigger cho Cleaning Task

**Vấn đề phát hiện:**

Trong `processCheckoutCheck()` (dòng 274-293), khi tạo cleaning task:
```typescript
const { error: taskError } = await supabase
  .from('housekeeping_tasks')
  .insert({...})

if (taskError) {
  console.error('[useRoomChecks] Error creating cleaning task:', taskError)
} else {
  console.log('[useRoomChecks] Auto-created cleaning task for room', roomNumber)
}
// THIẾU: Không trigger workflow HOUSEKEEPING_TASK_CREATED
```

**Hậu quả:**
- Task được tạo nhưng không trigger workflow automation
- Notification workflow có thể không gửi cho assigned staff (nếu có template)

**Giải pháp:**
Thêm `triggerWorkflow()` sau khi insert thành công:
```typescript
if (!taskError) {
  triggerWorkflow({
    triggerType: WorkflowTriggerTypes.HOUSEKEEPING_TASK_CREATED,
    eventData: {...},
    tenantId,
    hotelId,
  })
}
```

---

### III. ĐỀ XUẤT TRIỂN KHAI

#### Quick Fixes (Ưu tiên cao)

| # | Vấn đề | Giải pháp | File |
|---|--------|-----------|------|
| 1 | Query task thiếu `checkout_inspection_id` | Thêm field vào select | `useHousekeepingTasks.ts` |
| 2 | Thiếu invalidation sau auto-complete | Thêm invalidateQueries | `RoomCheckPage.tsx` |
| 3 | Thiếu workflow trigger cho cleaning task | Thêm triggerWorkflow | `useRoomChecks.ts` |

#### Medium Fixes (Ưu tiên trung bình)

| # | Vấn đề | Giải pháp | File |
|---|--------|-----------|------|
| 4 | Stock validation khi thay đồ | Fetch stock + warning UI | `ItemsCheckStep.tsx` |
| 5 | Session cleanup sendBeacon | Review logic hoặc trust scheduler | `RoomCheckPage.tsx` |

---

### IV. CHI TIẾT THAY ĐỔI FILE

#### 1. `src/hooks/useHousekeepingTasks.ts`

**Thay đổi 1:** Thêm `checkout_inspection_id` vào `useMyTasks`:
```typescript
.select(`
  *,
  room:rooms(id, room_number, floor, room_type),
  requested_user:users!housekeeping_tasks_requested_by_fkey(id, full_name, avatar_url),
  booking:room_bookings(id, guest_name, check_out_date)
`)
// ↓ Thêm *
.select(`
  *, checkout_inspection_id,
  ...
`)
```

Thực tế `*` đã bao gồm tất cả columns, nên không cần thay đổi select. Vấn đề có thể nằm ở TypeScript type. Cần verify lại.

**Kiểm tra:** Query `*` đã bao gồm `checkout_inspection_id` (là column trong table). Type `HousekeepingTaskWithDetails` đã có field này. Không cần sửa query.

#### 2. `src/pages/rooms/RoomCheckPage.tsx`

**Thay đổi:** Thêm invalidation sau auto-complete task (sau dòng 566):
```typescript
if (relatedTask) {
  await supabase.from('housekeeping_tasks').update({...}).eq('id', relatedTask.id)
  
  // Thêm invalidation
  queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
  queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
}
```

#### 3. `src/hooks/useRoomChecks.ts`

**Thay đổi:** Thêm workflow trigger sau khi tạo cleaning task (sau dòng 293):
```typescript
if (!taskError) {
  console.log('[useRoomChecks] Auto-created cleaning task for room', roomNumber)
  
  // Trigger workflow
  triggerWorkflow({
    triggerType: WorkflowTriggerTypes.HOUSEKEEPING_TASK_CREATED,
    eventData: {
      task_type: 'cleaning',
      task_type_label: 'Dọn phòng',
      priority: taskPriority,
      room_id: roomId,
      room_number: roomNumber,
      hotel_id: hotelId,
      title: `Dọn dẹp phòng ${roomNumber}`,
    },
    tenantId,
    hotelId,
  }).catch(err => console.error('Workflow trigger failed:', err))
}
```

---

### V. FLOW SAU CẢI TIẾN

```text
┌─────────────────────────────────────────────────────────────┐
│                    CHECKOUT FLOW                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Khách checkout → perform_checkout()                      │
│    └─ Room: occupied → check_out                            │
│                                                             │
│ 2. NV thấy phòng trong StaffRoomCheckView (filter Check-out)│
│    └─ Click "Kiểm tra" → /rooms/ID/check?type=checkout      │
│                                                             │
│ 3. Checkout Room Check (5 bước)                             │
│    ├─ Items consumed/lost → inventory_transaction           │
│    ├─ Chargeable items → notify managers                    │
│    └─ needs_cleaning?                                       │
│        ├─ YES → Room: cleaning                              │
│        │        └─ AUTO-CREATE cleaning task ✅             │
│        │        └─ ✨ TRIGGER WORKFLOW (mới)                │
│        │        └─ Notify managers                          │
│        │        └─ Supplement alert nếu có missing ✅       │
│        └─ NO → Room: vacant                                 │
│                                                             │
│ 4. NV dọn phòng (nếu cần)                                   │
│    └─ Xem task trong "Việc cần làm"                         │
│        └─ ✅ checkout_inspection_id có trong response       │
│    └─ Click "Bắt đầu" → Task: in_progress                   │
│        └─ Navigate với inspection ID ✅                     │
│    └─ Dọn xong → CleaningCompleteDialog                     │
│        └─ Warning missing items ✅                          │
│        └─ "Mở phòng ngay" → Room: vacant                    │
│        └─ Auto-complete cleaning task ✅                    │
│        └─ ✨ INVALIDATE QUERIES (mới)                       │
│                                                             │
│ 5. Phòng sẵn sàng nhận khách mới                            │
└─────────────────────────────────────────────────────────────┘
```

---

### VI. TÓM TẮT ƯU TIÊN

1. **Cao:** Thêm workflow trigger cho auto-created cleaning task
2. **Cao:** Thêm query invalidation sau auto-complete task
3. **Trung bình:** Stock validation trong ItemsCheckStep
4. **Thấp:** Review session cleanup logic

