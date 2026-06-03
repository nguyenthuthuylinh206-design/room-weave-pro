# Phân tích & Redesign trang /inventory (Kho & Tài sản)

> Vai trò: Senior Product Designer + UX + BA. Bối cảnh: phần mềm vận hành khách sạn VN, user 25–60 tuổi, không rành công nghệ, dùng 8 tiếng/ngày.

---

## A. Tóm tắt hiện trạng

Trang `/inventory` hiện là **Hub dạng Tabs + Sidebar 5 nhóm × 14 mục con**:

```text
Topbar:  Kho / Tổng quan › Bảng điều khiển           [Search] [+ Thao tác ▾]
─────────────────────────────────────────────────────────────────────
Sidebar (220px)          │  Tab content
  TỔNG QUAN              │   ┌──────────── Hero giá trị kho ─────────┐
   Bảng điều khiển       │   │ 1.2 tỷ ₫     +3.2% so tháng trước     │
   Giao dịch kho         │   │ Hôm nay · Sắp hết · Ứ đọng            │
  SẢN PHẨM               │   └────────────────────────────────────────┘
   Danh sách tài sản     │   [SKU][Sắp hết][Cần đặt lại][Ứ đọng]
   Danh mục              │   [Quick action bar: Nhập/Xuất/...]
   Thêm tài sản mới      │   [Chart 8col] [Forecast 4col]
  XUẤT NHẬP KHO          │   [Top consumed 7col] [Low-stock 5col]
   Nhập / Xuất / Chuyển  │   [Recent transactions full width]
   Kiểm kê / Đề xuất     │   [Hotel breakdown]
  PHÂN TÍCH              │
  THIẾT LẬP              │
```

Kết quả: nhìn rất "Bento đẹp" nhưng **không nói được người dùng phải làm gì kế tiếp**.

---

## B. Đánh giá theo 5 lăng kính

### 1. Layout

- **Hero "Tổng giá trị tồn kho" chiếm 6/12 cột × 2 hàng** — đẹp nhưng là chỉ số kế toán, không phải thứ NV kho động vào hàng ngày. Đang lấn chỗ của *hành động cần làm hôm nay*.
- **Sidebar 14 mục + Tab 5 mục + Sub-tab + Dropdown "Thao tác" 5 mục** → **4 lớp navigation song song** cho cùng 1 hành động (vd "Nhập kho" xuất hiện 3 chỗ). Người mới sẽ phân vân chọn lối nào.
- **Quick action bar** đặt *sau* KPI grid → user phải cuộn xuống mới thấy nút Nhập/Xuất — thao tác phổ biến nhất lại không nổi bật nhất.
- **"Hotel breakdown" ở đáy trang** — quản lý chuỗi mới cần, nhân viên 1 KS không bao giờ dùng nhưng vẫn tốn dữ liệu/render.
- **Recent transactions full width 1 bảng** dài → user phải scroll dài, không có filter "việc của tôi".

### 2. UX

- **Người mới KHÔNG hiểu ngay**: 5 KPI dạng số rời (Số SKU, <7 ngày, Cần đặt lại, Ứ đọng) không trả lời câu hỏi *"giờ tôi phải làm gì?"*.
- **Nhãn kỹ thuật**: "SKU", "Tồn ứ đọng ≥90d", "Dự báo tiêu hao 30 ngày", "Cần đặt lại" — đúng ngành nhưng cô lao công, lễ tân không hiểu. Cần ngôn ngữ thao tác: *"3 món cần đặt thêm trong tuần này"*.
- **Thao tác thừa**: muốn "Nhập kho" — 1) bấm "+ Thao tác", 2) chọn "Nhập kho", 3) chọn kho, 4) chọn NCC… Quick action lại nằm dưới gập. Có thể rút còn 1 click.
- **Trùng đường dẫn**: "Xuất kho" có ở sidebar, tab Xuất nhập, nút Thao tác, và badge ở `distributionsPending` — user không biết cái nào là "đúng".
- **Breadcrumb 3 cấp ("Kho / Tổng quan › Bảng điều khiển")** trong khi đã ở trang Tổng quan — dư thừa nhận thức.

### 3. Business workflow

Một ngày kho khách sạn 2–4 sao thực tế:

1. Sáng: xem **những gì THIẾU phải bổ sung phòng** (room check đêm trước).
2. Nhận hàng NCC giao (**Nhập kho**).
3. Phát hàng cho buồng phòng (**Xuất / Phân phối**).
4. Cuối ngày: duyệt phiếu đang chờ, kiểm kê đột xuất nếu lệch.
5. Cuối tuần: xem **đề xuất đặt lại** + đặt mua.

→ Trang hiện tại **không tổ chức theo nhịp ngày này**. Người dùng phải tự "lắp" thông tin.

### 4. Hiệu suất thao tác

- Tác vụ lặp ≥ 5 lần/ngày: **Xuất kho cho phòng** và **xem món thiếu**. Hiện cần 3–4 click.
- Tác vụ 1–2 lần/ngày: Nhập kho, duyệt phiếu chờ.
- Tác vụ tuần: Kiểm kê, đề xuất đặt lại.

→ Quy tắc 80/20: **2 nút lớn "Xuất cho phòng" và "Nhập kho NCC"** phải sticky ở thumb zone mobile và ở header desktop.

### 5. Thiết kế

- Hero gradient navy-on-dark đẹp nhưng **tương phản chữ phụ thấp** (text-paper/55) — user 50+ khó đọc.
- Typography hai họ (display + body) chuẩn nhưng KPI dùng số `text-[26px]` cùng cấp với "Số SKU" — *tầm quan trọng ngang nhau* trong khi nghiệp vụ không phải vậy.
- Nút "Thao tác" outline-on-dark, kích thước `size="sm"` (h-9) — **dưới chuẩn 44px touch target** cho mobile.
- Màu cảnh báo: amber + rose + emerald dùng đúng quy tắc nhưng **không có icon** đi kèm → user mù màu/đèn vàng sẽ khó phân biệt.

---

## C. Đề xuất cải tiến (ưu tiên)


| #   | Vấn đề                           | Tác động                    | Giải pháp                                                                                                                                 | Ưu tiên    |
| --- | -------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Không trả lời "giờ làm gì?"      | Mất 30–60s mỗi lần mở trang | Đổi Hero thành **"Việc cần làm hôm nay"** với 3 hàng action (Cần xuất cho phòng / Cần nhập từ NCC / Cần duyệt)                            | **Cao**    |
| 2   | 4 lớp navigation trùng           | Confusion, train lâu        | Bỏ Dropdown "+Thao tác", đưa **2 nút primary "Xuất kho" + "Nhập kho"** ra header. Các thao tác ít dùng giữ trong sidebar                  | **Cao**    |
| 3   | Quick action bar ở dưới fold     | Click thừa                  | Gộp vào header (desktop) / sticky top mobile                                                                                              | **Cao**    |
| 4   | KPI "kế toán" lấn chỗ "vận hành" | Sai trọng tâm               | Tổng giá trị kho → tile nhỏ. Hero là **danh sách việc**                                                                                   | **Cao**    |
| 5   | Sidebar 14 mục dài               | Quá tải                     | Gộp còn **6 mục**: Tổng quan · Tài sản · Nhập · Xuất · Kiểm kê · Phân tích. "Đề xuất đặt lại" + "Bổ sung" hiện inline trong tab tương ứng | Trung bình |
| 6   | Nhãn kỹ thuật                    | Người mới không hiểu        | "SKU"→"Loại hàng", "Cần đặt lại"→"Cần đặt thêm", "Ứ đọng ≥90d"→"Tồn lâu (>3 tháng)"                                                       | Trung bình |
| 7   | Hotel breakdown render luôn      | Chậm trang                  | Chỉ hiện ở chế độ Chain, lazy-load                                                                                                        | Trung bình |
| 8   | Touch target nhỏ                 | Mobile khó bấm              | Header buttons h-11 trên mobile, ≥44px                                                                                                    | Trung bình |
| 9   | Cảnh báo chỉ bằng màu            | A11y                        | Icon ⚠️/⏰/● đi kèm số                                                                                                                     | Thấp       |
| 10  | Breadcrumb dư khi ở overview     | Noise                       | Ẩn breadcrumb ở overview                                                                                                                  | Thấp       |


---

## D. Layout đề xuất (Task-First Inventory Hub)

### Desktop (≥1280px)

```text
┌────────────────────────────────────────────────────────────────────┐
│ KHO  ·  Khách sạn ABC                  [🔎 Tìm hàng / mã / phòng] │
│                                                                    │
│  ╔═══════════════════════╗  ╔═══════════════════════╗              │
│  ║  + NHẬP KHO TỪ NCC    ║  ║  → XUẤT CHO PHÒNG     ║  [Khác ▾]  │
│  ╚═══════════════════════╝  ╚═══════════════════════╝              │
├────────┬───────────────────────────────────────────────────────────┤
│ Menu   │  ▌ Việc cần làm hôm nay                                  │
│        │  ┌──────────────────────────────────────────────────┐   │
│ Tổng   │  │ 🟠 5 phòng cần bổ sung đồ (P201, P305…)   [Làm] │   │
│ quan ● │  │ 🔴 3 món sắp hết trong 7 ngày              [Đặt]│   │
│        │  │ 🟡 2 phiếu xuất chờ duyệt                  [Mở] │   │
│ Tài    │  │ 🟢 Hôm qua đã xuất 12 phiếu · 0 lệch       ✓    │   │
│ sản    │  └──────────────────────────────────────────────────┘   │
│        │                                                          │
│ Nhập   │  ▌ Tình hình kho                                        │
│ Xuất ② │  ┌──────────┬──────────┬──────────┬──────────┐         │
│ Kiểm   │  │ Giá trị  │ Loại hàng│ Tồn lâu  │ Hôm nay  │         │
│ kê     │  │ 1.2 tỷ ₫ │   248    │  12 món  │ 8 nhập   │         │
│        │  │ +3.2% ↗  │          │  85 tr ₫ │ 14 xuất  │         │
│ Phân   │  └──────────┴──────────┴──────────┴──────────┘         │
│ tích   │                                                          │
│        │  ▌ Biến động tồn kho 30 ngày    │  ▌ Top tiêu thụ      │
│        │  [───── line chart ─────]       │  1. Khăn tắm          │
│        │                                 │  2. Nước suối         │
│        │                                                          │
│        │  ▌ Giao dịch gần đây  [Lọc: Tất cả ▾]  [Xem tất cả →] │
└────────┴───────────────────────────────────────────────────────────┘
```

### Mobile (portrait)

```text
┌──────────────────────────┐
│ ☰  Kho       🔎  Avatar  │
├──────────────────────────┤
│ [+ NHẬP]   [→ XUẤT]      │  ← sticky, 44px
├──────────────────────────┤
│ Việc hôm nay (4)         │
│ ┌──────────────────────┐ │
│ │🟠 5 phòng cần bổ sung│ │
│ │             [Làm →]  │ │
│ ├──────────────────────┤ │
│ │🔴 3 món sắp hết      │ │
│ │             [Đặt →]  │ │
│ └──────────────────────┘ │
│                          │
│ Tình hình (swipe →)      │
│ [1.2 tỷ ₫] [248 loại]…   │
│                          │
│ Giao dịch gần đây        │
│ • 09:12 Xuất P201 …      │
│ • 08:30 Nhập NCC A …     │
└──────────────────────────┘
│ 🏠  Phòng  Kho●  Giặt  ⋯│ ← bottom nav
└──────────────────────────┘
```

### Mermaid — phân cấp thông tin mới

```text
graph TD
  A[/inventory/] --> B[Header: 2 nút Primary + Search]
  A --> C[Việc cần làm hôm nay]
  C --> C1[Bổ sung cho phòng]
  C --> C2[Cần đặt thêm]
  C --> C3[Phiếu chờ duyệt]
  A --> D[Tình hình kho - 4 KPI nhỏ]
  A --> E[Biểu đồ + Top tiêu thụ]
  A --> F[Giao dịch gần đây]
  A --> G[Sidebar 6 mục]
```

---

## E. Lý do từng thay đổi

1. **Hero = Action list** thay vì số tiền: trả lời đúng câu hỏi của người dùng 8h/ngày ("Giờ tôi cần làm gì?"), giảm thời gian định hướng từ ~30s xuống ~3s.
2. **2 nút primary trong header**: Xuất/Nhập là 80% công việc hằng ngày → đặt ở "thumb zone" mobile + tầm mắt đầu tiên desktop.
3. **Gộp navigation còn 1 lớp chính** (sidebar 6 mục) + bỏ dropdown "Thao tác" → loại bỏ trùng lặp.
4. **KPI tiền tệ xuống tile nhỏ**: vẫn giữ cho chủ KS, nhưng không lấn nghiệp vụ.
5. **Ngôn ngữ thao tác** thay nhãn kỹ thuật → giảm đào tạo, phù hợp người không rành công nghệ.
6. **Lazy hotel breakdown + chỉ chain**: giảm noise cho 80% user 1 KS.
7. **Touch ≥44px + icon kèm màu**: A11y + người lớn tuổi.

---

## F. Phạm vi triển khai (frontend-only, không đụng business logic)

**File sẽ sửa:**

- `src/pages/inventory/InventoryDashboardPage.tsx` — đơn giản hóa header: 2 CTA primary + Khác (dropdown), bỏ breadcrumb ở overview.
- `src/components/inventory/InventoryOverviewSection.tsx` — thứ tự lại: TodoCard → KPI compact → Chart/Top → Recent. Lazy `InventoryHotelBreakdown`.
- `src/components/inventory/hub/InventoryKpiGrid.tsx` — bỏ Hero gradient, thay bằng **4 tile cùng kích cỡ**, dùng nhãn dễ hiểu.
- **Mới**: `src/components/inventory/hub/InventoryTodoCard.tsx` — tổng hợp từ `useInventoryHubBadges` + supplements pending + reorder + distributions pending, mỗi dòng có CTA điều hướng tới đúng tab/sub.
- `src/components/inventory/CompactActionBar.tsx` — di chuyển 2 hành động chính lên header, bar gốc giữ làm phụ.
- Sidebar trong `InventoryDashboardPage`: gộp "Đề xuất đặt lại" + "Bổ sung đồ" vào tab tương ứng (vẫn truy cập được qua deep-link cũ).

**Không đụng**: RPC, schema, permission, business logic xuất/nhập/kiểm kê.

---

## G. Test cases & rollout

- **Test UX**: 3 user (chủ KS, quản lý, nhân viên) — đo thời gian thực hiện "tạo phiếu xuất cho P201" trước/sau (target: từ 4 click → 2 click).
- **Visual regression**: `/inventory` desktop 1366 + mobile 390.
- **A11y**: contrast ratio ≥ 4.5 trên tile mới, focus ring đầy đủ.
- **Rollout**: feature flag `inventory.hub_v3` trong `hotel.settings`, mặc định ON cho tenant mới, OFF cho tenant cũ; sau 1 sprint bật toàn bộ.
- **Rollback**: tắt flag → fallback layout v2 hiện tại (giữ memory `inventory-hub-desktop-v3` + thêm `inventory-hub-todo-first-v1`).

---

## H. Còn thiếu / câu hỏi cho bạn

1. "Việc cần làm" có gộp luôn **bảo trì + giặt là** liên quan kho 
2. Cho phép tôi **xóa hẳn dropdown "Thao tác"** ở header
3. Có ưu tiên redesign **mobile trước** (vì NV dùng chủ yếu) hay **desktop trước** (vì QL dùng)? cả 2

Bạn duyệt plan này thì tôi sẽ implement đúng phần F, không đụng nghiệp vụ.