

## Kiem tra tiep - Cac van de con lai

Sau khi kiem tra toan bo code TaskCard, TaskDetailDialog, RoomCheckPage, StaffTasksTab, useHousekeepingTasks, va CleaningCompleteDialog, duoi day la cac van de con phat hien:

---

### VAN DE 1: Event bubbling - Button click trong TaskCard trigger onClick cua card (TRUNG BINH)

**File**: `src/components/housekeeping/TaskCard.tsx` dong 145-146, 262-342

**Hien tai**: TaskCard nhan prop `onClick` de mo TaskDetailDialog (StaffTasksTab.tsx dong 245, 271, 298). Div wrapper co `onClick={onClick}`. Nhung cac Button ben trong (Bat dau, Hoan thanh, Kiem tra phong, P.xxx, Nhan viec) **KHONG co `e.stopPropagation()`**.

**Van de**: Khi nhan vien bam nut "Bat dau", "Hoan thanh", hoac "P.101":
1. Button handler thuc thi (VD: navigate den room check)
2. Event bubble len div -> `onClick` cua div **CUNG** thuc thi -> mo TaskDetailDialog

Ket qua: Nhan vien bam "Bat dau" -> vua navigate di vua mo dialog. Hoac bam "P.101" -> vua navigate den phong vua mo dialog phia sau.

**Giai phap**: Them `e.stopPropagation()` vao tat ca cac Button onClick handler trong TaskCard de ngan event bubble len parent div.

---

### VAN DE 2: RoomCheckPage chi auto-complete task `checkout_inspection`, KHONG auto-complete `checkin_prep` va `amenity_request` (NGHIEM TRONG)

**File**: `src/pages/rooms/RoomCheckPage.tsx` dong 813-847

**Hien tai**: Sau khi submit room check, chi co doan code:
```text
if (data.check_type === 'checkout' && room?.id && user?.id) {
  // Tim va complete task checkout_inspection
}
```

**Van de**: Khi nhan vien bat dau task `checkin_prep` -> navigate den `/rooms/xxx/check?type=checkin` -> hoan thanh kiem tra -> submit. Nhung task `checkin_prep` **KHONG DUOC AUTO-COMPLETE**. Nhan vien phai quay lai danh sach task va bam "Hoan thanh" thu cong.

Tuong tu cho `amenity_request` -> navigate den `/rooms/xxx/check?type=replenish` -> submit -> task van dang `in_progress`.

**Giai phap**: Them logic auto-complete tuong tu cho `checkin` va `replenish` check types:
- `checkin` -> Tim va complete task `checkin_prep` cho room do
- `replenish` -> Tim va complete task `amenity_request` cho room do

---

### VAN DE 3: TaskCard - handleStart thieu `setIsUpdating(false)` truoc khi navigate (NHO)

**File**: `src/components/housekeeping/TaskCard.tsx` dong 71-91

**Hien tai**: `handleStart` goi `setIsUpdating(true)` o dong 72, sau do navigate (dong 81, 85, 87). Nhung `setIsUpdating(false)` chi duoc goi trong `finally` block (dong 90). Khi navigate xay ra, component co the unmount truoc khi `finally` chay -> **React warning: "Can't perform state update on unmounted component"**.

**Van de**: Khong lam crash app nhung tao console warning khong can thiet.

**Giai phap**: Dat `setIsUpdating(false)` truoc cac lenh `navigate()`.

---

### VAN DE 4: CleaningCompleteDialog - Khi chon "Kiem tra nhanh truoc", task van o trang thai `in_progress` (TRUNG BINH)

**File**: `src/components/rooms/CleaningCompleteDialog.tsx` dong 44-49

**Hien tai**: Khi nhan vien chon "Kiem tra nhanh truoc":
1. `onComplete?.()` duoc goi -> `handleCleaningCompleted` trong TaskCard -> update task status = `completed`
2. Navigate den `/rooms/${roomId}/check?type=daily`

**Van de**: `onComplete` goi `handleCleaningCompleted` -> set task = `completed` **TRUOC KHI** kiem tra. Neu nhan vien huy kiem tra giua chung -> task da `completed` nhung phong chua duoc kiem tra thuc su.

**Giai phap**: Khi chon "Kiem tra nhanh truoc", **KHONG** goi `onComplete()`. Chi navigate den room check. Task se duoc auto-complete khi kiem tra hoan thanh (can ket hop voi Fix 2 - them auto-complete cho daily check type voi cleaning task).

---

### VAN DE 5: `useCancelTask` thieu invalidate `unified-tasks` (NHO)

**File**: `src/hooks/useHousekeepingTasks.ts` dong 472-477

**Hien tai**: `useCancelTask` invalidate `hotel-housekeeping-tasks`, `my-housekeeping-tasks`, `pending-task-count`, `unassigned-housekeeping-tasks`. Nhung **thieu `unified-tasks`**.

**Giai phap**: Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`.

---

### VAN DE 6: `useCreateTask` thieu invalidate `unified-tasks` (NHO)

**File**: `src/hooks/useHousekeepingTasks.ts` dong 228-231

**Hien tai**: `useCreateTask` onSuccess invalidate `hotel-housekeeping-tasks`, `my-housekeeping-tasks`, `pending-task-count`, `unassigned-housekeeping-tasks`. Nhung **thieu `unified-tasks`**.

**Giai phap**: Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`.

---

### VAN DE 7: RoomCheckPage auto-complete checkout task thieu invalidate `unified-tasks` (NHO)

**File**: `src/pages/rooms/RoomCheckPage.tsx` dong 843-846

**Hien tai**: Sau khi auto-complete checkout task, chi invalidate `my-housekeeping-tasks`, `pending-task-count`, `hotel-housekeeping-tasks`. **Thieu `unified-tasks`**.

**Giai phap**: Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`.

---

### TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | Loai |
|---|--------|--------|------|
| 1 | Event bubbling - Button click trigger card onClick | **Trung binh** | Bug UX |
| 2 | RoomCheck khong auto-complete checkin_prep/amenity_request task | **Cao** | Logic thieu |
| 3 | handleStart setState warning khi navigate | **Thap** | Console warning |
| 4 | CleaningCompleteDialog complete task truoc khi kiem tra | **Trung binh** | Logic sai |
| 5 | useCancelTask thieu invalidate unified-tasks | **Thap** | Cache sync |
| 6 | useCreateTask thieu invalidate unified-tasks | **Thap** | Cache sync |
| 7 | RoomCheckPage auto-complete thieu invalidate unified-tasks | **Thap** | Cache sync |

---

### KE HOACH THUC HIEN

#### Fix 1: Event bubbling - stopPropagation
- **File**: `src/components/housekeeping/TaskCard.tsx`
- **Thay doi**: Wrap tat ca cac Button onClick handler trong 1 helper de stopPropagation:
  - Dong 267: `onClick={handleStart}` -> `onClick={(e) => { e.stopPropagation(); handleStart() }}`
  - Dong 280-281: `onClick={handleContinue}` -> tuong tu
  - Dong 289-290: `onClick={handleContinue}` -> tuong tu  
  - Dong 301: `onClick={handleDeliveryConfirm}` -> tuong tu
  - Dong 313: `onClick={() => navigate(...)}` -> tuong tu
  - Dong 321: `onClick={handleComplete}` -> tuong tu
  - Dong 330-334: `onClick={handleComplete}` -> tuong tu
  - Dong 249: `onClick={claimTask}` -> tuong tu

#### Fix 2: Auto-complete checkin_prep va amenity_request tasks khi submit room check
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 883 (sau block checkout auto-complete)
- **Thay doi**: Them block tuong tu cho `checkin` va `replenish`:
```text
// Auto-complete related checkin_prep task
if (data.check_type === 'checkin' && room?.id) {
  const { data: relatedTask } = await supabase
    .from('housekeeping_tasks')
    .select('id')
    .eq('room_id', room.id)
    .eq('task_type', 'checkin_prep')
    .in('status', ['pending', 'in_progress'])
    .maybeSingle()
  
  if (relatedTask) {
    await supabase.from('housekeeping_tasks')
      .update({ status: 'completed', completed_at: now, room_check_id: createdCheck?.id })
      .eq('id', relatedTask.id)
    // Invalidate queries
  }
}

// Auto-complete related amenity_request task  
if (data.check_type === 'replenish' && room?.id) {
  // Tuong tu cho amenity_request
}

// Auto-complete related cleaning task when daily check
if (data.check_type === 'daily' && room?.id) {
  // Tim va complete cleaning task
}
```
- Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })` vao moi block

#### Fix 3: setState warning - setIsUpdating truoc navigate
- **File**: `src/components/housekeeping/TaskCard.tsx` dong 71-91
- **Thay doi**: Them `setIsUpdating(false)` truoc moi `navigate()` va `setShowDeliveryModal(true)`.

#### Fix 4: CleaningCompleteDialog - khong complete task khi chon "Kiem tra truoc"
- **File**: `src/components/rooms/CleaningCompleteDialog.tsx` dong 44-49
- **Thay doi**: Khi `option === 'check'`, **KHONG** goi `onComplete?.()`. Chi navigate. Task se duoc auto-complete boi Fix 2 (daily check -> complete cleaning task).

#### Fix 5+6+7: Them unified-tasks invalidation
- **File**: `src/hooks/useHousekeepingTasks.ts`
  - Dong 228-231 (`useCreateTask` onSuccess): Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`
  - Dong 472-477 (`useCancelTask` onSuccess): Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 843-846: Them `queryClient.invalidateQueries({ queryKey: ['unified-tasks'] })`

