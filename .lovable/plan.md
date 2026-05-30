## Vấn đề

Khi nhân viên giao hàng vào một phòng đang có khách (booking đang chờ checkout), thay vì vào màn giao đồ thì lại bị nhảy sang màn **kiểm tra phòng checkout** (`?type=checkout&inspection=...`) — đúng như URL bạn đang đứng:
`/rooms/<room>/check?type=checkout&inspection=<id>`.

## Nguyên nhân (đã trace)

Có **2 lỗi cộng hưởng**:

### 1. Nav button thiếu `type=delivery`
- `src/components/distribution/components/UnifiedRoomList.tsx:231` — `handleRoomClick` navigate tới:
  `?distribution_order_id=...&room_order_id=...` (KHÔNG có `type=delivery`).
- `src/components/distribution/components/StopCard.tsx:102` — y hệt.

So sánh với nút "Giao phòng này" (`performDeliver`, dòng 152) thì có `type=delivery` đầy đủ → flow đó đúng.

### 2. RoomCheckPage tự "normalize" URL về checkout-inspection
`src/pages/rooms/RoomCheckPage.tsx:224-234`:

```ts
if (!isInspectionLoading && pendingInspection && !prefilledType && !inspectionIdFromUrl) {
  navigate(`/rooms/${id}/check?type=checkout&inspection=${pendingInspection.id}`, { replace: true })
}
```

Khi phòng đang có booking chờ checkout, `pendingInspection` tồn tại. Nếu URL không có `type=...`, useEffect này **xoá sạch query string distribution** và đẩy người dùng vào checkout inspection. Đây chính là lúc UI biến từ "Giao phòng" thành "Kiểm tra phòng".

## Cách sửa

Sửa cả 2 lớp để bền:

### A. Frontend — bổ sung `type=delivery` ở 2 chỗ navigate
1. `UnifiedRoomList.tsx:231` — đổi thành:
   ```
   /rooms/${room_id}/check?type=delivery&distribution_order_id=...&room_order_id=...&returnTo=/inventory/distributions/${distribution_order_id}
   ```
2. `StopCard.tsx:102` — y hệt.

→ Cùng format với `performDeliver` (line 152), giữ `returnTo` để nút "Quay lại" về đúng phiếu.

### B. Frontend — defensive guard ở RoomCheckPage
`RoomCheckPage.tsx:224-234`: bổ sung điều kiện **không redirect** khi URL có `distribution_order_id`, `room_order_id` hoặc `returnTo`. Tránh trường hợp tương lai có nơi khác navigate thiếu `type=delivery` cũng không phá flow giao hàng.

```ts
const hasDistributionContext =
  !!searchParams.get('distribution_order_id') ||
  !!searchParams.get('room_order_id') ||
  !!searchParams.get('returnTo')

if (
  !isInspectionLoading &&
  pendingInspection &&
  !prefilledType &&
  !inspectionIdFromUrl &&
  !hasDistributionContext           // ← thêm
) { ... }
```

### C. Version bump
- `APP_VERSION` 1.1.16 → 1.1.17
- Thêm entry changelog: *"Sửa lỗi bấm phòng trong phiếu giao bị nhảy sang kiểm tra checkout"*.

## Phạm vi không đụng

- Không sửa RPC, không migration.
- Không đổi RoomCheckRouter (router đã đúng — đã có guard `delivery` + distribution params).
- Không đổi `performDeliver` (đang đúng).
- Không đổi `auto-create checkout inspection` (useEffect line 269) vì chỉ chạy khi `watchedCheckType === 'checkout'`, không bị ảnh hưởng.

## QA checklist sau khi build

1. Vào phiếu giao đang `in_progress`, **bấm tên phòng** trong danh sách (không phải nút "Giao phòng") → URL phải có `?type=delivery&distribution_order_id=...&room_order_id=...`, KHÔNG nhảy sang checkout.
2. Test cả phòng đang có booking checkout pending — vẫn không bị nhảy.
3. Bấm "Giao phòng này" (nút primary) → vẫn vào màn delivery như trước.
4. Vào `/rooms/:id/check` (không tham số) ở phòng có booking checkout pending → vẫn auto redirect sang `?type=checkout&inspection=...` như cũ (giữ behaviour cho lễ tân).
5. Test trên mobile portrait (390px) và desktop 981px.

## Files sẽ sửa

- `src/components/distribution/components/UnifiedRoomList.tsx` (1 dòng)
- `src/components/distribution/components/StopCard.tsx` (1 dòng)
- `src/pages/rooms/RoomCheckPage.tsx` (~5 dòng useEffect guard)
- `src/lib/app-version.ts`
- `public/changelog.json`

Không cần migration, không cần test mới (logic UI thuần).
