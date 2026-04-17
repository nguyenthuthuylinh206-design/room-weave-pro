
User báo: PWA mobile (iPhone) không lưu/gợi ý email + password đã đăng nhập. Mỗi lần phải gõ lại.

## Phân tích nguyên nhân

Đã xem `LoginForm.tsx` và `credential-manager.ts`:

### Vấn đề #1: iOS Safari/PWA KHÔNG hỗ trợ `PasswordCredential` API
- `credential-manager.ts` dùng `window.PasswordCredential` → chỉ Chrome/Edge desktop hỗ trợ
- iOS Safari & PWA standalone mode → API trả về `undefined` → không lưu được
- iOS dùng **iCloud Keychain** thông qua autofill HTML chuẩn, KHÔNG qua JS API

### Vấn đề #2: Form HTML không đúng chuẩn để Keychain nhận diện
File `LoginForm.tsx` có vài chỗ sai khiến iOS Keychain không lưu:

1. **`action="#"` + `method="POST"`** → iOS coi đây là form không submit thật → không trigger lưu password. Cần bỏ hoặc dùng `action` thật.
2. **Email field có `name="username"`** nhưng **type="email"** + label "email" → iOS Keychain confused. Nên dùng `name="email"` hoặc giữ `username` nhưng đảm bảo nhất quán.
3. **Submit qua `form.handleSubmit(onSubmit)`** với `e.preventDefault()` của react-hook-form → iOS đôi khi không nhận diện đây là "successful login submission" → không prompt lưu.
4. **Password manager prompt cần navigation thật**: sau submit, iOS chờ navigation/page change để xác nhận login thành công rồi mới prompt lưu. Hiện tại `navigate('/auth/callback')` là client-side routing → iOS không phải lúc nào cũng nhận diện.

### Vấn đề #3: `QuickReLogin` component có thể đang chiếm quyền autofill
- Khi có `remembered_email` trong localStorage → render `QuickReLogin` thay vì `LoginForm`
- Cần xem `QuickReLogin.tsx` có đúng chuẩn autofill không

## Giải pháp đề xuất

### Fix 1: Sửa form HTML chuẩn cho iOS Keychain (LoginForm.tsx)

```tsx
<form 
  id="login-form"
  onSubmit={form.handleSubmit(onSubmit)}
  // BỎ action="#" và method="POST" → để form là pure JS
>
  <input 
    name="email"           // đổi từ "username" → "email"
    type="email"
    autoComplete="email username"  // cả 2 để cover mọi trường hợp
    inputMode="email"
    autoCapitalize="off"
    autoCorrect="off"
    spellCheck={false}
  />
  <input
    name="password"
    type="password"
    autoComplete="current-password"
  />
</form>
```

### Fix 2: Thêm hidden username input vào QuickReLogin
Khi chỉ hiển thị password field, iOS cần một `<input name="email" type="email" autoComplete="username">` (có thể hidden hoặc readonly) để Keychain biết đây là login flow nào.

### Fix 3: Trigger Keychain save bằng cách đúng
- iOS tự động prompt lưu khi: form có `name="password"` + `autoComplete="current-password"` + submit thành công + có navigation
- Bỏ `storeCredential()` call trên iOS (chỉ gọi khi `'PasswordCredential' in window`)
- Đảm bảo form submit đi qua native form submission flow

### Fix 4: Thêm meta tag cho PWA standalone
`index.html` cần:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">
```
(Kiểm tra xem đã có chưa)

### Fix 5: Bump APP_VERSION → 1.0.3
Để CacheBuster wipe SW cũ, đảm bảo user nhận được fix ngay.

## Files sẽ sửa

| File | Thay đổi |
|------|---------|
| `src/components/auth/LoginForm.tsx` | Bỏ `action="#" method="POST"`, đổi `name="username"` → `name="email"`, thêm `inputMode/autoCapitalize/autoCorrect`, chỉ gọi `storeCredential` nếu API tồn tại |
| `src/components/auth/QuickReLogin.tsx` | Thêm hidden email input với `autoComplete="username"` để Keychain biết account context |
| `index.html` | Verify meta tags PWA Apple (nếu thiếu thì thêm) |
| `src/lib/app-version.ts` | Bump `1.0.2` → `1.0.3` |
| `public/changelog.json` | Entry 1.0.3: "Sửa lưu mật khẩu trên iPhone" |

## Ghi chú quan trọng cho user

Sau khi deploy + reload PWA:
- Lần đăng nhập tiếp theo, iOS sẽ hỏi "Save Password to Keychain?" → bấm **Save**
- Lần sau mở app, ô email/password sẽ có gợi ý vàng từ iCloud Keychain → tap để autofill
- Nếu trước đó đã từ chối lưu: vào Settings → Passwords trên iPhone, xóa entry cũ (nếu có) hoặc đăng nhập lại để iOS hỏi lại

Bạn xác nhận triển khai theo kế hoạch trên?
