---
name: Outbound Hub Consolidation v1
description: Trang Xuất kho gộp 2 view List+Manual, banner gợi ý 'Từ yêu cầu' inline mở view=from-requests; submit không navigate đi xa, toast + về list
type: feature
---

## Cấu trúc tab `/inventory?tab=operations&sub=outbound`

- **Sub-tabs hiển thị**: chỉ 2 — `view=list` (Danh sách phiếu, default) | `view=manual` (+ Tạo phiếu mới).
- **`view=from-requests`** vẫn hợp lệ qua URL nhưng KHÔNG có tab riêng — mở qua `PendingSupplementsBanner` (đặt trong DistributionOrdersPage), banner dùng `setSearchParams` để chuyển view, render `<CreateFromSupplementsPage embedded />` thay cho DistributionOrdersPage trong slot `value="list"`.
- Badge `distributionsPending` chỉ hiện ở cấp 2 ("Xuất kho"), KHÔNG lặp lại ở cấp 3.

## Logic submit (OutboundPage)

- `from_warehouse_id` optional khi `transaction_category === 'room_assign'` (room_assign dùng `useDistributionForm` riêng).
- 3 mutation pending hợp nhất → `isAnyPending` cho mọi nút submit.
- Sau success: toast + `form.reset()`/`distributionForm.reset()` + `goToList()` (chuyển `view=list`), KHÔNG `navigate()` ra ngoài hub.
- Lỗi thiếu phòng/sản phẩm/lô giặt: `toast.error()` thay vì `return` im lặng.
- Bỏ emoji 🏠🧺🔧🗑️➖ ở SelectItem.

## Legacy redirects (App.tsx)

- `/inventory/distributions/new` → `InventoryHubRedirect tab=operations sub=outbound view=manual`
- `/inventory/distributions/from-supplements` → `... view=from-requests` (giữ query `?ids=`)
- File `CreateDistributionPage.tsx` đã xoá; route `/inventory/distributions` (không có /new) vẫn redirect như cũ.

## Banner contract

`PendingSupplementsBanner` dùng `useSearchParams` (không `useNavigate`), set `tab/sub/view=from-requests` + append `ids` đã chọn.
