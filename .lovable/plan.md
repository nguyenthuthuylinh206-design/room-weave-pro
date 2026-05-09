## Plan: Đổi tên thương hiệu còn sót HotelOps → RoomQc

### Phạm vi
6 file còn sót chuỗi "HotelOps" hoặc email "hotelops" chưa được đổi trong lượt rebrand trước.

### Chi tiết thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/Layout.tsx` | Logo text `HotelOps` → `RoomQc`; email `admin@hotelops.com` → `roomqc@gmail.com` |
| 2 | `src/components/landing/LandingNavbar.tsx` | Logo text `HotelOps` → `RoomQc` |
| 3 | `src/components/landing/FooterSection.tsx` | Logo text `HotelOps` → `RoomQc` |
| 4 | `src/components/landing/PricingSection.tsx` | Enterprise email `contact@hotelops.vn` → `roomqc@gmail.com` |
| 5 | `src/i18n/locales/vi/landing.json` | `copyright` string `HotelOps` → `RoomQc` |
| 6 | `src/i18n/locales/en/landing.json` | `copyright` string `HotelOps` → `RoomQc` |

### Kiểm tra sau implement
- `rg -ni "HotelOps|hotelops" src/ public/` trả về 0 kết quả.

### Không thay đổi
- Không chạm database, migration, hay backend logic.
