# Plan: Tối ưu QR Scanner trên điện thoại

## Vấn đề hiện tại (`src/components/bookings/QRScannerDialog.tsx`)

1. **Resolution quá cao**: yêu cầu `width: 4096, height: 2160` → nhiều điện thoại trung cấp trả stream lớn, FPS thấp, mỗi frame phải resize → chậm.
2. **Scan toàn bộ frame 1280×720**: `qr-scanner-wechat` chạy WASM ~150–400ms/frame trên điện thoại tầm trung → throttle 200ms trở nên vô nghĩa, mỗi lần scan thực tế cách nhau 0.4–0.8s → cảm giác "không nhạy".
3. **Không dùng `BarcodeDetector` native**: Android Chrome có sẵn API native cực nhanh (<30ms/frame), bị bỏ qua hoàn toàn.
4. **Throttle 200ms cố định**: ngay cả khi máy mạnh cũng không scan nhanh hơn được.
5. **Auto-zoom 2x sau 15 frame fail**: với throttle hiện tại ~ 3s mới zoom → người dùng đã bỏ cuộc.

## Hướng sửa

### A. Logic scan
- **Ưu tiên `window.BarcodeDetector`** nếu có (`['qr_code']`). Detect trực tiếp trên `<video>` element, không cần canvas.
- Fallback `qr-scanner-wechat` nếu trình duyệt không hỗ trợ (iOS Safari, Firefox).
- Giảm `SCAN_INTERVAL_MS` từ 200 → 100ms với BarcodeDetector; giữ 250ms với WeChat WASM (vì nó vốn chậm).

### B. Crop vùng scan
- Chỉ scan **vùng giữa khung 56vmin** thay vì toàn bộ frame:
  - Tính tỉ lệ crop từ video size → vẽ chỉ vùng QR box vào canvas 640×640.
  - Giảm ~70% pixel cần xử lý → WeChat scan nhanh hơn 3–4 lần.

### C. Resolution camera
- Hạ `ideal` xuống `1920×1080` (đủ đọc QR cách 30cm). Giữ `4096×2160` chỉ làm `max` để máy iPhone Pro tận dụng được nếu muốn.
- Thêm `frameRate: { ideal: 30 }` để đảm bảo FPS.

### D. Auto-zoom thông minh
- Giảm `FRAMES_BEFORE_ZOOM` 15 → 8 (zoom sớm hơn ~1s sau khi không tìm thấy).
- Khi đã zoom mà vẫn fail 8 frame → reset zoom (giữ logic cũ nhưng nhanh hơn).

### E. UI feedback
- Hiển thị badge "Đang quét..." nhấp nháy nhẹ ở góc để người dùng biết scanner đang chạy (hiện tại không có dấu hiệu nào).
- Thêm toast hint sau 8s không tìm thấy: "Đưa QR vào giữa khung, giữ cách 20–30cm, bật đèn pin nếu thiếu sáng".

### F. Bonus: cải thiện cảm nhận
- `playsInline` + `autoPlay` ✓ đã có. Thêm `disablePictureInPicture` để tránh popup PiP trên iOS.
- Vibrate 50ms khi scan thành công (`navigator.vibrate?.(50)`) → feedback xúc giác.

## File thay đổi

- `src/components/bookings/QRScannerDialog.tsx` — viết lại logic scan loop, thêm BarcodeDetector path, crop region, hint timeout.

## Test cases

1. **Android Chrome (BarcodeDetector path)**: scan QR CCCD ở khoảng cách 10/20/30/40 cm — phải bắt được < 500ms ở 20cm.
2. **iOS Safari (WeChat WASM path)**: scan tương tự — < 1.5s ở 20cm.
3. **Thiếu sáng**: bật đèn flash → vẫn scan được.
4. **QR không phải CCCD**: hiển thị toast "QR không phải định dạng CCCD" và tiếp tục quét (không đóng dialog).
5. **Auto-zoom**: khi QR nhỏ ở xa → tự zoom 2x sau ~1s.

## Rollout / Rollback

- Thay đổi chỉ ở 1 file UI, không động schema/RPC → rollback bằng revert commit.
- Không feature flag (cải thiện thuần UX, không breaking).

## Phần KHÔNG đụng

- `parseCCCDQR.ts` giữ nguyên.
- `DocumentScanner.tsx` (entry point) giữ nguyên.
- Remote scan flow (mobile-scan-upload) không liên quan.
