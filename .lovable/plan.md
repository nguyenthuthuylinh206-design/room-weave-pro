## Mục tiêu

Dựng lại trang `/inventory` cho laptop (≥1024px) thành một **Inventory Command Center** theo phong Enterprise SaaS, dùng đúng 3 preset đã chốt:

- **Bảng màu — Navy Trust**: `#0f1b3d`, `#1e3a5f`, `#3b6fa0`, `#e8edf3` (làm accent + chrome). Vẫn tôn trọng dark/light theme hiện có; thêm token mới `--ink`, `--ink-2`, `--steel`, `--paper` để không phá design system khác.
- **Typography — Sora + Manrope**: heading số liệu KPI bằng **Sora** (tracking hẹp), body & label bằng **Manrope**. Mono cho mã code giữ nguyên JetBrains.
- **Layout — Bento Grid**: KPI và widget xếp theo lưới 12 cột nhiều kích cỡ (2×1, 4×2, 6×2, 8×2…), không đều nhau, có "hero tile" doanh thu tồn kho.

Phạm vi áp dụng **chỉ desktop (`lg:` trở lên)**. Mobile/tablet giữ nguyên `MobileInventoryDashboard`. Không động vào business logic — chỉ frontend/presentation.

## Vấn đề hiện tại

```text
[ PageHeader (cao, nhiều nút trôi nổi) ]
[ Breadcrumb              ]
[ Sidebar 240px | Tabs ngang lặp nội dung sidebar       ]
                | KPI grid 4 cột phẳng                  |
                | Action bar                            |
                | 8/4 chart + forecast (min-h 320 cứng) |
                | 8/4 top consumed + alerts             |
                | Recent transactions full-width        |
```

Hậu quả: sidebar + tabs trùng lặp, KPI nhạt, widget đều tăm tắp, không có điểm nhấn, chữ Inter mặc định, header chiếm 1/4 fold đầu tiên.

## Kiến trúc mới (Tab "Tổng quan" trên laptop)

```text
┌──────────────────────────────────────────────────────────────┐
│ Topbar mỏng: breadcrumb + quick search + Thao tác (split)    │
├──────┬───────────────────────────────────────────────────────┤
│      │  HERO TILE (col-span-6, row-span-2)                   │
│ Side │  - Tổng giá trị tồn (Sora 48px)                       │
│ Nav  │  - Sparkline 30 ngày, delta %                         │
│ 220  │  - Pill 3 cảnh báo nóng (low/dead/pending)            │
│ px   ├────────────────┬──────────────────┬───────────────────┤
│      │ KPI 2×1: SKU   │ KPI 2×1: Đề xuất │ KPI 2×1: Kiểm kê  │
│      │ (col-span-2)   │ (col-span-2)     │ (col-span-2)      │
│      ├────────────────┴───────────┬──────────────────────────┤
│      │ Forecast 7 ngày            │ Top tiêu thụ tuần        │
│      │ (col-span-6, row-span-2)   │ (col-span-6, row-span-2) │
│      ├────────────────────────────┼──────────────────────────┤
│      │ Cảnh báo tồn kho           │ Phân bổ theo khách sạn   │
│      │ (col-span-5)               │ (col-span-7)             │
│      ├────────────────────────────┴──────────────────────────┤
│      │ Giao dịch gần đây — bảng compact (col-span-12)        │
└──────┴───────────────────────────────────────────────────────┘
```

- Lưới: `grid-cols-12 auto-rows-[140px] gap-3` → mỗi tile chọn `row-span-1/2` và `col-span-*`.
- Mỗi tile = `div` border + `rounded-xl`, KHÔNG dùng `Card` (theo quy tắc Enterprise Minimalist), nền `bg-card` + viền `border-border/70`, hover nâng nhẹ shadow.
- Hero tile có gradient mảnh navy → trong (`from-[--ink] to-[--ink-2]`) ở **light mode**, glass mờ ở dark.

## Chrome chung của trang

- **PageHeader gọn 1 dòng**: tiêu đề "Kho" (Sora 20, tracking-tight) + breadcrumb inline + Quick search (Cmd/Ctrl+K) + dropdown "Thao tác" (giữ nguyên hành vi).
- **Tabs ngang biến mất trên laptop** (vì đã có sidebar trái). Trên tablet vẫn hiện. Trên laptop, tab hiện tại đổi thành "section title" gắn vào sidebar item active để khử trùng lặp.
- **Sidebar trái** (`lg:w-[220px]`): grouping hiện tại giữ nguyên, nhưng:
  - Group title: Manrope 11px, uppercase, tracking `0.08em`, `text-muted-foreground/70`.
  - Item active: nền `bg-accent/40` + thanh dọc 2px màu `--steel` bên trái, không bo tròn toàn bộ.
  - Badge số chuyển sang ô vuông nhỏ `h-4 min-w-4` Sora 10px.
- **Sub-tabs trong các tab assets/operations/analytics/settings**: đổi từ `TabsList` mặc định sang dạng "segmented pill" thấp `h-8`, font Manrope 13.

## Design tokens

Thêm vào `src/index.css` (cả `:root` và `.dark`):

```css
--ink: 222 60% 15%;       /* #0f1b3d */
--ink-2: 213 53% 24%;     /* #1e3a5f */
--steel: 209 47% 43%;     /* #3b6fa0 */
--paper: 218 32% 94%;     /* #e8edf3 */

--font-display: 'Sora', ui-sans-serif, system-ui;
--font-body: 'Manrope', ui-sans-serif, system-ui;
--shadow-tile: 0 1px 2px hsl(var(--ink) / .06), 0 6px 24px -12px hsl(var(--ink) / .12);
```

`tailwind.config.ts`:
- `fontFamily.display = ['Sora', ...]`, `fontFamily.sans = ['Manrope', ...]`
- `colors.ink / ink2 / steel / paper` mapping HSL var
- `boxShadow.tile = 'var(--shadow-tile)'`

`index.html`: thêm `<link>` Google Fonts cho Sora 400/600/700 và Manrope 400/500/600.

## File sẽ tạo / sửa

**Tạo mới**
1. `src/components/inventory/hub/desktop/InventoryDesktopHub.tsx` — layout bento full cho laptop.
2. `src/components/inventory/hub/desktop/InventoryHeroTile.tsx` — hero tổng giá trị + sparkline + 3 cảnh báo.
3. `src/components/inventory/hub/desktop/InventoryKpiTile.tsx` — tile KPI nhỏ tái sử dụng (label, value Sora, delta, icon mảnh).
4. `src/components/inventory/hub/desktop/InventorySidebarNav.tsx` — sidebar mới (kế thừa data từ `inventoryMenuGroups`).
5. `src/components/inventory/hub/desktop/InventoryTopbar.tsx` — topbar mỏng (breadcrumb + search + thao tác).

**Sửa**
6. `src/pages/inventory/InventoryDashboardPage.tsx` — desktop dùng `InventoryDesktopHub` + `InventorySidebarNav` + ẩn `TabsList` ngang ở `lg:`; tablet/mobile giữ nguyên.
7. `src/components/inventory/InventoryOverviewSection.tsx` — đổi lưới sang bento 12 cột, dùng tile mới, bỏ `min-h-[320px]` cứng → dùng `row-span`.
8. `src/components/inventory/hub/InventoryKpiGrid.tsx` — render bằng `InventoryKpiTile` thay vì layout cũ; xuất tile riêng cho hero.
9. `src/components/inventory/hub/InventoryHubBreadcrumb.tsx` — nhỏ lại, ghép vào topbar; bỏ block riêng trên laptop.
10. `src/index.css` — tokens Navy Trust + font + shadow tile.
11. `tailwind.config.ts` — fontFamily + colors + shadow.
12. `index.html` — preload Google Fonts Sora + Manrope.

**Memory + version**
13. `mem://design/inventory-hub-desktop-v3` — ghi spec layout + tokens.
14. `mem://index.md` — thêm reference + cập nhật Core nếu cần (font dự án vẫn Inter ở chỗ khác — chỉ áp dụng cục bộ trong /inventory bằng class `font-display` / `font-sans`, **không đổi font toàn app**).
15. `src/lib/app-version.ts` + `src/components/CacheBuster.tsx` + `public/changelog.json` — bump `1.1.22`.

## Quy tắc tuân thủ project

- Không thêm icon/emoji thừa vào tab và sidebar (memory: Icon Reduction).
- Không tạo Card mới — dùng `div border rounded-xl` (memory: Enterprise SaaS Standards).
- Status dùng màu chữ semantic: `text-emerald-600 / text-amber-600 / text-rose-600`. Navy chỉ dùng làm accent chrome, không làm màu status.
- Số tiền giữ format `1.700.000 ₫` (Core memory).
- Toàn bộ string tiếng Việt.
- Không động vào business logic, RPC, query — chỉ presentation.
- Bump version theo Release Convention.

## Rollout

- Feature ẩn sau breakpoint `lg` — laptop thấy ngay, tablet/mobile không đổi.
- Không cần migration DB.
- Rollback: revert 5 file mới + `InventoryDashboardPage.tsx` về bản trước.

## QA checklist

- [ ] 1280×800, 1440×900, 1920×1080: lưới bento không vỡ, không scroll ngang.
- [ ] Sora load thật (devtools → Network), không fallback sang Inter ở KPI.
- [ ] Sidebar item active chỉ một item; badge realtime vẫn cập nhật.
- [ ] Sub-tabs assets / operations / analytics / settings vẫn switch đúng query `?tab=&sub=`.
- [ ] Dark mode tile đọc được, hero tile không bị chữ trắng trên nền sáng.
- [ ] Lighthouse Performance ≥ 90 ở `/inventory`.
- [ ] Không có warning console mới.

## Phần KHÔNG làm trong lượt này

- Không redesign các route con (`/items`, `/laundry`, `/maintenance`).
- Không đổi font toàn app — chỉ áp Sora/Manrope trong khu `/inventory`.
- Không đụng vào mobile dashboard.
