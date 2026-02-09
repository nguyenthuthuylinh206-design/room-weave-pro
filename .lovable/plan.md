

## Ket qua kiem tra toan bo du an - Dot tiep theo

Sau khi kiem tra ky cac loi console, network requests, va code patterns, phat hien cac van de sau:

---

### VAN DE 1: API Error 300 - Ambiguous relationship (QUAN TRONG)

**Hien trang**: Query trong `usePendingRoomDistributions.ts` (dong 22) dung `distribution_orders!inner` nhung table `distribution_order_rooms` co **2 foreign keys** toi `distribution_orders`:
- `distribution_order_rooms_distribution_order_id_fkey`
- `distribution_order_rooms_handover_to_order_id_fkey`

PostgREST tra ve HTTP 300 (Multiple Choices) vi khong biet dung FK nao.

**Loi thuc te** (tu network logs):
```
"message": "Could not embed because more than one relationship was found
 for 'distribution_order_rooms' and 'distribution_orders'"
```

Tuong tu, `useRoomDistributionHistory.ts` (dong 46) cung dung `distribution_orders!inner` - cung bi loi tuong tu nhung chi xay ra khi user vao trang room detail.

**Fix**: Doi thanh `distribution_orders!distribution_order_rooms_distribution_order_id_fkey` de chi dinh ro FK.

| File | Dong | Hien tai | Sua thanh |
|------|------|----------|-----------|
| `src/hooks/usePendingRoomDistributions.ts` | 22 | `distribution_orders!inner(...)` | `distribution_orders!distribution_order_rooms_distribution_order_id_fkey(...)` |
| `src/hooks/useRoomDistributionHistory.ts` | 46 | `distribution_orders!inner (...)` | `distribution_orders!distribution_order_rooms_distribution_order_id_fkey(...)` |

---

### VAN DE 2: Console Warning - Badge khong ho tro ref (ForwardRef)

**Hien trang**: Trong `BookingsPage.tsx` (dong 1201-1208), `<Badge>` duoc dung lam con cua `<TooltipTrigger asChild>`. Radix UI can component con phai ho tro `ref` (dung `React.forwardRef`), nhung `Badge` component hien tai la function component thuong, khong forward ref.

**Console warning**:
```
Warning: Function components cannot be given refs.
Check the render method of `Primitive.button.SlotClone`.
at Badge
```

**Fix**: Wrap `Badge` component trong `React.forwardRef` tai `src/components/ui/badge.tsx`.

**File**: `src/components/ui/badge.tsx` - doi `function Badge(...)` thanh `const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(...)`

---

### VAN DE 3: BookingsPage file qua lon (1553 dong)

File `src/pages/bookings/BookingsPage.tsx` co **1553 dong** - qua lon, kho bao tri. Nen tach thanh cac component nho hon:
- `BookingFilters` - Phan filter/search
- `BookingTable` - Bang danh sach
- `BookingMobileCard` - Card mobile view
- `BookingStatusBadge` - Badge trang thai
- `BookingActions` - Action buttons

**Uu tien**: Thap (code cleanup, khong anh huong chuc nang)

---

### TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | File |
|---|--------|--------|------|
| 1 | API 300 - Ambiguous FK (2 files) | **Cao** - Loi runtime, data khong load | `usePendingRoomDistributions.ts`, `useRoomDistributionHistory.ts` |
| 2 | Badge forwardRef warning | **Trung binh** - Warning console, UX khong anh huong | `badge.tsx` |
| 3 | BookingsPage qua lon | **Thap** - Code quality | `BookingsPage.tsx` |

### GIAI PHAP CHI TIET

**Van de 1** (2 files, 2 dong sua):
- `usePendingRoomDistributions.ts` dong 22: Doi `distribution_orders!inner(hotel_id, status)` thanh `distribution_orders!distribution_order_rooms_distribution_order_id_fkey(hotel_id, status)`
- `useRoomDistributionHistory.ts` dong 46: Doi `distribution_orders!inner (` thanh `distribution_orders!distribution_order_rooms_distribution_order_id_fkey (`

**Van de 2** (1 file):
- `badge.tsx`: Chuyen `Badge` sang `React.forwardRef` de tuong thich voi Radix UI `asChild` pattern

**Van de 3**: De lai cho giai doan sau, khong anh huong chuc nang hien tai.

