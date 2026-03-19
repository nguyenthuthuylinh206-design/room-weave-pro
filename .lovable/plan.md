

## Đánh giá giao diện Group Checkout Dialog theo 7 tiêu chí UX

### 1. Tính rõ ràng và trực quan (Clarity & Intuitive) — ⭐⭐⭐ 3/5

**Tốt:**
- Header rõ ràng: "Checkout nhóm - [Tên khách] (N phòng)"
- Badge trạng thái kiểm tra phòng cho mỗi phòng
- Tổng cộng / Còn lại nổi bật với font-bold và màu đỏ/xanh

**Cần cải thiện:**
- **Thiếu card-based layout**: Tất cả nội dung nằm trong 1 ScrollArea dài, không có visual grouping rõ ràng giữa "Danh sách phòng", "Tổng hợp thanh toán", và "Actions". Lễ tân phải cuộn nhiều mới thấy tổng tiền
- **"Subtotal" là thuật ngữ tiếng Anh** — nên đổi thành "Tạm tính"
- **"VAT"** cũng là thuật ngữ chuyên ngành, nên hiển thị "Thuế GTGT (8%)"
- **Phần phụ thu checkout trễ** hiển thị tất cả 4 tiers cùng lúc (trước 12h, 12-15h, 15-18h, sau 18h) → gây nhiễu. Chỉ nên highlight tier đang áp dụng
- **Font quá nhỏ**: Hầu hết dùng `text-xs` (12px) — khó đọc trên màn hình lớn và rất khó trên mobile

### 2. Tính nhất quán (Consistency) — ⭐⭐⭐⭐ 4/5

**Tốt:**
- Sử dụng nhất quán `formatVNCurrency` cho tiền tệ
- Lucide icons đồng bộ (DoorOpen, CreditCard, Check...)
- Component UI từ shadcn/ui thống nhất

**Cần cải thiện:**
- **Không nhất quán với CheckoutSummaryDialog (lẻ)**: Dialog lẻ đã được redesign với card-based layout, nhưng dialog nhóm vẫn dùng layout cũ (flat list) → trải nghiệm khác nhau giữa checkout lẻ và nhóm
- Footer actions không sticky (nằm trong ScrollArea) — khác với single checkout đã có sticky footer

### 3. Phản hồi từ hệ thống (Feedback) — ⭐⭐⭐⭐ 4/5

**Tốt:**
- Loading spinner khi đang xử lý (`isProcessing`, `isCalculating`)
- InspectionStatusCard hiển thị real-time trạng thái kiểm tra phòng
- Toast notifications khi thanh toán thành công
- Nút disabled khi có `hasInvalidAdjustments`

**Cần cải thiện:**
- Không có skeleton/loading state khi đang tính toán chi phí (`isCalculating`) — chỉ disable nút, không cho user biết đang tính

### 4. Điều hướng dễ dàng (Navigation) — ⭐⭐⭐ 3/5

**Tốt:**
- Nút "Hủy", "Thu nhỏ", X rõ ràng
- Collapsible cho từng phòng giúp quản lý complexity
- "Select All" checkbox tiện lợi

**Cần cải thiện:**
- **Footer actions nằm trong scroll** → user phải cuộn xuống cuối mới thấy nút "Thu tiền & Trả phòng". Với nhóm 4+ phòng, đây là vấn đề lớn
- **Không có tóm tắt nhanh** ở đầu: user phải cuộn qua toàn bộ danh sách phòng mới thấy tổng tiền
- Thiếu breadcrumb/step indicator cho quy trình checkout nhóm (nhiều bước: chọn phòng → kiểm tra → thanh toán → xác nhận)

### 5. Phòng ngừa và xử lý lỗi (Error Prevention) — ⭐⭐⭐⭐ 4/5

**Tốt:**
- Nút checkout disabled khi chưa hoàn thành kiểm tra
- Cảnh báo "Khách chưa thanh toán đầy đủ" rõ ràng
- Bắt buộc nhập lý do khi điều chỉnh phụ thu
- Overdue warning hiển thị rõ ràng ở đầu

**Cần cải thiện:**
- **Input phụ thu trễ hiển thị raw number** (không format) — dễ nhầm lần giữa 510000 và 5100000
- Thiếu confirmation dialog trước khi "Cho trả phòng (nợ X)" — thao tác mang tính quyết định cao

### 6. Hiệu quả và Tối giản (Efficiency) — ⭐⭐⭐ 3/5

**Tốt:**
- Batch inspection request cho nhiều phòng cùng lúc
- Auto-select tất cả phòng đang ở khi mở dialog
- Collapsible rooms giảm visual noise

**Cần cải thiện:**
- **Quá nhiều thông tin chi tiết mặc định**: Mỗi phòng khi expand hiển thị late checkout tiers + cost breakdown + damage section + notes → rất dài
- **Phần "Tổng hợp thanh toán" lặp lại thông tin** đã có trong từng phòng
- Thiếu quick-action: không có nút "Checkout tất cả" nhanh khi mọi thứ đã ready
- ~1400 dòng code trong 1 file → khó maintain

### 7. Tính tiếp cận và tương thích (Accessibility) — ⭐⭐ 2/5

**Cần cải thiện nghiêm trọng:**
- **Font size quá nhỏ**: Đại đa số dùng `text-xs` (12px), kể cả số tiền quan trọng
- **Tổng cộng dùng `font-bold` nhưng vẫn text-sm** → không đủ nổi bật cho số tiền quan trọng nhất
- **Còn lại dùng `text-sm font-semibold`** → tương tự, quá nhỏ
- **Nút action footer trên mobile** dùng `flex-col sm:flex-row` nhưng các nút vẫn nhỏ, text dài ("Cho trả phòng (nợ 11.729.500đ)") có thể bị cắt
- **Dialog không có `max-h` rõ ràng** — trên mobile nhỏ có thể tràn ra ngoài viewport
- **Contrast**: Nhiều label dùng `text-muted-foreground` + `text-xs` → rất khó đọc trên nền sáng

---

### Tổng điểm: ⭐⭐⭐ 3.3/5

### Đề xuất cải thiện (ưu tiên cao → thấp)

| # | Cải thiện | Mức ưu tiên |
|---|-----------|-------------|
| 1 | **Sticky footer**: Tách footer actions ra khỏi ScrollArea, luôn hiển thị ở dưới cùng | Cao |
| 2 | **Tổng tiền mini-summary** sticky ở trên footer (TỔNG / CÒN LẠI) để user không cần cuộn | Cao |
| 3 | **Tăng font size**: Tổng cộng → `text-lg font-bold`, Còn lại → `text-base font-bold`, các dòng chi tiết → `text-sm` thay vì `text-xs` | Cao |
| 4 | **Collapse late checkout tiers**: Chỉ hiển thị tier đang áp dụng, cho phép expand xem tất cả | Trung bình |
| 5 | **Đổi thuật ngữ**: "Subtotal" → "Tạm tính", "VAT" → "Thuế GTGT" | Trung bình |
| 6 | **Format input số tiền** với dấu chấm phân cách (510.000 thay vì 510000) | Trung bình |
| 7 | **Card-based grouping** cho phần Tổng hợp thanh toán (border + background nhẹ) | Trung bình |
| 8 | **Thống nhất với single checkout**: Áp dụng card-based layout tương tự CheckoutSummaryDialog | Thấp |
| 9 | **Loading skeleton** khi đang tính chi phí | Thấp |
| 10 | **Tách component**: Chia file 1400 dòng thành sub-components | Thấp |

Bạn muốn tôi triển khai những cải thiện nào?

