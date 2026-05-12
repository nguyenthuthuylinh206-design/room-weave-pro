# Bước 3+: Tối ưu hiệu năng nâng cao

Sau Bước 1 (manualChunks + lazy layout) và Bước 2 (lazy i18n), vẫn còn 6 nhóm tối ưu đáng làm. Sắp xếp theo **impact/effort**.

---

## A. React Query defaults (impact CAO, effort THẤP)
Hiện tại mỗi query mặc định `staleTime: 0` → refetch liên tục khi focus tab, đổi route.
- Set `staleTime: 60_000`, `gcTime: 5 * 60_000`
- `refetchOnWindowFocus: false`
- `retry: 1` (thay vì 3) cho query thường
**Kết quả:** Giảm 40–60% request thừa, chuyển trang mượt hơn.

## B. Route-level prefetch on hover/idle (impact CAO, effort TB)
- Prefetch chunk khi user hover link sidebar (`onMouseEnter` → `import()`)
- Prefetch các route phổ biến (Dashboard, Rooms, Bookings) sau khi app idle 2s
**Kết quả:** Click chuyển trang gần như tức thì.

## C. Tối ưu HeroSection & Landing assets (impact TB, effort THẤP)
- Convert hero image sang WebP/AVIF, thêm `loading="eager" fetchpriority="high"` cho LCP image
- Lazy load các section dưới fold (Features, Pricing, Testimonials) bằng `react-intersection-observer` + `lazy()`
- Inline critical CSS cho above-the-fold

## D. Font loading (impact TB, effort THẤP)
- Audit font hiện tại: nếu dùng Google Fonts → thêm `&display=swap`, preload font chính
- Nếu self-host: subset (Vietnamese only), woff2, `font-display: swap`
**Kết quả:** Giảm 200–400ms FCP, hết FOIT.

## E. Supabase client warm-up & auth fast-path (impact TB, effort TB)
- Hiện tại auth check chạy đồng bộ trước khi render landing → public route nên skip
- Tách `RootRoute` để landing không chờ `getSession()`
- Cache session ở `localStorage` để hydrate nhanh

## F. Bundle audit & dead code (impact TB, effort TB)
- Chạy `vite-bundle-visualizer` để soi
- Loại bỏ deps trùng lặp (đã thấy `framer-motion` + `motion`?)
- Tree-shake icon imports: dùng `lucide-react/icons/X` thay vì `lucide-react`
- Kiểm tra `date-fns` import từ subpath
- Loại bỏ `mermaid`/`exceljs`/`jspdf`/`html5-qrcode` khỏi route không cần

## G. Service Worker precache cho returning users (impact CAO cho lần 2+, effort CAO)
- Precache shell + chunk landing → lần 2 vào < 500ms
- **Cảnh báo:** đã có `CacheBuster`, cần phối hợp tránh stale; rủi ro PWA iframe
- Có thể skip nếu không cần

---

## Đề xuất triển khai

**Bước 3a (làm ngay, an toàn nhất):** A + C + D + F
→ Giảm thêm 30–40% TTI, click chuyển trang mượt, FCP nhanh hơn.

**Bước 3b (sau khi 3a ổn):** B + E
→ Cảm giác app "instant" khi điều hướng nội bộ.

**Bước 3c (tùy chọn):** G — chỉ làm nếu user thực sự cần offline/returning speed.

---

## Files dự kiến chạm
- `src/App.tsx` (QueryClient defaults)
- `src/components/layout/Sidebar.tsx` (prefetch on hover)
- `src/components/landing/*` (lazy sections, image optimization)
- `index.html` (font preload, critical CSS)
- `vite.config.ts` (bundle analyzer plugin tạm thời)
- `package.json` (loại deps thừa)

## Rủi ro
- React Query staleTime cao → một số trang cần realtime phải override (đã có pattern subscribe sẵn, OK)
- Prefetch tốn bandwidth mobile → chỉ prefetch trên `navigator.connection.effectiveType === '4g'`
- Font swap → có thể FOUT nhẹ, chấp nhận được

## Bạn muốn làm gói nào?
- **Bước 3a** (khuyên dùng — impact cao, không rủi ro)
- **Bước 3a + 3b**
- **Tất cả 3a + 3b + 3c**
- Hoặc chọn lẻ A/B/C/D/E/F/G
