## Vấn đề: iOS/Android Safari không lưu mật khẩu

Hiện tại code dùng `PasswordCredential API` — **chỉ chạy trên Chrome/Edge desktop**. iOS Safari, iOS PWA, và Android Chrome PWA **không hỗ trợ** API này → cô bấm đăng nhập trên mobile xong, trình duyệt không hỏi "Lưu mật khẩu vào iCloud Keychain / Google Password Manager".

### Lý do mobile không lưu

iOS Keychain & Google Password Manager **chỉ tự động prompt** khi:

1. Form là `<form>` HTML chuẩn ✅ (đã có)
2. Có input `autocomplete="username"` + `autocomplete="current-password"` ✅ (đã có)
3. Form **submit qua HTTP POST hoặc dispatch `submit` event không bị `preventDefault` ngay lập tức** ⚠️
4. Trang sau submit phải **navigate** (đổi URL) — không chỉ re-render SPA ⚠️

→ React Hook Form gọi `e.preventDefault()` ngay → mobile browser **không nhận diện được "user vừa submit credentials"** → không prompt lưu.

Ngoài ra trong PWA standalone trên iOS, Keychain chỉ prompt khi navigation thật sự xảy ra (không phải client-side routing bằng `react-router`).

## Giải pháp

### 1. Trigger native "credential save" hint cho mobile

Thay vì chỉ dựa vào `PasswordCredential` (desktop), thêm fallback:

- **Sau khi `signIn` thành công**: dispatch một form submit "ảo" tới trang chính bằng `window.location.assign()` hoặc dùng `<form action="/auth/callback" method="GET">` submit thật → trình duyệt thấy đây là "successful login form submission" → hỏi lưu mật khẩu.
- Hoặc đơn giản hơn: thay `navigate('/auth/callback')` (SPA) bằng `window.location.href = '/auth/callback'` **chỉ trong lần đăng nhập thành công** → trigger full page navigation → iOS/Android nhận diện và prompt.

### 2. Đảm bảo cấu trúc form đúng chuẩn cho mobile

- `LoginForm.tsx`: form đã chuẩn ✅
- `QuickReLogin.tsx`: input email ẩn dùng `position: absolute; opacity: 0` — **iOS Safari đôi khi bỏ qua** input này. Đổi sang `sr-only` Tailwind class hoặc giữ visible nhưng `readonly` + style nhỏ.

### 3. PWA-specific: enable iOS Keychain Associated Domains

iOS PWA chỉ lưu password tự động khi:

- App được cài qua "Add to Home Screen" với `manifest.json` đúng
- Có `apple-app-site-association` (cho native app) — **không cần với web PWA**, chỉ cần form HTML chuẩn + full navigation sau submit

### 4. (Khuyến nghị) Thêm nút "Lưu mật khẩu trên thiết bị này"

Cho người dùng tự bật — UX rõ ràng hơn checkbox "Remember me" hiện tại (vốn chỉ lưu email).

## Files cần sửa


| File                                   | Thay đổi                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/auth/LoginForm.tsx`    | Đổi `navigate('/auth/callback')` → `window.location.assign('/auth/callback')` sau login thành công (trigger native save prompt) |
| `src/components/auth/QuickReLogin.tsx` | Tương tự + đổi style hidden email từ inline style sang `className="sr-only"` để iOS nhận diện                                   |
| `src/pages/auth/Login.tsx`             | Bỏ điều hướng SPA `navigate` trong `handleLoginSuccess`, để LoginForm tự navigate full-page                                     |


## Câu hỏi xác nhận

1. **Cô đang test trên thiết bị nào?**
  - iPhone Safari (browser thường)
  - iPhone PWA (đã "Add to Home Screen")
  - Android Chrome
  - Android PWA
   *(Khác nhau: iOS PWA khó nhất, Android Chrome dễ nhất)*   
  *Cô cần tất cả các phần trên* 
2. **Mong muốn của cô là gì?**
  - **A**: Trình duyệt tự hỏi "Lưu mật khẩu?" → dùng iCloud Keychain/Google Password (khuyến nghị, an toàn nhất)
  - **B**: App tự lưu mật khẩu vào thiết bị (lưu vào localStorage mã hoá) → tự auto-fill khi mở lại — **kém an toàn hơn** nhưng chắc chắn hoạt động trên mọi mobile/PWA   
  Tự động lưu đi 