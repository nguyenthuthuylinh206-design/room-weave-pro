## Plan: Đổi tên thương hiệu còn sót sang RoomQc

### Phạm vi
6 file còn sót chuỗi thương hiệu hoặc email cũ chưa được đổi trong lượt rebrand trước.

### Chi tiết thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/Layout.tsx` | Logo text cũ → `RoomQc`; email cũ → `roomqc@gmail.com` |
| 2 | `src/components/landing/LandingNavbar.tsx` | Logo text cũ → `RoomQc` |
| 3 | `src/components/landing/FooterSection.tsx` | Logo text cũ → `RoomQc` |
| 4 | `src/components/landing/PricingSection.tsx` | Enterprise email cũ → `roomqc@gmail.com` |
| 5 | `src/i18n/locales/vi/landing.json` | `copyright` string cũ → `RoomQc` |
| 6 | `src/i18n/locales/en/landing.json` | `copyright` string cũ → `RoomQc` |

### Kiểm tra sau implement
- Kiểm tra trong `src/` và `public/` trả về 0 kết quả cho thương hiệu/email cũ.

### Không thay đổi
- Không chạm database, migration, hay backend logic.
