
## Vấn đề hiện tại

Trang `/inventory?tab=overview` bị "lộm cộm" do:
1. KPI Grid 6 cột compact ở trên cùng — nhưng ngay sau là "Thao tác nhanh" (CompactActionBar) chèn ngang phá nhịp.
2. Grid 7/5 (chart + forecast) rồi đến grid 4/4/4 (top consumed + low stock + alerts/transactions) — 2 hệ lưới khác nhau cạnh nhau, không thẳng cột.
3. Cột phải của hàng 2 chứa 2 widget chồng (Alerts + Recent Transactions) làm chiều cao lệch hẳn so với 2 cột bên trái.
4. "Cảnh báo tồn kho thấp" và "Cảnh báo kho" trùng lặp ý nghĩa, đặt cạnh nhau gây rối.
5. Hotel Breakdown nằm rời rạc dưới cùng, không có section header.

---

## A. Layout mới (desktop ≥lg)

```text
┌────────────────────────────────────────────────────────────┐
│ KPI Grid — 6 cards (giữ nguyên)                            │
├────────────────────────────────────────────────────────────┤
│ Toolbar: [Thao tác nhanh ▾]              (1 hàng mảnh)    │
├──────────────────────────────────┬─────────────────────────┤
│ Biểu đồ biến động (8 cols)       │ Dự báo hết hàng (4)    │
│ h-[320px]                        │ h-[320px] scroll        │
├──────────────────────────────────┼─────────────────────────┤
│ Top tiêu hao 30d (8 cols)        │ Cảnh báo & tồn thấp (4)│
│ h-[320px]                        │ (gộp LowStock+Alerts)   │
├──────────────────────────────────┴─────────────────────────┤
│ Giao dịch gần đây — full width, bảng compact 2 cột         │
├────────────────────────────────────────────────────────────┤
│ Section: "Phân bổ theo khách sạn" (chỉ All Hotels)         │
└────────────────────────────────────────────────────────────┘
```

Nguyên tắc:
- Thống nhất 1 hệ grid `lg:grid-cols-12` cho mọi hàng → các cột thẳng nhau.
- 2 hàng widget chính dùng cùng tỷ lệ 8/4 → tạo "rãnh" thẳng đứng.
- Mọi widget cùng hàng dùng cùng `min-h` (320px) → không lệch chiều cao.
- "Giao dịch gần đây" tách thành hàng riêng full-width vì là list dài, không hợp khi nhồi cột hẹp.
- Gộp `LowStockAlert` + `InventoryAlertsWidget` thành 1 widget cảnh báo duy nhất với 2 section bên trong.

---

## B. Mobile (<lg)

- KPI Grid: 2 cột (giữ nguyên).
- Toolbar action: full width.
- Mọi widget: 1 cột stack dọc theo thứ tự: Forecast → Cảnh báo gộp → Chart → Top tiêu hao → Giao dịch gần đây.
  (Ưu tiên thông tin cần hành động lên trước trên mobile.)

---

## C. Files sửa (UI thuần, không đụng logic/data)

1. `src/components/inventory/InventoryOverviewSection.tsx` — refactor JSX layout theo sơ đồ trên.
2. `src/components/inventory/InventoryAlertsWidget.tsx` *(hoặc tạo mới `CombinedStockAlerts.tsx`)* — gộp LowStockAlert vào trong, thêm tab hoặc 2 section header rõ ràng.
3. `src/components/inventory/InventoryValueChart.tsx`, `InventoryForecastWidget.tsx`, `InventoryTopConsumedWidget.tsx`, `RecentTransactions.tsx` — chỉ thêm `min-h-[320px]` / `h-full` để đồng đều chiều cao, không đổi nội dung.
4. `InventoryHotelBreakdown.tsx` — bọc thêm section header `<h2 class="text-sm font-medium tracking-wide uppercase text-muted-foreground">Phân bổ theo khách sạn</h2>` + `border-t pt-4`.

Không đụng: hooks, data layer, KPI Grid, MobileInventoryDashboard (mobile vẫn dùng component riêng).

---

## D. Permission / Test / Rollout

- Permission: không đổi.
- Test thủ công:
  1. Desktop 1746px: 2 hàng widget cùng rãnh cột 8/4, chiều cao bằng nhau.
  2. Tablet 1024px: vẫn 8/4, không xuống dòng giữa chừng.
  3. Mobile 390px: stack 1 cột đúng thứ tự ưu tiên.
  4. All Hotels mode: section "Phân bổ theo khách sạn" có header và border-top.
  5. Single hotel: section ẩn hoàn toàn.
- Bump `APP_VERSION` → `1.1.9`, thêm changelog "Sắp xếp lại layout Tổng quan Kho cho cân đối".
- Rollback: revert 2 file chính (`InventoryOverviewSection.tsx`, alerts widget).

---

## Giả định

- Chấp nhận gộp LowStock + Alerts thành 1 khối (đỡ trùng lặp). Nếu bạn muốn giữ tách riêng, mình sẽ đặt cùng cột phải nhưng có divider rõ ràng thay vì gộp.
