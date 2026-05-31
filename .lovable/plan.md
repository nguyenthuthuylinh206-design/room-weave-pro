
## Mục tiêu

Staff và Department Manager (trưởng bộ phận) **bắt buộc** phải vào ca (`shift_start_at` còn mở, chưa từng kết thúc) mới được nhấn các nút thao tác vận hành: kiểm phòng (lean/quick/replenish/delivery), nhận/hoàn thành task housekeeping & maintenance, chuyển trạng thái phòng, giao đồ (distribution), thao tác laundry batch, check-in/out booking.

Owner / Hotel Manager / Super Admin **không bị chặn** (chỉ cần xem giám sát).

Khi user chưa vào ca nhấn nút → mở **dialog "Bạn cần vào ca để tiếp tục"** với 2 nút: **Vào ca ngay** (gọi `useShiftCheckIn`) và **Hủy**. Vào ca thành công → tự động chạy lại hành động đang dở.

## A. Logic nghiệp vụ

- "Đã vào ca" = `myStatus.shift_start_at` không null **và** (`shift_end_at` null hoặc < `shift_start_at`). Không tính ca treo >16h (coi như chưa vào → phải vào lại).
- "Cần gác cổng" (require shift) áp dụng khi `primaryRole ∈ { staff, department_manager }`.
- Busy/offline-heartbeat **vẫn được** thao tác (không khắt khe presence).

## B. Schema / migration

Không cần migration. Tận dụng bảng `staff_status` + hook `useMyStaffStatus`, `useShiftCheckIn` sẵn có.

## C. API / hook mới

1. **`src/hooks/useRequireShift.ts`** (mới)
   - `useRequireShift()` trả về `{ isOnShift, requiresShift, guard(action: () => void): void }`.
   - `requiresShift` = role là staff/department_manager.
   - `guard(fn)`: nếu không cần gác (manager+) hoặc đã on-shift → chạy `fn()`. Ngược lại → set `pendingAction` state và mở dialog (qua Zustand store nhẹ hoặc Context).
2. **`src/contexts/RequireShiftProvider.tsx`** (mới)
   - Provider bọc trong `MainLayout` cùng nhánh `isStaffUser`.
   - State: `pendingAction | null`. Expose `request(fn)` và `clear()`.
   - Render `<RequireShiftDialog />` ở cuối tree.
3. **`src/components/staff/RequireShiftDialog.tsx`** (mới)
   - Dialog tiếng Việt: tiêu đề "Bạn cần vào ca để tiếp tục", body giải thích, 2 nút: **Hủy** | **Vào ca ngay**.
   - Nhấn Vào ca → `useShiftCheckIn().mutate(undefined, { onSuccess: () => { pendingAction?.(); clear(); } })`.
   - Loading state trong khi mutate.

## D. UI – chèn `guard()` ở các điểm thao tác

Chỉ wrap **onClick handler**, không tháo dỡ logic. Áp dụng tại:

| Module | File | Hành động |
|---|---|---|
| Room Check | `src/components/rooms/check-lean/QuickPathConfirmSheet.tsx`, `LeanOverview` "Bắt đầu kiểm", `submit_room_check_lean` trigger nút Hoàn tất | mở phiên / submit |
| Room Check Router | `RoomCheckRouter.tsx` – chặn khi mount nếu chưa on-shift (redirect dashboard + dialog tự mở) | |
| Housekeeping Tasks | `MyTasksList` action "Bắt đầu / Hoàn thành / Báo lỗi" | `transition_task_status` calls |
| Maintenance | nút "Nhận việc / Hoàn thành" trong MaintenanceTaskCard | |
| Distribution | `MobileOutboundForm` & `QuickOutboundDialog` nút "Tạo phiếu / Giao", `DistributionOrderCard` "Bắt đầu giao / Hoàn tất" | |
| Laundry | `LaundryBatchCard` chuyển trạng thái (deliver/receive/stock) | |
| Booking | `CheckInDialog` & `CheckoutDialog` nút xác nhận | |
| Rooms FSM | `transition_room_status` UI (DND/OOS/Clean) trong RoomQuickActionsMenu | |

Pattern dùng:
```tsx
const { guard } = useRequireShift()
<Button onClick={() => guard(() => doStuff())}>...</Button>
```

Mỗi file chỉ thêm 1 import + bọc handler — không đụng business logic.

## E. Permission / role rules

- `requiresShift = primaryRole === 'staff' || primaryRole === 'department_manager'`.
- Super Admin / Owner / Hotel Manager: `guard` luôn pass-through, không bao giờ mở dialog.

## F. Test cases (vitest)

`src/hooks/useRequireShift.test.tsx`:
1. staff chưa vào ca + guard → action không chạy, dialog mở.
2. staff đã vào ca + guard → action chạy ngay.
3. department_manager chưa vào ca → dialog mở.
4. hotel_manager / owner → action chạy bất kể trạng thái.
5. ca treo >16h coi như chưa vào ca → dialog mở.
6. Sau khi mutate `useShiftCheckIn` success → `pendingAction` được gọi đúng 1 lần và `clear()` chạy.

## G. Rollout

- Không cần feature flag (yêu cầu mặc định bật).
- Bump `APP_VERSION` + `CURRENT_VERSION` + thêm entry changelog: "Bắt buộc vào ca trước khi thao tác nghiệp vụ (Staff & Trưởng bộ phận)".
- Memory mới: `mem://features/staff-management/require-shift-gate-v1` mô tả gate + danh sách điểm chèn.
- QA checklist: mỗi module ở bảng trên — đăng nhập Staff chưa vào ca → bấm nút → dialog hiện → Vào ca → action chạy tiếp.
- Rollback: gỡ `RequireShiftProvider` khỏi `MainLayout`; các `guard()` trả pass-through (hook fallback) → không gãy UI.

## Phần còn thiếu / giả định

- Giả định Department Manager hiện được map sang `primaryRole = 'department_manager'` (đã có trong `useUser.roleOrder`).
- Chưa chặn ở server-side RPC (yêu cầu chọn "Mở dialog tại chỗ" — chặn client-side đủ cho UX). Nếu cần khoá tuyệt đối, vòng sau có thể thêm check `shift_start_at` trong các RPC chính, nhưng phạm vi lượt này chỉ ở UI.
