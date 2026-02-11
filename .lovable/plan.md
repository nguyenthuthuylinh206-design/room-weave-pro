

## Phase 3: Cac van de hieu suat con lai

### Tong quan: 8 van de, 8 file thay doi

---

### 1. NGHIEM TRONG: `usePurchaseOrders.ts` - usePOStats chay 3 query tuan tu

**Van de**: `usePOStats()` (dong 61-108) thuc hien 3 query rieng biet bang `await` tuan tu:
- Query 1: COUNT tat ca POs
- Query 2: COUNT pending approval 
- Query 3: Fetch 30 ngay gan nhat de tinh tong

Khong co `staleTime` -> moi lan mount deu fetch lai. 500 owner x 3 = 1,500 query dong thoi.

**Thay doi**: Gop 3 query vao `Promise.all()` de chay song song. Them `staleTime: 60000`.

---

### 2. NGHIEM TRONG: `useRecurringIssues.ts` - Fetch ALL maintenance requests + O(n^2) client grouping

**Van de**: Dong 20-34 fetch `select('*')` toan bo `maintenance_requests` trong 90 ngay, khong co `.limit()`. Roi dong 39-91 group va filter tren client. Voi nhieu maintenance request, co the bi cat o 1000 row.

**Thay doi**: Them `.limit(500)` de phong ve. Them `staleTime: 5 * 60 * 1000` (5 phut) vi recurring issues khong thay doi nhanh.

---

### 3. TRUNG BINH: `useAvailableRooms.ts` - Realtime channel khong filter tenant

**Van de**: Dong 34-50 channel `'available-rooms-realtime'` nghe ALL thay doi tren `rooms` va `room_bookings` khong filter theo tenant. 12,500 user nhan moi update tu moi tenant khac.

**Thay doi**:
- Doi ten channel: `'available-rooms-realtime'` -> `` `available-rooms-${tenantId}` ``
- Them filter: `filter: \`tenant_id=eq.${tenantId}\`` cho ca 2 subscription (rooms va room_bookings)

---

### 4. TRUNG BINH: `useRecentActivities.ts` - Channel name khong unique

**Van de**: Dong 38 dung channel ten `'activity-logs-changes'` - khong unique per tenant. Cac tenant khac nhau co the conflict.

**Thay doi**: Doi ten channel thanh `` `activity-logs-${tenantId}` ``

---

### 5. TRUNG BINH: `useItems.ts` - Channel name khong unique per tenant

**Van de**: Dong 23 dung channel ten `'items-changes'` - da co filter `tenant_id` nhung ten channel khong unique. Neu 2 component khac nhau mount, co the conflict.

**Thay doi**: Doi ten channel thanh `` `items-${tenantId}` ``

---

### 6. TRUNG BINH: `useRoomCheckSession.ts` - useAllRoomCheckSessions khong filter tenant

**Van de**: Dong 207-210 `useAllRoomCheckSessions()` fetch `select('*')` toan bo `room_check_sessions` khong filter tenant. Dong 233-241 realtime channel `'all-room-check-sessions'` cung khong filter.

**Thay doi**:
- Them `.eq('tenant_id', tenantId)` vao query (can truyen tenantId vao hook)
- Doi ten channel: `` `room-check-sessions-${tenantId}` ``
- Them filter realtime: `filter: \`tenant_id=eq.${tenantId}\``

---

### 7. THAP: `useUnifiedTasks.ts` - stock_adjustments channel khong filter

**Van de**: Dong 186-200 channel `'unified-tasks-stock'` nghe ALL thay doi tren `stock_adjustments` khong filter. Moi user nhan moi update.

**Thay doi**: Them filter `tenant_id` vao subscription. Doi ten channel thanh `` `unified-tasks-stock-${tenantId}` ``

---

### 8. THAP: `useHousekeepingTasks.ts` - Cac channel con lai khong unique

**Van de**: 
- Dong 91: `'my-tasks-changes'` - khong unique per user
- Dong 531: `'unassigned-tasks-changes'` - khong unique per tenant
- Dong 794: `'task-stats-changes'` - khong unique per tenant

**Thay doi**:
- `'my-tasks-changes'` -> `` `my-tasks-${userId}` ``
- `'unassigned-tasks-changes'` -> `` `unassigned-tasks-${tenantId}` ``
- `'task-stats-changes'` -> `` `task-stats-${tenantId}` ``

---

### Tac dong den nguoi dung

| # | Thay doi | Tac dong |
|---|---------|----------|
| 1 | usePOStats Promise.all | Trang mua hang load nhanh hon ~3x |
| 2 | useRecurringIssues limit + staleTime | Trang bao tri on dinh hon, khong bi mat data |
| 3-8 | Realtime channel filter + unique name | Giam broadcast storm, tiet kiem bandwidth, tranh conflict giua cac user/tenant |

### Luu y

- Tat ca thay doi deu backward-compatible, khong can migration SQL
- Khong anh huong UX: user van nhan du update realtime cua tenant minh
- Giam tai cho Supabase Realtime server dang ke (tu broadcast ALL -> chi broadcast trong tenant)

---

### Danh sach file thay doi

| # | File | Loai thay doi |
|---|------|--------------|
| 1 | `src/hooks/usePurchaseOrders.ts` | Promise.all, staleTime |
| 2 | `src/hooks/useRecurringIssues.ts` | .limit(500), staleTime 5m |
| 3 | `src/hooks/useAvailableRooms.ts` | Channel filter tenant, unique name |
| 4 | `src/hooks/useRecentActivities.ts` | Channel unique name |
| 5 | `src/hooks/useItems.ts` | Channel unique name |
| 6 | `src/hooks/useRoomCheckSession.ts` | Filter tenant, channel unique name |
| 7 | `src/hooks/useUnifiedTasks.ts` | Channel filter + unique name |
| 8 | `src/hooks/useHousekeepingTasks.ts` | 3 channel unique names |

