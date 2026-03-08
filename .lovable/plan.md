

## Nâng cấp Hướng dẫn Sử dụng — Chi tiết & Chuyên sâu hơn

### Vấn đề
Hiện tại mỗi bước hướng dẫn chỉ có 1 dòng title + 1 dòng description ngắn (~10-15 từ). Người dùng không hiểu được **tại sao** phải làm, **kết quả** ra sao, và **lưu ý gì** khi thao tác.

### Giải pháp

#### 1. Mở rộng data structure `GuideStep`
Thêm các trường mới cho mỗi bước:
- `detailedDescription`: Giải thích chi tiết, dễ hiểu (2-4 câu) — giải thích **tại sao**, **kết quả** sau bước này
- `warnings?`: Cảnh báo quan trọng cần lưu ý (ví dụ: "Không thể hoàn tác sau khi xác nhận")
- `note?`: Ghi chú bổ sung

#### 2. Thêm trường mới cho `HelpGuide`
- `detailedDescription`: Giải thích tổng quan chi tiết cho mỗi module (chức năng dùng để làm gì, ai dùng, khi nào dùng)
- `prerequisites?`: Điều kiện trước khi thực hiện (ví dụ: "Cần có booking trước khi check-in")
- `importantNotes?`: Lưu ý quan trọng chung cho module

#### 3. Cập nhật nội dung ~22 bài guide
Viết lại chi tiết hơn cho tất cả các bài, ví dụ:

**Trước** (hiện tại):
> Bước 3: Kiểm tra từng hạng mục — "Đánh dấu trạng thái các đồ dùng: đủ, thiếu, hỏng, cần thay"

**Sau** (nâng cấp):
> Bước 3: Kiểm tra từng hạng mục
> - Hệ thống hiển thị danh sách đồ dùng theo tiêu chuẩn phòng (khăn tắm, dầu gội, ga giường...). Với mỗi món, bạn chọn trạng thái: **Đủ** (không cần bổ sung), **Thiếu** (cần thêm), **Hỏng** (cần thay), hoặc **Mất** (báo mất). Số lượng thực tế sẽ được so sánh với số chuẩn để tính chênh lệch.
> - ⚠️ Nếu chọn "Mất", số lượng tồn kho sẽ bị trừ ngay và ghi nhận vào báo cáo mất mát.

#### 4. Cập nhật UI `HelpPage.tsx`
- Hiển thị `detailedDescription` dưới title của guide (trước danh sách bước)
- Hiển thị `prerequisites` với icon cảnh báo
- Mỗi bước hiển thị `detailedDescription` bên dưới description ngắn
- Hiển thị `warnings` với màu đỏ/cam nổi bật
- Thêm section "Lưu ý quan trọng" (`importantNotes`) cuối mỗi guide

### File thay đổi
1. **`src/data/helpGuides.ts`** — Mở rộng interface + viết lại nội dung chi tiết cho 22 guides
2. **`src/pages/HelpPage.tsx`** — Cập nhật `GuideCard` để render các trường mới

### Phạm vi nội dung chi tiết
Viết chi tiết cho tất cả 22 bài hướng dẫn thuộc 4 vai trò, bao gồm giải thích:
- Chức năng này **dùng để làm gì**, **ai dùng**, **khi nào dùng**
- Mỗi bước: **thao tác cụ thể** + **giải thích kết quả** + **cảnh báo nếu có**
- Điều kiện trước khi thực hiện
- Lưu ý quan trọng

