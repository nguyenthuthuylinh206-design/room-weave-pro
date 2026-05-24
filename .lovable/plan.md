## Mục tiêu
Gộp toàn bộ 16 file checklist QA hiện có ở `/mnt/documents/qa-checklist/` thành **1 file PDF duy nhất** in được trên giấy A4, có phân mục rõ ràng để bạn in ra và tick tay.

## Cách làm

1. Đọc lại 16 file `.md` đang có (00-OVERVIEW → 14-super-admin → 99-regression-smoke).
2. Build 1 file HTML tổng hợp với:
   - **Trang bìa**: Tiêu đề "QA Checklist — Hotel Asset Manager", ngày in, version app
   - **Mục lục** (Table of Contents) có số trang
   - **14 chương** + smoke test, mỗi chương bắt đầu **trang mới** (`page-break-before`)
   - Header chạy trên mỗi trang: tên module hiện tại
   - Footer chạy: số trang `x / total`
   - Checkbox ô vuông in được (☐) ở cột Pass/Fail
   - Font hỗ trợ tiếng Việt đầy đủ (DejaVu Sans hoặc Noto Sans)
   - Khổ A4, lề 15mm, font 10pt cho bảng để vừa cột
3. Convert HTML → PDF bằng **Chromium headless** (cho font Việt chuẩn + page break + header/footer tốt hơn pandoc/wkhtmltopdf).
4. QA: render từng trang ra ảnh, kiểm tra:
   - Không vỡ bảng / cắt chữ
   - Tiếng Việt có dấu đầy đủ
   - Page break đúng đầu mỗi module
   - Checkbox in rõ
5. Output: **1 file duy nhất** `QA-Checklist-Full.pdf` tại `/mnt/documents/qa-checklist/` + trả `<presentation-artifact>` để bạn tải.

## Cấu trúc PDF cuối cùng

```
Trang 1       : Bìa
Trang 2-3     : Mục lục
Trang 4+      : 00. Hướng dẫn & Test Data Seed
              : 01. Auth & Onboarding
              : 02. Phân quyền & Đa hotel
              : 03. Rooms
              : 04. Bookings
              : 05. Check-in / Check-out
              : 06. Housekeeping & Room Check Lean
              : 07. Laundry
              : 08. Inventory
              : 09. Maintenance
              : 10. Payment & VietQR
              : 11. Subscription
              : 12. Reports
              : 13. Notifications & Email
              : 14. Super Admin
              : 99. Smoke Test 15 phút (in riêng để dán tường)
```

## Phần KHÔNG làm trong sprint này
- Không sửa nội dung test case (giữ nguyên file `.md` hiện tại)
- Không thêm test case mới
- Không sinh file Excel/Word
- Không tự seed data

Approve để build.
