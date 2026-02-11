

## Phase 2: Toi uu hieu suat bo sung cho 12,500 nguoi dung

### Tong quan: 8 file thay doi, 1 migration SQL

---

### 1. `useMaintenanceDashboard.ts` - Chuyen tinh toan sang server-side RPC

**Van de hien tai**: 
- `select('*')` fetch toan bo maintenance_requests (co the bi cat 1000 row)
- Tinh toan O(n^2) tren client (first-time-fix-rate loop qua moi request)
- Khong co `staleTime` -> fetch lai moi lan mount

**Thay doi**:
- Tao database function `get_maintenance_dashboard` tinh toan tat ca stats (total, inProgress, completed, MTTR, MTBF, firstTimeFixRate, costLast30Days) trong PostgreSQL
- Function tra ve JSONB gom `stats` + `active_requests` (chi cac request chua hoan thanh) + `recent_completions` (10 request gan nhat)
- Hook chi goi 1 RPC call thay vi fetch all + client calc
- Them `staleTime: 60000` (1 phut) vi dashboard stats khong can realtime

**Migration SQL**: Tao function `get_maintenance_dashboard(p_tenant_id UUID, p_hotel_id UUID DEFAULT NULL)` voi logic:
- COUNT theo status, priority
- AVG thoi gian hoan thanh (MTTR) 
- MTBF tinh tu item_id recurring failures
- First-time-fix-rate dung NOT EXISTS subquery (thay vi O(n^2) loop)
- Cost 30 ngay gan nhat
- Active requests (status != completed/cancelled) voi limit 50
- Recent completions (top 10)

---

### 2. `useBookingStats.ts` - Chay 5 query song song bang Promise.all

**Van de hien tai**: 5 query chay tuan tu (await lien tiep), mat ~500ms (5 x 100ms)

**Thay doi**:
- Gop 5 query rieng biet vao `Promise.all([...])` 
- Thoi gian giam tu ~500ms xuong ~100ms (chi bang 1 query cham nhat)
- Khong can thay doi logic, chi thay doi cach goi

---

### 3. `useMaintenanceRequests.ts` - Tang staleTime

**Van de**: `staleTime: 0` (dong 64) -> moi lan mount/re-render deu fetch lai

**Thay doi**: Doi `staleTime: 0` thanh `staleTime: 30 * 1000` (30 giay)

---

### 4. `useHotels.ts` - Them cache config

**Van de**: Khong co `staleTime`, `gcTime`, `refetchOnWindowFocus` -> fetch lai moi lan mount. Hotels data thay doi rat it.

**Thay doi**: Them vao `useHotels` query (dong 97):
```
staleTime: 2 * 60 * 1000   // 2 phut
gcTime: 5 * 60 * 1000      // 5 phut
refetchOnWindowFocus: false
```

---

### 5. `useSupplementRequests.ts` - Them limit

**Van de**: Khong co `.limit()` -> fetch tat ca records, co the bi cat o 1000 row hoac gay cham

**Thay doi**: Them `.limit(200)` sau `.order(...)` (dong 76)

---

### 6. `useLaundryRequests.ts` - Them limit

**Van de**: Tuong tu, khong co `.limit()`

**Thay doi**: Them `.limit(200)` sau `.order(...)` (dong 67)

---

### 7. `useHousekeepingTasks.ts` - Fix channel name trung lap

**Van de**: `usePendingTaskCount` (dong 434) dung channel ten `'task-count-changes'` - khong unique. Neu 2 user khac nhau mount, channel bi conflict.

**Thay doi**: Doi ten channel thanh `` `task-count-${userId}` ``

---

### 8. `useRoomsReportData.ts` - Bo Math.random, dung gia tri thuc

**Van de**: Dong 207-220 tao `occupancyTrend` va dong 230-233 tao `periodComparison` bang `Math.random()`. Du lieu thay doi ngau nhien moi lan render, khong chinh xac cho bao cao.

**Thay doi**:
- `occupancyTrend`: Bo `Math.random()`, dung gia tri co dinh tu actual data (baseRate * variation khong random). Neu khong co du lieu, tra ve mang rong `[]`
- `periodComparison`: Thay random bang `null` (khong co du lieu ky truoc thuc te). UI da handle `periodComparison === null` (dong 401: `{data?.periodComparison && (...)}`), nen se an section nay thay vi hien data gia

---

### Danh sach file thay doi

| # | File | Loai thay doi |
|---|------|--------------|
| 1 | Migration SQL | Tao function `get_maintenance_dashboard` |
| 2 | `src/hooks/useMaintenanceDashboard.ts` | Dung RPC, them staleTime |
| 3 | `src/hooks/useBookingStats.ts` | Promise.all cho 5 query |
| 4 | `src/hooks/useMaintenanceRequests.ts` | staleTime 0 -> 30s |
| 5 | `src/hooks/useHotels.ts` | staleTime 2m, gcTime 5m |
| 6 | `src/hooks/useSupplementRequests.ts` | .limit(200) |
| 7 | `src/hooks/useLaundryRequests.ts` | .limit(200) |
| 8 | `src/hooks/useHousekeepingTasks.ts` | Channel name unique per user |
| 9 | `src/hooks/useRoomsReportData.ts` | Bo Math.random, dung null/actual data |

### Ket qua du kien

- Maintenance dashboard: Tu fetch ALL records + O(n^2) calc -> 1 RPC call (~10x nhanh hon)
- Booking stats: Tu 500ms (sequential) -> 100ms (parallel)
- Giam fetch thua qua staleTime cho maintenance requests va hotels
- Bao cao phong hien thi du lieu thuc thay vi random
- Channel realtime khong bi conflict giua cac user

