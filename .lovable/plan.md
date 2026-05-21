## Mục tiêu
Khi user đã đăng nhập 1 lần thành công trên **PWA đã cài (standalone)**, các lần mở app sau đó **tự động đăng nhập** mà không cần nhập email/mật khẩu, cũng không cần ấn nút "Tiếp tục" như màn `QuickReLogin` hiện tại.

## Bối cảnh đã có (reuse)
- `src/lib/credential-manager.ts` — đã lưu email + password vào `localStorage` (XOR obfuscation) + native `PasswordCredential` API. Hàm `getLocalCredential()` đọc lại được.
- `src/components/auth/QuickReLogin.tsx` — đã có UI nhập lại password cho lần đăng nhập sau, đã gọi `storeCredential()` khi thành công.
- `src/components/auth/LoginForm.tsx` — đã có checkbox "Ghi nhớ đăng nhập" + lưu `storeCredential()` khi `rememberMe = true`.
- `src/lib/pwa-environment.ts` — hàm `isPreviewOrIframe()` đã phân biệt preview vs production. Sẽ thêm `isStandalonePWA()`.
- `src/pages/auth/Login.tsx` — entry point quyết định render `QuickReLogin` hay `LoginForm`.

## Thiết kế

### A. Logic nghiệp vụ
Thêm 1 chế độ **"Auto-login PWA"**:
- **Điều kiện kích hoạt** (tất cả phải đúng):
  1. App đang chạy ở chế độ standalone PWA (`display-mode: standalone` hoặc `navigator.standalone`).
  2. Có `getLocalCredential()` hợp lệ (email + password).
  3. User chưa logout chủ động (xem cờ ở mục C).
  4. Không phải preview/iframe (`shouldEnablePWA()` = true) → để dev không bị tự đăng nhập.
- **Hành vi**: Khi vào `/auth/login` mà đủ điều kiện → bỏ qua mọi UI, gọi `signIn(email, password)` ngầm với spinner "Đang đăng nhập…", thành công thì điều hướng `/auth/callback`.
- **Fallback**: Nếu `signIn` lỗi (password đổi, account khóa…) → `clearLocalCredential()`, hiển thị `LoginForm` bình thường + toast "Phiên đã hết hạn, vui lòng đăng nhập lại".
- **Trên trình duyệt thường (không phải PWA)**: giữ nguyên hành vi cũ — `QuickReLogin` (vẫn phải gõ password). An toàn cho máy dùng chung.

### B. UI / Component
1. **`src/lib/pwa-environment.ts`**
   - Thêm `isStandalonePWA(): boolean` — kiểm tra `window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true`.

2. **`src/lib/credential-manager.ts`**
   - Thêm cờ `app_user_logged_out` (localStorage). `clearLocalCredential()` set cờ này = `'1'`. `storeCredential()` xóa cờ. Hàm mới `wasExplicitlyLoggedOut(): boolean`.

3. **`src/components/auth/AutoLoginGate.tsx` (mới)**
   - Component bọc trong `Login.tsx`. Khi mount:
     - Check `isStandalonePWA() && !wasExplicitlyLoggedOut() && getLocalCredential() && !isPreviewOrIframe()`.
     - Nếu đủ → setState `autoLoggingIn = true`, gọi `signIn`. Render full-screen spinner + dòng "Đang đăng nhập với <email>… [Hủy]".
     - Nút "Hủy" → set cờ logged-out, render `LoginForm`.
     - Lỗi → clear credential, render `LoginForm` + toast.
   - Nếu không đủ điều kiện → render `children` (giữ logic `QuickReLogin` / `LoginForm` cũ).

4. **`src/pages/auth/Login.tsx`**
   - Wrap nội dung Card hiện tại bằng `<AutoLoginGate>`.

5. **`src/contexts/AuthContext.tsx`** (logout flow — cần xem để chắc chắn)
   - Trong hàm `signOut`, sau khi `supabase.auth.signOut()` → gọi `clearLocalCredential()` (đảm bảo lần sau PWA không tự đăng nhập lại tài khoản vừa logout).

### C. Bảo mật / UX
- Vẫn dùng XOR obfuscation đã có. Bổ sung note trong UI Settings (tuỳ chọn, không thuộc scope này): "Bật trên thiết bị cá nhân".
- Trong `LoginForm`, đổi label checkbox thành "Ghi nhớ đăng nhập trên thiết bị này" (tiếng Việt rõ hơn, optional).
- Trong `QuickReLogin` thêm dòng nhỏ "Lần sau khi mở app sẽ tự đăng nhập" (chỉ hiển thị nếu `isStandalonePWA()`).
- Khi user bấm Logout từ menu → chắc chắn không auto-login lại cho đến khi đăng nhập tay 1 lần nữa.

### D. Phạm vi không động đến
- Không đổi schema DB, không thêm migration, không sửa edge function.
- Không thay đổi flow auth của trình duyệt thường (vẫn `QuickReLogin`).
- Không thay đổi PWA service worker config.

## Files sẽ tạo/sửa
- **Tạo**: `src/components/auth/AutoLoginGate.tsx`
- **Sửa**: `src/lib/pwa-environment.ts` (thêm `isStandalonePWA`), `src/lib/credential-manager.ts` (thêm logged-out flag), `src/pages/auth/Login.tsx` (bọc gate), `src/contexts/AuthContext.tsx` (clear credential khi signOut), `src/lib/app-version.ts` + `public/changelog.json` (bump version).
- **Optional**: tinh chỉnh label tiếng Việt ở `LoginForm` / `QuickReLogin`.

## Test cases
1. Lần đầu đăng nhập (PWA installed) với "Ghi nhớ" bật → đóng app → mở lại → tự vào dashboard, không thấy form.
2. Bấm Logout → mở lại PWA → thấy `LoginForm` (không auto-login).
3. Đổi mật khẩu phía admin → mở PWA → auto-login fail → fallback `LoginForm` + toast.
4. Mở app trên trình duyệt thường (không cài) → vẫn thấy `QuickReLogin` như cũ.
5. Mở app trong Lovable preview/iframe → KHÔNG auto-login (an toàn cho dev).
6. Bấm "Hủy" lúc đang spinner auto-login → về `LoginForm`, không bị loop.

## Rollout
- Bump `APP_VERSION` → `1.0.42`, thêm changelog entry "Tự động đăng nhập trên PWA đã cài".
- Không cần migration. Không breaking change cho user web thường.
