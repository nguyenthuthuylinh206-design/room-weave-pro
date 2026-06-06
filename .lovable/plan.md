
# Đánh giá Kho & Tài sản + Phòng

Phân tích trên codebase hiện tại (sau Batch 3). Mỗi phát hiện ghi rõ mức độ ưu tiên: **P0** (gây sai dữ liệu / khóa thao tác), **P1** (UX khó dùng đáng kể), **P2** (đánh bóng).

---

## A. KHO & TÀI SẢN (`/inventory`)

### A1. Cấu trúc menu trùng lặp — gây bối rối (P1)
- Sidebar trái (laptop) đã có 5 nhóm × 14 mục, đồng thời còn `TabsList` ngang ở mobile + breadcrumb. Trên desktop, sidebar và tab strip không hiển thị cùng lúc (tab ẩn ở `lg`), nhưng **header còn 1 dải breadcrumb riêng** + nav sidebar có cùng nội dung → 2 lớp điều hướng song song.
- Mục **"Bảng điều khiển"** trong nhóm "Tổng quan" và **"Giao dịch kho"** lại đặt chung nhóm với Tổng quan trong khi thực ra thuộc Vận hành → phân loại không nhất quán với memory `inventory-hub-consolidation-v1`.
- **Đề xuất**: gom "Giao dịch kho" về nhóm "Xuất nhập kho"; bỏ breadcrumb khi `tab !== overview` ở laptop (sidebar đã đủ context); rename nhóm "Sản phẩm" → "Tài sản" cho đồng nhất với tab.

### A2. CTA "Thêm tài sản" trong tab "Tài sản" lẫn vai trò trang vs. action (P1)
- Sub-tab `assets` có `'items' | 'categories' | 'new'` — `new` thực chất là form tạo, không phải dạng "danh sách". Mặc dù mở được, click "+ Thêm tài sản" sẽ thay đổi URL `?sub=new`, người dùng back/forward khó hiểu.
- **Đề xuất**: bỏ sub-tab `new`, dùng dropdown "Khác → Thêm tài sản" (đã có) hoặc nút `+` trong tab `items`. Giữ 2 sub-tab `items | categories`.

### A3. Header có 3 CTA primary cạnh nhau (Nhập / Xuất / Khác) (P2)
- Memory `inventory-hub-task-first-v3` yêu cầu **2 CTA primary**. Hiện cả "Nhập kho" và "Xuất kho" đều `variant="default"` → giảm tính tập trung. Nên Nhập = primary, Xuất = secondary outline (hoặc ngược lại tuỳ workload).
- Touch target trên mobile: 3 nút + Menu chip trong 1 hàng → khả năng overflow ngang. Nên ẩn "Khác" vào kebab menu trên mobile dưới 360px.

### A4. TodoCard "Việc cần làm hôm nay" — thiếu mức ưu tiên & hành động batch (P1)
- 4 loại task (dist / soonout / reorder / adj) sắp xếp theo thứ tự cứng. Khi có >5 mục, không có sort theo tone/severity, không cap.
- "soonout" tone `danger` nhưng "dist" tone `warning` → ngược trực giác (xuất kho chờ duyệt thường khẩn hơn dự báo 7 ngày). Nên cho phép cấu hình hoặc tự gắn `danger` khi distribution >24h chưa duyệt.
- Empty state hiện "Mọi thứ đang ổn" nhưng không kèm link kiểm tra báo cáo gần đây — thiếu next action.

### A5. KPI tile vs. CombinedStockAlerts trùng số liệu (P2)
- KPI "Sắp hết (7 ngày)" và CombinedStockAlerts tile "Sắp hết <7d" cùng nguồn `forecastSoonOut` nhưng đặt cách nhau, không cross-link rõ. Người dùng dễ tưởng 2 con số khác nhau.
- **Đề xuất**: nhấn KPI tile cuộn xuống CombinedStockAlerts (scroll + highlight) hoặc rút gọn 1 nơi.

### A6. Realtime gaps đã phát hiện ở Batch 3 — còn `useReorderSuggestions` (P2)
- TodoCard đã realtime cho 3 nhóm chính. Nhưng trang `/inventory?tab=operations&sub=reorder` không có subscribe `reorder_suggestions` UPDATE/INSERT — khi cron sinh đề xuất mới, user phải F5.

### A7. Mobile dashboard không có Quick Search (P1)
- Desktop có `InventoryQuickSearch` (Cmd+K), mobile chỉ render `MobileInventoryDashboard` không kèm search. User mobile muốn tìm 1 item phải vào sub-tab Tài sản → 2 thao tác thừa.

### A8. Outbound shared sub-form đã chuẩn hoá — nhưng entrypoint chưa rõ (P2)
- Memory `outbound-shared-subform-v1` nói có `QuickOutboundDialog` và `MobileOutboundForm`. Nút "Xuất kho" ở header điều hướng `/inventory/outbound/new` (page mode), trong khi Quick dialog không có entrypoint từ hub overview → giảm tốc độ thao tác.
- **Đề xuất**: ở mobile, nút "Xuất kho" mở `QuickOutboundDialog` (1 sheet), giữ page mode cho phiếu phức tạp.

---

## B. PHÒNG (`/rooms`)

### B1. 4 view mode + role-default — học khá nặng (P1)
- `grid | list | floor | map` — 4 tab + tooltip dài. Default theo role giúp nhưng nhãn "Lưới (HK)" / "Lịch đặt phòng" / "Sơ đồ tình trạng" dễ lẫn với nhau với người mới. Floor (tape chart) và Map (status) cùng là "sơ đồ" trong đầu user.
- **Đề xuất**: gom còn 3 view chính cho từng role view (HK / Lễ tân / Quản lý booking), ẩn các view không phù hợp role; hoặc đổi nhãn: "Bảng" / "Sơ đồ phòng (Lễ tân)" / "Tape chart (Booking)".

### B2. Bulk actions bar + select-all checkbox xung đột với Quick View click (P1)
- Memory `rooms-grid-quick-view-consolidation-v1` quy định click card body → mở Quick View. Nhưng `RoomGrid` cũng hỗ trợ Shift+Click range / Cmd+Click toggle để multi-select (`quick-view-multi-select-v2`). Vùng click overlap → user click 1 cái dễ "mở dialog thay vì chọn".
- Hiện trạng: checkbox "select all" hiện ở mức page, còn per-card không có checkbox visible (theo memory v2 chỉ vào selection mode khi Shift+Click). Người không biết shortcut sẽ không tìm thấy cách select.
- **Đề xuất**: hiển thị nhỏ overlay checkbox khi hover card desktop; mobile dùng long-press 500ms (đã có) nhưng cần affordance trực quan (vd. hint chip "Giữ để chọn nhiều").

### B3. Subtitle hướng dẫn vai trò ở `RoomsPage` chỉ thấy desktop (P2)
- `<p>` mô tả view chỉ render trong nhánh desktop. Mobile (`MobileRoomsPage`) không có dòng giải thích nào — user mới chuyển view không biết khác nhau gì.

### B4. RoomGrid section "Bình thường" mặc định collapse — nhưng không phân biệt rõ phòng đang occupied vs sạch (P1)
- Memory `grid-priority-and-role-split-v1` đã phân 3 section urgent/warning/normal. Tuy nhiên trong nhóm "Bình thường" trộn cả phòng `occupied` (đang có khách), `clean` (sẵn sàng) và `out_of_service` (đã lift). Department manager khó scan.
- **Đề xuất**: trong section Normal, tách subgroup nhỏ theo trạng thái (Sẵn sàng / Đang ở / Khác) hoặc gắn nhóm chấm semantic ở header subgroup.

### B5. CTA "Kiểm tra" trên card phòng — chạy qua RoomCheckRouter (P0 đối với staff không có shift)
- Memory `require-shift-gate-v1` wrap route `/rooms/:id/check*`. User staff bấm "Kiểm tra" nhưng chưa vào ca sẽ thấy dialog "Vào ca ngay". OK về flow, nhưng UI card không hint trước → click thừa.
- **Đề xuất**: với staff chưa vào ca, render nút "Kiểm tra" disabled + tooltip "Bạn cần vào ca trước"; click → mở RequireShift dialog trực tiếp (không navigate).

### B6. Quick View chứa quá nhiều action (P1)
- `RoomQuickViewDialog` 303 LOC: đổi trạng thái, vật tư, session check, history, giao việc, xem chi tiết, audit log… → dialog quá tải, không tận dụng route detail.
- **Đề xuất**: giữ Quick View ở mức "xem nhanh + 2 action chính" (Kiểm tra + Đổi trạng thái), các action khác di chuyển vào trang detail `/rooms/:id`.

### B7. Tape chart và Floor map chưa share filters với `RoomFilters` (P2)
- `RoomFilters` (search, floor, status) chỉ tác động trực tiếp đến `RoomGrid`/`RoomTable`. Khi switch sang tape chart / floor map, filter visually còn ở header nhưng không thực sự lọc → người dùng confuse.
- **Đề xuất**: hoặc ẩn `RoomFilters` ở 2 view này, hoặc cho 2 view tự áp dụng floor/status filter.

### B8. Việc "vào ca" gate ở Mobile có thể chặn dialog Quick View action (P2)
- `useTaskTransition` / `useBookingActions` bị wrap. Khi staff mở Quick View ở mobile, các nút như "Báo vật tư thiếu" có thể không rõ tại sao bị chặn → cần inline hint trong dialog thay vì popup gate.

---

## C. Cross-cutting (Kho ↔ Phòng)

### C1. Distribution flow xuyên 2 module — nhưng không có "back-link" rõ (P1)
- Tạo phiếu xuất từ Quick View phòng (qua `RoomSupplementSheet`) → push vào distribution orders. Sau khi tạo, không có toast kèm CTA "Xem phiếu vừa tạo" → người dùng không biết phải vào `/inventory?tab=operations&sub=outbound` để theo dõi.
- **Đề xuất**: toast success kèm action "Mở phiếu".

### C2. Room check missing items → reorder suggestions: latency cảm nhận (P2)
- Memory mô tả chain Room check → consumption_snapshots → reorder_suggestions (cron hourly). User vừa report `missing 2 cái khăn` sẽ không thấy phản ánh vào dashboard ngay. Cần một dòng "Cập nhật mỗi giờ" trong CombinedStockAlerts để giảm hiểu lầm.

---

## D. Đề xuất chia 4 Batch fix

### Batch 4A — Kho menu & header (P1, client-only, ~5 file)
- Bỏ sub-tab `assets/new` (chỉ giữ items + categories).
- Gom "Giao dịch kho" về nhóm Xuất nhập, rename nhóm "Sản phẩm" → "Tài sản".
- Ẩn breadcrumb ở header desktop khi đã có sidebar.
- Đổi 1 trong 2 nút Nhập/Xuất thành outline secondary.
- Thêm `InventoryQuickSearch` vào `MobileInventoryDashboard` (sticky top).

### Batch 4B — TodoCard & realtime (P1, ~3 file)
- Sort theo severity, cap 5 mục + "Xem thêm".
- Tăng tone `distributionsPending > 24h` lên `danger`.
- Realtime `useReorderSuggestions` (subscribe `reorder_suggestions` INSERT).
- Thêm toast CTA "Mở phiếu vừa tạo" cho distribution flow (cross-module C1).

### Batch 4C — Phòng UX (P1, ~6 file)
- Disabled + tooltip nút "Kiểm tra" khi staff chưa vào ca (B5).
- Tách subgroup trong section "Bình thường" của RoomGrid (B4).
- Ẩn `RoomFilters` ở view `floor` & `map` hoặc wire filters (B7).
- Bổ sung subtitle role-hint cho mobile (B3).
- Hint chip "Giữ để chọn nhiều" trên mobile RoomGrid (B2).

### Batch 4D — Quick View slim & detail page (P2, ~4 file, lớn nhất)
- Cắt `RoomQuickViewDialog` còn 2 action chính, đẩy phần còn lại vào `/rooms/:id`.
- Audit `MobileRoomsPage` (592 LOC) → tách component nhỏ hơn để dễ maintain.

### Files dự kiến chỉnh (sơ bộ)
```text
A. src/pages/inventory/InventoryDashboardPage.tsx        (4A)
   src/components/inventory/MobileInventoryDashboard.tsx (4A)
   src/components/inventory/hub/InventoryTodoCard.tsx    (4B)
   src/hooks/useReorderSuggestions.ts                    (4B)
   src/components/rooms/RoomGrid.tsx                     (4C, 4D)
   src/components/rooms/MobileRoomsPage.tsx              (4C, 4D)
   src/components/rooms/RoomQuickViewDialog.tsx          (4D)
   src/pages/rooms/RoomsPage.tsx                         (4C)
```

### Không đụng (giữ nguyên)
- RPC, schema, RLS, permission matrix.
- Distribution / atomic check / state machine v2.
- Route detail `/rooms/:id`, `/inventory/*/new`.

### QA checklist tổng
1. Sidebar Kho: 5 nhóm × ≤4 mục, badge realtime hiện trong <2s.
2. Mobile `/inventory`: search field bám sticky, nút Xuất kho mở Quick dialog.
3. `/rooms`: staff chưa vào ca thấy "Kiểm tra" disabled với tooltip, click → mở RequireShift dialog.
4. Section "Bình thường" có subheader Sẵn sàng/Đang ở.
5. Tạo phiếu xuất từ Quick View phòng → toast có action "Mở phiếu".

### Rollback
- Tất cả client-only, revert commit theo Batch.

---

Bạn duyệt Batch nào trước? Mặc định đề xuất: **4A → 4B → 4C → 4D** (mức ưu tiên P1 → P2). Có thể merge 4A + 4B nếu muốn dồn 1 lần publish.
