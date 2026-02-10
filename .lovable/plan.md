

## Kiem tra Logic & UX/UI: Bat dau kiem tra phong tu Task cong viec

Sau khi kiem tra toan bo luong tu TaskCard / TaskDetailDialog / StaffTasksTab -> RoomCheckPage, duoi day la cac van de phat hien:

---

### VAN DE 1: `getCheckTypeLabel` thieu mapping cho `delivery` va `replenish` (TRUNG BINH)

**File**: `src/pages/rooms/RoomCheckPage.tsx` dong 741-748

**Hien tai**:
```text
const labels = {
  daily: 'Kiem tra hang ngay',
  checkin: 'Kiem tra check-in',
  checkout: 'Kiem tra check-out',
  maintenance: 'Kiem tra bao tri',
}
```

**Van de**: Khi submit dialog (dong 1044), check_type `delivery` hoac `replenish` se hien thi raw string "delivery" / "replenish" thay vi nhan tieng Viet.

**Giai phap**: Them 2 mapping:
- `delivery: 'Kiem tra sau giao hang'`
- `replenish: 'Bo sung do & Don dep'`

---

### VAN DE 2: TaskCard `handleStart` cho `cleaning` KHONG navigate den room check (DUNG DESIGN)

Khi nhan "Bat dau" cho task `cleaning`, he thong chi update status len `in_progress` ma khong navigate di dau. Day la **dung thiet ke** vi task don phong chi can bat dau/hoan thanh, khong can form kiem tra. Tuy nhien:

**Van de nho**: Sau khi nhan "Bat dau" cho task `cleaning`, card chuyen sang trang thai `in_progress` nhung chi hien nut "Hoan thanh". **Khong co nut navigate den phong** de nhan vien xem phong nao can don (tren mobile, nhan vien co the quen phong nao).

**Giai phap**: Them nut "Xem phong" (secondary) ben canh "Hoan thanh" cho task `cleaning` dang `in_progress`, navigate den `/rooms/{room_id}`.

---

### VAN DE 3: TaskCard `handleStart` cho `checkin_prep` va `amenity_request` KHONG navigate (TRUNG BINH)

**Hien tai** (TaskCard.tsx dong 71-88): `handleStart` chi navigate cho `checkout_inspection` va `delivery_confirmation`. Cac task type khac (`checkin_prep`, `amenity_request`, `cleaning`, `other`) chi update status ma khong navigate di dau.

**Van de**: 
- `checkin_prep` (Chuan bi check-in): Nhan vien nen duoc navigate den `/rooms/{room_id}/check?type=checkin` de thuc hien kiem tra phong checkin.
- `amenity_request` (Bo sung do dung): Nhan vien nen duoc navigate den `/rooms/{room_id}/check?type=replenish` de thuc hien bo sung.

**Giai phap**: Them navigate cho `checkin_prep` va `amenity_request` trong `handleStart`:
- `checkin_prep` -> `/rooms/${task.room_id}/check?type=checkin`
- `amenity_request` -> `/rooms/${task.room_id}/check?type=replenish`

Tuong tu cho `handleContinue` (khi task da `in_progress`).

**Dong thoi** cap nhat `TaskDetailDialog.tsx` (dong 75-90, 112-121) voi cung logic navigate.

---

### VAN DE 4: TaskCard - Khong co nut "Tiep tuc" cho task `in_progress` ngoai checkout_inspection va delivery (TRUNG BINH)

**Hien tai** (TaskCard.tsx dong 266-301): Khi task `in_progress`:
- `checkout_inspection` -> Nut "Kiem tra phong"
- `delivery_confirmation` -> Nut "Xac nhan nhan hang"
- **Tat ca loai khac** -> Chi co nut "Hoan thanh"

**Van de**: Task `checkin_prep` va `amenity_request` dang `in_progress` khong co cach navigate den form kiem tra. Nhan vien phai tu navigate thu cong.

**Giai phap**: Them nut "Kiem tra phong" cho `checkin_prep` va `amenity_request` khi `in_progress`, tuong tu `checkout_inspection`.

---

### VAN DE 5: `cleaning` task `in_progress` - nut "Hoan thanh" khong co icon room (NHO - UX)

**Hien tai**: Task cleaning in_progress chi hien 1 nut "Hoan thanh". Tren mobile, nhan vien can biet phong nao de di don.

**Giai phap**: Them them nut outline "P.{roomNumber}" nho ben canh, onClick navigate den `/rooms/{room_id}` de xem chi tiet phong.

---

### VAN DE 6: UnifiedTaskCard cho housekeeping khong co action buttons (TRUNG BINH)

**Hien tai** (UnifiedTaskCard.tsx dong 173-184): Chi hien nut "Mo chi tiet" cho non-housekeeping tasks. Housekeeping tasks **KHONG co action button nao** trong UnifiedTaskCard.

**Luu y**: Xem lai StaffTasksTab.tsx - housekeeping tasks duoc render bang `TaskCard` (dong 241-246, 267-271), khong phai `UnifiedTaskCard`. Nen van de nay chi xay ra khi `UnifiedTaskCard` duoc su dung o noi khac. Hien tai khong phai van de nghiem trong.

---

### VAN DE 7: `invalidateQueries` thieu `unified-tasks` sau khi updateStatus (NHO)

**Hien tai**: Sau khi `handleStart` hoac `handleComplete` trong TaskCard, khong co `invalidateQueries` cho `unified-tasks`. Hook `useUpdateTaskStatus` co invalidate `my-housekeeping-tasks` nhung **co the thieu** `unified-tasks`.

**Kiem tra**: Can doc `useUpdateTaskStatus` de xac nhan.

---

### VAN DE 8: Mobile UX - TaskDetailDialog khong toi uu cho mobile (TRUNG BINH)

**Hien tai** (TaskDetailDialog.tsx dong 139): Dialog dung `max-w-md` va co padding/margins chuan desktop.

**Van de**: 
- Tren mobile, dialog chiem gan het man hinh nhung cac action buttons o duoi cung co the bi cut boi keyboard hoac thanh cuon.
- Khong co sticky footer cho action buttons.

**Giai phap**: Them `max-h-[85vh] overflow-y-auto` cho content va sticky footer cho action buttons tren mobile.

---

### TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | Loai |
|---|--------|--------|------|
| 1 | getCheckTypeLabel thieu delivery/replenish | Trung binh | Bug UI |
| 2 | cleaning task khong co nut xem phong | Thap | UX mobile |
| 3 | checkin_prep/amenity_request khong navigate khi bat dau | Trung binh | Logic thieu |
| 4 | Khong co nut "Tiep tuc" cho checkin_prep/amenity_request in_progress | Trung binh | Logic thieu |
| 5 | cleaning in_progress thieu nut xem phong | Thap | UX mobile |
| 6 | UnifiedTaskCard housekeeping khong co actions | Thap | Khong anh huong |
| 7 | invalidateQueries thieu unified-tasks | Thap | Can kiem tra |
| 8 | TaskDetailDialog mobile UX | Trung binh | UX mobile |

---

### KE HOACH THUC HIEN

#### Fix 1: getCheckTypeLabel - them delivery/replenish
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 741-748
- Them: `delivery: 'Kiem tra sau giao hang'`, `replenish: 'Bo sung do & Don dep'`

#### Fix 2+3+4+5: Navigate logic cho tat ca task types trong TaskCard va TaskDetailDialog

**File**: `src/components/housekeeping/TaskCard.tsx`
- Dong 71-88 (`handleStart`): Them navigate cho:
  - `checkin_prep` -> `/rooms/${task.room_id}/check?type=checkin`
  - `amenity_request` -> `/rooms/${task.room_id}/check?type=replenish`
- Dong 116-123 (`handleContinue`): Mo rong de xu ly `checkin_prep`, `amenity_request`, `cleaning`:
  - `checkin_prep` -> `/rooms/${task.room_id}/check?type=checkin`
  - `amenity_request` -> `/rooms/${task.room_id}/check?type=replenish`
  - `cleaning` -> `/rooms/${task.room_id}` (xem chi tiet phong)
- Dong 266-301 (render in_progress buttons): Them nut "Kiem tra phong" cho `checkin_prep` va `amenity_request`. Them nut "Xem phong" nho cho `cleaning`.

**File**: `src/components/housekeeping/TaskDetailDialog.tsx`
- Dong 75-90 (`handleStart`): Them navigate tuong tu TaskCard cho `checkin_prep`, `amenity_request`
- Dong 112-121 (`handleContinue`): Mo rong tuong tu
- Dong 297-341 (action buttons render): Them buttons tuong tu

#### Fix 6: TaskDetailDialog mobile UX
- **File**: `src/components/housekeeping/TaskDetailDialog.tsx` dong 139
- Them `className="max-w-md max-h-[85vh] flex flex-col"` cho DialogContent
- Wrap task details trong `div className="flex-1 overflow-y-auto"` 
- Wrap action buttons trong `div className="sticky bottom-0 bg-background pt-2 border-t mt-auto"`

#### Fix 7: Kiem tra va fix invalidateQueries
- Doc `useUpdateTaskStatus` trong `useHousekeepingTasks.ts` de xac nhan co invalidate `unified-tasks` chua. Neu thieu thi them.
