

User muốn tắt pull-to-refresh trên `/inventory` mobile vì nó ảnh hưởng đến trải nghiệm vuốt/chạm.

Từ context đã thấy:
- `MobileInventoryDashboard.tsx` đang wrap toàn bộ content trong `<PullToRefresh onRefresh={handleRefresh}>`
- `PullToRefresh` component nằm ở `src/components/mobile/PullToRefresh.tsx`
- Hook `usePullToRefresh` có `e.preventDefault()` trên `touchmove` → đây chính là thủ phạm chặn các thao tác vuốt khác

## Giải pháp

Đơn giản nhất và an toàn nhất: **bỏ wrapper `PullToRefresh` trong `MobileInventoryDashboard.tsx`**, chỉ render trực tiếp các section. Không cần xóa component `PullToRefresh` (các trang khác có thể vẫn dùng).

### File thay đổi

**`src/components/inventory/MobileInventoryDashboard.tsx`**
- Xóa import `PullToRefresh` và `useQueryClient`
- Xóa hàm `handleRefresh`
- Thay `<PullToRefresh onRefresh={handleRefresh}>...</PullToRefresh>` bằng `<div>...</div>` thường

### Kết quả
- Không còn listener `touchmove` với `preventDefault` trên trang inventory
- Vuốt ngang/dọc trên các card, swipeable items hoạt động bình thường
- User vẫn refresh được bằng cách reload PWA hoặc dữ liệu tự refresh qua React Query
- Các trang khác (nếu có dùng `PullToRefresh`) không bị ảnh hưởng

