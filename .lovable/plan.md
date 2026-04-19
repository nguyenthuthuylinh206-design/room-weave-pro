

## Tổng kết các lỗi phát hiện ở module Báo cáo

### 🔴 LỖI NGHIÊM TRỌNG (sai dữ liệu / hiển thị 0)

#### 1. `DamagesReportPage.tsx` — **Đếm sai hoàn toàn, luôn ra 0**
DB lưu `items_damaged` / `items_lost` là **JSONB array** (mảng object có `item_id`, `item_name`, `quantity`, `notes`...):
```json
[{ "item_id": "...", "item_name": "Ấm đun nước", "notes": "cháy" }]
```
Nhưng code (dòng 38, 111-115, 120-125, 335, 340) lại coi là **`Record<string, number>`** (object dạng `{itemId: qty}`):
```ts
items_damaged: Record<string, number>
const damagedCount = Object.values(damaged).reduce((sum, v) => sum + v, 0)
```
→ Khi gặp array, `Object.values([{...}])` trả `[{...}]`, sum → `NaN` hoặc `[object Object]`. **Tất cả số liệu Hỏng/Mất ở trang này đều sai**.

Đây cùng vấn đề đã sửa cho `BookingIssuesCard` nhưng `DamagesReportPage` chưa được sửa.

#### 2. `MaintenanceReportPage.tsx` — **3 mục bị bỏ trống**
Code hard-code `costByType = []`, `monthlyTrend = []`, `recurringIssues = []` (dòng 73-80) với comment "not available from current hook" → 3 chart/table này hiển thị rỗng. Cần dùng `useRecurringIssues` (đã có) + tạo RPC chi phí theo loại + xu hướng theo tháng.

#### 3. `useRevenueReport.ts` — **Tính `pendingRevenue` sai khi có cọc**
Dòng 146:
```ts
pendingRevenue = total_amount - amount_paid - deposit_amount
```
Nhưng `paidRevenue` (dòng 144) chỉ cộng `amount_paid`, **không cộng `deposit_amount`** → `paidRevenue + pendingRevenue ≠ totalRevenue`. Theo memory `checkout-and-payment-logic`: số đã thu = `amount_paid + deposit_amount`. Dẫn đến doanh thu tổng bị thiếu phần cọc đã thu.

#### 4. `useRevenueReport.ts` — **`netRevenue` bị trừ commission 2 lần**
Dòng 151:
```ts
netRevenue = sum(b.net_revenue || b.total_amount) - otaCommission
```
Nếu DB đã lưu `net_revenue` (đã trừ commission), trừ thêm `otaCommission` → âm. Nếu chỉ có `total_amount`, trừ 1 lần là đúng. Logic mixed gây sai khi có dữ liệu hỗn hợp.

#### 5. `MobileMaintenanceReportPage.tsx` & các trang Mobile — không truyền `dateRange`
`MaintenanceReportPage` desktop có `dateRange` state nhưng `useMaintenanceDashboard()` không nhận tham số → date picker không có tác dụng, luôn lấy mặc định.

---

### 🟡 LỖI TRUNG BÌNH (UI/UX hoặc edge case)

#### 6. `useOutboundReport.ts` — Chỉ filter theo `tenant_id`, **bỏ `hotel_id` khi `isAllHotelsMode`**
Dòng 90: `if (!isAllHotelsMode && selectedHotel?.id)` — đúng. Nhưng dòng 104 không bao gồm category mới (vd `room_check`, `transfer`...) → `transactions` có category lạ bị nhồi vào `'other'` mà không tổng hợp lại. (Minor)

#### 7. `useOperationsReport.ts` — `total_value` của `out` đôi khi âm
Code (dòng 125) dùng `Math.abs(t.total_value)` cho outbound — đúng cho trường hợp DB lưu âm. Nhưng `net_change_value` (dòng 126) lại sum `total_value` raw → có thể ra âm nếu out lưu âm, hoặc dương nếu out lưu dương → không nhất quán.

#### 8. `ReportsDashboardPage.tsx` — **Vi phạm chuẩn UI dự án**
Dùng `Card`, `bg-blue-500/10`, `bg-emerald-500/10`, icons trong tabs/cards (memory `enterprise-saas-and-localization-standards-spec`, `minimalist-ui-icon-reduction-spec`). Nút "Xuất tất cả" (dòng 188) chưa có handler.

#### 9. `OutboundReportPage.tsx` — Tabs có icons (vi phạm chuẩn)
Dòng 281-304: 6 tabs đều có `<Package/>`, `<Users/>`, `<WashingMachine/>`... → vi phạm "no icons in tabs".

#### 10. `MaintenanceReportPage.tsx` — Nút "PDF" và "Excel" disabled mãi
Dòng 99-104: cả 2 nút export `disabled={isExporting}` nhưng **không có `onClick`** → bấm không có gì xảy ra.

#### 11. `ReportsDashboardPage` — Nút Refresh không invalidate đủ
Chỉ invalidate `quick-report` + `dashboard-stats`, không invalidate `revenue-report`, `inventory-report`, `laundry-report`... → bấm refresh các trang con không reload.

#### 12. `useRevenueReport` — Không filter theo `tenant_id` khi `tenantId` undefined
Dòng 131: `if (tenantId) query = query.eq('tenant_id', tenantId)` — nếu `tenantId` undefined ngay sau login, query sẽ lấy **của mọi tenant** (RLS chặn nhưng vẫn nguy hiểm về performance + memory `tenant-isolation-filtering-standard` yêu cầu BẮT BUỘC filter).

---

### 🟢 LỖI NHỎ

#### 13. `RevenueReportPage` & các trang report khác chưa có `<HotelFilterCard />`
Người dùng không biết đang xem hotel nào, không đổi được trừ khi vào sidebar.

#### 14. `useReports.useQuickReport` — `inventoryQuery.eq(...)` không reassign
Dòng 177-179: `inventoryQuery.eq('hotel_id', hotelId)` — Supabase builder cần reassign `inventoryQuery = inventoryQuery.eq(...)`. Cách này có thể vẫn work do mutation, nhưng không an toàn.

#### 15. `DamagesReportPage.tsx` — Chỉ filter hotel sau khi query, không filter ở DB
Dòng 87-92: query lấy toàn bộ checks tenant, rồi filter trong JS. Hotel có nhiều phòng → chậm + lãng phí băng thông.

---

## Đề xuất sửa (theo độ ưu tiên)

| # | File | Mức | Sửa gì |
|---|---|---|---|
| 1 | `DamagesReportPage.tsx` | 🔴 | Parse JSONB array thay vì Record. Đếm `length`, lấy `notes` làm nguyên nhân, hiển thị tên item |
| 2 | `useRevenueReport.ts` | 🔴 | `paidRevenue += deposit_amount`; sửa logic `netRevenue` không trừ 2 lần |
| 3 | `MaintenanceReportPage.tsx` | 🔴 | Thêm RPC `get_maintenance_report(tenant, hotel, from, to)` → cost by type + monthly trend + recurring; gắn handler PDF/Excel |
| 4 | `useOperationsReport.ts` | 🟡 | Chuẩn hoá: outbound luôn dương, `net_change = inbound - outbound` |
| 5 | `ReportsDashboardPage.tsx` | 🟡 | Bỏ `Card` → `border rounded-lg`, bỏ bg màu, bỏ icon trong tabs; thêm hotel filter; bỏ nút "Xuất tất cả" hoặc thêm logic |
| 6 | `useReports.ts` (`useQuickReport`) | 🟡 | Reassign builder; bắt buộc tenant filter |
| 7 | `OutboundReportPage.tsx` | 🟡 | Bỏ icons trong tabs |
| 8 | Tất cả report pages | 🟢 | Thêm `<HotelFilterCard />` ở trên cùng |

---

## Câu hỏi xác nhận

1. **Phạm vi sửa**:
   - A: Chỉ sửa 3 lỗi 🔴 nghiêm trọng (DamagesReport sai số liệu, RevenueReport sai công thức, MaintenanceReport rỗng) — nhanh, ~3 file
   - B: Sửa hết 🔴 + 🟡 (8 file) — bao gồm cả chuẩn hoá UI
   - C: Sửa toàn bộ 15 lỗi (làm sạch hoàn toàn module Báo cáo)

2. **Báo cáo Bảo trì** — bạn muốn có những phân tích nào? (hiện đang rỗng 3 mục)
   - A: Cả 3: Chi phí theo loại + Xu hướng theo tháng + Vấn đề lặp lại
   - B: Chỉ Xu hướng theo tháng + Chi phí theo loại
   - C: Bỏ luôn 3 mục đó, chỉ giữ thống kê tổng

3. **`paidRevenue` trong báo cáo doanh thu** — có nên cộng `deposit_amount` không?
   - A: Có — đúng theo memory `checkout-and-payment-logic` (đã thu = amount_paid + deposit_amount)
   - B: Không — coi cọc là chưa "ghi nhận doanh thu" cho đến khi checkout

