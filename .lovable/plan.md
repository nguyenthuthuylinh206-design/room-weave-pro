# Dọn thanh trượt ngang ở các tab trong Kho

## Vấn đề
Trong `/inventory`, có **5 hàng tabs** đang dùng `overflow-x-auto` thô — hiển thị thanh cuộn xám mặc định của trình duyệt ngay dưới tab, đặc biệt rõ ở:
- **Xuất nhập** (7 tab + badge) — chắc chắn tràn ở 981px
- **Tổng quan / Tài sản / Phân tích / Thiết lập** — có thể tràn ở mobile/tablet

Trước đó đã làm sạch `ItemTabs.tsx` (chip strip + chevron + fade) nhưng `InventoryDashboardPage.tsx` thì chưa.

## Giải pháp
Tạo **1 component dùng chung** `ScrollableTabsList` (wrapper bọc `<TabsList>` của shadcn), tái sử dụng cùng pattern đã chốt ở `ItemTabs`:

- Ẩn scrollbar (`[&::-webkit-scrollbar]:hidden`, `[scrollbar-width:none]`)
- `snap-x snap-mandatory` cho cuộn mượt
- Fade gradient trái/phải khi có overflow (`pointer-events-none`)
- Nút chevron tròn nổi (h-8 w-8, ghost + border + backdrop-blur) chỉ hiện khi `canLeft/canRight`
- Auto-scroll tab active vào giữa qua `scrollIntoView({ inline: 'center' })` — dùng `data-state="active"` selector
- `ResizeObserver` cập nhật trạng thái chevron khi đổi viewport

Sau đó **thay 5 chỗ** `<div className="overflow-x-auto ..."><TabsList>...</TabsList></div>` thành `<ScrollableTabsList>...</ScrollableTabsList>` trong `InventoryDashboardPage.tsx`. Không đụng nội dung trigger, không đổi logic state/URL.

## Phạm vi
- **Tạo mới**: `src/components/shared/ScrollableTabsList.tsx`
- **Sửa**: `src/pages/inventory/InventoryDashboardPage.tsx` (5 vị trí TabsList, dòng 303–311, 322–328, 352–383, 427–432, 451–456)
- **Refactor tuỳ chọn**: `ItemTabs.tsx` dùng lại `ScrollableTabsList` để không trùng code (gọn ~50 dòng) — sẽ làm trong cùng commit.
- **Không** đụng: data, RPC, permission, route, version bump (chỉ UI thuần).

## Test thủ công
- 981px (viewport hiện tại): tab "Xuất nhập" hiện chevron phải + fade, cuộn mượt, không còn thanh xám.
- 1280px: không chevron, không fade với các tab ngắn.
- 390px mobile: vẫn cuộn được, fade hiện đúng (TabsList trong InventoryDashboardPage không có mobile select riêng — chỉ ItemTabs có; giữ nguyên).
- Click tab cuối → tab tự cuộn vào giữa.

## Rollback
Chỉ 2 file, revert `ScrollableTabsList` import + paste lại div cũ là xong.
