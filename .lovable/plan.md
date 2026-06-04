# C4 — Modernize RoomCheckPage (Replenish + Delivery) theo chuẩn Lean

**Mục tiêu**: Tách 2 flow phụ (`?type=replenish` và `?type=delivery`) khỏi file monolith 1.619 dòng `RoomCheckPage.tsx` thành 2 page chuyên biệt theo chuẩn Lean (atomic RPC, autosave 24h, audit log, mobile-first, feature flag rollout).

---

## 1. Phân tích hiện trạng

### Legacy `RoomCheckPage.tsx` (1.619 LOC) handle 6 loại:
- `daily` / `checkin` / `checkout` / `maintenance` → **đã được Lean redirect** từ Phase trước
- `delivery` (kèm `distribution_order_id` + `room_order_id`) → **CÒN legacy**
- `replenish` (đứng độc lập) → **CÒN legacy**

### Replenish flow (legacy)
3 step: CheckType → ItemsCheck + CleaningRequest → Review.
Submit qua `useCreateRoomCheck.mutateAsync()` → insert `room_checks` + cập nhật stock rời rạc → background: auto-complete `housekeeping_tasks` task_type=`amenity_request`, send Telegram, delete session.

**Vấn đề**:
- Không atomic (4 mutation rời, có thể lệch nếu lỗi giữa chừng)
- Không validate stock client-side
- Không audit log
- UI Card cũ, padding rộng, không thumb-zone

### Delivery flow (legacy)
3 step: CheckType → DeliveryItemsStep + CleaningRequest → Review.
`DeliveryItemsStep` (333 dòng) đọc `room_distribution_orders` → đối chiếu số lượng giao thực tế vs kế hoạch.
Submit → insert room_check + redirect về `/inventory/distributions/:id`.

**Vấn đề**:
- Step CheckType vô nghĩa khi đã có `distribution_order_id` (đáng lẽ skip thẳng)
- Không có "Quick OK toàn bộ" cho trường hợp giao đủ (90% case)
- Notification không atomic với insert

### Tài sản tái dùng được
| Asset | Path | Dùng cho |
|---|---|---|
| LeanContextCard | `components/rooms/lean/LeanContextCard.tsx` | Header cả 2 page |
| LeanReportIssueSheet | `components/rooms/lean/LeanReportIssueSheet.tsx` | Báo thiếu/hỏng cho replenish |
| LeanStates | `components/rooms/lean/LeanStates.tsx` | Loading / error / empty |
| ResumeDraftSheet | `components/rooms/lean/ResumeDraftSheet.tsx` | Autosave resume |
| useLeanDraft | hook autosave 24h | Cả 2 page |
| RequireShiftProvider | shift gate | Cả 2 page |
| DefaultOkItemsCheck pattern | `check-steps/DefaultOkItemsCheck.tsx` | Replenish item list |

### Phụ thuộc ngoài cần giữ
- `notify-chargeable` edge function (nếu replenish có item chargeable)
- `housekeeping_tasks` task_type=`amenity_request` / `delivery_check` (auto-complete)
- `room_distribution_orders` + `room_orders` schema (delivery)
- `useRoomCheckSession` realtime sync

---

## 2. Schema / RPC mới

### `submit_replenish_lean(p_room_id, p_items[], p_cleaning, p_notes, p_draft_id)`
- Validate tenant qua task lookup
- Validate stock per item (block nếu vượt tồn)
- Insert `room_checks` (check_type='replenish')
- Insert `room_check_issues` cho item thiếu/hỏng (fan-out 2 pass như Lean v1)
- Update `housekeeping_tasks` status='completed' qua `transition_task_status`
- Insert `room_check_audit` (action='replenish_submit_lean')
- Return `{ check_id, missing_count, charged_total }`

### `submit_delivery_lean(p_room_id, p_distribution_order_id, p_room_order_id, p_received[], p_notes, p_draft_id)`
- Validate tenant qua distribution_order
- Insert `room_checks` (check_type='delivery')
- Update `room_orders.status` = 'delivered' / 'partial' / 'rejected'
- Update parent `room_distribution_orders` aggregate status
- Insert audit (action='delivery_submit_lean')
- Trigger notification cho người yêu cầu

### Không thay schema bảng — chỉ thêm 2 RPC + 2 audit action.

---

## 3. UI / Routes mới

```
/rooms/:id/check-replenish     → RoomReplenishPage.tsx (Lean)
/rooms/:id/check-delivery      → RoomDeliveryPage.tsx (Lean)
```

### `RoomReplenishPage.tsx` (~350 LOC mục tiêu)
- Header: LeanContextCard (phòng + thời gian + người làm)
- Body: `DefaultOkItemsCheck` reverse-logic — list amenities, default OK, tap để báo "thiếu/đã giao bổ sung X"
- Bottom sheet: stepper số lượng + ảnh tùy chọn
- Sticky bottom: "Hoàn tất bổ sung" + count badge
- Autosave 24h qua `useLeanDraft`
- ResumeDraftSheet khi quay lại

### `RoomDeliveryPage.tsx` (~400 LOC mục tiêu)
- Header: LeanContextCard + chip "Phiếu #XYZ"
- Body: list room_orders với planned vs actual stepper (default = planned)
- 1-tap "Đủ tất cả" → fill actual = planned
- Sticky bottom: "Xác nhận giao" → submit RPC
- Redirect về `/inventory/distributions/:id` sau success

### Shared
- `hooks/useReplenishDraft.ts` + `useDeliveryDraft.ts` (wrapper quanh useLeanDraft)
- `hooks/useSubmitReplenishLean.ts` + `useSubmitDeliveryLean.ts` (gọi RPC + invalidate)

---

## 4. Permission / Role

- Replenish: bất kỳ staff on-shift (qua RequireShiftProvider)
- Delivery: chỉ user được giao task `delivery_check` HOẶC role manager+

---

## 5. Feature flag + Rollout

### `settings.room_check.use_lean_replenish` và `use_lean_delivery` (per hotel)
- Default OFF tuần 1 → opt-in qua `?lean=1` để pilot
- Hotel A pilot tuần 1 → fix bug
- Bật ON cho 50% hotel tuần 2
- Bật ON toàn bộ tuần 3
- Tuần 4: xoá legacy branch trong `RoomCheckPage.tsx` (giảm ~600 LOC)

### Router update: `RoomCheckRouter.tsx`
- Khi `?type=replenish` + flag ON (hoặc `?lean=1`) → redirect `/check-replenish`
- Khi `?type=delivery` + flag ON → redirect `/check-delivery`
- Default vẫn → legacy page

### Backward compat
- Mọi link cũ `?type=replenish` / `?type=delivery` vẫn work
- 5-7 chỗ trong app gọi trực tiếp `/rooms/:id/check?type=...` không cần đổi

---

## 6. Test cases tối thiểu

**Replenish**:
- [ ] Submit với 0 issue → check tạo, task completed, không có issue row
- [ ] Submit thiếu 2 món có ảnh → issue rows fan-out đúng, stock không bị trừ
- [ ] Submit khi mất mạng → draft saved, resume hoạt động
- [ ] Submit double-tap → chỉ 1 record (idempotent qua draft_id)

**Delivery**:
- [ ] Giao đủ → room_orders status='delivered'
- [ ] Giao thiếu → status='partial', parent distribution_order aggregate đúng
- [ ] Submit khi parent đã 'completed' → block với error message VN
- [ ] Redirect đúng về `/inventory/distributions/:id`

---

## 7. Rollback plan
- Đặt flag về OFF qua `settings.room_check.use_lean_replenish=false` → tự rollback sang legacy
- Nếu RPC corrupt data: chạy migration rollback drop function (giữ tables nguyên)
- Audit log mọi submission để diff nếu cần

---

## 8. Lộ trình thực thi (4 phase × ~0.5-1 ngày)

| Phase | Nội dung | Risk |
|---|---|---|
| **P1 — Foundation** | 2 RPC `submit_replenish_lean` + `submit_delivery_lean`, 2 audit action, 2 hook draft + submit, **chưa wire UI** | Thấp — chỉ thêm |
| **P2 — Replenish UI** | `RoomReplenishPage.tsx` + route `/check-replenish`, opt-in qua `?lean=1` | Thấp — page mới, không đụng legacy |
| **P3 — Delivery UI** | `RoomDeliveryPage.tsx` + route `/check-delivery`, opt-in qua `?lean=1` | Trung — đụng inventory flow |
| **P4 — Rollout + cleanup** | Update RoomCheckRouter, flag config, xoá branch replenish/delivery khỏi `RoomCheckPage.tsx` (giảm ~600 LOC) | Cao — phải pilot trước |

---

## 9. Quyết định cần user xác nhận trước khi code

1. **OK với scope 4 phase trên?** (Hay ưu tiên chỉ replenish, hoặc chỉ delivery?)
2. **Có cần Phase 1 (RPC) trước không?** Hay làm UI trước với mutation tạm thời rồi viết RPC sau?
3. **Default flag**: OFF + opt-in `?lean=1` (an toàn) hay ON ngay cho hotel mới?
4. **Khi nào xoá legacy branch trong file 1.619 dòng?** P4 hay sprint sau?
