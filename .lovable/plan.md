
## Mục tiêu
Khi nhân viên chạm vào thông báo trên điện thoại, trang **/payment-qr/:paymentId** phải mở ra ngay và hiển thị QR **không cần đăng nhập**, không còn rơi vào “404 Không tìm thấy trang”.

---

## Nhận định nguyên nhân (dựa trên code hiện tại)
Trong `src/App.tsx` route `/payment-qr/:paymentId` đã tồn tại và đã public, nên “404” khi mở từ thông báo thường đến từ 1 trong 2 nguyên nhân sau:

1) **Thông báo đang mở nhầm domain/môi trường (Live vs Preview)**
- Điện thoại có thể đang nhận push từ **domain đã subscribe trước đó** (thường là site đã Publish).
- Nếu bạn vừa sửa route ở môi trường Preview/Test nhưng **chưa Publish/Update lên Live**, thì khi điện thoại mở link trên Live sẽ gặp 404 (do code Live chưa có route public hoặc chưa có route đó).

2) **Service Worker mở URL dạng relative (`/payment-qr/...`) trên iOS/Safari có thể resolve sai**
- Hiện tại payload push và service worker đều dùng `data.url` kiểu `"/payment-qr/..."` (relative).
- Trên một số trình duyệt mobile (đặc biệt iOS web push), `clients.openWindow()` / `WindowClient.navigate()` với URL relative có thể dẫn tới mở sai đường dẫn → 404.
- Fix bền vững: luôn chuyển sang **absolute URL** trước khi openWindow/navigate.

---

## Cách sửa (đảm bảo bền vững trên mobile)
### A) Luôn gửi URL dạng absolute trong payload push (đúng domain hiện tại)
**File:** `src/components/bookings/BookingPaymentDialog.tsx`

- Khi bấm “Gửi QR sang điện thoại”, thay vì gửi:
  - `action_url: "/payment-qr/:id"`
  - `data.url: "/payment-qr/:id"`
- Sẽ tạo:
  - `const path = \`/payment-qr/${createdPayment.id}\``
  - `const absoluteUrl = new URL(path, window.location.origin).toString()`
- Và gửi:
  - `action_url: absoluteUrl`
  - `data.url: absoluteUrl`

Lợi ích:
- Nếu bạn đang thao tác ở Preview → link mở Preview (đúng DB Test).
- Nếu bạn thao tác ở Live → link mở Live (đúng DB Live).
- Tránh 404 do mở nhầm môi trường.

---

### B) Service Worker: luôn normalize URL sang absolute trước khi mở (fix iOS)
**File:** `src/sw.ts`

Trong `notificationclick`:
- Lấy `rawUrl = event.notification.data?.url || '/'`
- Tạo `resolvedUrl = new URL(rawUrl, self.location.origin).toString()`
- Dùng `resolvedUrl` cho:
  - `(client as WindowClient).navigate(resolvedUrl)`
  - `self.clients.openWindow(resolvedUrl)`

Lợi ích:
- Dù payload gửi relative hay absolute, SW vẫn mở đúng.
- Giảm rủi ro khác nhau giữa Android Chrome / iOS Safari.

---

### C) Đảm bảo Live đã nhận code mới (nếu điện thoại đang mở site Live)
Vì frontend thay đổi route chỉ có hiệu lực khi Publish:
- Thực hiện **Publish → Update** để đưa thay đổi route public + SW lên môi trường Live.
- Trên điện thoại, cần **refresh** để SW cập nhật:
  - Mở app/site → kéo refresh 1–2 lần
  - Nếu vẫn dính SW cũ: xóa cache site (Safari/Chrome) hoặc gỡ “Add to Home Screen” rồi thêm lại (trong trường hợp đã cài kiểu PWA)

---

## Kế hoạch triển khai (thứ tự tối ưu)
1) **Sửa `BookingPaymentDialog.tsx`**: gửi `action_url` & `data.url` là absolute URL theo `window.location.origin`.
2) **Sửa `src/sw.ts`**: normalize URL sang absolute trước `navigate/openWindow`.
3) **Publish/Update** (nếu bạn đang test bằng site đã publish trên điện thoại).
4) **Test end-to-end theo checklist** (bên dưới).

---

## Checklist test (để xác nhận “đã được”)
1) Trên desktop (đang đăng xuất hoặc Incognito):
   - Mở trực tiếp: `https://<domain>/payment-qr/<paymentId>`  
   - Kỳ vọng: vào được màn QR (không bị đá login, không NotFound)

2) Tạo payment mới → bấm “Gửi QR sang điện thoại”
3) Trên điện thoại:
   - Chạm thông báo
   - Kỳ vọng: mở đúng domain và đúng đường dẫn `/payment-qr/<id>` và hiện QR ngay
   - Nếu vẫn 404: ghi lại “URL đang mở là domain nào” (Live hay Preview) để chốt đúng nguyên nhân môi trường

---

## (Khuyến nghị bảo mật – làm sau khi hết 404)
Hiện migration đang tạo policy `USING (true)` cho `booking_payments` (public read toàn bảng) → có rủi ro bị đọc danh sách payment.
Sau khi fix 404 ổn định, nên chuyển sang:
- Một backend function “public get payment qr” trả về đúng vài field cần hiển thị, thay vì mở public SELECT cả bảng,
- Và gỡ policy public read.

(Phần này không bắt buộc để hết 404 ngay, nhưng rất nên làm để tránh lộ dữ liệu.)

---

## Rủi ro & phương án dự phòng
- Nếu vẫn 404 sau A+B+C, khả năng cao là **điện thoại đang mở một domain khác** (ví dụ domain custom / domain cũ / Live chưa update). Khi đó sẽ bổ sung log trong SW để in ra `resolvedUrl` và confirm chính xác URL được mở.
