
## Kế hoạch: Sửa lỗi QR Payment mở qua Auth Bridge

### I. VẤN ĐỀ XÁC ĐỊNH

Khi click thông báo push notification trên điện thoại, URL được mở là:
```
lovable.dev/auth-bridge?project_id=...&return_url=.../payment-qr/...
```

Auth Bridge là hệ thống xác thực của Lovable cho Preview domain. Trang QR payment cần public (không cần login) nhưng Auth Bridge đang chặn → trắng trang.

**Nguyên nhân:** URL được gửi trong notification là Preview domain (`894427c4-...lovableproject.com`). Khi điện thoại mở URL này trong Safari mà chưa có session auth, nó bị redirect qua Auth Bridge.

---

### II. GIẢI PHÁP

**Có 2 phương án:**

**Phương án A (Khuyến nghị): Publish app và sử dụng Production domain**
- Khi gửi notification từ Live domain (`room-weave-pro.lovable.app`), URL sẽ là live domain
- Live domain không có Auth Bridge → trang QR mở trực tiếp
- Đây là giải pháp đúng cho production

**Phương án B: Bypass Auth Bridge cho Preview (không khuyến nghị cho production)**
- Đây là hạn chế của Lovable Preview environment
- Preview luôn yêu cầu auth qua Auth Bridge
- Không có cách bypass Auth Bridge ở phía code

---

### III. HÀNH ĐỘNG CẦN THỰC HIỆN

**1. Publish app lên Live domain**
- Click **Publish** → **Update** trong Lovable
- Đảm bảo tất cả code mới (route public, RLS policies) được deploy

**2. Trên điện thoại:**
- Mở app/website từ **Live domain**: `room-weave-pro.lovable.app`
- KHÔNG dùng Preview domain để test tính năng public QR
- Đăng nhập và đăng ký push notification **trên Live domain**

**3. Test lại:**
- Tạo thanh toán mới
- Gửi QR sang điện thoại
- Click thông báo → phải mở `room-weave-pro.lovable.app/payment-qr/...` thay vì Preview domain

---

### IV. TẠI SAO PHẢI LÀM VẬY?

```text
Preview domain (đang bị lỗi):
894427c4-...lovableproject.com/payment-qr/...
        ↓
   Auth Bridge (chặn)
        ↓
   Trắng trang ❌

Live domain (giải pháp):
room-weave-pro.lovable.app/payment-qr/...
        ↓
   Mở trực tiếp (public route)
        ↓
   Hiển thị QR ✅
```

---

### V. TÓM TẮT

| Bước | Hành động |
|------|-----------|
| 1 | Publish/Update app lên Live |
| 2 | Mở `room-weave-pro.lovable.app` trên điện thoại |
| 3 | Đăng nhập và bật thông báo push **trên Live** |
| 4 | Test tạo payment + gửi QR |
| 5 | Click notification → mở QR không cần login |

**Lưu ý:** Push subscription gắn với domain. Nếu bạn đã subscribe trên Preview, cần subscribe lại trên Live domain để notification mở đúng domain.

