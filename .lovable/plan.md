# Fix: Bar booking đè chữ cột phòng (P101, Deluxe · Bẩn...)

## Nguyên nhân
Trong `RoomTapeChart.tsx`:
- Header sticky: `z-30` (góc trái `z-40`)
- Cột phòng sticky của từng hàng: **`z-[2]`** (line 942)
- Booking bar render: **`z-[3]`** (line 1090)
- Block bar: `z-[1]`

→ Khi cuộn ngang, các bar booking (z-3) đè lên cột phòng sticky (z-2) gây chồng chữ "P105 · Standard · Bẩn".

Ngoài ra row group header cũng chỉ `z-10` nhưng OK vì nằm trên hàng riêng.

## Thay đổi (chỉ UI, 1 file)

**`src/components/rooms/RoomTapeChart.tsx`**

1. **Cột phòng sticky của từng row** (line 942): `z-[2]` → `z-20`
   - Cao hơn bar (z-3), block (z-1), now-line (z-5)
   - Vẫn thấp hơn header sticky (z-30) và corner (z-40)

2. **Row group header** (line 770): `z-10` → `z-20` để đồng bộ với cột phòng (header floor cũng cần che bar khi scroll).

3. **Đảm bảo bar không tràn vào vùng cột phòng**: Bar đã được render với `left = ROOM_COL_W + offset` nên về mặt toạ độ không tràn; vấn đề chỉ là z-index khi cột phòng sticky lướt qua bar lúc scroll ngang. Fix z-index là đủ.

4. **Thêm `bg-background` rõ ràng** cho cột phòng (đã có) — giữ nguyên, chỉ cần đảm bảo không có `bg-transparent` ở wrapper bên ngoài.

## Version
- Bump `APP_VERSION` → `1.0.86`
- Thêm entry `public/changelog.json`: "Sửa booking bar đè chữ cột phòng trong Tape Chart"

## Test thủ công
1. Mở `/rooms` → tab Sơ đồ
2. Cuộn ngang sang trái/phải
3. Xác nhận text "P101", "Deluxe · Bẩn"... luôn hiển thị rõ, không bị booking bar đè lên
4. Header ngày vẫn nằm trên cùng, góc trái "Phòng" vẫn che cả header lẫn cột phòng

## Không thay đổi
- Không sửa logic, hook, RPC, schema
- Không sửa kích thước cell, lane, layout
