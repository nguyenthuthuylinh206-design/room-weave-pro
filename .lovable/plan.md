

## Kế hoạch: Cho phép xem QR thanh toán không cần đăng nhập

### I. VẤN ĐỀ

Route `/payment-qr/:paymentId` đang được bọc trong `AuthGuard`:
```typescript
// src/App.tsx (line 144-152)
{
  path: "/payment-qr/:paymentId",
  element: (
    <AuthGuard>  // ← Yêu cầu đăng nhập
      <PaymentQRPage />
    </AuthGuard>
  ),
}
```

Khi nhân viên nhấn vào thông báo trên điện thoại, nếu chưa đăng nhập → bị redirect → hiển thị lỗi 404.

---

### II. GIẢI PHÁP

Bỏ `AuthGuard` để trang QR có thể truy cập công khai (public route).

---

### III. CHI TIẾT THAY ĐỔI

#### File: `src/App.tsx`

**Thay đổi:**
```typescript
// Cũ:
{
  path: "/payment-qr/:paymentId",
  element: (
    <AuthGuard>
      <PaymentQRPage />
    </AuthGuard>
  ),
}

// Mới:
{
  path: "/payment-qr/:paymentId",
  element: <PaymentQRPage />,  // Public route - không cần đăng nhập
}
```

---

### IV. BẢO MẬT

**Trang này an toàn khi public vì:**
- Chỉ hiển thị thông tin thanh toán cơ bản (số tiền, tên khách, số phòng)
- Payment ID là UUID ngẫu nhiên, khó đoán
- Không có action nhạy cảm (chỉ xem, không thể chỉnh sửa)
- Thông tin ngân hàng là của khách sạn (công khai cho khách thanh toán)

---

### V. KẾT QUẢ SAU KHI SỬA

```text
Nhân viên nhận notification
         │
         ▼
   Click thông báo
         │
         ▼
   Mở /payment-qr/{id}
         │
         ▼
   ┌─────────────────────┐
   │ PaymentQRPage       │
   │ • Hiển thị ngay     │
   │ • Không cần login   │
   │ • QR sẵn sàng       │
   └─────────────────────┘
         │
         ▼
   Đưa cho khách quét
```

