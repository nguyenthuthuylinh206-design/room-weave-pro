# Refactor menu Cài đặt (Sidebar)

## Mục tiêu
Sửa các lỗi UX phát hiện qua đánh giá: header nhóm bị lặp, quá tải 17 mục, trùng lặp ngữ nghĩa, mục lạc chỗ, tên kỹ thuật khó hiểu.

## Phạm vi
Chỉ frontend: `src/components/layout/Sidebar.tsx` (mảng `children` của item `settings`, lines 197–220) và file dịch `src/i18n/locales/vi/navigation.json` (+ `en/navigation.json`). **Không** thay route, không đổi nội dung trang.

## A. Cấu trúc mới (5 nhóm, sắp xếp liền mạch)

```
CÀI ĐẶT
├─ Tài khoản
│   ├─ Hồ sơ cá nhân            /settings/profile          (chuyển từ avatar menu)
│   ├─ Đổi mật khẩu             /settings/change-password
│   └─ Người dùng & Phân quyền  /settings/users
│
├─ Khách sạn
│   ├─ Thông tin khách sạn      /settings/hotels            (đổi tên từ "Khách sạn")
│   ├─ Chính sách khách sạn     /settings/hotel-policy
│   └─ Cấu hình nghiệp vụ       /settings/business
│
├─ Bảng giá & Phụ thu
│   ├─ Bảng giá phòng           /settings/pricing           (đổi từ "Bảng giá 4 trục")
│   ├─ Mùa giá                  /settings/pricing/seasonal  (đổi từ "Quy tắc mùa giá")
│   └─ Phụ thu & Thuế phí       /settings/pricing-rules
│
├─ Vận hành
│   ├─ Kiểm tra phòng           /settings/room-check
│   ├─ Tự động hóa              /settings/workflows
│   └─ Khai báo lưu trú (BCA)   /settings/legal/stay-registration  (gộp BCA + giải thích)
│
├─ Thanh toán & Gói
│   ├─ Đăng ký & Thanh toán     /settings/subscription
│   └─ Mức sử dụng              /settings/usage
│
└─ Hệ thống
    ├─ Cài đặt chung            /settings/general
    ├─ Thông báo                /settings/notifications
    ├─ Telegram                 /settings/telegram
    ├─ Cài đặt AI               /settings/ai
    └─ Nhật ký thay đổi         /settings/audit-log
```

## B. Thay đổi cụ thể

### 1. Sắp xếp lại array (fix bug header lặp)
Trong `Sidebar.tsx`, mảng `children` của `settings`: viết lại theo đúng thứ tự nhóm ở trên. Sau khi sửa, mỗi label nhóm chỉ xuất hiện 1 lần (logic `lastGroup` hiện tại sẽ tự đúng).

### 2. Dời mục lạc chỗ
- `assetGroupMigration` ("Phân loại tài sản") → **xoá khỏi Cài đặt**, chuyển vào nhánh `inventory` (đã có module Kho). Giữ route cũ để không vỡ link.

### 3. Đổi tên (i18n `vi/navigation.json`)
| Cũ | Mới |
|---|---|
| Bảng giá 4 trục | Bảng giá phòng |
| Quy tắc mùa giá | Mùa giá |
| Cấu hình khai báo BCA | Khai báo lưu trú (BCA) |
| Khách sạn (trong Cài đặt) | Thông tin khách sạn |
| Cấu hình khách sạn | Chính sách khách sạn |

### 4. Đổi tên nhóm
- "Thông báo" (group) → gộp vào nhóm **Hệ thống** (chỉ có 2 mục, không đáng tách).
- "Pháp lý" (group) → gộp vào **Vận hành**.
- "Tài khoản" / "Thanh toán" giữ nguyên.

### 5. Tinh chỉnh thị giác (tuỳ chọn)
Trong block render group label (line 504–509), tăng tương phản nhóm đầu vs nhóm tiếp theo: thêm `mt-2 border-t border-border/40 pt-3` cho nhóm thứ 2 trở đi để mắt nhảy nhóm dễ hơn.

## C. Không ảnh hưởng
- Không sửa route, không sửa page component.
- Không sửa permission/`minMode` của từng item (giữ nguyên).
- Không đụng DB / RPC / edge function.

## D. QA checklist
- [ ] Mỗi label nhóm xuất hiện đúng 1 lần khi mở Cài đặt.
- [ ] Số mục con ≤ 5 trong mỗi nhóm.
- [ ] Click từng mục → vẫn đến đúng trang cũ.
- [ ] "Phân loại tài sản" xuất hiện trong menu Kho, không còn trong Cài đặt.
- [ ] Role Staff/Manager: các mục `minMode` vẫn được ẩn đúng.
- [ ] Mobile: bottom nav không bị ảnh hưởng (Settings không nằm trong bottom 5).

## E. Rollback
Revert 2 file: `Sidebar.tsx` + `navigation.json` (vi/en). Không có migration.

## F. File sẽ sửa
- `src/components/layout/Sidebar.tsx` (mảng children settings + thêm `assetGroupMigration` vào inventory)
- `src/i18n/locales/vi/navigation.json`
- `src/i18n/locales/en/navigation.json`
- `src/lib/app-version.ts` (bump)
- `public/changelog.json` (entry mới)
