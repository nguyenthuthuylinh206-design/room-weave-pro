## Mục tiêu
Nâng cấp module Khách hàng từ list cơ bản thành **Guest CRM v2** đầy đủ: KPI tổng quan, segment lọc nhanh, bảng/dữ liệu nâng cao desktop + card mobile, thao tác nhanh inline, và trang chi tiết khách 360°.

## A. Kiến trúc & nghiệp vụ

### Segment (tab lọc nhanh)
| Segment | Logic |
|---|---|
| Tất cả | không filter |
| VIP | `vip_level IN ('gold','vip')` |
| Mới (30d) | `created_at >= now() - 30d` |
| Quay lại | `total_stays >= 2` |
| Sinh nhật tháng này | `extract(month from date_of_birth) = current_month` |
| Blacklist | `vip_level = 'blacklist'` |

### KPI cards (header)
- Tổng khách (count)
- VIP / Gold (count)
- Khách mới 30 ngày
- Sinh nhật tháng này
- Tổng doanh thu khách (sum `total_spent`)
- Khách quay lại (count `total_stays >= 2`)

→ Tính client-side từ `guests` đã fetch (limit raise lên 1000) + 1 query `count` riêng cho mỗi KPI nếu vượt limit. Phase 1 làm client-side.

### Gộp trùng SĐT
- RPC `merge_guests(source_ids uuid[], target_id uuid)`:
  1. Validate cùng `tenant_id`, caller có quyền `manage_guests`/owner.
  2. `UPDATE room_bookings SET guest_id = target_id WHERE guest_id = ANY(source_ids)`.
  3. Merge `total_stays`, `total_spent`, `last_stay_date` (sum/max) vào target.
  4. Copy non-null fields từ source nếu target trống (id_number, address, …).
  5. `DELETE FROM guests WHERE id = ANY(source_ids)`.
  6. Audit log.

## B. Schema / Migration

Không đổi schema bảng. Chỉ thêm RPC:

```sql
CREATE OR REPLACE FUNCTION public.merge_guests(
  p_target_id uuid,
  p_source_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_count int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM guests WHERE id = p_target_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'TARGET_NOT_FOUND'; END IF;
  IF NOT (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'tenant_owner')
       OR has_permission(auth.uid(),'manage_guests')) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;
  IF EXISTS (SELECT 1 FROM guests WHERE id = ANY(p_source_ids) AND tenant_id <> v_tenant) THEN
    RAISE EXCEPTION 'CROSS_TENANT';
  END IF;
  UPDATE room_bookings SET guest_id = p_target_id
   WHERE guest_id = ANY(p_source_ids) AND tenant_id = v_tenant;
  -- merge stats, copy missing fields, delete sources...
  RETURN jsonb_build_object('merged', array_length(p_source_ids,1));
END $$;
GRANT EXECUTE ON FUNCTION public.merge_guests(uuid, uuid[]) TO authenticated;
```

Rollback: `DROP FUNCTION public.merge_guests(uuid, uuid[]);`

## C. API / Hooks

`src/hooks/useGuests.ts` thêm:
- `useGuestStats()` — trả về KPI {total, vip, newCount, birthday, returning, totalRevenue}.
- `useMergeGuests()` — gọi RPC `merge_guests`.
- `useGuests({ segment, search, sortBy, sortDir, page, pageSize })` — mở rộng, hỗ trợ server-side pagination.
- `useExportGuestsCSV()` — fetch all + tải CSV (tên, SĐT, email, VIP, lần ở, chi tiêu, lần cuối).

## D. UI / Components

```
src/pages/guests/GuestsPage.tsx                (rewrite)
src/components/guests/
  GuestKpiBar.tsx          — 6 thẻ KPI, click filter segment
  GuestSegmentTabs.tsx     — tabs: Tất cả / VIP / Mới / Quay lại / Sinh nhật / Blacklist
  GuestToolbar.tsx         — search + sort + export + Thêm khách
  GuestDataTable.tsx       — desktop: sort cột, checkbox row, pagination
  GuestCardList.tsx        — mobile: card hiện tại được nâng cấp
  GuestQuickActions.tsx    — dropdown: Sửa nhanh / Đổi VIP / Blacklist / Gộp
  GuestFormDialog.tsx      — Thêm/Sửa khách (reuse field từ GuestDetailPage edit form)
  MergeGuestsDialog.tsx    — chọn target, preview tác động, confirm
```

Responsive: `md:` breakpoint → table; `<md` → card list. Cả hai dùng cùng data source và filter.

### GuestDetailPage 360°
Refactor thành 4 tab:
1. **Tổng quan** — info + KPI khách (lần ở, doanh thu, chi tiêu TB, lần cuối, tần suất).
2. **Lịch sử booking** — danh sách hiện tại + filter theo năm.
3. **Tài chính** — tổng chi tiêu, breakdown theo phòng/dịch vụ, dư nợ chưa thu.
4. **Giấy tờ & Ghi chú** — file CCCD/Hộ chiếu (id_image_url), notes timeline.

## E. Permission
- `view_guests` → xem trang + KPI.
- `manage_guests` → Thêm/Sửa/Blacklist/Export/Merge.
- Staff không có quyền: ẩn nút thao tác, chỉ xem.

## F. Test cases
1. KPI tính đúng khi đổi segment.
2. Segment "Sinh nhật" chỉ hiện khách có `date_of_birth` trong tháng hiện tại.
3. Sort theo `total_spent` desc/asc đúng thứ tự.
4. Export CSV: số cột & encoding UTF-8 BOM OK trên Excel VN.
5. Merge 2 khách trùng SĐT: bookings chuyển hết về target, source bị xoá, stats cộng dồn.
6. Staff không có `manage_guests` → ẩn nút Merge/Blacklist.
7. Mobile <768px: card layout; ≥768px: table layout.
8. Pagination 50/trang chạy mượt với 1000+ khách.

## G. Rollout
1. Migration RPC `merge_guests` (không phá vỡ).
2. Deploy UI v2 (GuestsPage rewrite) — flag `?v=1` để toggle về v1 nếu cần (giữ file cũ làm `GuestsPageLegacy.tsx`).
3. Theo dõi 48h → xoá legacy.

**Rollback**: revert route về `GuestsPageLegacy`, drop RPC.

## Phạm vi không làm trong lần này
- Marketing/SMS tới khách (tạo skill riêng).
- Loyalty points (cần schema mới).
- Import khách từ Excel (đã có ở module khác).
