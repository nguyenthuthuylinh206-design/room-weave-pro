## Vấn đề

`src/components/items/ItemTabs.tsx` hiện đang để `overflow-x-auto` trên `TabsList`, làm hiện thanh cuộn ngang xám mặc định của browser — rất thô khi có nhiều danh mục (Tất cả, Ẩm thực, Điện tử, Phòng khách, Phòng tắm, Thiết bị, Tiêu hao, Vệ sinh, Đồ vải, …) ở màn ~980px hoặc nhỏ hơn.

## Hướng nâng cấp (UI-only, không đụng data/logic)

Refactor `ItemTabs.tsx` theo 2 chế độ responsive:

### 1. Desktop / Tablet (≥ `sm`, ≥640px) — Chip strip ẩn scrollbar

- Ẩn hoàn toàn native scrollbar: `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]` (giống pattern đã dùng ở `PeriodPresetChips.tsx`).
- Thêm `snap-x snap-mandatory` + `snap-start` cho từng chip → vuốt mượt, dừng đúng chip.
- Fade edges 2 bên bằng 2 lớp `pointer-events-none` gradient `from-background` (trái/phải) chỉ hiện khi có overflow.
- Chevron trái/phải (icon-only, `h-8 w-8`, `variant="ghost"`) chỉ render khi `scrollWidth > clientWidth`; click scroll ±200px. Theo dõi qua `ResizeObserver` + scroll listener để bật/tắt disable state.
- Auto-scroll tab đang active vào tầm nhìn khi `activeTab` thay đổi (`scrollIntoView({ inline: 'center', block: 'nearest' })`).
- Chip giữ nguyên style hiện tại (`h-8 px-3 text-xs`, `data-[state=active]:bg-muted`) + thêm counter dạng muted nhỏ.

### 2. Mobile (< `sm`, ~390–639px) — Select dropdown gọn

- Thay strip bằng `Select` trigger full-width `h-9`:
  - Label trigger: tên danh mục đang chọn + số lượng (vd. `Phòng tắm · 25`).
  - Options render từ cùng danh sách (`Tất cả` + categories), kèm count bên phải.
- Tiết kiệm chiều ngang quý giá trên iPhone SE/Android nhỏ, không còn thanh trượt rác.

Quyết định breakpoint bằng `useBreakpoint()` từ `src/lib/breakpoints.ts` (`isMobile`).

## File sẽ sửa

- `src/components/items/ItemTabs.tsx` — refactor toàn bộ render, tách 2 nhánh `MobileSelect` + `DesktopStrip`. Giữ nguyên props `activeTab`, `onTabChange`, không đổi hook `useCategories`.

## File mới (tùy chọn nội bộ)

- Có thể tách `DesktopChipStrip` thành subcomponent trong cùng file để dễ đọc (≤120 dòng tổng).

## Không đụng

- `useCategories`, schema, RPC, permissions, các page sử dụng `ItemTabs`.
- Không thay đổi version bump (UI nhỏ) — trừ khi sau khi build user yêu cầu publish, sẽ bump theo convention.

## Test thủ công

- 390px: thấy Select dropdown, không còn thanh cuộn.
- 768px: thấy strip chip, không có scrollbar xám, có fade + chevron khi tràn.
- 1280px: nếu đủ chỗ → không hiện chevron, không hiện fade.
- Chuyển tab bằng click chevron / chọn dropdown → list items reload đúng.
- Khi active tab nằm ngoài viewport, vào trang sẽ auto-scroll tới giữa.
- Kiểm tra Safari iOS (smooth scroll + snap).

## Rollback

Revert duy nhất file `ItemTabs.tsx` — không ảnh hưởng module khác.
