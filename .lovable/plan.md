# Gộp Xuất kho thành 1 trang duy nhất

## Hiện trạng

Trong hub `/inventory?tab=operations`, người dùng đang phải nhảy giữa 2 sub khác nhau:

- `sub=outbound` → `OutboundPage` (form tạo phiếu xuất thủ công, có nhánh `room_assign` chỉ "đẩy" sang tab khác).
- `sub=distributions` → `DistributionOrdersPage` (danh sách phiếu giao hàng + tab todo/delivering/done/all).
- Route riêng `/inventory/distributions/from-supplements` → `CreateFromSupplementsPage` (tạo phiếu từ yêu cầu bổ sung).

→ 3 chức năng cùng một nghiệp vụ "xuất hàng ra khỏi kho" nhưng nằm 3 nơi, khó nhìn.

## Mục tiêu

Trang **Xuất kho** (`/inventory?tab=operations&sub=outbound`) là một nơi duy nhất, có 3 tab con dọc theo chiều ngang:

```text
Xuất kho
├─ Danh sách phiếu        (mặc định — xem việc cần làm)
├─ Tạo phiếu thủ công     (form xuất kho cho phòng / giặt / bảo trì / thanh lý / khác)
└─ Từ yêu cầu bổ sung     (chọn nhiều supplement requests → tạo phiếu giao 1 lần)
```

Sub-tab "Phiếu giao hàng" cũ trong thanh sidebar của hub được gỡ (gộp vào Xuất kho), giữ redirect tương thích.

## A. Kiến trúc

- Bọc lại `OutboundPage` thành layout có `Tabs` nội bộ. State đồng bộ qua URL bằng query param mới `view=list | manual | from-requests` (mặc định `list`).
- Tab "Danh sách phiếu" render component `<DistributionOrdersPage />` y nguyên (đã có filter + phân trang).
- Tab "Tạo phiếu thủ công" giữ nguyên form hiện tại (tách phần body thành component `OutboundManualForm`).
- Tab "Từ yêu cầu bổ sung" render lại `<CreateFromSupplementsPage />` nhưng ở chế độ "embedded" (ẩn `PageHeader` + nút Back, vì đã nằm trong hub).
- Khi user chọn `transaction_category = room_assign` trong form thủ công, KHÔNG còn nút "Mở phiếu giao hàng" nhảy tab nữa — render trực tiếp `DistributionForm` ngay tại chỗ (đã import sẵn).

## B. Schema / migration

Không có. Đây là refactor UI thuần.

## C. API / RPC

Không thay đổi. Vẫn dùng:
- `useCreateOutboundTransaction`
- `useCreateDistributionOrder`
- `useCreateLaundryBatch`
- `useCreateDistributionFromSupplements`

## D. UI / Files

**Tạo mới**
- `src/pages/inventory/outbound/OutboundHubPage.tsx` — wrapper với 3 tab + sync `?view=`.
- `src/pages/inventory/outbound/OutboundManualForm.tsx` — tách body form hiện tại của `OutboundPage`.
- `src/pages/inventory/outbound/FromSupplementsEmbedded.tsx` — wrap `CreateFromSupplementsPage` ẩn header (prop `embedded`).

**Sửa**
- `src/pages/inventory/InventoryDashboardPage.tsx`:
  - Group "XUẤT NHẬP KHO": gỡ mục "Phiếu giao hàng" khỏi sidebar (đã nằm trong Xuất kho).
  - Tab content `sub=outbound` đổi sang lazy import `OutboundHubPage` thay cho `OutboundPage`.
  - Giữ `sub=distributions` như alias → redirect sang `sub=outbound&view=list` để bookmark/cũ không vỡ.
- `src/pages/inventory/OutboundPage.tsx`: gỡ block "Mở phiếu giao hàng" (nhánh `room_assign` render `DistributionForm` trực tiếp).
- `src/pages/inventory/CreateFromSupplementsPage.tsx`: thêm prop optional `embedded?: boolean` → ẩn PageHeader & Back button khi true; submit thành công thì chuyển `?view=list` thay vì `navigate('/inventory/distributions/...')`.

**Routes hiện có** vẫn giữ nguyên (`/inventory/distributions`, `/inventory/distributions/from-supplements`, `/inventory/outbound/new`) — bookmark cũ vẫn chạy, nhưng sidebar hub chỉ còn 1 lối vào.

## E. Permission

Không đổi. Mỗi tab con kế thừa quyền sẵn có:
- Tạo phiếu / phê duyệt: `manage_inventory` / storekeeper level.
- Xem danh sách: `view_inventory`.

## F. Test cases (manual QA)

1. Vào `/inventory?tab=operations&sub=outbound` → mặc định mở tab "Danh sách phiếu", thấy đúng danh sách như trước.
2. Đổi tab "Tạo phiếu thủ công" → URL thành `?view=manual`. Tạo 1 phiếu xuất bảo trì → thành công → quay về tab list.
3. Chọn loại "Xuất cho phòng" trong tab thủ công → thấy `DistributionForm` inline (không còn nút "Mở phiếu giao hàng").
4. Tab "Từ yêu cầu bổ sung" → URL `?view=from-requests`. Chọn vài request → tạo phiếu → success → tự về tab list.
5. Mở link cũ `/inventory?tab=operations&sub=distributions` → tự chuyển `sub=outbound&view=list`.
6. Mở `/inventory/distributions/from-supplements?ids=...` (route cũ standalone) vẫn chạy bình thường (full page).
7. Mobile: bottom-nav inventory vẫn vào được hub; tab strip nội bộ scroll ngang OK trên 390px.

## G. Rollout

- Không cần feature flag — refactor UI thuần, không phá data.
- Bump `APP_VERSION` + `CURRENT_VERSION` + thêm entry `public/changelog.json` (theo convention release).
- Rollback: revert 3 file mới + 3 file sửa. Không có migration.

## Phần còn thiếu / cân nhắc sau

- Có thể gộp luôn "Nhập kho" theo cùng pattern (List + Manual + From PO) trong sprint sau để đối xứng.
- `OutboundPage.tsx` cũ (route `/inventory/outbound/new`) hiện vẫn dùng làm full-page. Sau khi user quen hub, có thể redirect route này sang hub luôn.
