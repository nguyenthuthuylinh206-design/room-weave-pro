## Mục tiêu

Giảm thời gian chuyển trang từ ~5s xuống còn dưới 500ms cho điều hướng giữa các trang đã load, và dưới ~1.5s cho lần đầu vào trang mới.

## Nguyên nhân chính

```text
Click sang trang mới
  → tải chunk JS của page (network)        ← thường là cause chính
  → tải namespace i18n vi/<module>.json    ← extra request
  → mount component, fire 4–8 React Query  ← network round-trip
  → render + suspense fallback flicker
```

Vấn đề kỹ thuật cụ thể trong codebase hiện tại:

1. **Mỗi page = 1 chunk lazy riêng**, chỉ prefetch khi `onMouseEnter` trong Sidebar. Trên mobile (không có hover) và trên route đầu tiên, click luôn phải chờ network round-trip.
2. **Không có prefetch chủ động sau idle** — sau khi app load xong, browser không tự kéo về các chunk người dùng sắp click.
3. **Vendor chunk gộp tất cả node_modules** (~2.5–3 MB) — gồm cả mermaid, excel, pdf, charts, qr cho dù trang hiện tại không cần. Điều này không trực tiếp gây 5s khi chuyển trang, nhưng làm lần load đầu nặng và đẩy mọi thứ khác xếp hàng phía sau.
4. **i18n namespace vẫn lazy** — mỗi trang gọi `useTranslation('rooms')`, `useTranslation('inventory')`… kích hoạt 1 request JSON nữa, gây flash key code.
5. **MainLayout chứa nhiều provider/banner nặng** (HotelProvider, PWA prompt, FreeTrialPopup, AnnouncementHost, GracePeriodBanner…) — không phải nguyên nhân chính, nhưng cộng dồn 200–500ms trên mobile yếu.
6. **React Query staleTime = 5 phút** đã ổn, nhưng nhiều hook page-specific dùng `queryKey` khác nhau cho cùng 1 dữ liệu → vẫn refetch khi đổi trang.

## Phân tích codebase

### Có thể reuse
- `src/lib/route-prefetch.ts` đã có map prefix → loader đầy đủ.
- `Sidebar.tsx` đã gọi `prefetchRoute` trên hover/focus.
- React Query đã có cache 30 phút.
- i18n đã được khóa 100% tiếng Việt (1.0.17).

### Cần refactor
- Mở rộng `prefetchRoute` để hỗ trợ:
  - `prefetchRouteIdle()` chạy sau `requestIdleCallback` cho các route phổ biến.
  - Trigger trên `pointerdown` / `touchstart` (kích hoạt sớm hơn click ~100–300ms, hoạt động cả mobile).
- Bundle thêm các namespace i18n hay dùng (`navigation`, `dashboard`, `rooms`, `inventory`, `bookings`, `settings`) vào `resources` ban đầu để bỏ network round-trip cho `useTranslation` ở các trang chính.
- Tách các thư viện rất nặng nhưng chỉ dùng 1–2 trang khỏi vendor chunk: `mermaid`, `xlsx/exceljs`, `jspdf/pdfmake`, `recharts`/`chart.js`, `qrcode`/`html5-qrcode`. Dùng `manualChunks` có điều kiện cho từng package này (đặt riêng, không tách lung tung gây lại TDZ trước đây).
- Header / Sidebar cần thêm `<link rel="prefetch">` cho các page hay click nhất (Dashboard, Rooms, Bookings, Inventory).

### Cần thêm mới
- Hook `useIdlePrefetch(routes: string[])` chạy 1 lần sau khi MainLayout mount + requestIdleCallback, prefetch các route theo permission của user.
- Wrapper `NavLinkPrefetch` thay cho `<Link>` ở Sidebar / MobileBottomNav — gắn `onPointerDown` để bắt đầu fetch chunk + fire React Query prefetch ngay khi user "bắt đầu" tap, không chờ click.
- (Optional) Thêm `viewTransition: true` trong React Router khi điều hướng để tránh flash trắng (hỗ trợ trình duyệt mới).

### Rủi ro migration
- Tách lại manualChunks có thể tái phát TDZ (đã từng gặp ở 1.0.15/1.0.16). Cần tách rất bảo thủ: chỉ tách package không có ai khác trong vendor import vào (mermaid, xlsx, jspdf đều standalone — an toàn).
- Bundle thêm namespace i18n eager làm initial bundle hơi to (~30–80 KB gzip) nhưng đổi lấy chuyển trang mượt.
- Prefetch quá hung hăng tốn data trên 3G; cần check `navigator.connection?.saveData` để tắt.

## Kế hoạch triển khai

### A. Kiến trúc / logic nghiệp vụ
- Áp dụng "prefetch sớm + cache lâu + bundle vừa đủ" để chuyển trang gần như tức thì giữa các route quen thuộc, vẫn giữ kiến trúc lazy hiện tại.

### B. Schema / migration
- Không thay đổi DB.

### C. API / RPC / server actions
- Không thay đổi backend.

### D. UI screens / components
- `src/lib/route-prefetch.ts`: thêm `prefetchRouteIdle`, hỗ trợ `pointerdown`.
- `src/components/layout/Sidebar.tsx` + `MobileBottomNav.tsx`: chuyển trigger prefetch sang `onPointerDown` thay vì `onMouseEnter` (vẫn giữ `onMouseEnter` cho desktop).
- `src/components/layout/MainLayout.tsx`: gọi `useIdlePrefetch` sau mount với danh sách 6–8 route chính theo permission.
- `src/i18n/index.ts`: bundle eager thêm `navigation`, `dashboard`, `rooms`, `inventory`, `bookings`, `settings` cho `vi`.
- `vite.config.ts`: `manualChunks` tách riêng `mermaid`, `xlsx`/`exceljs`, `jspdf`, `qrcode`/`html5-qrcode` thành chunk độc lập (chỉ load khi page đó mount).
- `index.html`: thêm `<link rel="modulepreload">` cho `Dashboard`, `RoomsPage`, `BookingsPage` (3 page khởi đầu phổ biến).

### E. Permission / role rules
- `useIdlePrefetch` lọc danh sách route theo permission của user để không kéo chunk thừa.

### F. Test cases / kiểm tra
- Đo Network tab ở DevTools: chuyển từ Dashboard → Rooms → Bookings phải ≤ 200ms (không có request JS mới sau lần đầu).
- Mobile (Chrome throttling Slow 4G): điều hướng giữa 2 page bottom-nav ≤ 700ms.
- Không còn flash key i18n (`bookings.title` hiện ra trước "Đặt phòng").
- Build phải pass; không tái phát lỗi `Cannot access X before initialization`.
- Lighthouse Performance ≥ 80.

### G. Rollout notes
- Bump `APP_VERSION` lên `1.0.18`, `public/changelog.json` thêm entry "Tăng tốc chuyển trang".
- Theo dõi 1–2 ngày sau publish; nếu thấy lỗi white screen quay lại, rollback bằng cách revert `vite.config.ts` (giữ vendor 1 chunk).

## File dự kiến sửa
- `src/lib/route-prefetch.ts`
- `src/hooks/useIdlePrefetch.ts` (mới)
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/i18n/index.ts`
- `vite.config.ts`
- `index.html`
- `src/lib/app-version.ts`
- `public/changelog.json`

## Phần còn thiếu / không làm trong bước này
- Không refactor lớn React Query keys (việc lớn, làm sau nếu cần).
- Không bật React Router `unstable_viewTransition` (gây side-effect ở Safari cũ — sẽ test riêng).
- Không tách MainLayout banners thành lazy (ROI thấp so với rủi ro).