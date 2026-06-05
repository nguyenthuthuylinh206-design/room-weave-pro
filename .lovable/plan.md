# Audit menu /inventory — Báo cáo phát hiện & lộ trình

Phạm vi quét: `src/pages/inventory/*` (14 trang, 6.100 dòng), `src/components/inventory/*` (40 component) và 2 mobile form khổng lồ (Inbound 647 dòng, Outbound 1.173 dòng). Đối chiếu với các Core rule trong memory (Vietnamese-first, single-page Zod form, tenant_id filter, atomic RPC, semantic colors).

---

## A. Tổng quan kiến trúc hiện tại

```text
/inventory  (InventoryDashboardPage — 570 dòng, hub tabs+sidebar)
├── tab=overview        Desktop: InventoryOverviewSection (TodoCard + KPI + Bento)
│                       Mobile : MobileInventoryDashboard (Hero + FAB + sections)
├── tab=assets          items / categories / new (lazy ItemsPage, CategoriesPage, ItemFormPage)
├── tab=operations
│   ├── sub=transactions  TransactionListPage (450 dòng)
│   ├── sub=inbound       Desktop InboundPage (371) | Mobile MobileInboundForm (647, 3-step wizard) ❌
│   ├── sub=outbound      list/manual nested tabs → DistributionOrdersPage + OutboundPage (614)
│   │                     Mobile: MobileOutboundForm (1.173 dòng wizard) ❌
│   ├── sub=transfer      TransferPage (329)
│   ├── sub=adjustments   AdjustmentListPage (316) → /adjustments/new (498) → /:id/check (626) → /:id (646)
│   └── sub=reorder       ReorderSuggestionsPage (279)
├── tab=analytics       dead-stock / consumption
└── tab=settings        supplements / warehouses
```

---

## B. Phát hiện theo mức độ ưu tiên

### 🔴 P0 — Vi phạm Core rule / data integrity

1. **Mobile Inbound + Outbound form là wizard nhiều bước (3 step / 4 step)**
  - `MobileInboundForm.tsx`: `const [step, setStep] = useState(1); const totalSteps = 3` (L56-62) — fields không render đồng thời. Zod chạy submit cuối ⇒ user có thể đứng yên ở step 2 với lỗi step 1 nhưng không thấy.
  - `MobileOutboundForm.tsx` (1.173 dòng) cũng wizard.
  - Vi phạm Core: *"Zod forms must render all fields on a single page (no multi-step hiding) to ensure validation"*.
2. **Schema lệch giữa desktop và mobile Inbound**
  - Desktop `inboundSchema`: `to_warehouse_id: z.string().uuid()` (yêu cầu chọn từ WarehouseSelect).
  - Mobile `createInboundSchema`: `to_location: z.string().min(1)` (text tự do!).
  - Hậu quả: dữ liệu nhập trên mobile không gắn vào warehouse → vi phạm `Warehouse Prerequisite` memory; sau này khó join, không tính tồn theo kho được.
3. **Outbound schema gọi `t()` bên trong refine — message i18n nhưng schema được tái tạo mỗi render**
  - `createOutboundSchema(t)` chạy trong component → mỗi render tạo schema mới → resolver mới → invalidate `useForm` cache, làm rerender form và lost focus trên input dài.
4. **OutboundPage chứa 5 nghiệp vụ trong 1 trang 614 dòng**
  - `room_assign | laundry | maintenance | disposal | other` → field bật/tắt theo category với 4 `.refine` lồng nhau. Lỗi validation hay rơi vào `path: ['items']` hoặc `['to_location']` không khớp field UI → toast "Vui lòng kiểm tra" nhưng user không thấy field nào lỗi.
5. **Adjustment status flow không có guard transition**
  - `statusConfig` chứa `draft / in_progress / completed / approved / rejected` cập nhật trực tiếp qua hook (không thấy RPC `transition_adjustment_status`). Khác với chuẩn FSM đã áp dụng cho `rooms/bookings/housekeeping_tasks` (memory *State Machine Column Revoke v1*). Có thể bypass quy tắc duyệt.

### 🟠 P1 — UX khó chịu nghiêm trọng

6. **Hub có ba lớp navigation chồng chéo trên mobile (<lg)**
  - PageHeader + dòng "Menu + Search" + ScrollableTabsList sticky + sub-tab strip → ~200px chiều cao trước khi thấy content trên iPhone SE.
  - Mỗi tab lại có sub-tab ngang riêng (Operations 6 tab, lại lồng 2 sub-tab cho outbound).
7. **Sub-tab dùng nhãn "+ Nhập kho", "+ Tạo phiếu mới", "+ Thêm tài sản"**
  - Mix giữa tab điều hướng và CTA tạo mới. Người dùng click "+ Nhập kho" tưởng mở dialog tạo nhanh, thực tế chỉ chuyển tab sang trang form đầy đủ.
8. **Outbound view legacy redirect chạy mỗi render**
  - `useEffect` ở L140-153 setSearchParams khi `sub=distributions` hoặc `view=from-requests`. Nhưng `searchParams` nằm trong deps ⇒ chạy lại mỗi lần URL đổi → có thể tạo loop ngắn ở hash routing.
9. **Trang TransactionList 450 dòng, không server-side pagination**
  - Tương tự lỗi đã sửa ở `RoomStandards` (memory Sprint 3). Trên tenant >1.000 transaction, client load full → chậm + miss vì 1.000-row cap.
10. **AdjustmentList tab "Approved" không có pagination control mobile**
  - `useStockAdjustments(filters, page, 25)` nhưng UI mobile không hiển thị `setPage(...)` → user không xem được trang 2.
11. **InventoryDashboardPage import 14 lazy chunks ngay từ đầu**
  - Mọi tab đều `lazy(...)` nhưng `<Suspense>` bọc từng `<TabsContent>` của shadcn render ngầm cả khi không active ⇒ thực tế tải gần như toàn bộ chunk khi mở overview (đo qua Network khi tăng tốc lần đầu).
12. **Mobile FAB + bottom nav + sticky CTA chồng nhau**
  - `MobileInventoryFAB` + bottom-nav permission (memory `mobile-bottom-nav-and-back-behavior-v1`) + sticky form footer ⇒ thumb zone bị che, đụng vào "Confirm" rất khó.

### 🟡 P2 — Sạch nghiệp vụ / nhất quán

13. **Trùng lặp logic Outbound**
  - `OutboundPage` (desktop), `MobileOutboundForm`, `QuickOutboundDialog`, `useOutboundSubmit` (memory *Outbound Shared Sub-form v1*). Vẫn còn nhánh `room_assign` dùng `DistributionForm` riêng → 3 source of truth.
14. **InboundPage prefill từ adjustment không validate hotel_id**
  - `prefillFromAdjustment.hotelId` được dùng ngầm; không có hook setHotelContext ⇒ nếu user đổi hotel trong middle, items vẫn submit vào kho hotel hiện tại.
15. **Mobile Inbound dùng `useItems({ search }, 1, 50)**`
  - Search debounce không có; mỗi keystroke fetch 50 item. Cũng không filter theo hotel selected.
16. **Reorder suggestion không hiển thị "Mua bao nhiêu nữa"**
  - Chỉ hiển thị `min_stock`, `current_stock`, `vendor`. Cần `suggested_qty = max_stock - current_stock` rõ ràng + giá ước tính tổng.
17. **Icon vẫn xuất hiện trong tab (ClipboardCheck, Plus, ArrowDown…)**
  - Vi phạm Core *"No icons/emojis in tabs"* — đã thấy ở `MobilePrimaryActions`, `MobileSecondaryActions`, dropdown "Khác".
18. **Status color không nhất quán**
  - `AdjustmentList` dùng `text-blue-600`, `text-yellow-600`. Theo Core chỉ cho phép `text-green-600 / text-red-600 / text-amber-600` (không có blue/yellow).
19. **Currency format ở `OutboundPage` dùng `toLocaleString` mặc định**
  - Một vài chỗ format "1,700,000 ₫" (comma) thay vì dot ⇒ vi phạm Core *"dots for thousands separator"*.
20. **Distributions order flow thiếu trạng thái "Cần làm ngay" highlight**
  - Đã chuẩn hoá ở memory *Distribution Order UI v2* (3-bucket + NextActionCard), nhưng hub list mới không render NextActionCard ⇒ regression.

### 🟢 P3 — Polish / kỹ thuật

21. CreateAdjustmentPage 498 dòng + CheckAdjustmentPage 626 dòng + AdjustmentDetailPage 646 dòng → đề xuất tách `<AdjustmentItemRow>`, `<InvestigationPanel>` shared component.
22. `useInventoryHubBadges` chạy polling mỗi 30s nhưng không subscribe realtime → badge "Đang chờ duyệt" trễ.
23. Không có unit test cho `useOutboundSubmit`, `useCreateInboundTransaction` (memory đã yêu cầu ≥80% coverage cho logic quan trọng).
24. `DistributionOrderDetailPage` không có breadcrumb back → `navigate(-1)` từ deep-link mở trực tiếp về landing.
25. `DeadStockPage` chưa export CSV (`/reports/inventory` có nhưng module này không).

---

## C. Đề xuất Sprint (giống cấu trúc đã làm với /rooms)

### Sprint 1 — Validation & FSM (P0 #1–#5)

- Refactor `MobileInboundForm` & `MobileOutboundForm` về **single-page** (giữ section accordion thay vì step). Tận dụng shared `useOutboundSubmit`, `OutboundCategoryGrid`.
- Hợp nhất schema Inbound: tạo `src/lib/inventory/inboundFormSchema.ts` (giống `roomFormSchema`) dùng `to_warehouse_id: uuid` chung cho desktop + mobile.
- Tạo RPC `transition_adjustment_status(adjustment_id, next_status, reason)`; revoke UPDATE column `status` trên `stock_adjustments`; log audit (theo chuẩn FSM rooms/bookings).
- Tách `OutboundPage` thành 5 sub-component `<OutboundRoomAssign>`, `<OutboundLaundry>`… mỗi nghiệp vụ form riêng, validate riêng.

### Sprint 2 — Hub Mobile UX (P1 #6–#12)

- Gộp PageHeader + Quick search vào 1 hàng compact; ẩn ScrollableTabsList khi sub-tab có sub của riêng nó.
- Đổi tab có "+" thành button CTA tách rời (góc phải tab strip).
- Sửa effect legacy redirect: thêm guard `if (sub === 'distributions')` chạy 1 lần qua ref.
- Lazy thật sự bằng `React.lazy` + conditional render `{tab === 'operations' && <Outlet/>}` thay vì `<TabsContent>` luôn mount.
- Ẩn `MobileInventoryFAB` khi đang trong form (có sticky footer riêng).

### Sprint 3 — Hardening (P1 #9–#10, P2 #13–#17)

- Server-side pagination + search cho TransactionList (tương tự đã làm RoomStandards).
- Thêm pagination footer cho AdjustmentList mobile.
- Đồng bộ `formatCurrency` (1.700.000 ₫) toàn module.
- Bỏ icon trong tab/dropdown theo Core.
- Đổi `text-blue-600`/`text-yellow-600` → semantic tokens (`text-muted-foreground`, `text-amber-600`).
- Add debounce 250ms cho `useItems` search.
- Tích hợp realtime cho `useInventoryHubBadges` (channel `inventory-hub`).

### Sprint 4 — Cleanup, FSM Phase 2, Tests

- Tách AdjustmentDetail/Check thành component nhỏ tái dùng.
- Test cho RPC `transition_adjustment_status`, `useOutboundSubmit`, schema parse.
- Lazy `DistributionForm` (chỉ load khi category = room_assign).
- Bổ sung NextActionCard cho hub list distribution.
- Export CSV cho DeadStock.
- Bump version + changelog mỗi sprint (Core release rule).

---

## D. Câu hỏi cần xác nhận trước khi bắt đầu

1. **Sprint 1** ưu tiên `Mobile form single-page` 
2. Khi gộp schema Inbound, mobile user trên `to_location` text tự do (đang dùng) sẽ phải chọn warehouse từ danh sách —  auto-pick `defaultWarehouse` 
3. Sprint chạy theo cùng nhịp như /rooms (1 sprint / message)

Trả lời 3 câu trên, mình sẽ vào build mode bắt đầu Sprint 1.