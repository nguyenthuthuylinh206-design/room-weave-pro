## Vấn đề cần xử lý
Chức năng hiện tại đang báo “Đã lưu” nhưng thay đổi không chắc chắn được ghi và không chắc chắn được áp vào giao diện sau khi thoát/vào lại. Nguyên nhân rủi ro chính:

- State local/remote/draft còn nhiều nguồn, dễ bị remote hoặc localStorage ghi đè.
- Save đang update toàn bộ `hotels.settings`, dễ fail do quyền cột hoặc ghi đè settings khác nếu có thao tác đồng thời.
- UI dùng `height` trực tiếp nhưng grid width lại tính gián tiếp, nên người dùng có thể bấm “Nhỏ/Lớn” mà cảm giác “không đổi rõ”.
- Chưa có xác nhận đọc lại sau khi lưu, nên toast thành công có thể không phản ánh đúng dữ liệu thật.

## Những gì sẽ reuse
- Bảng hiện có: `hotels.settings.floor_map_cell_size`.
- Màn hiện có: `/rooms?view=map`, component `RoomFloorMapView`.
- Hook hiện có: `useFloorMapCellSize`, `useFloorMapCellSizeRemote`.
- UI popup hiện có để chỉnh: chiều cao ô, số cột, cỡ chữ.

## Cần refactor
1. Biến hook size thành một state machine đơn giản:
   - `saved`: giá trị đã lưu thật.
   - `draft`: giá trị đang xem thử trên UI.
   - `dirty`: draft khác saved.
   - Không tự động save localStorage khi kéo slider.
   - Remote load chỉ áp vào UI khi chưa có draft chưa lưu.

2. Làm save flow đáng tin cậy:
   - User kéo slider/chọn preset trong popup: chỉ preview.
   - User bấm `Lưu`: ghi backend, đọc lại giá trị vừa lưu, rồi mới toast thành công.
   - User bấm preset nhanh `Nhỏ/Vừa/Lớn`: preview ngay, ghi backend, đọc lại, rồi giữ state đã lưu.
   - Nếu fail: giữ draft trên màn và toast lỗi rõ ràng, không báo lưu thành công giả.

3. Làm thay đổi hiển thị nhìn thấy rõ:
   - `height` sẽ áp trực tiếp vào ô phòng.
   - `cols` sẽ đổi công thức `gridTemplateColumns` theo đúng số cột mong muốn trên desktop thay vì auto-fill mơ hồ.
   - `fontScale` sẽ ảnh hưởng trực tiếp bằng CSS variable/font-size inline cho số phòng và text phụ, không chỉ đổi class theo ngưỡng.

## Cần thêm mới
1. RPC/database function atomic để merge đúng một key JSON:
   - `update_hotel_floor_map_cell_size(hotel_id, size_json)`.
   - Validate `tenant_id`, role/permission, và hotel thuộc tenant.
   - Merge `settings.floor_map_cell_size` không ghi đè các key settings khác.
   - Trả lại giá trị đã lưu sau normalize.

2. Migration quyền:
   - Nếu thiếu quyền cập nhật `hotels.settings`, cấp đúng quyền cần thiết cho `authenticated` hoặc dùng RPC `SECURITY DEFINER` có kiểm tra tenant/role.
   - Không tạo bảng mới.

3. Test cho logic quan trọng:
   - Normalize/clamp height/cols/fontScale.
   - Dirty state khi preview.
   - Save success sync saved=draft.
   - Discard trả về saved.

## Rủi ro migration
- Không thay schema bảng, chỉ thêm RPC và grant execute nên rủi ro thấp.
- RPC sẽ chỉ update `hotels.settings.floor_map_cell_size`, không đụng `room_check` hoặc settings khác.
- Rollback: drop RPC mới, frontend có thể quay lại update cũ nếu cần.

## Kiến trúc / logic nghiệp vụ
```text
Load /rooms?view=map
  -> fetch hotel settings floor_map_cell_size
  -> normalize
  -> saved = draft = value

User chỉnh
  -> draft đổi ngay
  -> UI đổi ngay
  -> chưa lưu thì hiện “Chưa lưu”

User Lưu
  -> call RPC atomic
  -> RPC merge JSON + return saved value
  -> saved = draft = returned value
  -> invalidate/refetch cache
```

## Schema / migration
- Thêm migration tạo RPC `public.update_hotel_floor_map_cell_size`.
- Grant execute cho `authenticated`.
- Không tạo bảng mới.

## API / RPC / server actions
- `useFloorMapCellSizeRemote.save()` chuyển sang gọi RPC thay vì update `hotels.settings` trực tiếp.
- Sau save sẽ set query cache và refetch/confirm giá trị.

## UI screens / components
- `RoomFloorMapView.tsx` giữ UI hiện tại nhưng sửa hành vi:
  - Preset nhanh lưu thật và có trạng thái đang lưu.
  - Popup có preview rõ, `Lưu`, `Hủy`, `Mặc định`.
  - Summary hiển thị đúng giá trị đang dùng.
  - Ô phòng và chữ đổi rõ khi kéo slider.

## Permission / role rules
- Chỉ user cùng tenant và có quyền cập nhật hotel settings được lưu kích thước chung.
- Nếu user không có quyền, UI sẽ báo lỗi lưu; không hiện toast thành công giả.

## Test cases
- Chọn `Lớn` → ô cao hơn, ít cột hơn, refresh vẫn là `Lớn`.
- Chỉnh cỡ chữ 160% → số phòng to rõ, bấm lưu, thoát/vào lại vẫn giữ.
- Chỉnh rồi bấm `Hủy` → quay về size đã lưu.
- Lưu lỗi → không đóng popup, không báo thành công, draft vẫn còn để thử lưu lại.
- Chuyển khách sạn → load size riêng của khách sạn đó.

## Rollout notes
- Không xóa dữ liệu cũ trong `hotels.settings.floor_map_cell_size`.
- Giá trị cũ sẽ được normalize khi đọc lần đầu.
- Sau khi triển khai sẽ kiểm tra lại bằng console/network hoặc preview để xác nhận lưu và reload vẫn giữ.