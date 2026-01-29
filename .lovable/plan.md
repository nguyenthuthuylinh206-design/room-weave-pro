
## Đánh giá chi tiết: Hoàn thiện quy trình Housekeeping

### I. TỔNG QUAN TIẾN ĐỘ PHASE 1

| Vấn đề | Trạng thái | Nhận xét |
|--------|------------|----------|
| ✅ Phòng check_out không có nút KT | **Đã hoàn thành** | `StaffRoomCheckView.tsx` có nút "Kiểm tra" màu tím cho phòng check_out, filter chip "Check-out" với số lượng |
| ✅ Task không auto-complete khi mở phòng | **Đã hoàn thành** | `useMarkRoomReady()` tự động complete housekeeping_tasks loại `cleaning` |
| ✅ Warning missing items | **Đã hoàn thành** | `CleaningCompleteDialog.tsx` hiển thị cảnh báo số lượng đồ thiếu |

---

### II. CÁC VẤN ĐỀ CÒN TỒN TẠI (PHASE 2)

#### A. Không tự động tạo Cleaning Task khi Checkout

**Vấn đề:**
Trong `processCheckoutCheck()` (useRoomChecks.ts dòng 241-271):
```typescript
if (needsCleaning || roomCondition !== 'clean') {
  // ✅ Chuyển room status → cleaning
  await supabase.from('rooms').update({ status: 'cleaning' })...
  
  // ✅ Gửi thông báo cho Manager
  await sendCleaningRequestNotifications(...)
  
  // ❌ THIẾU: Không tự động tạo housekeeping_task loại 'cleaning'
}
```

**Hậu quả:**
- Phòng ở status `cleaning` nhưng không có task trong `housekeeping_tasks`
- Nhân viên vào tab "Việc cần làm" không thấy phòng cần dọn
- Manager phải vào `RoomDetailPage` → `CleaningRequestBanner` để tạo task thủ công

**Giải pháp đề xuất:**
Thêm logic tự động tạo cleaning task trong `processCheckoutCheck()`:
```typescript
// Sau khi update room status → cleaning
if (needsCleaning) {
  await supabase.from('housekeeping_tasks').insert({
    tenant_id: tenantId,
    hotel_id: hotelId,
    room_id: roomId,
    task_type: 'cleaning',
    title: `Dọn dẹp phòng ${roomNumber}`,
    description: notes || `Yêu cầu dọn phòng sau checkout`,
    priority: priority || 'medium',
    requested_by: userId,
    // assigned_to: null → Chờ Manager giao việc hoặc NV tự nhận
    status: 'pending'
  })
}
```

---

#### B. Không có Alert/Request tự động bổ sung đồ

**Vấn đề:**
Sau checkout check, nếu có đồ `consumed` hoặc `lost`:
- ✅ Tạo `inventory_transaction` (ghi nhận xuất kho)
- ✅ Giảm `quantity_in_stock` trong items table
- ❌ **KHÔNG** tự động tạo yêu cầu bổ sung cho phòng đó

**Hiện trạng:**
- Hook `useRoomSupplements` chỉ **tính toán** missing items, không tự động trigger alert
- Distribution order phải tạo **thủ công** bởi Manager

**Giải pháp đề xuất:**
1. **Option 1 - Alert notification:** Sau checkout check có consumed/lost items → Gửi thông báo "Phòng X cần bổ sung Y đồ dùng" cho warehouse manager
2. **Option 2 - Auto-add to queue:** Tạo record trong bảng mới `supplement_requests` để Manager duyệt và tạo distribution order

---

#### C. Flow từ Task → Room Check chưa liền mạch

**Vấn đề:**
Khi nhân viên click "Bắt đầu" trên task `checkout_inspection`:
```typescript
// TaskCard.tsx dòng 68-79
const handleStart = async () => {
  await updateStatus({ taskId: task.id, status: 'in_progress' })
  
  if (task.task_type === 'checkout_inspection') {
    // Navigate KHÔNG có inspection ID
    navigate(`/rooms/${task.room_id}/check?type=checkout`)
  }
}
```

**Nhận xét:**
- ✅ Navigation đúng route
- ⚠️ Không truyền `inspection_id` → `RoomCheckPage` phải tự tìm pending inspection
- ⚠️ Có fallback logic trong `completeCheckoutInspection()` nhưng tăng complexity

**Đề xuất cải tiến:**
Truyền inspection ID nếu task có `checkout_inspection_id`:
```typescript
navigate(`/rooms/${task.room_id}/check?type=checkout&inspection=${task.checkout_inspection_id}`)
```

---

#### D. Cleaning Task chưa sync với Room Status

**Vấn đề:**
- Khi Manager tạo cleaning task qua `CleaningRequestBanner` → Task được tạo ✅
- Nhưng nếu phòng chuyển từ `cleaning` → `vacant` qua cách khác (ví dụ: trực tiếp từ DB) → Task vẫn pending

**Hiện trạng:**
`useMarkRoomReady()` ĐÃ auto-complete cleaning tasks ✅
Nhưng nếu room được update status bởi code khác → Task không được complete

**Đề xuất:**
Thêm database trigger để sync:
```sql
CREATE TRIGGER sync_cleaning_task_on_room_status
AFTER UPDATE ON rooms
FOR EACH ROW
WHEN (OLD.status = 'cleaning' AND NEW.status = 'vacant')
EXECUTE FUNCTION auto_complete_cleaning_tasks();
```

---

### III. ĐÁNH GIÁ UX CHO NHÂN VIÊN

#### Flow hiện tại đã hoạt động tốt:

| Flow | Trạng thái | Nhận xét |
|------|------------|----------|
| ✅ Xem phòng check_out | **Tốt** | Filter chip "Check-out" với số lượng, nút "Kiểm tra" rõ ràng |
| ✅ Kiểm tra checkout 5 bước | **Tốt** | Type → Items → Chargeable → Cleaning → Review |
| ✅ Dọn phòng xong | **Tốt** | Dialog với 2 option + warning missing items |
| ✅ Xem task cá nhân | **Tốt** | Tab "Việc cần làm" với filter, badge số lượng |
| ✅ Nhận đồ giao hàng | **Tốt** | DeliveryConfirmationModal với xác nhận/từ chối |

#### Flow cần cải thiện:

| Flow | Vấn đề | Mức độ |
|------|--------|--------|
| ⚠️ Phòng cleaning không có task | NV không thấy trong task list | **Cao** |
| ⚠️ Bổ sung đồ sau checkout | Phải làm thủ công | **Trung bình** |
| ⚠️ Theo dõi tiến độ dọn phòng | Manager không biết NV nào đang dọn | **Thấp** |

---

### IV. ĐỀ XUẤT TRIỂN KHAI PHASE 2

#### Quick Fix (1-2 giờ):

**1. Auto-create cleaning task trong `processCheckoutCheck()`:**
```typescript
// Thêm sau dòng 265 trong useRoomChecks.ts
if (needsCleaning && tenantId && userId) {
  await supabase.from('housekeeping_tasks').insert({
    tenant_id: tenantId,
    hotel_id: hotelId,
    room_id: roomId,
    task_type: 'cleaning',
    title: `Dọn dẹp phòng ${roomNumber}`,
    description: data.cleaning_notes || `Yêu cầu dọn phòng sau checkout. Tình trạng: ${roomCondition}`,
    priority: data.cleaning_priority || 'medium',
    requested_by: userId,
    status: 'pending'
  })
}
```

#### Medium Fix (3-4 giờ):

**2. Alert thông báo cần bổ sung đồ:**
- Sau checkout check, nếu có consumed/lost items:
  - Tính toán missing_items cho phòng đó
  - Gửi notification cho warehouse manager với danh sách cần bổ sung
  - Thêm badge/indicator trên phòng trong StaffRoomCheckView

**3. Sync Task → Inspection ID:**
- Khi tạo `checkout_inspection_request`, lưu ID vào task
- Khi navigate từ task, truyền inspection ID qua URL

---

### V. TÓM TẮT FILE CẦN SỬA

| File | Thay đổi | Độ ưu tiên |
|------|----------|------------|
| `src/hooks/useRoomChecks.ts` | Thêm auto-create cleaning task trong `processCheckoutCheck()` | **Cao** |
| `src/hooks/useRoomChecks.ts` | Thêm supplement alert sau checkout | **Trung bình** |
| `src/components/housekeeping/TaskCard.tsx` | Truyền inspection_id khi navigate | **Thấp** |
| `src/components/housekeeping/TaskDetailDialog.tsx` | Truyền inspection_id khi navigate | **Thấp** |

---

### VI. FLOW ĐỀ XUẤT SAU CẢI TIẾN

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
│        │        └─ ✨ AUTO-CREATE cleaning task (MỚI)       │
│        │        └─ Notify managers                          │
│        │        └─ ✨ Supplement alert nếu có missing (MỚI) │
│        └─ NO → Room: vacant                                 │
│                                                             │
│ 4. NV dọn phòng (nếu cần)                                   │
│    └─ Xem task trong "Việc cần làm"                         │
│    └─ Click "Bắt đầu" → Task: in_progress                   │
│    └─ Dọn xong → CleaningCompleteDialog                     │
│        └─ "Mở phòng ngay" → Room: vacant                    │
│        └─ Auto-complete cleaning task ✅ (đã có)            │
│                                                             │
│ 5. Phòng sẵn sàng nhận khách mới                            │
└─────────────────────────────────────────────────────────────┘
```
