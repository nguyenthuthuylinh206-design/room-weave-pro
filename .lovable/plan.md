## Mục tiêu

Làm lại UI Phiếu giao hàng (`/inventory/distributions`) để **người mới nhìn 3 giây là biết phải làm gì**. Giữ nguyên backend/RPC/quyền hiện tại, chỉ refactor lớp trình bày + đơn giản hoá thuật ngữ.

3 vấn đề trọng tâm cần giải quyết:
1. **Quá nhiều trạng thái** (5: pending / released / in_progress / completed / closed).
2. **Thuật ngữ rối** (Route, Batch, Stop, Phiếu, Giao, Trao, Kiểm kho, Handover, Release...).
3. **Wizard 4 bước nhưng không rõ bấm gì** — guidance text mờ, action button chìm.

---

## A. Hợp nhất trạng thái (UI layer, không đổi DB)

5 trạng thái DB → **3 trạng thái hiển thị** + sub-label:

| DB status | UI hiển thị | Màu (semantic text) |
|---|---|---|
| `pending`, `released` | **Chờ xuất kho** | `text-amber-600` |
| `in_progress` | **Đang giao hàng** | `text-blue-600` |
| `completed`, `closed` | **Hoàn thành** | `text-green-600` |
| `cancelled` | **Đã huỷ** | `text-muted-foreground` |

Sub-label nhỏ bên dưới (vd: "Đã xuất kho, chờ NV xác nhận nhận", "5/12 phòng", "Đã đóng phiếu").

→ Sửa file: `DistributionStatusBadge.tsx`, dùng đồng nhất ở list + detail + card.

---

## B. Chuẩn hoá thuật ngữ (toàn bộ UI user-facing)

| Đang dùng | Đổi thành |
|---|---|
| Route / Batch / Stop | **Phiếu giao hàng** (cấp phiếu) / **Phòng cần giao** (cấp dòng) |
| Handover / Release / "Giao hàng cho nhân viên" | **Xuất kho cho nhân viên** |
| Confirm receive / "Xác nhận đã nhận đủ hàng" | **Tôi đã nhận đủ hàng** |
| Deliver stop / "Giao" | **Đã giao phòng này** |
| Cannot access | **Không vào được phòng** |
| Close route | **Đóng phiếu** |
| "Kiểm tra kho & bắt đầu giao" | **Xuất kho & bắt đầu giao** |

Quy tắc: **bỏ hoàn toàn từ tiếng Anh** trong UI; mọi action button viết theo dạng "động từ + đối tượng" rõ ràng.

---

## C. Trang danh sách (`DistributionOrdersPage`)

### Hiện trạng
- Bảng/cards có cột mã phiếu, trạng thái, NV, tầng, ca, ngày, số phòng, %.
- 2 nút "Tạo phiếu" trong dropdown (Từ yêu cầu bổ sung / Thủ công).
- Filter card riêng + search.

### Đổi
- **Tab/Segment ở đầu**: `Cần làm ngay (n)` · `Đang giao (n)` · `Hoàn thành` · `Tất cả`. Mặc định mở "Cần làm ngay" — gồm các phiếu user hiện tại đang phải hành động (chưa phân công, đang chờ mình nhận, đang giao của mình, chờ đóng).
- **Mỗi dòng thêm cột "Việc cần làm"** (text ngắn + màu): "Chờ phân công", "Chờ xuất kho", "Bạn cần xác nhận nhận", "Đang giao 5/12", "Chờ đóng phiếu".
- Cột "Trạng thái" dùng badge 3 trạng thái mới + chấm tròn semantic.
- Nút "Tạo phiếu" chính: text "Tạo phiếu mới" (không icon-only), dropdown phụ giữ nguyên 2 lựa chọn nhưng đặt label rõ: "Từ phiếu bổ sung của lễ tân (n)" / "Tạo thủ công".
- Mobile cards: 1 dòng tiêu đề (mã + badge), 1 dòng việc cần làm + nút primary, 1 dòng meta (NV · tầng · ngày).

---

## D. Trang chi tiết — Layout mới (`DistributionOrderDetailPage` + `RouteDetailView`)

Thay 4 khối chồng (header buttons + warning + wizard + info bar + room list + notes) bằng **3 khối rõ ràng**:

```text
┌─────────────────────────────────────────────────────────┐
│ 1. HEADER GỌN                                           │
│    [←] PGH-2025-0142  [Đang giao hàng]    [⋯ Khác]      │
│    Tạo bởi An • 10/05 14:30                             │
├─────────────────────────────────────────────────────────┤
│ 2. THẺ "VIỆC CẦN LÀM NGAY" (CTA dominant)               │
│    📦 Chờ bạn xuất kho cho Minh                         │
│    Kiểm tra hàng trong kho rồi bấm xuất.                │
│    [ Xuất kho & bắt đầu giao ]   ← nút lớn primary      │
├─────────────────────────────────────────────────────────┤
│ 3. THANH TIẾN ĐỘ (1 dòng)                               │
│    NV: Minh · Tầng 3 · Ca chiều · 10/05    5/12 ▓▓▓░░  │
├─────────────────────────────────────────────────────────┤
│ 4. DANH SÁCH PHÒNG                                      │
│    [hiển thị chỉ các phòng pending lên đầu, đã xong xếp│
│     dưới và collapse mặc định]                          │
└─────────────────────────────────────────────────────────┘
```

### Thẻ "Việc cần làm ngay" (thay wizard 4 bước)

Tính theo `(status, role)` → ra **1 thẻ duy nhất** với:
- Tiêu đề lớn (`text-base font-semibold`) — câu hành động.
- 1 dòng giải thích ngắn.
- **1 nút primary lớn** (`h-12 w-full sm:w-auto`) — action chính.
- Tối đa 1 nút secondary (vd "Xác nhận thay nhân viên").

Bảng quyết định rút gọn:

| Status | Vai trò | Tiêu đề thẻ | Nút primary |
|---|---|---|---|
| pending, chưa phân công | Quản lý | Cần phân công nhân viên giao | Phân công ngay |
| pending, đã phân công | Quản lý kho | Chờ bạn xuất kho cho **{NV}** | Xuất kho & bắt đầu giao |
| pending, self-assign | Quản lý = NV | Kiểm hàng trong kho rồi đi giao | Xuất kho & bắt đầu giao |
| pending | NV được giao | Chờ quản lý kho xuất hàng | (không có nút) |
| released | NV được giao | Hàng đã sẵn sàng — xác nhận để bắt đầu | Tôi đã nhận đủ hàng |
| released | Quản lý | Chờ **{NV}** xác nhận nhận hàng | Xác nhận thay NV (secondary) |
| in_progress | NV được giao | Còn **{n}** phòng cần giao | (cuộn xuống danh sách) |
| in_progress | Quản lý | Đang giao: **{x/y}** phòng | (chỉ xem) |
| completed | Quản lý | Đã giao xong — đóng phiếu để hoàn tất | Đóng phiếu |
| closed | mọi người | Phiếu đã đóng | (không) |
| cancelled | mọi người | Phiếu đã huỷ | (không) |

→ Bỏ hẳn step indicator 4 vòng tròn — thay bằng chấm tiến độ inline trong thanh tiến độ ở khối 3.

### Header gọn

- Bên trái: back · mã phiếu · badge trạng thái 3-state · meta dòng nhỏ.
- Bên phải: **chỉ 1 menu "⋯ Khác"** chứa: Chỉnh sửa (disabled nếu không cho phép) · In phiếu · Huỷ phiếu (text đỏ).
- Bỏ 3 nút icon-only dễ bấm nhầm trên header hiện tại.
- Warning "chưa phân công" đã được thẻ CTA bao trọn → bỏ banner riêng.

### Danh sách phòng

- Sắp xếp: phòng đang chờ giao lên đầu, đã giao + không vào được xuống cuối (collapse default, click mở rộng).
- Mỗi dòng phòng: tên phòng (font-mono) · mã · text trạng thái semantic (`text-green-600 "Đã giao"` / `text-amber-600 "Chờ giao"` / `text-red-600 "Không vào được"`).
- 1 nút primary "Đã giao phòng này" (NV) hoặc menu `⋯` (xem chi tiết / báo không vào được / hoàn tác).
- Bỏ dùng từ "Stop"; gọi là "phòng".

---

## E. Files sẽ chạm

- `src/pages/inventory/DistributionOrdersPage.tsx` — thêm tab segment + cột "Việc cần làm".
- `src/pages/inventory/DistributionOrderDetailPage.tsx` — header gọn + bỏ banner.
- `src/components/distribution/components/RouteDetailView.tsx` — bỏ info bar dài, gộp vào thanh tiến độ; truyền dữ liệu cho thẻ CTA mới.
- `src/components/distribution/components/DeliveryStepWizard.tsx` → **đổi tên** thành `NextActionCard.tsx` (giữ file cũ làm compat 1 sprint), bỏ step indicator, dựng 1 thẻ CTA theo bảng trên.
- `src/components/distribution/components/DistributionStatusBadge.tsx` — gộp 5 → 3 trạng thái + sub-label.
- `src/components/distribution/components/DistributionOrderTable.tsx`, `DistributionOrderCard.tsx` — thêm cột "Việc cần làm".
- `src/components/distribution/components/UnifiedRoomList.tsx` — đổi label, sort, collapse done.
- (Tuỳ chọn) `src/i18n/locales/vi/distribution.json` — gom thuật ngữ về 1 mối.

**Không đụng**: hooks (`useRouteBatch`, `useDistributionOrders`), RPC, types, RLS.

---

## F. Test cases & QA

1. Owner self-assign tạo phiếu → vào detail thấy đúng 1 nút "Xuất kho & bắt đầu giao".
2. Manager tạo phiếu, phân công cho Staff A → Manager thấy "Chờ bạn xuất kho cho A"; Staff A thấy "Chờ quản lý kho xuất hàng".
3. Sau khi xuất kho → Staff A vào thấy "Tôi đã nhận đủ hàng"; Manager thấy "Xác nhận thay NV".
4. Trong khi giao: thanh tiến độ tăng đúng, danh sách phòng đã giao tự xuống dưới.
5. Sau khi giao xong → Manager thấy "Đóng phiếu".
6. Phiếu chưa phân công → CTA "Phân công ngay" ở cả list (cột việc cần làm) lẫn detail.
7. Mobile (375px): nút CTA full-width, header không tràn, menu ⋯ hoạt động.
8. List: bấm tab "Cần làm ngay" thấy đúng các phiếu của mình; chuyển sang "Tất cả" thấy đầy đủ.

---

## G. Rollout

- Một sprint duy nhất, không cần feature flag (chỉ đổi UI).
- Không có migration DB, không breaking change cho RPC.
- Sau release: cập nhật memory `mem://design/distribution-order-ui-v2` ghi nhận chuẩn 3-trạng-thái và NextActionCard.

## Cần xác nhận trước khi triển khai

1. **Tab mặc định trên trang danh sách**: "Cần làm ngay" (đề xuất) hay "Tất cả"?
2. **Có đồng ý gộp 5 → 3 trạng thái hiển thị** (DB giữ nguyên 5)? Nếu bạn muốn giữ "Đã đóng" tách khỏi "Hoàn thành" mình sẽ làm 4 trạng thái thay vì 3.
3. Nếu không trả lời, mình mặc định: (1) Cần làm ngay, (2) gộp 3 trạng thái.
