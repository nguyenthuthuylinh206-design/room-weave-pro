

## Xây dựng Hệ thống Hướng dẫn Sử dụng

### Vấn đề hiện tại
Trang HelpPage hiện chỉ có 6 câu FAQ tĩnh và các link placeholder (#). Không có hướng dẫn chi tiết, không phân theo vai trò, không có contextual help trên các trang.

### Giải pháp: 2 thành phần chính

#### 1. Trang Hướng dẫn theo Module (`/help/guides`)
Thay thế HelpPage hiện tại bằng trang hướng dẫn có cấu trúc:

- **Phân theo vai trò**: 4 tab — Nhân viên phòng, Lễ tân, Quản lý, Chủ khách sạn
- **Mỗi vai trò** liệt kê các bài hướng dẫn step-by-step theo module liên quan:
  - *Nhân viên phòng*: Kiểm tra phòng (checkin/checkout/daily), Gửi giặt, Báo bảo trì, Bổ sung đồ
  - *Lễ tân*: Check-in khách, Check-out & thanh toán, Tạo booking, Xử lý phụ thu, Gia hạn booking
  - *Quản lý*: Quản lý kho (nhập/xuất/kiểm kê), Thiết lập chuẩn phòng, Báo cáo, Phân quyền nhân sự
  - *Chủ KS*: Dashboard tổng quan, Subscription & thanh toán, Thêm khách sạn, Cài đặt hệ thống
- **Mỗi bài** gồm: tiêu đề, các bước đánh số, mô tả ngắn, icon module tương ứng, nút "Đi tới trang" (navigate trực tiếp)
- Mobile responsive — dạng accordion trên mobile

#### 2. Contextual Help Button (nút `?` trên mỗi trang)
- Tạo component `ContextualHelp` — nút `?` floating hoặc inline trong PageHeader
- Khi bấm → mở Sheet/Dialog hiển thị hướng dẫn ngắn cho trang hiện tại
- Mỗi trang define `helpContent` riêng: mô tả chức năng + các bước thường dùng + tips
- Data hướng dẫn lưu trong file JSON/TS, map theo route path
- Ưu tiên các trang staff hay dùng: Phòng, Booking, Giặt là, Kho, Bảo trì

### Cấu trúc file

```text
src/
├── data/
│   └── helpGuides.ts          # Toàn bộ nội dung hướng dẫn (theo role + module)
│   └── contextualHelp.ts      # Nội dung help theo route path
├── components/shared/
│   └── ContextualHelpButton.tsx  # Nút ? + Sheet hiển thị help
├── pages/
│   └── HelpPage.tsx           # Redesign: tabs theo role, danh sách guides
```

### Kế hoạch thực hiện

1. **Tạo `helpGuides.ts`** — data hướng dẫn cho 4 vai trò, ~20 bài guide
2. **Tạo `contextualHelp.ts`** — help content map theo route (~15 trang chính)
3. **Redesign `HelpPage.tsx`** — Tabs theo vai trò, accordion danh sách guide, nút navigate, mobile responsive
4. **Tạo `ContextualHelpButton.tsx`** — Nút `?` mở Sheet với help content, tự detect route hiện tại
5. **Tích hợp ContextualHelpButton** vào `PageHeader` hoặc các trang chính (Phòng, Booking, Kho, Giặt, Bảo trì)

