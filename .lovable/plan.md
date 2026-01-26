
## Kế hoạch: Cải thiện PWA lưu tài khoản/mật khẩu tự động

### I. NGUYÊN NHÂN VẤN ĐỀ

Sau khi phân tích code, tôi phát hiện các vấn đề khiến trình duyệt/PWA không lưu mật khẩu:

| Vấn đề | File | Hiện tại | Cần sửa |
|--------|------|----------|---------|
| Form thiếu `id` | `LoginForm.tsx` | `<form onSubmit={...}>` | `<form id="login-form" ...>` |
| Email autocomplete sai | `LoginForm.tsx` | `autoComplete="email"` | `autoComplete="username"` |
| Input thiếu `id` rõ ràng | `LoginForm.tsx` | Không có | `id="login-email"`, `id="login-password"` |
| QuickReLogin cũng thiếu | `QuickReLogin.tsx` | Tương tự | Cần cập nhật giống LoginForm |

**Lý do kỹ thuật:**
- Browser credential manager yêu cầu `autocomplete="username"` để nhận diện đây là form đăng nhập
- PWA cần form có `id` rõ ràng để browser lưu credentials chính xác
- Chrome/Safari yêu cầu `id` attribute trên input fields để gợi ý mật khẩu đã lưu

---

### II. CÁC THAY ĐỔI CẦN THỰC HIỆN

#### 1. LoginForm.tsx

```tsx
// TRƯỚC
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  <Input
    {...field}
    type="email"
    autoComplete="email"
  />
  <Input
    {...field}
    type={showPassword ? 'text' : 'password'}
    autoComplete="current-password"
  />

// SAU
<form 
  id="login-form"
  onSubmit={form.handleSubmit(onSubmit)} 
  className="space-y-4"
>
  <Input
    {...field}
    id="login-email"
    type="email"
    autoComplete="username"  // Thay đổi để browser nhận diện là login form
  />
  <Input
    {...field}
    id="login-password"
    type={showPassword ? 'text' : 'password'}
    autoComplete="current-password"
  />
```

#### 2. QuickReLogin.tsx

```tsx
// TRƯỚC
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  <Input
    {...field}
    autoComplete="current-password"
  />

// SAU
<form 
  id="quick-login-form"
  onSubmit={form.handleSubmit(onSubmit)} 
  className="space-y-4"
>
  {/* Thêm hidden input cho email để browser liên kết credentials */}
  <input 
    type="hidden" 
    name="username" 
    autoComplete="username" 
    value={email} 
  />
  <Input
    {...field}
    id="quick-login-password"
    autoComplete="current-password"
  />
```

---

### III. GIẢI THÍCH KỸ THUẬT

#### Tại sao `autocomplete="username"` thay vì `email`?

Theo [HTML Living Standard](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute), trình duyệt sử dụng các cặp:
- `username` + `current-password` = Form đăng nhập → Lưu credentials
- `email` + `current-password` = Có thể nhầm lẫn với form liên hệ

#### Tại sao cần hidden input trong QuickReLogin?

Vì QuickReLogin chỉ hiển thị password field, browser không biết email đi kèm. Hidden input với `autoComplete="username"` giúp browser:
1. Hiểu đây là form đăng nhập
2. Liên kết đúng password với email
3. Cập nhật credentials nếu mật khẩu thay đổi

---

### IV. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/auth/LoginForm.tsx` | Thêm `id` cho form và inputs, đổi `autoComplete="email"` → `"username"` |
| `src/components/auth/QuickReLogin.tsx` | Thêm `id` cho form, thêm hidden username input |

---

### V. KIỂM TRA SAU TRIỂN KHAI

1. Mở PWA trên Chrome/Safari mobile
2. Đăng nhập với tài khoản mới
3. Sau khi đăng nhập thành công, browser sẽ hỏi "Lưu mật khẩu?"
4. Đăng xuất và mở lại → Browser tự động gợi ý credentials đã lưu

---

### VI. LƯU Ý BỔ SUNG

- **PWA Standalone Mode**: Browser credential manager hoạt động trong PWA mode, nhưng UI có thể khác một chút so với browser thường
- **iOS Safari**: Yêu cầu user cho phép AutoFill trong Settings → Passwords
- **Android Chrome**: Tự động lưu nếu user đã bật "Save passwords" trong Settings

---

### VII. THỨ TỰ TRIỂN KHAI

1. **Phase 1**: Cập nhật `LoginForm.tsx` với các attributes chuẩn
2. **Phase 2**: Cập nhật `QuickReLogin.tsx` với hidden username input
3. **Phase 3**: Test trên PWA (Chrome, Safari mobile)
