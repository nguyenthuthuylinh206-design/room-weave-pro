## Vấn đề xác định

Ảnh chụp cho thấy PWA production đang crash ở `PricingSection` với lỗi:

```text
.map is not a function
/assets/PricingSection...
```

Có 2 nguyên nhân cần xử lý cùng lúc:

1. `PricingSection` vẫn có đường render phụ thuộc dữ liệu dịch `features` là array; nếu i18n trả về string/object trong bundle cũ hoặc cache lệch, `.map` làm sập route.
2. Service worker hiện tại precache cả app shell/chunk và dùng SPA fallback từ precache `index.html`, nên PWA đã cài có thể tiếp tục chạy bundle cũ dù web đã publish bản mới. `CacheBuster` lại chạy sau khi React render nên không cứu được crash xảy ra sớm.

## Kế hoạch sửa

### 1. Chặn crash ngay tại `PricingSection`
- Thêm parser an toàn cho `pricing.*.features`:
  - array -> dùng trực tiếp
  - string -> tách theo dòng/dấu phân cách hợp lý
  - object/undefined -> trả `[]`
- Không để bất kỳ giá trị i18n nào gọi `.map` trực tiếp nếu chưa chuẩn hóa.
- Đây là fix trực tiếp cho lỗi trong ảnh.

### 2. Bọc root landing bằng error boundary đúng tầng
- Route `/` render landing qua `RootRoute`, hiện chưa bọc `SectionErrorBoundary` ở tầng `Suspense` của landing.
- Thêm boundary quanh landing ở `RootRoute` để nếu landing section lỗi, người dùng không rơi vào màn `Unexpected Application Error` mặc định.

### 3. Sửa chiến lược service worker để không giữ app shell cũ
- Trong `src/sw.ts`:
  - Không precache `index.html` và các chunk route động dễ lệch phiên bản.
  - Đổi navigation fallback sang `NetworkFirst` cho HTML navigation thay vì luôn lấy `index.html` từ precache.
  - Giữ push notification và cache tài nguyên tĩnh cần thiết.
- Trong `vite.config.ts`:
  - Loại `html` khỏi `globPatterns` hoặc thêm ignore rõ ràng cho `index.html`.
  - Không precache quá rộng toàn bộ `assets/*.js` route chunks.

### 4. Đưa PWA update/cleanup lên trước render
- Hiện `usePWAUpdate` chỉ nằm trong `MainLayout`, nên guest landing hoặc crash trước layout không có cơ chế update.
- Tạo component/hook nhỏ chạy ở root app trước `RouterProvider` để:
  - đăng ký SW ở production,
  - bắt update mới sớm,
  - reload khi controller đổi,
  - không phụ thuộc vào `MainLayout`.
- Giữ `PWAUpdatePrompt` trong layout nếu vẫn muốn hiển thị thông báo cho user đã đăng nhập.

### 5. Nâng fallback production, không để hiện stack trace thô
- Cập nhật `ChunkErrorBoundary`/`RouteErrorBoundary` để lỗi render thường trên production hiển thị tiếng Việt với nút:
  - Tải lại
  - Xoá cache & tải lại
  - Về trang chủ
- Tránh để người dùng cuối thấy màn `Unexpected Application Error`/stack trace như ảnh.

### 6. Version và changelog
- Bump `APP_VERSION` lên `1.0.63`.
- Thêm entry `public/changelog.json` mô tả fix PWA mobile production.

## Không thay đổi

- Không thêm migration.
- Không đổi nghiệp vụ chat/booking/room check.
- Không sửa database/RPC.

## QA sau khi implement

- Kiểm tra `/` và `/landing` ở viewport mobile 390px không crash khi `pricing.*.features` là array/string/object/undefined.
- Kiểm tra service worker production config không precache `index.html` theo kiểu app shell cũ.
- Kiểm tra route fallback hiển thị tiếng Việt, không còn màn `Unexpected Application Error` mặc định.
- Kiểm tra PWA update hook chạy ở root, không phụ thuộc đăng nhập/MainLayout.

## Rollout note

Bản này cần publish để thiết bị PWA thực tế nhận service worker mới. Với thiết bị đã kẹt cache quá cũ, lần mở đầu có thể vẫn cần đóng/mở lại app hoặc bấm “Xoá cache & tải lại”; sau release này cơ chế update sẽ không còn để app shell cũ giữ lỗi lâu như hiện tại.