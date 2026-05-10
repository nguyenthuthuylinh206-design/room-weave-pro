## Mục tiêu

Cải thiện trải nghiệm sidebar desktop (`src/components/layout/Sidebar.tsx`):
1. **Không nháy** khi user/tenant/permissions load xong.
2. **Mượt mà** khi click expand/collapse và khi điều hướng.
3. **Tự ẩn (collapse) nhóm cha** khi user click vào một mục con / chuyển tab.

## Phân tích hiện trạng

- `isLoading = userLoading || tenantLoading || permissionsLoading` → khi 1 trong 3 hook xong trước thì sidebar render skeleton hoàn toàn → khi cả 3 xong, đột ngột thay bằng nav thật → **nháy** (skeleton dài → nav full).
- `useState` khởi tạo `expandedItems` chỉ chạy **1 lần** (lazy init). Khi user click mục con để chuyển route, dropdown cha vẫn mở. User muốn dropdown đóng lại sau khi chuyển tab.
- `toggleExpanded` đã đảm bảo "chỉ 1 nhóm mở tại 1 thời điểm" — giữ nguyên.
- Animation `grid-rows-[1fr↔0fr]` đang chạy 300ms `ease-in-out` — OK, nhưng có thể bị giật khi `expandedItems` reset đột ngột do re-render từ `pendingCounts` realtime.
- Active link đổi màu `bg-primary` ngay khi click → tốt; không cần đổi.

## Thay đổi đề xuất

### A. Loại bỏ nháy do skeleton
- Skeleton sidebar **chỉ hiện khi `userLoading` thực sự true** (lần đầu chưa có session). `tenantLoading` và `permissionsLoading` chạy nền → render shell sidebar luôn, chỉ thay phần header tenant + danh sách nav bằng placeholder nhỏ tại chỗ.
- Lý do: user data thường có ngay từ AuthContext; tenant + permissions tới sau vài trăm ms. Tránh thay full skeleton → full nav.

### B. Tự ẩn nhóm khi chuyển tab
- Thêm `useEffect` theo `location.pathname`: nếu pathname **không khớp** với bất kỳ child nào của nhóm đang expand → reset `expandedItems` về `[]`.
- Nếu pathname khớp với 1 child trong nhóm khác → set `expandedItems = [thatGroup]` (đảm bảo nhóm chứa route hiện tại luôn mở khi reload, các nhóm khác đóng).
- Hành vi cụ thể user trải nghiệm: click "Inventory → Transactions" → điều hướng → nhóm Inventory **vẫn mở** (vì child active nằm trong đó). Click "Rooms" (nhóm khác) → Inventory đóng, Rooms mở.
- Nếu user click child trong **cùng nhóm đang mở** rồi muốn tự đóng → option phụ: thêm hành vi `Click child → collapse parent sau khi navigate xong` (300ms timeout). **→ cần xác nhận** ở phần "Cần xác nhận".

### C. Mượt animation
- Thêm `will-change: grid-template-rows` cho container expand/collapse → GPU promote, không giật trên Chrome.
- Đảm bảo `transition-colors` trên Link không kèm `transition-all` → giữ duration nhẹ 150ms.
- Header tenant: bọc subscription badge + `daysLeft` trong `useMemo` để tránh tính toán lại mỗi render do `pendingCounts` realtime.
- `pendingCounts` đang trigger re-render toàn sidebar mỗi khi count đổi → bọc từng `Badge` trong component nhỏ `<PendingBadge keyName=...>` dùng `useQuery` selector hoặc memo, để chỉ badge re-render thay vì cả nav.

### D. (Tùy chọn) Persist trạng thái expand qua `sessionStorage`
- Lưu `expandedItems` để reload không reset. Mặc định OFF, bật nếu user yêu cầu.

## File sẽ chạm

- `src/components/layout/Sidebar.tsx` — chính
- (Tùy chọn) `src/components/layout/SidebarBadge.tsx` — tách badge để memo riêng

## Test / verify

- Click qua 5 module khác nhau, quan sát:
  - Không thấy skeleton flash khi đã login.
  - Nhóm cũ tự đóng, nhóm mới tự mở.
  - Animation 300ms mượt, không giật.
- `pendingCounts` thay đổi (giả lập tạo task mới) → chỉ badge nhấp nháy, dropdown không re-collapse.
- Reload trang ở `/inventory/transactions` → nhóm Inventory mở sẵn.

## Cần xác nhận từ bạn

1. **Khi click 1 mục con, có muốn nhóm cha tự đóng lại sau khi điều hướng không?**
   - (a) Giữ mở (vì child active trong nhóm) — mặc định hiện tại + đề xuất B.
   - (b) Tự đóng lại sau navigate — accordion-style, gọn hơn nhưng phải mở lại nếu muốn chọn child khác.
2. **Có cần persist trạng thái expand qua reload (sessionStorage)?** Y/N.

Nếu bạn không nói gì, mình mặc định (1a) + (2) = N.
