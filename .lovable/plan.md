

## Mục tiêu

Thêm 2 chức năng vào trang Quản lý phòng:
1. **Chọn tất cả phòng** (đặc biệt cho Grid view — hiện chỉ Table view có)
2. **Áp dụng tiêu chuẩn cho các phòng đã chọn** trong bulk actions bar

## Hiện trạng

- `RoomTable.tsx` đã có checkbox "select all" ở header ✅
- `RoomGrid.tsx` **chưa có** nút chọn tất cả
- `RoomBulkActionsBar.tsx` có: Đổi trạng thái, Yêu cầu kiểm tra, Xóa — **chưa có** "Áp dụng tiêu chuẩn"
- Hook `useApplyStandards` (trong `useRoomStandards.ts`) đã có sẵn — gọi RPC `apply_room_standards` cho **1 phòng**
- Mỗi phòng có `room_type` riêng → khi áp dụng cho nhiều phòng, mỗi phòng dùng chuẩn theo `room_type` của nó

## Thiết kế

### 1. Nút "Chọn tất cả" cho Grid view

Đặt ở `RoomsPage.tsx` (phía trên Bulk Actions Bar hoặc cạnh Tabs view-mode), hiển thị khi `viewMode === 'grid'`:

```
[ ☐ Chọn tất cả (24 phòng) ]
```
- Click → chọn/bỏ chọn toàn bộ `rooms` đang hiển thị (sau filter)
- Trạng thái: `unchecked` / `indeterminate` / `checked`

### 2. Nút "Áp dụng tiêu chuẩn" trong Bulk Actions Bar

Thêm button mới trong `RoomBulkActionsBar.tsx`, cạnh "Yêu cầu kiểm tra":

```
[ 📋 Áp dụng tiêu chuẩn (3) ]
```

**Flow:**
1. Click → mở `AlertDialog` xác nhận:
   - "Áp dụng tiêu chuẩn cho **3 phòng** đã chọn?"
   - "Mỗi phòng sẽ được áp dụng theo tiêu chuẩn của hạng phòng tương ứng. Item bị thiếu sẽ được bổ sung, item đã có sẽ giữ nguyên."
2. Confirm → loop qua từng `roomId`, gọi `apply_room_standards` RPC tuần tự
3. Hiện progress: "Đang xử lý 2/3..."
4. Toast tổng kết: "Đã áp dụng cho 3 phòng: 12 mới, 5 cập nhật"
5. Invalidate `['rooms']`, clear selection

### 3. Hook mới: `useBulkApplyStandards`

Thêm vào `src/hooks/useBulkRoomActions.ts`:

```ts
useBulkApplyStandards()
  → mutationFn: nhận roomIds[]
  → loop tuần tự gọi supabase.rpc('apply_room_standards', { p_room_id, p_user_id })
  → trả về { totalAdded, totalUpdated, failedRooms[] }
  → onSuccess: invalidate ['rooms'], toast tổng kết
```

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useBulkRoomActions.ts` | Thêm hook `useBulkApplyStandards` |
| `src/components/rooms/RoomBulkActionsBar.tsx` | Thêm button "Áp dụng tiêu chuẩn" + AlertDialog xác nhận |
| `src/components/rooms/RoomGrid.tsx` | (Optional) Có thể giữ nguyên — nút select-all đặt ở RoomsPage |
| `src/pages/rooms/RoomsPage.tsx` | Thêm thanh "Chọn tất cả" ở Grid view (hiển thị conditionally) |
| `src/locales/vi/rooms.json` & `en/rooms.json` | Thêm key `bulkActions.applyStandards`, `bulkActions.selectAll`, dialog text |

## Câu hỏi xác nhận

1. **Vị trí nút "Chọn tất cả"**:
   - A: Hiển thị **trên cùng Grid** (1 hàng riêng phía trên grid cards)
   - B: Hiển thị trong **bulk actions bar** (chỉ xuất hiện khi đã chọn ≥1 phòng) — kiểu "chọn tất cả còn lại"
   - C: Hiển thị **cả Grid lẫn Table** dạng checkbox góc trên (Table đã có sẵn rồi)

2. **Khi áp dụng tiêu chuẩn cho phòng có hạng chưa cấu hình standards**:
   - A: Bỏ qua, hiện thông báo "X phòng không có chuẩn cấu hình"
   - B: Báo lỗi và dừng toàn bộ
   - C: Bỏ qua âm thầm, chỉ tính phòng có chuẩn

