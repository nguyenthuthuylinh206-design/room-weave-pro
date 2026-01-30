
## Báo cáo kiểm tra Logic: Yêu cầu từ phòng (Laundry Requests) & Bổ sung đồ (Supplement Requests)

### Tổng kết trạng thái

| Thành phần | Database | Code Logic | Trạng thái |
|------------|----------|------------|------------|
| Tables `laundry_requests`, `supplement_requests` | ✅ Tồn tại | - | OK |
| RPCs (generate codes, add to batch) | ✅ Tồn tại | - | OK |
| RLS Policies | ✅ Có | - | OK |
| Realtime subscriptions | - | ✅ Đã implement | OK |
| `processDailyCheck` → laundry request | - | ✅ Đã thêm logic | Cần test |
| `processCheckoutCheck` → requests | - | ✅ Có logic | Cần test |

**Vấn đề phát hiện:** Database cho thấy **0 laundry_requests và 0 supplement_requests** mặc dù có **nhiều room_checks với laundry/consumed/lost items** được tạo gần đây. Điều này có nghĩa là code tạo request đang bị lỗi hoặc code mới chưa được deploy.

---

### Các lỗi logic cần sửa

#### 1. **Lỗi CRITICAL: `processDailyCheck` không tạo Supplement Request cho items consumed**

**Vấn đề:** Trong `processDailyCheck` (daily check), code chỉ tạo `laundry_request` nhưng **KHÔNG** tạo `supplement_request` cho các đồ tiêu hao (items_consumed).

**Vị trí:** `src/hooks/useRoomChecks.ts` dòng 50-100

**Hiện tại:**
```typescript
// processDailyCheck - chỉ xử lý laundry, KHÔNG xử lý consumed items
const hasLaundry = laundryItems.length > 0
if (hasLaundry && tenantId && userId && checkId) {
  await createLaundryRequestFromCheck({...})
}
// THIẾU: Không tạo supplement request cho consumed items
```

**Dữ liệu DB chứng minh:**
- Room check `16e93572-...` (daily) có `items_consumed: [Bàn chải đánh răng]` nhưng `supplement_request_count: 0`

**Giải pháp:** Thêm logic tạo supplement request trong `processDailyCheck`:
```typescript
// Sau phần laundry request
const consumedItems = data.items_consumed || []
if (consumedItems.length > 0 && tenantId && userId && checkId) {
  await createSupplementRequestFromCheck({
    roomId,
    roomNumber,
    tenantId,
    hotelId,
    userId,
    userName: userName || 'Nhân viên',
    checkId,
    consumedItems,
    lostItems: [], // Daily check không track lost items
  })
}
```

---

#### 2. **Lỗi logic: Daily check không track lost items nhưng có action**

**Vấn đề:** Theo config trong `roomCheckConfig.ts`, daily check có `linenActions: ['ok', 'change']` và `consumableActions: ['ok', 'empty']`. Tuy nhiên, UI có thể cho phép nhập `items_consumed` nhưng code không xử lý thành supplement request.

**Check type configs hiện tại:**
| Check Type | Lost Items | Consumed Items | Cần Supplement Request? |
|------------|------------|----------------|-------------------------|
| daily | ❌ Không có action | ✅ `empty` action | Chỉ cho consumed |
| checkout | ✅ Full | ✅ Full | Có |
| checkin | ❌ | ❌ | Không |
| maintenance | ❌ | ❌ | Không |

---

#### 3. **Thiếu error handling khi RPC fails**

**Vấn đề:** Nếu RPC `generate_laundry_request_code` hoặc `generate_supplement_request_code` thất bại, code vẫn tiếp tục với fallback code nhưng không log lỗi đầy đủ.

**Vị trí:** `src/hooks/useRoomChecks.ts` dòng 1214-1217, 1327-1331

**Hiện tại:**
```typescript
const { data: codeResult } = await supabase
  .rpc('generate_supplement_request_code', { p_tenant_id: tenantId })

const requestCode = codeResult || `SUP-${Date.now()}` // Fallback nếu RPC fail
```

**Giải pháp:** Thêm logging để debug:
```typescript
const { data: codeResult, error: codeError } = await supabase
  .rpc('generate_supplement_request_code', { p_tenant_id: tenantId })

if (codeError) {
  console.error('[useRoomChecks] Error generating request code:', codeError)
}

const requestCode = codeResult || `SUP-${Date.now()}`
```

---

#### 4. **Invalidate queries thiếu cho supplement/laundry requests**

**Vấn đề:** Sau khi tạo room check thành công, `onSuccess` không invalidate các query keys cho supplement và laundry requests.

**Vị trí:** `src/hooks/useRoomChecks.ts` dòng 889-898

**Hiện tại:**
```typescript
onSuccess: (check: any, variables) => {
  queryClient.invalidateQueries({ queryKey: ['room-checks', variables.roomId] })
  queryClient.invalidateQueries({ queryKey: ['rooms'] })
  queryClient.invalidateQueries({ queryKey: ['items'] })
  // THIẾU: laundry-requests, supplement-requests, pending counts
}
```

**Giải pháp:** Thêm invalidate queries:
```typescript
queryClient.invalidateQueries({ queryKey: ['laundry-requests'] })
queryClient.invalidateQueries({ queryKey: ['laundry-requests-pending-count'] })
queryClient.invalidateQueries({ queryKey: ['supplement-requests'] })
queryClient.invalidateQueries({ queryKey: ['supplement-requests-pending-count'] })
queryClient.invalidateQueries({ queryKey: ['draft-laundry-batch'] })
```

---

#### 5. **Potential race condition trong auto-add to batch**

**Vấn đề:** Sau khi tạo laundry request, code gọi `add_laundry_to_draft_batch` nhưng dùng `try-catch` và chỉ log error mà không thông báo cho user.

**Vị trí:** `src/hooks/useRoomChecks.ts` dòng 1358-1368

**Hiện tại:**
```typescript
try {
  await supabase.rpc('add_laundry_to_draft_batch', {...})
} catch (err) {
  console.error('[useRoomChecks] Error auto-adding to batch:', err)
  // Không throw - request đã được tạo
}
```

**Đánh giá:** Logic này OK vì request đã được tạo thành công, chỉ là auto-add thất bại. Tuy nhiên có thể thêm toast notification nhẹ để user biết.

---

### Danh sách sửa đổi cần thực hiện

| # | File | Thay đổi | Mức độ |
|---|------|----------|--------|
| 1 | `useRoomChecks.ts` | Thêm logic tạo supplement request trong `processDailyCheck` cho consumed items | **CRITICAL** |
| 2 | `useRoomChecks.ts` | Thêm invalidate queries cho laundry/supplement sau room check | Quan trọng |
| 3 | `useRoomChecks.ts` | Thêm error logging cho RPC calls | Trung bình |
| 4 | Testing | Kiểm tra end-to-end với daily check có consumed items | **CRITICAL** |

---

### Chi tiết kỹ thuật sửa lỗi #1

**File:** `src/hooks/useRoomChecks.ts`

**Thay đổi `processDailyCheck` (khoảng dòng 50-102):**

```typescript
async function processDailyCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
  tenantId?: string
  hotelId: string
  roomNumber: string
  checkId?: string
  userName?: string
}) {
  const { roomId, data, userId, tenantId, hotelId, roomNumber, checkId, userName } = params
  const quantityChanges: Record<string, number> = {}
  
  // 1. Đồ gửi giặt → Giảm quantity
  const laundryItems = data.items_sent_to_laundry || []
  for (const item of laundryItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
  }
  
  if (laundryItems.length > 0) {
    await updateLaundryQuantities(laundryItems)
  }
  
  // 2. Đồ thay thế → Tăng quantity
  for (const item of data.items_replaced || []) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
  }
  
  // 3. Đồ tiêu hao (consumed) → Giảm quantity (THÊM MỚI)
  const consumedItems = data.items_consumed || []
  for (const item of consumedItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
  }
  
  // Apply quantity changes
  await applyRoomItemChanges(roomId, quantityChanges, userId)
  
  // 4. Auto-create laundry request nếu có đồ gửi giặt
  if (laundryItems.length > 0 && tenantId && userId && checkId) {
    await createLaundryRequestFromCheck({
      roomId,
      roomNumber,
      tenantId,
      hotelId,
      userId,
      userName: userName || 'Nhân viên',
      checkId,
      laundryItems,
    })
  }
  
  // 5. Auto-create supplement request nếu có đồ tiêu hao (THÊM MỚI)
  if (consumedItems.length > 0 && tenantId && userId && checkId) {
    await createSupplementRequestFromCheck({
      roomId,
      roomNumber,
      tenantId,
      hotelId,
      userId,
      userName: userName || 'Nhân viên',
      checkId,
      consumedItems,
      lostItems: [], // Daily check không track lost
    })
  }
  
  return { quantityChanges }
}
```

---

### Chi tiết kỹ thuật sửa lỗi #2

**File:** `src/hooks/useRoomChecks.ts`

**Thay đổi `onSuccess` callback (khoảng dòng 889-910):**

```typescript
onSuccess: (check: any, variables) => {
  queryClient.invalidateQueries({ queryKey: ['room-checks', variables.roomId] })
  queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] })
  queryClient.invalidateQueries({ queryKey: ['rooms'] })
  queryClient.invalidateQueries({ queryKey: ['items'] })
  queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
  queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['checkout-inspection'] })
  queryClient.invalidateQueries({ queryKey: ['pending-inspection'] })
  queryClient.invalidateQueries({ queryKey: ['room-has-pending-inspection'] })
  
  // THÊM MỚI: Invalidate laundry & supplement requests
  queryClient.invalidateQueries({ queryKey: ['laundry-requests'] })
  queryClient.invalidateQueries({ queryKey: ['laundry-requests-pending-count'] })
  queryClient.invalidateQueries({ queryKey: ['supplement-requests'] })
  queryClient.invalidateQueries({ queryKey: ['supplement-requests-pending-count'] })
  queryClient.invalidateQueries({ queryKey: ['draft-laundry-batch'] })
  
  // ... rest of the code
}
```

---

### Kết luận

**Nguyên nhân chính:** Code trong `processDailyCheck` chỉ tạo laundry request cho đồ giặt, nhưng **không tạo supplement request cho đồ tiêu hao** (items_consumed). Điều này giải thích tại sao:
- Daily checks có `items_consumed` nhưng không có supplement_request
- Daily checks có `items_sent_to_laundry` nhưng không có laundry_request (do code mới vừa được thêm, chưa test)

**Hành động tiếp theo:**
1. Sửa `processDailyCheck` để xử lý consumed items
2. Thêm invalidate queries cho laundry/supplement
3. Test end-to-end với daily check bao gồm đồ giặt và đồ tiêu hao
4. Xác nhận data hiển thị trong `/laundry?tab=requests` và `/supplements`
