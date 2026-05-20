# Kế hoạch tối ưu giao diện Mobile

## Bối cảnh
Chụp preview ở 390×844 (iPhone 14). Vì chưa đăng nhập nên màn hiện tại là **landing page** — đây cũng là vấn đề lớn nhất nhìn thấy. Sau đó review thêm các màn chính trong app dựa trên code.

## Vấn đề phát hiện

### A. Landing page (ưu tiên 1 — user gặp ngay)
1. **Khoảng trắng khổng lồ** giữa Hero ↔ Features ↔ Pricing ↔ Footer trên mobile. Nguyên nhân: `py-20 sm:py-28`, `mb-16`, `mt-20` được dùng đồng nhất cho mọi breakpoint → trên 390px tạo ra 80–112px padding dọc + 64px margin tiêu đề. Cộng với `motion.div initial opacity-0 whileInView`, nội dung "biến mất" khi screenshot/scroll nhanh, càng làm cảm giác trống.
2. **Hero title** `Quản lý khách sạn thông minh & toàn diện` vỡ 3 dòng xấu, `text-4xl` quá lớn cho 390px (chữ tràn sát mép).
3. **Hero min-h-[90vh]** trên iPhone notch (~844px) chiếm gần trọn screen, đẩy stats xuống dưới fold → không thấy.
4. **Stats grid 2 cột** có `mt-20` (80px gap) — quá xa Hero CTA.
5. **Pricing card 1 cột mobile** OK nhưng `py-20` + `mb-16` header lại tạo khoảng trống.

### B. Header / HotelSwitcher trong app
- `MobileHeader` hiện đã gọn (1.0.33), nhưng `MobileHotelSwitcher` wrapper là `<span onClick>` với class `contents` bọc `<button>` → **nested button + bubbling**, có thể gây sự kiện kép trên iOS Safari.
- Có **2 file `MobileHotelSwitcher`** khác nhau:
  - `src/components/layout/MobileHotelSwitcher.tsx` (bottom sheet — mới)
  - `src/components/mobile/MobileHotelSwitcher.tsx` (dropdown menu — cũ, vẫn được `MobileInventoryHeader` dùng)
  → Không nhất quán UX giữa các module.

### C. Mobile Inventory (route hiện tại sau khi login)
- `MobileInventoryHeader` dùng bản dropdown cũ với `w-[280px]` popover → trên 390px sẽ tràn nếu mở từ mép.
- `MobileInventoryDashboard` đặt `pb-32` để chừa cho bottom nav + FAB, nhưng nếu có safe-area lớn (iPhone 14 Pro) vẫn bị FAB đè lên content cuối.

### D. Touch target & overflow guard
- `index.css` đã có `overflow-x: hidden` cho `#root` (1.0.32) — OK.
- Một số `Button size="icon"` trong header dùng `h-9 w-9` = 36px, dưới chuẩn 44px iOS HIG. Chấp nhận được nhưng nên nâng touch target tối thiểu lên 44×44 qua `tap-highlight` padding ảo.

## Phạm vi triển khai (đề xuất)

### Phần 1 — Landing mobile (ưu tiên cao, fix ngay)
- `HeroSection.tsx`
  - `min-h-[90vh]` → `min-h-[80svh] sm:min-h-[90vh]`
  - Title: `text-3xl sm:text-5xl lg:text-6xl` (giảm từ 4xl→3xl mobile)
  - `pt-16 py-20` → `pt-20 pb-12 sm:py-20`
  - Stats: `mt-20` → `mt-10 sm:mt-20`, `grid-cols-2` giữ nguyên
  - CTA row: `gap-4` → `gap-3` + 2 nút `w-full sm:w-auto`
- `FeaturesSection.tsx`
  - `py-20 sm:py-28` → `py-14 sm:py-24`
  - Header `mb-16` → `mb-10 sm:mb-16`
  - Grid `gap-6` → `gap-4 sm:gap-6`
  - `motion.div` thêm `viewport={{ amount: 0.1 }}` để trigger sớm hơn trên mobile (không bị thấy trống).
- `PricingSection.tsx`
  - `py-20 sm:py-28` → `py-14 sm:py-24`
  - Header `mb-16` → `mb-10 sm:mb-16`
  - Card padding `p-6` → `p-5 sm:p-6`
  - Card list `space-y-3` → `space-y-2.5`
  - Pro card scale: bỏ shadow nặng trên mobile (`shadow-lg sm:shadow-primary/10`).
- `LandingNavbar.tsx`: kiểm tra logo + menu trigger còn trong thumb zone, padding gọn.

### Phần 2 — Thống nhất HotelSwitcher
- **Xoá** `src/components/mobile/MobileHotelSwitcher.tsx` (bản dropdown cũ).
- `MobileInventoryHeader.tsx`: chuyển sang dùng `@/components/layout/MobileHotelSwitcher` (bottom sheet).
- `MobileHotelSwitcher` (layout): đổi wrapper `<span onClick className="contents">` → `<div role="button" tabIndex={0}>` hoặc clone props vào children để tránh nested-button.

### Phần 3 — Safe area & touch target
- `MobileLayout.tsx`: `pb-safe-20` → `pb-[calc(5rem+env(safe-area-inset-bottom))]` chính xác cho iPhone notch.
- `MobileHeader` icon buttons: thêm `min-h-[44px] min-w-[44px]` (giữ visual h-9 bằng padding) — chỉ nếu cần.

### Phần 4 — Version bump
- `src/lib/app-version.ts` → `1.0.34`
- `src/components/CacheBuster.tsx` → bump `CURRENT_VERSION`
- `public/changelog.json`: entry "Tối ưu mobile landing + thống nhất HotelSwitcher".

## File sẽ thay đổi
1. ✏️ `src/components/landing/HeroSection.tsx`
2. ✏️ `src/components/landing/FeaturesSection.tsx`
3. ✏️ `src/components/landing/PricingSection.tsx`
4. ✏️ `src/components/landing/LandingNavbar.tsx` (rà soát, có thể chỉ minor)
5. ✏️ `src/components/layout/MobileHotelSwitcher.tsx` (fix wrapper)
6. ✏️ `src/components/inventory/MobileInventoryHeader.tsx` (dùng layout version)
7. 🗑️ `src/components/mobile/MobileHotelSwitcher.tsx` (xoá, không còn ai import)
8. ✏️ `src/components/layout/MobileLayout.tsx` (safe-area)
9. ✏️ `src/lib/app-version.ts` → 1.0.34
10. ✏️ `src/components/CacheBuster.tsx`
11. ✏️ `public/changelog.json`

## Không động vào
- Logic nghiệp vụ, RPC, schema, migration — **không có thay đổi DB**.
- Desktop layout — chỉ tinh chỉnh responsive prefix `sm:` trở lên giữ nguyên hành vi cũ.

## Test
- Mobile 390×844 và 360×800: scroll landing → không còn vùng trắng > 80px, Hero stats visible above fold sau scroll 1 lần.
- Mobile Inventory: mở HotelSwitcher → bottom sheet thay vì dropdown 280px.
- iPhone safe-area: FAB không che content cuối list.
- Desktop ≥ 768px: layout không đổi.

## Rollback
Revert 11 file. Không có migration.

**Duyệt để triển khai?**
