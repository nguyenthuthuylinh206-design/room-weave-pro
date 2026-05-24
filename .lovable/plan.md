# Kế hoạch: Tài liệu hướng dẫn sử dụng cho người mới (PDF)

## Mục tiêu

Tạo file PDF tiếng Việt hướng dẫn người dùng mới (chủ khách sạn / quản lý / lễ tân / buồng phòng) thiết lập và sử dụng Hotel Asset Manager từ A→Z, kèm screenshot thật từ preview app.

## Cách thực hiện

1. **Đăng nhập preview bằng tài khoản test** (dùng tài khoản đã tạo ở QA Full trước, hoặc tạo mới nếu cần) và điều hướng qua các flow chính bằng `browser--navigate_to_sandbox` + `browser--screenshot`.
2. **Chụp ~25–35 ảnh** ở 2 viewport: desktop (1366×768) cho phần thiết lập, mobile (390×844) cho phần vận hành hiện trường.
3. **Viết nội dung Markdown** tiếng Việt → render sang PDF (pandoc + chromium headless, font Việt) lưu vào `/mnt/documents/user-guide/`.
4. **QA**: convert từng trang PDF sang ảnh, kiểm tra layout/clipping/font Việt trước khi giao.

## Cấu trúc tài liệu (dự kiến ~30–40 trang)

**Phần 1 – Bắt đầu (cho Owner)**

- 1.1 Đăng ký tài khoản & xác minh email
- 1.2 Đăng nhập lần đầu, chọn gói, thanh toán VietQR
- 1.3 Onboarding: tạo khách sạn, cấu hình cơ bản

**Phần 2 – Thiết lập hệ thống (Owner / Manager)**

- 2.1 Quản lý khách sạn & nhân sự (mời Manager/Staff, phân quyền)
- 2.2 Thiết lập phòng & loại phòng, giá phòng
- 2.3 Thiết lập kho: kho, nhà cung cấp, vật tư, minibar
- 2.4 Thiết lập dịch vụ phụ, VietQR, email domain
- 2.5 Cấu hình Room Check (Lean / Full, hạng mục kiểm tra)

**Phần 3 – Vận hành Lễ tân (mobile)**

- 3.1 Nhận đặt phòng (walk-in / theo lịch / nhóm)
- 3.2 Check-in: quét CCCD, OCR, ký số
- 3.3 Trong lưu trú: đổi phòng, thêm dịch vụ, minibar
- 3.4 Check-out: thanh toán, in hóa đơn, gửi email

**Phần 4 – Vận hành Buồng phòng (mobile)**

- 4.1 Danh sách việc cần làm
- 4.2 Room Check Lean: Quick Path "Phòng OK", báo sự cố
- 4.3 Giặt ủi: tạo batch, nhận về kho
- 4.4 Bảo trì & Lost & Found

**Phần 5 – Quản lý & Báo cáo**

- 5.1 Dashboard chủ khách sạn
- 5.2 Báo cáo doanh thu, công suất, hiệu suất nhân viên
- 5.3 QC Dashboard, audit log
- 5.4 Gia hạn gói, thêm phòng

**Phần 6 – Phụ lục**

- Bảng phím tắt / mẹo dùng PWA (cài lên màn hình chính iOS/Android)
- Xử lý sự cố thường gặp (SePay không nhận, OCR sai, offline)
- Liên hệ hỗ trợ

## Output

- `/mnt/documents/user-guide/Huong-Dan-Su-Dung_v1.pdf` (file chính, A4, có mục lục, header/footer, số trang)
- `/mnt/documents/user-guide/screenshots/` (ảnh nguồn, để có thể chỉnh sửa lại sau)
- `/mnt/documents/user-guide/Huong-Dan-Su-Dung_v1.md` (nguồn Markdown để bạn chỉnh tay sau)

## Câu hỏi cần xác nhận trước khi làm

1. **Đối tượng đọc**: chỉ làm 1 file tổng hợp cho mọi vai trò, hay tách 4 file riêng (Owner / Manager / Lễ tân / Buồng phòng)? → Mặc định: **1 file tổng hợp có đánh dấu vai trò ở đầu mỗi phần**.
2. **Tài khoản chụp ảnh**: dùng tài khoản test đã có (dữ liệu trống), hay bạn muốn tôi tự seed vài phòng/booking mẫu để screenshot trông đầy đặn hơn? → Mặc định: **seed dữ liệu mẫu tối thiểu** để ảnh không trống.
3. **Branding**:  RoomQC trên bìa

Nếu bạn không trả lời, tôi sẽ chạy theo mặc định ở trên.