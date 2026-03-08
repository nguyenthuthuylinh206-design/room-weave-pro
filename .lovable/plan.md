

## Thêm Banner cảnh báo "Sắp hết hạn" kiểu Lovable

### Vấn đề hiện tại
Hệ thống chỉ hiển thị banner **sau khi** hết hạn (grace period / suspended). Không có cảnh báo **trước khi** hết hạn để nhắc nhở người dùng gia hạn sớm — giống như banner "Your plan is expiring soon" của Lovable.

### Giải pháp

#### 1. Mở rộng `useGracePeriod` hook
Thêm trạng thái mới:
- `isExpiringSoon`: true khi còn ≤7 ngày trước `subscription_end_date` (chưa hết hạn)
- `daysUntilExpiry`: số ngày còn lại trước khi hết hạn

#### 2. Nâng cấp `GracePeriodBanner`
Thêm một trạng thái banner mới hiển thị **trước** khi hết hạn:
- Nền gradient nhẹ (blue/indigo) — khác với amber (grace) và red (suspended)
- Nội dung: "Gói đăng ký sẽ hết hạn sau **X ngày**. Gia hạn ngay để không bị gián đoạn dịch vụ."
- Nút "Gia hạn ngay" → navigate `/settings/subscription`
- Nút dismiss (X) — có thể tắt, lưu vào `sessionStorage` để không hiện lại trong phiên đó
- Hiển thị cho cả owner lẫn manager (không chỉ owner)

#### 3. Thứ tự ưu tiên hiển thị
```text
suspended (red)  >  grace period (amber)  >  expiring soon (blue)
```
Chỉ hiển thị 1 banner tại 1 thời điểm.

### File thay đổi
1. **`src/hooks/useGracePeriod.ts`** — Thêm `isExpiringSoon`, `daysUntilExpiry`
2. **`src/components/layout/GracePeriodBanner.tsx`** — Thêm banner "sắp hết hạn" với style blue/indigo, dismiss lưu sessionStorage
3. **`src/components/layout/MainLayout.tsx`** — Mở rộng điều kiện hiển thị cho cả manager

