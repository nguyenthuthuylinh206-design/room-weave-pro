## Mục tiêu
Khi cuộn ngang trong Tape Chart, các ô ngày không được "xuyên" lên cột "Phòng" sticky bên trái.

## Nguyên nhân
File `src/components/rooms/RoomTapeChart.tsx`:
- L721: header cell "Phòng" dùng `bg-muted/40` (40% opacity)
- L770: row group "Tầng X" dùng `bg-muted/30` (30% opacity), sticky `left-0` full width

Khi scroll ngang, ô ngày nằm cùng row, có z thấp hơn nhưng vẫn hiện xuyên qua phần nền bán trong suốt của cột Phòng.

## Thay đổi

### `src/components/rooms/RoomTapeChart.tsx`

1. **Header "Phòng" (L720-725)**: thêm lớp nền opaque phía dưới
   - Thay `bg-muted/40` → `bg-muted` (solid) + giữ `border-r border-b` để không lộ viền

2. **Header date strip wrapper (L716-719)**: `bg-muted/40` giữ nguyên vì là phần header — không cần opaque (không bị che bởi gì cả). OK.

3. **Row group "Tầng X" (L768-784)**: hiện sticky `left-0` full width nền `bg-muted/30`. Tách thành 2 phần:
   - Box sticky chỉ rộng `ROOM_COL_W` với `bg-background` (opaque) chứa text "Tầng X (n phòng)"
   - Phần còn lại width = `days * cellW` nền `bg-muted/30` (cho đẹp)
   
   Hoặc đơn giản: giữ nguyên cấu trúc nhưng đổi nền sang `bg-muted` (opaque). Vì group header không cần thấy gì phía sau, opaque hoàn toàn ổn.

4. **Row room cell (L941-956)**: đã dùng `bg-background` (opaque) — OK, không sửa.

### Version bump
- `src/lib/app-version.ts`: `1.0.86` → `1.0.87`
- `public/changelog.json`: thêm entry "Sửa overlap cột Phòng khi cuộn ngang Tape Chart"

## Files sửa
- `src/components/rooms/RoomTapeChart.tsx` (2 dòng nền)
- `src/lib/app-version.ts`
- `public/changelog.json`

## QA
1. Mở `/rooms` → Tape Chart
2. Cuộn ngang → text "Phòng" và "Tầng X" phải đứng rõ, không có chữ ngày xuyên qua
3. Today highlight, weekend, holiday vẫn hiển thị đúng ở dải date header
