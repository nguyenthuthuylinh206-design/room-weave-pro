

## Kiem tra sau toan bo du an - Dot 3: Chuc nang tung phan

Sau khi kiem tra ky cac hooks, components, va logic nghiep vu cua tung module, phat hien cac van de sau:

---

### VAN DE 1: `useBookingStats.ts` - Thieu `tenant_id` filter (QUAN TRONG)

**Muc do**: Trung binh (RLS bao ve, nhung anh huong performance)

File `src/hooks/useBookingStats.ts` co **6 queries** toi `room_bookings` va `rooms` nhung **KHONG query nao filter theo `tenant_id`**:
- `useBookingStats()` - 5 queries (totalRooms, occupied, checkIns, checkOuts, revenue)
- `useTodayCheckouts()` - 1 query
- `useTodayCheckins()` - 1 query

**Thuc te**: RLS policies DA bao ve bang cach filter `tenant_id` qua `auth.uid()`, nen khong co data leak. Nhung:
1. Database phai lam them viec de filter (performance)
2. Khong nhat quan voi cac hooks khac (code quality)
3. Neu RLS bi vo tinh tat, se thanh van de nghiem trong

**Fix**: Them `.eq('tenant_id', tenantId)` vao tat ca queries trong file nay.

**File**: `src/hooks/useBookingStats.ts`

---

### VAN DE 2: `useRoomBooking.ts` - Thieu `tenant_id` filter

**Muc do**: Trung binh (RLS bao ve)

`useRoomBookings()` query `room_bookings` chi filter theo `room_id`, khong filter `tenant_id`. Tuong tu van de 1.

**File**: `src/hooks/useRoomBooking.ts`

---

### VAN DE 3: Hai he thong Toast song song (Code quality)

**Muc do**: Thap (khong anh huong chuc nang)

Du an dung **2 he thong toast khac nhau** cung luc:

| He thong | Import | Dung trong |
|----------|--------|------------|
| Radix Toast | `useToast` from `@/hooks/use-toast` | 16 files (useBookingActions, useMaintenanceRequests, useLaundryBatches...) |
| Sonner | `toast` from `sonner` | 44 files (useCheckoutInspection, useDistributionOrders, useHotels...) |

**Van de**:
- 2 files import CA HAI: `useInventoryTransactions.ts`, `useStockAdjustments.ts`
- Toast hien thi o 2 vi tri khac nhau tren man hinh
- UX khong nhat quan cho nguoi dung

**Giai phap**: Chuan hoa ve **sonner** (don gian hon, dang duoc dung nhieu hon - 44 vs 16 files). Khong thuc hien trong dot nay vi anh huong 16 files.

---

### VAN DE 4: `useBookingConflicts.ts` - Inner loop N+1 query

**Muc do**: Trung binh (performance)

`useBookingConflicts()` thuc hien **N+1 queries**: 
1. Query 1: Lay tat ca overdue bookings
2. Loop qua tung booking, moi booking query 1 lan de tim next booking

Voi 10 phong overdue = 11 queries. Voi 50 phong = 51 queries.

**Fix**: Gop thanh 1 RPC function de xu ly logic tren server.

**File**: `src/hooks/useBookingConflicts.ts`

---

### VAN DE 5: `useMaintenanceRequests.ts` - Sort priority bang text khong dung

**Muc do**: Thap

Dong 124: `query.order('priority', { ascending: false })` - sort `priority` dang text field. Gia tri la 'low', 'medium', 'high', 'urgent'. Sort alphabetically descending se cho thu tu: urgent > medium > low > high. **Sai** - 'high' bi xep sau 'low'.

**Fix dung**: Dung CASE expression trong SQL hoac sort tren client voi custom order.

**File**: `src/hooks/useMaintenanceRequests.ts`

---

### VAN DE 6: `useLaundryBatches.ts` - `useReceiveLaundryBatch` khong atomic

**Muc do**: Trung binh

`useReceiveLaundryBatch()` thuc hien **nhieu operations rieng le** thay vi 1 transaction:
1. Update batch (1 query)
2. Loop update tung batch item (N queries)
3. Insert notification (1 query)

Neu step 2 fail giua chung, data bi inconsistent (batch da update nhung items chua).

**Giai phap**: Tao RPC function `receive_laundry_batch` de xu ly atomic. Khong thuc hien trong dot nay vi can tao migration.

---

### VAN DE 7: `useBookingActions.ts` - Duplicate comment blocks

**Muc do**: Thap (code quality)

Dong 43-50 co 2 JSDoc comments lien tiep cho `handleCheckIn`:
```text
/** Check-in: Update booking status... */
/** Check-in: Update booking status... Uses database transaction */
```

Comment dau la legacy, nen xoa.

**File**: `src/hooks/useBookingActions.ts`

---

### TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | Fix |
|---|--------|--------|-----|
| 1 | `useBookingStats` thieu tenant_id | **Trung binh** | Them tenant_id filter vao 7 queries |
| 2 | `useRoomBooking` thieu tenant_id | **Trung binh** | Them tenant_id filter |
| 3 | Hai he thong toast | **Thap** | Ghi nhan, chuyen sang sonner dan |
| 4 | N+1 query trong useBookingConflicts | **Trung binh** | Tao RPC (giai doan sau) |
| 5 | Sort priority sai | **Thap** | Sort tren client |
| 6 | useReceiveLaundryBatch khong atomic | **Trung binh** | Tao RPC (giai doan sau) |
| 7 | Duplicate comments | **Thap** | Xoa comment thua |

---

### KE HOACH THUC HIEN (Dot nay)

Chi thuc hien cac fix don gian, khong can migration:

| # | File | Thay doi |
|---|------|----------|
| 1 | `src/hooks/useBookingStats.ts` | Them `.eq('tenant_id', tenantId)` vao tat ca queries trong `useBookingStats`, `useTodayCheckouts`, `useTodayCheckins` |
| 2 | `src/hooks/useMaintenanceRequests.ts` | Sort priority tren client voi custom order map |
| 3 | `src/hooks/useBookingActions.ts` | Xoa duplicate comment block (dong 43-48) |

### DE LAI CHO GIAI DOAN SAU

| # | File | Ly do |
|---|------|-------|
| 4 | Toast standardization | Anh huong 16+ files, can plan rieng |
| 5 | N+1 query fix | Can tao RPC/migration |
| 6 | Atomic receive batch | Can tao RPC/migration |

