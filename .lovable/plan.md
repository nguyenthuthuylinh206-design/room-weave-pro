

## Kế hoạch: Sửa lỗi Lưu Tài khoản/Mật khẩu trên PWA

---

### PHÂN TÍCH VẤN ĐỀ

#### 1. Nguyên nhân gốc rễ

Trình quản lý mật khẩu của trình duyệt (Password Manager) cần một số điều kiện để nhận diện và lưu thông tin đăng nhập:

| Yêu cầu | Hiện trạng | Vấn đề |
|---------|------------|--------|
| Form có `action` attribute | ❌ Không có | Form dùng `onSubmit` JavaScript, không có `action` |
| Input username/email visible | ⚠️ Một phần | QuickReLogin dùng hidden input với `absolute -left-[9999px]` |
| Form submit event được dispatch | ❌ Không | Form chặn submit bằng `e.preventDefault()` ngầm |
| Input `name` attribute | ⚠️ Một phần | LoginForm không có `name` attribute |
| Proper `id` attributes | ✅ Có | Đã có `id="login-email"`, `id="login-password"` |
| `autocomplete` attributes | ✅ Có | Đã có `autocomplete="username"`, `autocomplete="current-password"` |

#### 2. Vấn đề cụ thể theo file

**LoginForm.tsx (dòng 59-150):**
- Input email/password thiếu `name` attribute (browser cần để nhận diện)
- Form không có `action` attribute (browser dựa vào đây để trigger save prompt)
- Không gọi `PasswordCredential` API sau khi đăng nhập thành công

**QuickReLogin.tsx (dòng 68-79):**
- Hidden email input quá ẩn: `absolute -left-[9999px] w-px h-px opacity-0`
- Một số browser bỏ qua input hoàn toàn không visible
- Thiếu `name` attribute cho password input

---

### GIẢI PHÁP ĐỀ XUẤT

#### Phần 1: Cập nhật LoginForm.tsx - Thêm name attributes và PasswordCredential API

```tsx
// Thay đổi 1: Thêm name cho email input (dòng 70-77)
<Input
  {...field}
  id="login-email"
  name="username"           // ← THÊM
  type="email"
  placeholder="email@example.com"
  className="pl-10"
  autoComplete="username"
/>

// Thay đổi 2: Thêm name cho password input (dòng 95-102)
<Input
  {...field}
  id="login-password"
  name="password"            // ← THÊM
  type={showPassword ? 'text' : 'password'}
  placeholder="••••••••"
  className="pl-10 pr-10"
  autoComplete="current-password"
/>

// Thay đổi 3: Thêm hidden action để browser nhận diện là login form
<form 
  id="login-form" 
  action="#"                // ← THÊM
  method="POST"             // ← THÊM
  onSubmit={form.handleSubmit(onSubmit)} 
  className="space-y-4"
>

// Thay đổi 4: Sử dụng PasswordCredential API sau đăng nhập thành công
const onSubmit = async (data: LoginFormData) => {
  // Save or remove email based on rememberMe checkbox
  if (data.rememberMe) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }

  const { error } = await signIn(data.email, data.password);
  if (!error) {
    // THÊM: Trigger browser password manager save
    if ('PasswordCredential' in window) {
      try {
        const cred = new PasswordCredential({
          id: data.email,
          password: data.password,
          name: data.email,
        });
        await navigator.credentials.store(cred);
      } catch (e) {
        console.log('[Auth] Credential store not supported or failed:', e);
      }
    }
    navigate('/auth/callback');
  }
};
```

#### Phần 2: Cập nhật QuickReLogin.tsx - Cải thiện hidden email input

```tsx
// Thay đổi 1: Dùng visually hidden thay vì position absolute
// Dòng 67-79, thay bằng:
{/* Hidden username for credential manager - visually hidden but accessible */}
<div className="sr-only">
  <input 
    type="email"
    name="username"
    id="quick-login-username"
    autoComplete="username"
    value={email}
    readOnly
    tabIndex={-1}
  />
</div>

// Thay đổi 2: Thêm name attribute cho password
// Dòng 91-99:
<Input
  {...field}
  id="quick-login-password"
  name="password"              // ← THÊM
  type={showPassword ? 'text' : 'password'}
  placeholder="••••••••"
  className="pl-10 pr-10"
  autoComplete="current-password"
  autoFocus
/>

// Thay đổi 3: Thêm action và method cho form
// Dòng 66:
<form 
  id="quick-login-form" 
  action="#"                   // ← THÊM
  method="POST"                // ← THÊM
  onSubmit={form.handleSubmit(onSubmit)} 
  className="space-y-4"
>

// Thay đổi 4: Trigger credential store sau đăng nhập thành công
const onSubmit = async (data: QuickLoginData) => {
  const { error } = await signIn(email, data.password);
  if (!error) {
    // THÊM: Trigger browser password manager save
    if ('PasswordCredential' in window) {
      try {
        const cred = new PasswordCredential({
          id: email,
          password: data.password,
          name: email,
        });
        await navigator.credentials.store(cred);
      } catch (e) {
        console.log('[Auth] Credential store not supported or failed:', e);
      }
    }
    onSuccess();
  }
};
```

#### Phần 3: Tạo utility function cho PasswordCredential

Tạo file mới `src/lib/credential-manager.ts`:

```typescript
/**
 * Store credentials to browser password manager
 * Works on Chrome, Edge, and other Chromium browsers
 * Falls back gracefully on unsupported browsers (Safari, Firefox)
 */
export async function storeCredential(email: string, password: string): Promise<boolean> {
  // Check if PasswordCredential API is available
  if (!('PasswordCredential' in window)) {
    console.log('[Credential] PasswordCredential API not supported');
    return false;
  }

  try {
    const credential = new PasswordCredential({
      id: email,
      password: password,
      name: email,
    });
    
    await navigator.credentials.store(credential);
    console.log('[Credential] Credentials stored successfully');
    return true;
  } catch (error) {
    console.warn('[Credential] Failed to store credentials:', error);
    return false;
  }
}

/**
 * Request stored credentials from browser
 * Returns null if no credentials found or user cancels
 */
export async function getStoredCredential(): Promise<{ email: string; password: string } | null> {
  if (!('credentials' in navigator)) {
    return null;
  }

  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions);

    if (credential && credential.type === 'password') {
      const pwdCred = credential as PasswordCredential;
      return {
        email: pwdCred.id,
        password: pwdCred.password || '',
      };
    }
  } catch (error) {
    console.warn('[Credential] Failed to get credentials:', error);
  }

  return null;
}
```

---

### TỔNG HỢP THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `LoginForm.tsx` | Thêm `name`, `action`, `method` attributes; Gọi PasswordCredential API |
| `QuickReLogin.tsx` | Cải thiện hidden input visibility; Thêm `name`, `action`, `method`; Gọi PasswordCredential API |
| **Mới**: `credential-manager.ts` | Utility functions cho credential management |

---

### GIẢI THÍCH KỸ THUẬT

#### Tại sao cần `name` attribute?

Browser password manager tìm kiếm form fields dựa trên:
1. `name` attribute (ưu tiên cao nhất)
2. `id` attribute 
3. `autocomplete` attribute
4. Label text

Thiếu `name` khiến một số browser không nhận diện được form đăng nhập.

#### Tại sao cần `action` và `method`?

Browser nhận diện đây là form đăng nhập dựa trên:
- `action` attribute (dù là "#" cũng đủ)
- `method="POST"` 
- Cấu trúc form có username + password fields

#### PasswordCredential API

- **Chrome/Edge**: Hỗ trợ đầy đủ, lưu và autofill
- **Safari/iOS**: Không hỗ trợ PasswordCredential, nhưng vẫn hoạt động với form attributes chuẩn
- **Firefox**: Hỗ trợ một phần, fallback về form detection

#### Lưu ý cho iOS Safari

iOS Safari không hỗ trợ PasswordCredential API nhưng vẫn lưu được nếu:
1. Form có `autocomplete="username"` và `autocomplete="current-password"`
2. Input visible (không `display:none` hoặc `visibility:hidden`)
3. Form được submit (dù bằng JavaScript)

Giải pháp dùng `sr-only` (screen reader only) thay vì absolute positioning đảm bảo input vẫn được browser nhận diện.

---

### KẾT QUẢ MONG ĐỢI

| Trình duyệt | Trước | Sau |
|-------------|-------|-----|
| **Chrome/Android** | Không hiện prompt lưu | ✅ Hiện prompt lưu mật khẩu |
| **Safari/iOS** | Không autofill | ✅ Autofill hoạt động |
| **Edge** | Không hiện prompt | ✅ Hiện prompt lưu |
| **Firefox** | Không hiện prompt | ✅ Hiện prompt lưu |
| **PWA Standalone** | Không lưu | ✅ Lưu như browser thường |

