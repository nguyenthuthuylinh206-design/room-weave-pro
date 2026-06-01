## Mục tiêu
Làm lại toàn bộ chức năng điều chỉnh kích thước khung và chữ phòng ở `/rooms?view=map` để:
- Bấm **Nhỏ / Vừa / Lớn** là lưu thật ngay.
- Chỉnh trong popup rồi bấm **Lưu** là lưu thật.
- Out ra vào lại, refresh, đổi tab, quay lại màn hình vẫn giữ đúng kích thước đã lưu.
- Không còn bị `localStorage`, remote settings, draft state hoặc cache cũ ghi đè ngược.

## Những gì reuse
- Reuse bảng `hotels.settings.floor_map_cell_size` làm nơi lưu cấu hình theo từng khách sạn.
- Reuse hook `useFloorMapCellSizeRemote` để đọc/ghi settings.
- Reuse UI hiện có của toolbar và popup trong `RoomFloorMapView.tsx`.
- Reuse cách render grid/card hiện tại bằng `cellSize.classes`.

## Những gì cần refactor
1. **Bỏ mô hình state phức tạp hiện tại**
   - Không dùng song song nhiều nguồn quyết định như hiện tại: remote + localStorage + savedSize + dirty ref + draft ref.
   - Hook local chỉ quản lý **draft UI hiện tại** và tính class hiển thị.
   - Nguồn sự thật sau khi có khách sạn sẽ là `hotels.settings.floor_map_cell_size`.

2. **Tách rõ 3 thao tác**
   ```text
   Load server -> áp vào UI
   User chỉnh -> preview tạm
   User bấm Lưu / preset -> ghi server -> cập nhật cache -> áp lại UI
   ```

3. **Chặn stale overwrite**
   - Khi lưu thành công, cập nhật trực tiếp React Query cache cho `['floor-map-cell-size', tenantId, hotelId]`.
   - Không để refetch hoặc localStorage cũ kéo UI về giá trị trước đó.
   - Chỉ đọc localStorage như fallback khi chưa có hotel hoặc server chưa có cấu hình.

## Những gì thêm mới
1. **Helper chuẩn hóa cấu hình duy nhất**
   - Tạo/giữ các helper `normalizeCellSize`, `getPresetCellSize`, `cellSizeSignature`, `storageKey` để mọi nơi dùng cùng logic.
   - Đảm bảo giá trị lưu luôn có đủ: `preset`, `height`, `cols`, `fontScale`.

2. **Hook local đơn giản hơn**
   - API dự kiến:
     - `size`
     - `setDraft(next)` / `setPresetDraft(preset)` / `setCustomDraft(patch)`
     - `applySaved(value)` sau khi load/lưu thành công
     - `discardDraft()`
     - `isDirty`
     - `classes`, `summaryLabel`
   - Không tự động ghi localStorage trong mỗi lần kéo slider.

3. **Save flow chắc chắn trong UI**
   - Preset ngoài toolbar:
     - Tạo value preset.
     - Preview ngay.
     - Gọi mutation lưu server.
     - Thành công thì `applySaved(value)` và toast “Đã lưu”.
     - Thất bại thì giữ draft và báo lỗi rõ.
   - Popup:
     - Slider chỉ preview.
     - Nút **Lưu** ghi đúng `current draft`.
     - Nút **Hủy** quay lại giá trị đã lưu.
     - Đóng popup khi chưa lưu sẽ không âm thầm lưu.

4. **Fix lỗi DOM nesting trong toolbar**
   - Console đang báo `<button>` nằm trong `<button>` quanh Tooltip/Popover.
   - Sẽ chỉnh lại trigger/structure nếu nằm trong vùng size control để tránh warning gây hành vi click không ổn định.

## Schema / migration
- Không thêm migration.
- Không đổi schema.
- Vẫn lưu trong `hotels.settings.floor_map_cell_size`.

## API / RPC / server actions
- Không thêm RPC.
- Mutation vẫn dùng update `hotels.settings`, bắt buộc filter:
  - `.eq('tenant_id', tenantId)`
  - `.eq('id', hotelId)`

## UI screens / components
- Sửa `src/components/rooms/RoomFloorMapView.tsx`:
  - Làm lại hàm save preset và save popup.
  - Hiển thị trạng thái đang lưu rõ ràng.
  - Giữ label hiện tại như “Nhỏ / Vừa / Lớn / Tuỳ chỉnh”.
- Sửa `src/hooks/useFloorMapCellSize.ts`:
  - Làm lại hook theo draft/saved đơn giản.
- Sửa `src/hooks/useFloorMapCellSizeRemote.ts`:
  - Chuẩn hóa value trước khi lưu/đọc.
  - Cập nhật cache chính xác, không invalidate kéo giá trị cũ về.

## Permission / role rules
- Không đổi permission.
- Người đang vào được màn `/rooms?view=map` và có quyền hiện tại sẽ dùng được control như trước.

## Test cases
Sẽ kiểm tra bằng lint/test liên quan nếu có thể, và kiểm tra logic thủ công qua code path:
1. Bấm **Nhỏ** -> refresh/out vào lại -> vẫn Nhỏ.
2. Bấm **Lớn** -> refresh/out vào lại -> vẫn Lớn.
3. Mở popup kéo chiều cao/cột/cỡ chữ -> bấm **Lưu** -> refresh/out vào lại -> giữ đúng.
4. Mở popup chỉnh -> bấm **Hủy** -> quay lại size đã lưu.
5. Lưu thất bại -> không báo thành công giả.

## Rollout notes
- Đây là refactor frontend + cache, không đụng database.
- Nếu backend trả lỗi permission khi update `hotels.settings`, sẽ cần kiểm tra grant/RLS của bảng `hotels`, nhưng trước mắt không thêm migration vì hiện network trước đó đã PATCH thành công.