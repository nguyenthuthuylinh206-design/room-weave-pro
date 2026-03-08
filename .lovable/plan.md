

## Kết quả kiểm tra trang Quản lý Nhân sự

Đã review toàn bộ: `StaffManagementPage`, `StaffList`, `StaffCard`, `StaffDetailSheet`, `StaffStatsCards`, `StaffStatusBadge`, `StaffActivityTimeline`, `ManagerTasksTab`, `ManagerTaskCard`, `AssignTaskDialog`, `ShiftHistoryTab`, `OnShiftStaffPanel`, và các hooks: `useStaffStatus`, `useStaffActivity`, `useShiftManagement`, `useShiftHistory`, `useHousekeepingTasks`, `useOnShiftStaffList`.

Phát hiện **2 bug** cần fix:

---

### Bug 1: `useTaskStats` - Query thực thi gấp đôi khi có `hotelId` (TRUNG BÌNH)

**File**: `src/hooks/useHousekeepingTasks.ts` line 704-782

Pattern hiện tại dùng `.then()` sai logic:

```text
supabase.from('housekeeping_tasks').select(...).eq('status', 'pending').eq('tenant_id', tenantId)
  .then(r => hotelId 
    ? supabase.from('housekeeping_tasks').select(...).eq(...).eq('hotel_id', hotelId)  // ← QUERY MỚI
    : r
  )
```

Khi `hotelId` có giá trị, code chạy query đầu tiên (không có hotel filter), **đợi kết quả**, rồi **bỏ kết quả đó** và chạy query thứ hai (có hotel filter). Kết quả: **8 queries thay vì 4**, tốn gấp đôi thời gian và network.

**Fix**: Xây query trước rồi chạy 1 lần duy nhất. Dùng conditional `.eq('hotel_id', hotelId)` trước khi execute thay vì `.then()`.

---

### Bug 2: `AssignTaskDialog` dùng `useStaffStatus()` thay vì `useOnShiftStaffList()` (NHỎ)

**File**: `src/components/staff/AssignTaskDialog.tsx` line 36

Dialog giao việc hiển thị **tất cả nhân viên** (kể cả offline, chưa vào ca) thay vì chỉ nhân viên đang trong ca. Điều này trái với thiết kế hệ thống đã được áp dụng ở tất cả module khác (Distribution, Supplement, Bookings, Cleaning Request) - đều dùng `useOnShiftStaffList`.

**Fix**: Đổi sang dùng `useOnShiftStaffList(hotelId)`. Cần truyền `hotelId` vào `AssignTaskDialog` (lấy từ `selectedHotel` trong `ManagerTasksTab`).

---

### Các phần ĐÃ KIỂM TRA - KHÔNG CÓ LỖI

1. **StaffCard**: Logic Telegram fallback (username → phone → chat_id) chính xác. Button `type` implicit nhưng không trong form nên OK.
2. **StaffDetailSheet**: Thông tin liên hệ, hoạt động hiện tại, timeline đều render đúng.
3. **StaffStatsCards**: Filter toggle hoạt động đúng. `type="button"` trên stats buttons.
4. **StaffList**: Search, filter, sort logic đúng. Sort order: busy → available → break → offline.
5. **StaffStatusBadge**: Dot animation + color mapping chính xác.
6. **StaffActivityTimeline**: Icon mapping, time formatting đúng. Empty state có.
7. **useStaffStatus**: Realtime subscription cho `staff_status`, `telegram_connections`, `users`. Refetch 60s. OK.
8. **useShiftManagement**: Auto-close stale shift trước check-in. Invalidation `shift-history` khi check-out. OK.
9. **useShiftHistory**: Có `.limit(500)`. Date range filter đúng (set endDate 23:59:59). OK.
10. **OnShiftStaffPanel**: Dùng `useOnShiftStaffListAll` + shift settings. Live duration + status indicator. OK.
11. **ManagerTaskCard**: Cancel có `.in('status', [...])` guard. Priority + status display đúng.
12. **ShiftHistoryTab**: Stats calculation, filters, table render đều OK.

---

### Kế hoạch fix

1. **Refactor `useTaskStats`**: Loại bỏ pattern `.then()` gây double query. Build query conditional trước khi execute.
2. **Fix `AssignTaskDialog`**: Đổi `useStaffStatus()` → `useOnShiftStaffList(hotelId)`. Truyền `hotelId` từ `ManagerTasksTab`.

**Files thay đổi**:
- `src/hooks/useHousekeepingTasks.ts`
- `src/components/staff/AssignTaskDialog.tsx`
- `src/components/staff/ManagerTasksTab.tsx`

