
# Báo cáo: Những điểm chưa ổn trong dự án (giải thích dễ hiểu)

Tôi đã đối chiếu bộ tài liệu trong `docs/architecture/` với mã nguồn thật của dự án. Dưới đây là những điểm chưa hợp lý / sai / thiếu, viết lại theo ngôn ngữ thường ngày.

---

## NHÓM A — Tài liệu mô tả sai sự thật (gây hiểu nhầm khi đọc)

### A1. Tài liệu nói "có 2 cửa vào trang quản trị" — thực ra chỉ có 1
**Vấn đề:** Trong `findings.md` ghi là dự án có cả `/admin` và `/super-admin` trùng nhau, cần dẹp bớt.
**Sự thật:** Mở mã nguồn ra kiểm tra thì chỉ có duy nhất `/super-admin`. Đường dẫn `/admin` không tồn tại.
**Vì sao phải sửa:** Nếu đội ngũ đọc tài liệu rồi đi "dọn dẹp" theo, có thể sửa nhầm hoặc tốn công vô ích.
**Cách sửa:** Xóa mục cảnh báo này khỏi tài liệu, ghi chú là "đã ổn".

### A2. Tài liệu cảnh báo "có thể có bảng dữ liệu chưa khóa" — thực ra đã khóa hết
**Vấn đề:** Tài liệu đánh dấu mức độ **đỏ (cực kỳ nguy hiểm)** vì sợ có bảng dữ liệu để hở, ai cũng truy cập được.
**Sự thật:** Kiểm tra database thì cả **111/111 bảng đều đã được khóa** đúng quy tắc.
**Vì sao phải sửa:** Ghi cảnh báo đỏ giả khiến đội ngũ luôn lo lắng và ưu tiên sai việc.
**Cách sửa:** Đổi mục này thành "đã hoàn tất, tiếp theo cần soát lại nội dung quy tắc khóa cho chặt hơn".

### A3. Tài liệu nói "cổng nhận tiền chưa có mật khẩu bảo vệ" — thực ra đã có
**Vấn đề:** Tài liệu nói cổng webhook nhận thông báo chuyển tiền từ ngân hàng SePay đang để trống, ai cũng gửi giả được.
**Sự thật:** Mã nguồn đã có chỗ kiểm tra mật khẩu (`SEPAY_API_KEY`). **Nhưng** vẫn còn 1 lỗ hổng thật ở chỗ khác — xem mục B3 bên dưới.
**Cách sửa:** Cập nhật lại mô tả cho đúng, và tách lỗ hổng thật sang mục riêng.

### A4. Vài chỗ trong tài liệu để dấu "XX" hoặc tên cũ
**Vấn đề:**
- Có chỗ ghi "khoảng XX hàm không có nơi gọi" — quên thay con số thật (con số đúng là **145 hàm**).
- Vẫn còn tên cũ "Hotel Asset Manager" trong khi dự án đã đổi tên nội bộ thành "RoomQc".
**Cách sửa:** Điền số thật và thống nhất tên gọi (hoặc xác nhận giữ tên cũ — vì hướng dẫn của bạn vẫn dùng "Hotel Asset Manager").

---

## NHÓM B — Lỗi thật trong mã nguồn (cần sửa sớm)

### B1. 🔴 Có 2 phiên bản trùng tên của cùng 1 hàm xử lý phòng — máy có thể chọn nhầm
**Vấn đề dễ hiểu:** Hình dung bạn có 2 nhân viên cùng tên "Lan", một người biết nhận đồ giặt, một người không. Khi sếp gọi "Lan ơi nhận đồ giặt", máy có thể gọi nhầm cô không biết → đồ giặt bị bỏ sót, sổ sách lệch.
**Trong dự án:** Hàm `submit_room_check_lean` (lưu kết quả kiểm tra phòng) có **2 bản cùng tên**, một bản có nhận đồ gửi giặt, một bản không.
**Hậu quả:** Khi nhân viên báo "có 3 cái khăn gửi giặt", hệ thống có thể bỏ qua → kho giặt là sai số liệu.
**Cách sửa:** Xóa bản cũ (bản không có phần đồ giặt) khỏi database. Chỉ giữ 1 bản duy nhất.

### B2. 🟠 Nhiều chỗ trong mã đang đổi trạng thái phòng "tự ý" thay vì đi qua cửa chính
**Vấn đề dễ hiểu:** Quy tắc đặt ra là "muốn đổi trạng thái phòng (trống / đang ở / đang dọn / hỏng…) thì phải đi qua cửa chính có bảo vệ ghi sổ". Nhưng có **khoảng 10 chỗ** trong mã đang trèo cửa sổ — đổi trực tiếp.
**Hậu quả:**
- Không có nhật ký ai đổi, đổi lúc nào → khó truy lỗi.
- Bỏ qua các bước kiểm tra (ví dụ: phòng đang có khách mà bị đặt thành "trống").
**Các file đang vi phạm:** `useBulkRoomActions.ts`, `useRooms.ts`, `useBookingActions.ts`, `useCheckoutInspection.ts`, `useTaskQc.ts`, `useRoomChecks.ts`, `BookingsPage.tsx`.
**Cách sửa:** Chuyển tất cả 10 chỗ này sang gọi hàm chuẩn `useRoomTransition` (đã có sẵn). Đồng thời chặn cứng trong hàm cập nhật phòng — nếu ai cố tình truyền trạng thái thì bỏ qua.

### B3. 🟠 Cổng nhận tiền vẫn cho chạy khi chưa cài mật khẩu
**Vấn đề dễ hiểu:** Có ổ khóa cửa nhưng nếu bạn quên cài mật khẩu, **cửa vẫn mở toang** chứ không khóa lại. Mã chỉ ghi log "cảnh báo: chưa cài mật khẩu" rồi vẫn cho qua.
**Hậu quả:** Nếu lúc đưa lên sản phẩm thật mà quên cài mật khẩu, kẻ xấu có thể giả lập chuyển khoản → cộng tiền giả vào tài khoản khách sạn.
**Cách sửa:** Đổi logic: **bắt buộc** phải có mật khẩu, nếu thiếu thì từ chối thẳng (trả về lỗi 401), không cho chạy.

### B4. 🟠 Có file cũ bỏ quên trong dự án
**Vấn đề:** File `src/components/Layout.tsx` là phiên bản cũ, không còn nơi nào dùng (đã thay bằng `MainLayout.tsx`). Nhưng vẫn nằm trong dự án.
**Hậu quả:** Nhân viên mới có thể copy nhầm, gây lệch giao diện.
**Cách sửa:** Xóa file đó.

### B5. 🟠 Có 2 trang "Khác" (More) cho di động và máy tính, không rõ vai trò
**Vấn đề:** Có cả `pages/MorePage.tsx` và `pages/mobile/MorePage.tsx`, dễ sửa 1 chỗ quên 1 chỗ → menu mobile và menu desktop hiển thị khác nhau.
**Cách sửa:** Hợp nhất thành 1 file (tự nhận biết mobile/desktop), hoặc đặt tên rõ ràng `MorePageDesktop` / `MorePageMobile`.

### B6. 🟡 Hàm cập nhật phòng "ăn" mọi dữ liệu, không lọc
**Vấn đề:** Hàm `updateRoom` trong `useRooms.ts` nhận tất cả dữ liệu được truyền vào. Nếu lập trình viên (hoặc kẻ tấn công) truyền thêm `status` thì sẽ lách qua quy tắc B2.
**Cách sửa:** Chỉ cho phép cập nhật những trường đã liệt kê sẵn (số phòng, loại phòng, giá…), tự động loại bỏ `status`.

### B7. 🟡 Cổng nhận tiền chưa giới hạn theo địa chỉ IP
**Vấn đề:** Cổng webhook đang mở cho cả thế giới gọi vào, miễn là biết mật khẩu. Nếu mật khẩu rò rỉ, ai cũng tấn công được.
**Cách sửa:** Chỉ cho phép địa chỉ IP của ngân hàng SePay gọi vào (danh sách trắng). Đồng thời giới hạn số lần gọi mỗi phút.

---

## NHÓM C — Những thứ tài liệu nói có nhưng thực tế chưa có

### C1. Bộ kiểm tra tự động chưa đủ
**Vấn đề dễ hiểu:** Hệ thống có 284 "công cụ" trong database, nhưng bộ kiểm tra tự động (snapshot test) hiện chỉ canh chừng 13 cái. 271 cái còn lại nếu thay đổi sai cũng không ai báo.
**Cách sửa:** Mở rộng bộ kiểm tra ra toàn bộ 284 cái — tự động phát hiện khi có thêm bản trùng (như B1) hoặc đổi tham số.

### C2. Chưa có "máy tự kiểm tra trước khi lên sản phẩm"
**Vấn đề:** Có file kiểm tra (test) nhưng chưa có **CI** — tức là chưa có cơ chế tự động chạy kiểm tra trước mỗi lần xuất bản. Lập trình viên có thể quên chạy.
**Cách sửa:** Thêm 1 file cấu hình GitHub Action để mỗi lần đẩy code lên là tự chạy test, lỗi thì chặn không cho xuất bản.

### C3. Chưa có "luật cứng" cấm phạm 2 lỗi phổ biến
**Vấn đề:** Trong tài liệu có 2 quy tắc bắt buộc:
- Mọi truy vấn dữ liệu phải lọc theo `tenant_id` (để khách sạn A không thấy dữ liệu khách sạn B).
- Mọi đổi trạng thái phòng phải đi qua hàm chuẩn (xem B2).

Nhưng đây mới chỉ là "lời dặn miệng", không có cảnh báo tự động. Lập trình viên quên là code vẫn chạy bình thường.
**Cách sửa:** Cài thêm "cảnh sát tự động" (ESLint custom rule) — viết sai là gạch đỏ ngay trong lúc gõ code.

### C4. Tài liệu thiếu nhiều phần quan trọng
- Thiếu **sơ đồ** cho phần thanh toán, gói dịch vụ, người dùng, khách sạn.
- Thiếu mô tả **luồng** cho: bảo trì, đồ thất lạc, gắn khách theo số điện thoại, duyệt đơn xuất kho.
- Thiếu **kế hoạch quay lui** (rollback) khi nâng cấp database hỏng.
- Thiếu **bảng quyền chi tiết** của từng vai trò (chỉ có sườn).

**Cách sửa:** Bổ sung các tài liệu còn thiếu, ưu tiên sơ đồ thanh toán và bảng quyền.

---

## Thứ tự sửa đề xuất

**Tuần 1 — Việc nguy hiểm, làm nhanh được:**
1. (B3) Bắt buộc cổng nhận tiền có mật khẩu, không thì khóa lại.
2. (B1) Xóa bản trùng của hàm `submit_room_check_lean` trong database.
3. (B6) Lọc trường được phép cập nhật trong `updateRoom`.
4. (B4) Xóa file `Layout.tsx` cũ.
5. (A1, A2, A3, A4) Cập nhật lại tài liệu cho đúng sự thật.

**Tuần 2 — Việc cần thời gian:**
6. (B2) Chuyển 10 chỗ đổi trạng thái phòng sang dùng hàm chuẩn.
7. (C2) Thêm CI tự động kiểm tra trước khi xuất bản.
8. (C3) Cài "cảnh sát tự động" cho 2 luật quan trọng.
9. (C1) Mở rộng bộ kiểm tra tự động sang toàn bộ 284 hàm.
10. (B7) Giới hạn IP cho cổng nhận tiền.

**Để dành sau (chưa gấp):** B5, C4, các mục dọn dẹp tài liệu còn lại.

---

## Tóm tắt cho bạn quyết

Có **3 điểm thật sự nguy hiểm** cần ưu tiên ngay:
- **B1** — Hàm trùng tên có thể làm sai sổ kho giặt là.
- **B2** — Đổi trạng thái phòng "lậu" làm mất nhật ký, có thể gây xung đột với khách đang ở.
- **B3** — Cổng nhận tiền có thể bị giả lập nếu quên cài mật khẩu.

Còn lại đa phần là **dọn dẹp tài liệu** (Nhóm A) và **bổ sung lưới an toàn** (Nhóm C) để tránh lỗi tương tự trong tương lai.

Nếu bạn duyệt kế hoạch này, tôi sẽ làm theo đúng thứ tự Tuần 1 → Tuần 2 ở trên.
