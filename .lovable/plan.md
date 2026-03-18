

## Kế hoạch: Xây dựng trang chủ (Landing Page)

### Hiện trạng
- Route `/` hiện tại → `AuthGuard` → `Dashboard` (yêu cầu đăng nhập)
- Chưa có landing page public nào
- Đã có sẵn `/auth/login`, `/auth/register`, pricing plans trong super-admin

### Thiết kế tham khảo
Lấy cảm hứng từ 2 hình reference (Salework + GenSeo): hero section với dark/gradient background, feature cards, CTA buttons.

### Cấu trúc thay đổi

**1. Tạo `src/pages/LandingPage.tsx`** — Trang public gồm các section:

- **Navbar**: Logo "HotelOps" + links (Tính năng, Bảng giá, Liên hệ) + buttons "Đăng nhập" / "Đăng ký miễn phí"
- **Hero Section**: Headline mô tả dự án (hệ thống quản lý khách sạn toàn diện), subtitle, 2 CTA buttons (Dùng thử miễn phí → `/auth/register`, Đăng nhập → `/auth/login`), mockup illustration bên phải
- **Stats Bar**: Số liệu nổi bật (số phòng quản lý, đơn vị sử dụng, etc.)
- **Features Section**: Grid 6-8 feature cards (Quản lý phòng, Kho & tài sản, Giặt là, Bảo trì, Đặt phòng, Báo cáo...) với icon + mô tả
- **Pricing Section**: 3 gói (Miễn phí / Pro / Enterprise) với bảng so sánh tính năng, CTA đăng ký
- **CTA Section**: Call-to-action cuối trang
- **Footer**: Links, copyright

**2. Cập nhật routing trong `App.tsx`**:
- Thêm route public: `{ path: "/landing", element: <LandingPage /> }`
- Giữ nguyên `/` → AuthGuard → Dashboard (không break flow hiện tại)
- Redirect user chưa đăng nhập từ `/` sang `/landing` (hoặc đặt landing ở `/` và dashboard ở `/dashboard`)

**Đề xuất**: Đặt landing page ở `/` (public), chuyển dashboard vào `/dashboard`. Users đã đăng nhập vào `/` sẽ tự redirect sang `/dashboard`.

**3. Tạo `src/pages/PricingPage.tsx`** (optional, có thể tách riêng hoặc anchor link trong landing)

### Chi tiết kỹ thuật
- Landing page hoàn toàn public, không cần AuthGuard
- Dùng Tailwind CSS, dark gradient hero giống reference
- Responsive: mobile-first với hamburger menu
- i18n: thêm key vào `en/landing.json` và `vi/landing.json`
- Nếu user đã đăng nhập, navbar hiển thị "Vào Dashboard" thay vì "Đăng nhập"
- Smooth scroll cho anchor links (#features, #pricing)

### Files tạo/sửa
| File | Hành động |
|------|-----------|
| `src/pages/LandingPage.tsx` | Tạo mới — toàn bộ landing page |
| `src/components/landing/LandingNavbar.tsx` | Tạo mới — navbar riêng cho landing |
| `src/components/landing/HeroSection.tsx` | Tạo mới |
| `src/components/landing/FeaturesSection.tsx` | Tạo mới |
| `src/components/landing/PricingSection.tsx` | Tạo mới |
| `src/components/landing/FooterSection.tsx` | Tạo mới |
| `src/i18n/locales/en/landing.json` | Tạo mới — translations |
| `src/i18n/locales/vi/landing.json` | Tạo mới — translations |
| `src/App.tsx` | Sửa — restructure routes: `/` = LandingPage, `/dashboard` = Dashboard |
| `src/pages/Index.tsx` | Xóa hoặc redirect |

