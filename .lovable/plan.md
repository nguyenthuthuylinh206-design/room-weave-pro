## Vấn đề hiện tại
Các nút **Nhỏ / Vừa / Lớn** và popup chỉnh kích thước đang đổi UI tạm thời, nhưng trải nghiệm **Lưu** gây hiểu nhầm/không có tác dụng rõ ràng vì:

- Nút preset ngoài toolbar không có nút Lưu ngay bên cạnh, nên người dùng bấm preset xong tưởng đã lưu.
- Dữ liệu thực tế có gửi PATCH thành công, nhưng nguồn state đang có nhiều lớp: remote settings, localStorage, state tạm, cache hotels.
- Hook hiện vẫn ưu tiên chống overwrite hơi phức tạp, dễ tạo cảm giác state đã lưu nhưng UI không đổi hoặc quay lại khi remote/local cache lệch nhau.

## Cách sửa triệt để
Chuyển sang mô hình rõ ràng:

```text
server settings -> savedSize
người dùng chỉnh -> draftSize
bấm Lưu -> save draftSize vào server + localStorage -> savedSize = draftSize
bấm Hủy/đóng không lưu -> draft quay lại savedSize
```

## Kế hoạch triển khai
1. **Tách draft và saved size trong `useFloorMapCellSize`**
   - `savedSize`: cấu hình đã được tải/lưu chính thức.
   - `size`: cấu hình đang áp dụng trên UI để người dùng xem thử.
   - `isDirty`: có thay đổi chưa lưu hay không.
   - `markSynced(value)`: sau khi server lưu xong, set cả `savedSize` và `size` về value.
   - `discardDraft()`: quay lại cấu hình đã lưu nếu người dùng không muốn giữ thay đổi.

2. **Nút preset Nhỏ/Vừa/Lớn phải lưu thật**
   - Đổi hành vi các nút preset ngoài toolbar: click **Nhỏ/Vừa/Lớn** sẽ lưu luôn preset đó lên server, không chỉ đổi UI tạm.
   - Nếu chưa có khách sạn, lưu local thiết bị.
   - Hiển thị trạng thái loading/disabled khi đang lưu.

3. **Popup tùy chỉnh phải có trạng thái rõ ràng**
   - Trong popup, chỉnh slider vẫn preview ngay.
   - Hiển thị nhãn “Chưa lưu” khi có thay đổi.
   - Nút **Lưu** chỉ enable khi có thay đổi.
   - Thêm nút **Hủy** hoặc khi đóng popup thì gọi `discardDraft()` để không giữ nhầm thay đổi chưa lưu.

4. **Đồng bộ cache backend sau lưu**
   - Giữ logic cập nhật `['floor-map-cell-size', tenantId, hotelId]`.
   - Cập nhật cache `['hotels', ...]` đúng hotel.
   - Không invalidate ngay lập tức nếu không cần, tránh refetch kéo giá trị cũ trong vài ms.

5. **Kiểm tra**
   - Kiểm tra request PATCH gửi đúng body sau khi bấm Nhỏ/Vừa/Lớn.
   - Kiểm tra popup: kéo slider -> thấy “Chưa lưu” -> bấm Lưu -> refresh vẫn giữ.
   - Chạy lint các file liên quan.

## File sẽ sửa
- `src/hooks/useFloorMapCellSize.ts`
- `src/components/rooms/RoomFloorMapView.tsx`
- `src/hooks/useFloorMapCellSizeRemote.ts` nếu cần tinh chỉnh cache nhẹ

## Migration
- Không thêm migration.

## Test
- Không thêm test tự động trong lượt này; sẽ chạy lint và kiểm tra network/preview nếu phiên browser có auth.

## Phần còn thiếu/rủi ro
- Nếu người dùng muốn preset ngoài toolbar chỉ preview chứ không lưu luôn, cần đổi lại theo hướng có nút “Lưu” luôn hiện ngoài toolbar. Nhưng theo phản hồi hiện tại, preset nên có tác dụng lưu thật ngay khi bấm.