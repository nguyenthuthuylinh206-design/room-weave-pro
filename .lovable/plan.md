
# Sprint 2 — Audit /inventory (Hub UX + Outbound refactor)

Tiếp nối Sprint 1 (mobile forms single-page + FSM adjustment). Sprint 2 tập trung **P1 UX của Hub** và **gọn hoá OutboundPage desktop** (đang gánh 5 business types trong 1 file).

## A. Mục tiêu
1. Hub `/inventory` mobile: gọn header, bỏ chồng layer (~200px trước nội dung trên iPhone SE).
2. Sub-tabs: tách CTA `+ Nhập/Xuất` ra header thay vì lẫn vào tab navigation.
3. Outbound desktop: tách 5 business types thành sub-components, schema dùng `useMemo` để ổn định identity.
4. Legacy redirect Outbound: chỉ chạy 1 lần thay vì mỗi URL change.
5. Hide bottom FAB khi đang ở các trang form Nhập/Xuất/Adjustment.

## B. Phạm vi thay đổi

### B1. Hub Mobile UX (P1)
- `src/pages/inventory/InventoryHubPage.tsx` (hoặc tương đương): rút gọn header mobile, gộp breadcrumb + tiêu đề trong Overview tab, lazy-load `HotelBreakdown`.
- Bỏ duplicate "+ Nhập kho / + Xuất kho" trong TabsList. Chuyển 2 CTA này ra header phải (đã có precedent Task-First v3 trong memory).
- Đảm bảo `?tab=&sub=` vẫn sync URL.

### B2. Outbound Desktop Refactor (P0/P1)
- Hiện tại `src/pages/inventory/OutboundPage.tsx` chứa 5 business types (`room_assign | laundry | maintenance | disposal | other`) với nested `.refine` → tách:
  - `src/components/inventory/outbound/RoomAssignFields.tsx`
  - `src/components/inventory/outbound/LaundryFields.tsx`
  - `src/components/inventory/outbound/MaintenanceFields.tsx`
  - `src/components/inventory/outbound/DisposalFields.tsx`
  - `src/components/inventory/outbound/OtherFields.tsx`
- Schema tách sang `src/lib/inventory/outboundFormSchema.ts` với `discriminatedUnion('business_type', ...)`. Bọc `t()` bằng `useMemo(() => buildSchema(t), [i18n.language])` để tránh re-create mỗi render.
- Đồng bộ với shared `useOutboundSubmit` (memory: Outbound Shared Sub-form v1) — giữ nguyên backend contract.

### B3. Legacy Redirect Fix (P1)
- `OutboundPage` đang `useEffect(() => navigate(...), [searchParams])` chạy mỗi lần URL đổi. Đổi sang ref guard:
  ```ts
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    if (searchParams.get('sub') === 'distributions') {
      redirected.current = true;
      navigate('/inventory?tab=outbound&view=list', { replace: true });
    }
  }, []);
  ```

### B4. FAB Hide trong Form (P1)
- `MobileBottomNav` FAB hiện hiển thị cả ở `/inventory/inbound`, `/inventory/outbound`. Thêm hideOnPaths matcher cho các route form để tránh che nút Lưu.

## C. Không đổi (giữ contract)
- Backend RPC, schema DB, edge functions: KHÔNG đụng.
- Quick Outbound Dialog: giữ nguyên (đã làm ở Sprint 1 trước đó).
- Sub-tab URL convention `?tab=outbound&view=list|manual|from-requests`.

## D. Files dự kiến

**Tạo mới:**
- `src/lib/inventory/outboundFormSchema.ts`
- `src/components/inventory/outbound/{RoomAssign,Laundry,Maintenance,Disposal,Other}Fields.tsx` (5 file)

**Sửa:**
- `src/pages/inventory/InventoryHubPage.tsx` (hub mobile gọn + CTA header)
- `src/pages/inventory/OutboundPage.tsx` (dùng sub-components + schema mới + redirect guard)
- `src/components/MobileBottomNav.tsx` (hideOnPaths cho form routes)
- `src/lib/app-version.ts` (bump 1.1.74)
- `public/changelog.json`

## E. Migration / RPC
Không có.

## F. Test cases
- `src/lib/inventory/__tests__/outboundFormSchema.test.ts`: 5 business_type happy path + invalid discriminator → reject.
- Manual QA checklist:
  - iPhone SE 375×667: Hub không scroll thừa trước list.
  - URL `?tab=outbound&sub=distributions` redirect đúng 1 lần, sau đó back/forward không loop.
  - Form Nhập/Xuất trên mobile: FAB ẩn, nút "Lưu" không bị che.
  - Outbound desktop 5 business type submit OK, validation message tiếng Việt.

## G. Rollout
- Không feature flag (chỉ refactor UI + schema split, giữ contract).
- Rollback: revert commit, không có DB change.

## H. Risk
- Outbound schema split: rủi ro miss field. Mitigation: type test trong Vitest + diff schema cũ/mới trước khi xoá.
- Hub mobile layout: cần test cả 4 sub-tab (overview/inbound/outbound/transactions) để không vỡ hero tile (memory: Inventory Hub Desktop Bento v3).

## Câu hỏi trước khi build
1. Outbound 5 business types — bạn muốn giữ tất cả trong 1 page (tabs nội bộ) hay tách sub-route `/inventory/outbound/laundry` v.v.? (Đề xuất: giữ 1 page + tabs nội bộ, đỡ phá routing.)
2. Hub mobile CTA: 2 nút "Nhập / Xuất" ở header hay 1 nút FAB menu? (Đề xuất: 2 nút text gọn, nhất quán với Task-First v3.)
