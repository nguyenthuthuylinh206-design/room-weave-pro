

## Thêm thông báo chào mừng cho người dùng mới

### Vấn đề
Khi người dùng mới đăng ký, phần thông báo trống rỗng. Cần có 1 thông báo chào mừng để tạo ấn tượng tốt và hướng dẫn sử dụng.

### Giải pháp
Thêm logic tạo thông báo chào mừng vào trigger `handle_new_user` (cho user tự đăng ký) và edge function `create-user` (cho user được admin tạo).

### Thay đổi

| # | Loại | Mô tả |
|---|------|-------|
| 1 | Migration SQL | Cập nhật `handle_new_user()` — thêm INSERT vào `in_app_notifications` sau khi tạo user |
| 2 | Edge Function | Cập nhật `create-user/index.ts` — thêm INSERT thông báo chào mừng sau khi tạo user thành công |

### Chi tiết

**1. Migration — Thêm vào cuối `handle_new_user()`:**
```sql
INSERT INTO public.in_app_notifications (
  user_id, tenant_id, title, body, type, icon, is_read, metadata
) VALUES (
  NEW.id, new_tenant_id,
  'Chào mừng bạn đến với Hotel Asset Manager! 🎉',
  'Cảm ơn bạn đã đăng ký. Hãy bắt đầu bằng cách thiết lập khách sạn, thêm phòng và quản lý tài sản. Chúc bạn trải nghiệm tuyệt vời!',
  'welcome', 'sparkles', false,
  '{"action": "getting_started"}'::jsonb
);
```

**2. Edge function `create-user` — Thêm sau khi tạo profile thành công:**
```typescript
await supabaseAdmin.from('in_app_notifications').insert({
  user_id: authUser.user.id,
  tenant_id: tenantId,
  title: 'Chào mừng bạn đến với hệ thống! 👋',
  body: `Tài khoản của bạn đã được tạo. Vui lòng đổi mật khẩu khi đăng nhập lần đầu.`,
  type: 'welcome',
  icon: 'sparkles',
  is_read: false,
});
```

**3. NotificationCenter — Thêm icon `welcome` vào `typeIcons`:**
```tsx
welcome: <Sparkles className="h-4 w-4 text-primary" />,
```

Kết quả: Mọi user mới (tự đăng ký hoặc được admin tạo) đều nhận được thông báo chào mừng ngay khi vào hệ thống.

