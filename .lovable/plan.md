# Housekeeping Workflow - Implementation Status

## ✅ PHASE 1 - COMPLETED

| Task | Status | File Changed |
|------|--------|--------------|
| Phòng check_out có nút "Kiểm tra" | ✅ Done | `StaffRoomCheckView.tsx` |
| Auto-complete cleaning task khi mở phòng | ✅ Done | `useRooms.ts` |
| Warning missing items trong dialog | ✅ Done | `CleaningCompleteDialog.tsx` |

## ✅ PHASE 2 - COMPLETED

| Task | Status | File Changed |
|------|--------|--------------|
| Auto-create cleaning task khi checkout + needs_cleaning | ✅ Done | `useRoomChecks.ts` |
| Supplement alert khi có items consumed/lost | ✅ Done | `useRoomChecks.ts` |
| Pass inspection_id khi navigate từ task | ✅ Done | `TaskCard.tsx`, `TaskDetailDialog.tsx` |
| Update type HousekeepingTaskWithDetails | ✅ Done | `housekeeping.types.ts` |

---

## FLOW SAU CẢI TIẾN

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
│        │        └─ ✅ AUTO-CREATE cleaning task             │
│        │        └─ Notify managers                          │
│        │        └─ ✅ Supplement alert nếu có missing       │
│        └─ NO → Room: vacant                                 │
│                                                             │
│ 4. NV dọn phòng (nếu cần)                                   │
│    └─ Xem task trong "Việc cần làm"                         │
│    └─ Click "Bắt đầu" → Task: in_progress                   │
│    └─ Dọn xong → CleaningCompleteDialog                     │
│        └─ "Mở phòng ngay" → Room: vacant                    │
│        └─ ✅ Auto-complete cleaning task                    │
│                                                             │
│ 5. Phòng sẵn sàng nhận khách mới                            │
└─────────────────────────────────────────────────────────────┘
```

## CHI TIẾT THAY ĐỔI

### 1. Auto-create cleaning task (`useRoomChecks.ts`)

Khi checkout check + `needs_cleaning=true`:
- Tự động tạo `housekeeping_task` với `task_type: 'cleaning'`
- Priority tự động theo room_condition (very_dirty → high, dirty → medium)
- Link với `room_check_id` để truy vết

### 2. Supplement alert (`useRoomChecks.ts`)

Khi có `items_consumed` hoặc `items_lost`:
- Gửi notification cho Managers với danh sách đồ cần bổ sung
- Action URL dẫn đến trang Distribution Order

### 3. Inspection ID navigation (`TaskCard.tsx`, `TaskDetailDialog.tsx`)

Khi navigate từ task checkout_inspection:
- Tự động truyền `inspection_id` qua URL param
- Giảm complexity của fallback logic trong `completeCheckoutInspection()`

### 4. Type update (`housekeeping.types.ts`)

Thêm `checkout_inspection_id?: string | null` vào `HousekeepingTaskWithDetails`
