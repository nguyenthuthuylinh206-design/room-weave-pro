---
name: Rooms Quick View multi-select v2
description: Shift/Cmd-click range select on desktop, long-press selection on mobile, group siblings in Quick View
type: feature
---

# Rooms Multi-Select Shortcuts + Group Siblings (Batch 2, v1.1.58)

## Desktop (`RoomGrid.tsx`)
- Click thường vào ô phòng → mở Quick View (như cũ)
- **Shift+Click**: chọn 1 dải phòng từ phòng đã chọn cuối cùng đến phòng hiện tại, theo thứ tự ưu tiên đã sort (urgent → warning → normal)
- **Cmd/Ctrl+Click**: toggle chọn phòng đó vào/ra selection
- `lastSelectedId` state nhớ phòng được toggle gần nhất để Shift-range hoạt động

## Mobile (`MobileRoomsPage.tsx`)
- Long-press 500ms vào card → bật `selectionMode` + chọn luôn phòng đó + haptic vibrate 30ms (nếu device hỗ trợ)
- Implement bằng ref-map timers (không dùng `useLongPress` hook để tránh hook-in-loop)
- Click giả sau long-press được swallow qua `longPressTriggered` Set
- Vẫn giữ nút "Chọn" trên header để giữ tương thích

## Group Siblings trong Quick View
- `useActiveRoomBookings` select thêm cột `booking_group_id`
- `RoomGrid` build `groupSiblingsMap: Map<roomId, siblingRoomIds[]>` theo `booking_group_id`
- `QuickViewEntry.groupSiblings: GroupSibling[]` chứa `{ roomId, roomNumber, status, guestName }`
- Quick View hiển thị chip "Cùng đoàn (N phòng)" với chấm màu theo trạng thái — click chip → navigate sang phòng anh em

## File mới / đổi
- Mới: `src/hooks/useLongPress.ts` (utility, hiện chưa dùng do Rules of Hooks)
- Sửa: `src/hooks/useActiveRoomBookings.ts`, `src/components/rooms/RoomGrid.tsx`, `src/components/rooms/RoomQuickViewDialog.tsx`, `src/components/rooms/MobileRoomsPage.tsx`

## Không thay đổi
- `RoomBulkActionsBar` đã hỗ trợ 11 state + option "Gỡ DND/OOS" từ trước
- `RoomStatusSelector` đã group đầy đủ DND/OOS/skipper/sleep_out
