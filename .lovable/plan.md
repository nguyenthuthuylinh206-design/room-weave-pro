

## Nâng cấp email hóa đơn chuyên nghiệp

### Vấn đề hiện tại
- Email hóa đơn gửi đi có template đơn giản, thiếu thông tin khách sạn (tên, địa chỉ, logo, SĐT, MST)
- Template email khác hoàn toàn với template PDF/in ấn (đã có đầy đủ thông tin hotel)
- Không lấy thông tin khách sạn từ database

### Thay đổi

**1. Cập nhật Edge Function `send-invoice-email/index.ts`**
- Truy vấn bảng `hotels` để lấy thông tin khách sạn (name, address, phone, email, logo_url, website) dựa vào `hotel_id` của hóa đơn
- Thiết kế lại HTML email template chuyên nghiệp:
  - Header: Logo khách sạn (nếu có), tên, địa chỉ, SĐT, email, website
  - Thông tin khách hàng: tên, SĐT, địa chỉ, MST, công ty
  - Thông tin phòng & thời gian lưu trú
  - Bảng chi tiết dịch vụ có STT
  - Tổng kết: tạm tính, VAT, phí DV, tổng cộng, đã thanh toán, còn lại
  - Footer: lời cảm ơn, thông tin liên hệ khách sạn
- Cập nhật subject email: `Hóa đơn {số} - {tên khách sạn}`
- Sender name dùng tên khách sạn: `{Tên KS} <notifications@roomqc.com>`

**2. Deploy lại edge function**

### Chi tiết kỹ thuật
- Bảng `hotels` đã có sẵn các trường: `name`, `address`, `phone`, `email`, `logo_url`, `website`
- Bảng `guest_invoices` đã có `hotel_id` để join
- Không cần migration database

| File | Thay đổi |
|------|----------|
| `supabase/functions/send-invoice-email/index.ts` | Query hotel info, redesign email template chuyên nghiệp |

