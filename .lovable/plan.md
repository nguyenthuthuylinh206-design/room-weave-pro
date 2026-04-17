

# Quy chuẩn Touch/Swipe toàn dự án

## Phát hiện chính (vấn đề thực tế)

Sau khi quét toàn bộ codebase, mình tìm thấy **5 nguyên nhân gốc** gây vuốt giật, nhảy, đè thao tác:

### 1. Hai phiên bản `SwipeableCard` chồng chéo
- `src/components/mobile/TouchOptimized.tsx` → version cũ (threshold 50, không haptic, không offset)
- `src/components/mobile/SwipeableCard.tsx` → version mới (threshold 100, có haptic + visual offset, không được dùng ở đâu)
→ Tất cả 5 màn (Rooms, Laundry, Inventory LowStock, Dashboard, VendorPerformance) đang dùng **bản cũ thiếu logic phân biệt swipe ngang vs cuộn dọc** → vuốt dọc bị nhận nhầm thành swipe ngang.

### 2. `PullToRefresh` dùng `e.preventDefault()` trên `touchmove`
- Hook `usePullToRefresh.ts` gọi `preventDefault` mỗi khi distance > 10px → chặn cả native scroll và swipe ngang
- Dùng ở **22 trang mobile** → mọi trang đều bị ảnh hưởng (không chỉ /inventory)
- Listener gắn `passive: false` lên cả `document` khi không có `containerRef` → ảnh hưởng global

### 3. `SwipeableCard` không kiểm tra hướng vuốt
Chỉ đọc `clientX`, không so với `clientY` → vuốt dọc nghiêng nhẹ cũng kích hoạt `onSwipeLeft/Right`. CSS `touch-pan-y` giúp một phần nhưng không cứu được khi user swipe chéo.

### 4. Lồng `SwipeableCard` bên trong `PullToRefresh`
Cả 2 cùng giữ state touch → xung đột: pull-down kích hoạt khi user swipe ngang nhanh, swipe ngang trigger khi user kéo refresh.

### 5. Thiếu chuẩn threshold + thiếu velocity detection
Mỗi component tự đặt threshold (50, 100, 80). Không component nào kiểm tra **tốc độ vuốt** → vuốt chậm bị bỏ qua, vuốt nhanh kích hoạt nhầm.

---

## Quy chuẩn đề xuất (Touch Standard v1)

### A. Sửa `SwipeableCard` (file `TouchOptimized.tsx` - bản chính thức)
- Bắt cả `clientX` và `clientY` khi `touchstart`
- Trong `touchend`: chỉ kích hoạt swipe khi `|deltaX| > |deltaY| * 1.5` (góc < ~33°) → tránh nhầm với cuộn dọc
- Threshold mặc định **60px** + tối thiểu **0.3 px/ms velocity**
- Thêm haptic feedback `medium` khi trigger
- Giữ `touch-action: pan-y` (cho phép cuộn dọc native)
- Xóa file `SwipeableCard.tsx` cũ không dùng (tránh nhầm lẫn)

### B. Sửa `usePullToRefresh.ts`
- **Bỏ `e.preventDefault()`** — thay bằng kiểm tra hướng: chỉ pull khi `deltaY > deltaX * 2` (vuốt thẳng đứng rõ ràng) VÀ scrollTop = 0
- Nếu user vuốt ngang trước → **hủy hoàn toàn** pull session, không can thiệp
- Tăng activation threshold ban đầu: chỉ bắt đầu hiển thị indicator khi kéo > 20px (dead zone) → tránh "nhảy" khi chạm nhẹ
- Đổi listener target: nếu không có `containerRef`, gắn vào `document.body` thay vì `document` để tránh ảnh hưởng overlay/dialog
- Giữ `passive: true` cho cả 3 sự kiện (vì không còn preventDefault)

### C. Quy tắc dùng (document trong code comment + memory)
1. **Không lồng** `PullToRefresh` bên trong scrollable container có `SwipeableCard` con — luôn để `PullToRefresh` ở root, `SwipeableCard` là leaf
2. Trang nặng tương tác (Inventory dashboard, Room check) → **không bọc PullToRefresh**, dùng nút refresh thủ công
3. Mọi component vuốt dùng chung hằng số từ `src/lib/touch-constants.ts` (mới):
   ```ts
   SWIPE_THRESHOLD_PX = 60
   SWIPE_VELOCITY_MIN = 0.3
   SWIPE_ANGLE_RATIO = 1.5  // |dx| > |dy| * ratio
   PULL_DEAD_ZONE_PX = 20
   PULL_THRESHOLD_PX = 80
   ```

### D. CSS toàn cục (bổ sung `src/index.css`)
- Thêm `.swipeable` utility: `touch-action: pan-y; user-select: none; -webkit-user-select: none;`
- Body: thêm `overscroll-behavior-x: none` (tránh back-swipe iOS xung đột)

---

## Files thay đổi

| File | Thay đổi |
|------|---------|
| `src/lib/touch-constants.ts` | **Mới** — hằng số chung |
| `src/components/mobile/TouchOptimized.tsx` | Viết lại `SwipeableCard` với angle + velocity check |
| `src/components/mobile/SwipeableCard.tsx` | **Xóa** (không nơi nào import) |
| `src/hooks/usePullToRefresh.ts` | Bỏ preventDefault, thêm direction lock + dead zone |
| `src/index.css` | Thêm utility `.swipeable`, `overscroll-behavior-x: none` cho body |
| `mem://design/touch-and-swipe-standards-v1` | **Mới** — lưu quy chuẩn vào memory |

**Không đổi**: 22 trang đang dùng `PullToRefresh`/`SwipeableCard` → tự động hưởng lợi vì sửa ở core.

---

## Kết quả mong đợi

- Cuộn dọc native mượt 60fps trên tất cả trang (kể cả trang có PullToRefresh)
- Swipe ngang chỉ kích hoạt khi vuốt **rõ ràng theo phương ngang** + đủ nhanh
- Pull-to-refresh không "nhảy" khi user chạm nhẹ
- Không đè lên thao tác trong Sheet/Dialog/Drawer
- /inventory không cần tắt PullToRefresh nữa — có thể bật lại sau khi sửa (mình sẽ hỏi bạn ở bước implement)

