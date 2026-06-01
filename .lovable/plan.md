## Mục tiêu
Sửa lỗi sau khi chỉnh kích thước/cỡ chữ sơ đồ phòng và bấm **Lưu**, giao diện vẫn có lúc bị quay về giá trị cũ.

## Phát hiện chính
- API lưu vào backend đã thành công: request `PATCH hotels` trả `204` và dữ liệu `floor_map_cell_size` đã có trong `hotels.settings`.
- Lỗi nằm ở client state: hook local nhận `remoteInitial` từ query cũ và mỗi lần component re-render/refetch có thể set lại state theo giá trị remote cũ, làm cảm giác “lưu xong lại trở về như cũ”.
- Sau khi lưu, hook chỉ `setQueryData` cho query riêng `['floor-map-cell-size', hotelId]`, nhưng danh sách `hotels` cũng refetch; cần cập nhật đồng bộ cache danh sách hotels để tránh context kéo cấu hình cũ về.

## Kế hoạch triển khai
1. **Ổn định state local của sơ đồ phòng**
   - Thêm cơ chế “dirty/local edited” trong `useFloorMapCellSize`.
   - Khi người dùng đang chỉnh hoặc vừa chỉnh, không cho `remoteInitial` cũ ghi đè state local.
   - Khi lưu thành công, đánh dấu state hiện tại là đã đồng bộ.

2. **Đồng bộ cache sau khi lưu vĩnh viễn**
   - Sửa `useFloorMapCellSizeRemote` để sau khi lưu thành công:
     - cập nhật query `['floor-map-cell-size', hotelId]` ngay lập tức,
     - cập nhật mọi cache danh sách `hotels` đang có, merge `settings.floor_map_cell_size` vào đúng khách sạn,
     - tránh refetch kéo dữ liệu cũ làm UI nhảy ngược.

3. **Sửa UX nút Lưu**
   - Sau khi bấm **Lưu**, vẫn lưu localStorage trước như hiện tại.
   - Khi backend lưu thành công, gọi hàm xác nhận sync để giá trị hiện tại không bị remote cũ overwrite.
   - Hiển thị toast đúng trạng thái: “Đã lưu vĩnh viễn…” chỉ khi backend thật sự thành công.

4. **Kiểm tra sau sửa**
   - Test thao tác: kéo cỡ chữ/kích thước → lưu → chuyển tab/refresh → giá trị vẫn giữ.
   - Kiểm tra network vẫn có `PATCH hotels 204`.
   - Không thêm migration vì đây là lỗi state/cache frontend, schema backend đã lưu được.

## File dự kiến sửa
- `src/hooks/useFloorMapCellSize.ts`
- `src/hooks/useFloorMapCellSizeRemote.ts`
- `src/components/rooms/RoomFloorMapView.tsx`

## Migration
- Không thêm migration.

## Test dự kiến
- Không thêm test tự động nếu project chưa có test cho hook này; sẽ kiểm tra bằng preview/network sau khi implement.

## Phần còn thiếu/rủi ro
- Nếu quyền cập nhật `hotels.settings` bị hạn chế theo role ở một tài khoản khác, người đó vẫn có thể chỉ lưu cục bộ; cần tách quyền “lưu cho toàn khách sạn” ở phase sau nếu muốn.