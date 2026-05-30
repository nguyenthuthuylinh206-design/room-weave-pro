# Phân tích Logic & UX/UI – Module Xuất kho

## 1. Cấu trúc hiện tại

URL: `/inventory?tab=operations&sub=outbound&view=list|manual|from-requests`

```
Kho (Hub)
└── Vận hành (tab)
    └── Xuất kho (sub-tab)  ← bọc 3 view bằng query ?view=
        ├── Danh sách phiếu   → DistributionOrdersPage (340 LOC)
        ├── + Tạo phiếu thủ công → OutboundPage (562 LOC)
        └── Từ yêu cầu bổ sung   → CreateFromSupplementsPage (373 LOC, embedded)
```

3 file gốc + `CreateDistributionPage.tsx` (167 LOC, route cũ) + `MobileOutboundForm`.

---

## 2. Phân tích Logic nghiệp vụ

### 2.1. "Tạo phiếu thủ công" (OutboundPage)

Một form duy nhất gồng 5 loại nghiệp vụ qua field `transaction_category`:


| Category      | Bảng/RPC ghi                                             | Form con                                                                                   |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `room_assign` | `distribution_orders` (RPC `useCreateDistributionOrder`) | `<DistributionForm/>` riêng (`useDistributionForm`) — **không dùng react-hook-form chính** |
| `laundry`     | `laundry_batches` (RPC `useCreateLaundryBatch`)          | `laundry_items` field array                                                                |
| `maintenance` | `inventory_transactions`                                 | `items` field array + `maintenance_request_id`                                             |
| `disposal`    | `inventory_transactions`                                 | `items` field array                                                                        |
| `other`       | `inventory_transactions`                                 | `items` field array                                                                        |


**Vấn đề logic:**

1. `**room_assign` chạy song song hai state-tree** — `useForm` (warehouse, notes) + `useDistributionForm` (allocations). Submit chỉ đọc `distributionForm.allocations`, bỏ toàn bộ `from_warehouse_id` của form chính → field bắt buộc Zod nhưng không dùng. Đặt là field rác, gây confuse.
2. **Schema Zod refine kép** — `items` required ở refine #1, nhưng `room_assign` luôn return true → user chọn `room_assign` rồi không chọn allocation nào sẽ `return` im lặng (line 175 `if validAllocations.length === 0 return`) — **không có toast lỗi**.
3. `**laundry` validation gắt** (vendor + 2 date + staff + receiver) nhưng error path đẩy về `to_location` → message không hiện đúng field.
4. **3 mutation pending** (`isLoading`, `isDistributionLoading`, `isLaundryLoading`) không hợp nhất → nút submit có thể double-click qua nhánh khác.
5. **Sau submit, navigate khác nhau**: `room_assign` → `/inventory/distributions/:id`, `laundry` → `/laundry/batches/:id`, còn lại → `?sub=transactions`. **Inconsistent** — vừa nói "không cần chuyển trang" lại nhảy đi mất khỏi hub.
6. `**launderableItems` filter `item_type === 'linen'**` hard-code, không cho khăn/ga vendor giặt loại khác.
7. **Field `recipient_name`, `photos`, `notes**` khai báo nhưng chỉ một số category dùng → 1 form quá tải.

### 2.2. "Từ yêu cầu bổ sung" (CreateFromSupplementsPage)

- Đọc `supplement_requests` status=pending.
- Group theo phòng + staff on-shift.
- RPC `useCreateDistributionFromSupplements` tạo distribution_order, mặc định `autoRelease=true`.
- Embedded mode: ẩn header/back/cancel; success set `?view=list`.
- **OK**, nhưng:
  - Không thấy filter theo hotel khi `selectedHotel` null (All Hotels mode).
  - Không pre-check stock trước khi gửi → fail ở RPC.
  - Đã chọn ids qua URL nhưng không clear sau khi tạo xong.

### 2.3. "Danh sách phiếu" (DistributionOrdersPage)

- 4 tab nội bộ: `todo | delivering | done | all` — **tab lồng tab lồng tab** (Hub → Vận hành → Xuất kho → Danh sách phiếu).
- Phân quyền `STOREKEEPER_LEVELS` hard-code trong file → khó maintain.
- Có `RouteFiltersCard` + `PendingSupplementsBanner` (banner chỉ hiển thị → nút "Xử lý ngay" lại đẩy sang view khác?).

### 2.4. Trùng lặp & legacy

- `CreateDistributionPage.tsx` (167 LOC) — route cũ `/inventory/distributions/new`, vẫn tồn tại.
- `QuickOutboundDialog.tsx`, `MobileOutboundForm.tsx` — 2 nhánh UI riêng.
- `useCreateOutboundTransaction` vs `useCreateDistributionOrder` vs `useCreateLaundryBatch` — 3 hook khác đường ghi.

---

## 3. Phân tích UX/UI

### 3.1. Hierarchy quá sâu (selected element)

```
Sidebar Kho → Tabs(7): Tổng quan/Tài sản/[Vận hành]/...
              └─ Tabs(6): Giao dịch/+Nhập/[Xuất kho]/+Chuyển/Kiểm kê/Đề xuất
                          └─ Tabs(3): [Danh sách]/+Tạo thủ công/Từ yêu cầu
                                       └─ Tabs(4): Cần làm/Đang giao/Hoàn thành/Tất cả
```

→ **4 tầng tab**, vi phạm Enterprise SaaS minimalist. Người dùng phải nhớ chỗ mình đang đứng. Trên màn 981px (đang xem) các trigger bị tràn (ScrollableTabsList).

### 3.2. Visual noise

- Cả 3 cấp tab dùng cùng style `TabsTrigger` → không có cue cấp nào là chính.
- Badge `distributionsPending` xuất hiện **2 lần** (cấp 2 "Xuất kho" và cấp 3 "Danh sách phiếu") — redundant.
- Banner "22 yêu cầu bổ sung đang chờ" + tab "Từ yêu cầu bổ sung" + badge số 4 ở "Cần làm ngay" → **3 entry point cho cùng 1 việc**.

### 3.3. Form Xuất kho thủ công

- Select category dùng **emoji** (🏠🧺🔧🗑️➖) — trái với nguyên tắc đã ghi nhớ "Minimalist UI, removal of icons and emojis".
- Form đổi cấu trúc đột ngột khi đổi category (room_assign hiện 1 form lớn riêng, laundry hiện grid 4 cột date/staff, còn lại hiện items array). User dễ mất context.
- Tiêu đề `PageHeader` + nút `Back` vẫn hiện dù đang nằm trong tab → 2 chiều navigation rối.
- Nút submit không sticky, kéo xuống cuối mới thấy.

### 3.4. Mobile

- `if (isMobile) return <MobileOutboundForm/>` ngay đầu OutboundPage → khi vào qua hub mobile, hub layout vẫn render bên ngoài + form khác trong. Tạo cảm giác 2 page.
- `DistributionOrdersPage` mobile dùng card list nhưng filter card chiếm 60% màn hình.

### 3.5. Inconsistency

- "Tạo phiếu thủ công" có prefix `+` ở tab, "Từ yêu cầu bổ sung" thì không → user không hiểu cái nào là CTA tạo mới.
- 3 view khác nhau dùng 3 layout PageHeader khác nhau (list không có header, manual có, from-requests embedded ẩn).

---

## 4. Rủi ro & nợ kỹ thuật

1. **Field rác trong Zod** (room_assign yêu cầu `from_warehouse_id` nhưng không dùng).
2. **Submit silent-fail** khi không có allocation hoặc thiếu laundry field (return không toast).
3. **Navigate sau success** xé người dùng khỏi hub — đối nghịch yêu cầu "không cần chuyển trang".
4. `**CreateDistributionPage.tsx` legacy** vẫn còn route, gây 2 đường vào tạo phiếu giao phòng.
5. **3 tầng tab** + 2 lần badge — vi phạm thông tin "Sidebar 1 lối vào" trong memory `inventory-hub-v2-layout`.
6. **Emoji trong Select** vi phạm `minimalist-ui-icon-reduction-spec`.
7. **Hard-code role list** `STOREKEEPER_LEVELS` trong page.
8. `**launderableItems` filter cứng** `linen`.

---

## 5. Khuyến nghị (high-level, chưa triển khai)

### A. Rút gọn hierarchy

- Gộp "Danh sách phiếu" + "Từ yêu cầu bổ sung" thành **một** view duy nhất: bảng phiếu kèm banner gợi ý ("22 yêu cầu chờ → Tạo phiếu") inline.
- Loại tab "Từ yêu cầu bổ sung" — chuyển thành **drawer/sheet** mở từ banner.
- Còn lại 2 view: **Danh sách phiếu** | **+ Tạo mới** (CTA primary, nằm bên phải header thay vì tab).

### B. Tách form theo loại xuất

- Step 1: chọn category (5 thẻ lớn dạng card-picker, không emoji).
- Step 2: chỉ render đúng form con (room_assign | laundry | other).
- Hợp nhất 3 mutation → 1 wrapper `useCreateOutbound(category)` để pending state thống nhất.

### C. Loại field rác

- `from_warehouse_id` chỉ required khi category ≠ room_assign.
- `room_assign` chuyển hẳn sang state của `useDistributionForm`, drop useForm cho nhánh này.
- Bỏ navigate sau success → toast + reset form + chuyển `?view=list` (đã ở trong hub).

### D. Minimalist hóa

- Bỏ emoji trong SelectItem.
- Badge `distributionsPending` chỉ giữ ở **một** cấp (cấp 2 "Xuất kho" hoặc cấp 3 "Danh sách phiếu", không cả hai).
- Đồng bộ tiền tố `+` cho mọi tab tạo mới.

### E. Dọn legacy

- Xoá `CreateDistributionPage.tsx` + route `/inventory/distributions/new` (redirect → `?sub=outbound&view=manual`).
- Gộp `QuickOutboundDialog` về dùng chung component form con.

### F. Mobile

- Khi mobile, không render hub tabs lồng nhau → dùng bottom-sheet picker cho category, header sticky.

---

## 6. Cần xác nhận

1. chấp nhận **gộp về 2 view** (List với banner inline + Tạo mới)?
2. Form Xuất kho thủ công:giữ **single form thay đổi** như hiện tại nhưng dọn field rác
3. Có đồng ý **bỏ navigate đi xa** sau khi tạo, chỉ ở lại hub + toast + jump `?view=list`
4. Có cho **xoá `CreateDistributionPage.tsx` legacy** và redirect 

Trả lời 4 câu này để mình ra plan refactor chi tiết (file-level + migration nếu có).