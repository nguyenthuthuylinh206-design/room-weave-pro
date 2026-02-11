

## Toi uu hieu suat cho 12,500 nguoi dung dong thoi

### Tong quan: 13 file thay doi, 1 migration SQL

---

### 1. NGHIEM TRONG: `useRevenueReport.ts` - Them date filter server-side

**Van de**: Dong 123 fetch `select('*')` toan bo `room_bookings` khong co date filter. Voi 500 owner, moi nguoi fetch tat ca booking -> DB qua tai + bi cat o 1000 row.

**Thay doi**:
- Dong 123: Thay `select('*, room:...')` bang select chi cot can thiet: `select('check_out_date, total_amount, amount_paid, payment_status, booking_type, booking_source, ota_commission_amount, net_revenue, early_checkin_charge, late_checkout_charge, damage_charges, room_id, room:rooms!room_bookings_room_id_fkey(room_number, room_type)')`
- Them `.gte('check_out_date', sixMonthsAgo)` de chi lay 6 thang gan nhat (du cho monthly trends)
- Them `.limit(10000)` phong ve
- Tinh `sixMonthsAgo` = `subMonths(today, 6).toISOString()` ngay sau dong 118

### 2. NGHIEM TRONG: `useRooms.ts` - Filter realtime channel theo tenant

**Van de**: Dong 51-65, channel `room_items_changes` nghe TAT CA thay doi tren `room_items` khong phan biet tenant. 12,500 user nhan moi update.

**Thay doi** (dong 51-65):
- Doi ten channel: `room_items_changes` -> `` `room_items_${tenantId}` ``
- Them filter vao subscription: `filter: \`tenant_id=eq.${tenantId}\``

```typescript
const channel = supabase
  .channel(`room_items_${tenantId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'room_items',
    filter: `tenant_id=eq.${tenantId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  })
  .subscribe()
```

### 3. NGHIEM TRONG: `useUsers.ts` - Gop 3 query cascade thanh 1 RPC

**Van de**: Dong 43-78, khi filter hotel thuc hien 3 query tuan tu. 2,500 owner+manager x 3 = 7,500 query dong thoi.

**Thay doi**:
- Tao migration SQL: function `get_users_by_hotel(p_tenant_id, p_hotel_id, p_user_id, p_user_level)`
- Trong hook: Thay doan cascading query (dong 43-78) bang 1 RPC call
- Giu nguyen logic manager filter va owner filter trong SQL function

**SQL Migration**:
```sql
CREATE OR REPLACE FUNCTION public.get_users_by_hotel(
  p_tenant_id UUID,
  p_hotel_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_level TEXT DEFAULT NULL
)
RETURNS SETOF public.users
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT u.*
  FROM public.users u
  LEFT JOIN public.user_hotels uh ON u.id = uh.user_id
  WHERE u.tenant_id = p_tenant_id
    AND (
      p_hotel_id IS NULL
      OR u.hotel_id = p_hotel_id
      OR uh.hotel_id = p_hotel_id
      OR u.user_level_code = 'tenant_owner'
    )
    AND (
      p_user_level IS NULL
      OR p_user_level != 'manager'
      OR (u.reports_to = p_user_id OR u.created_by = p_user_id OR u.id = p_user_id)
    )
  ORDER BY u.created_at DESC;
END;
$$;
```

**Hook thay doi**: Thay doan dong 27-83 bang:
```typescript
queryFn: async () => {
  if (!tenant?.id) throw new Error('...')
  
  const { data, error } = await supabase.rpc('get_users_by_hotel', {
    p_tenant_id: tenant.id,
    p_hotel_id: selectedHotelId && !isAllHotelsMode ? selectedHotelId : null,
    p_user_id: currentUser?.id || null,
    p_user_level: currentUser?.user_level_code || null,
  })
  
  if (error) throw error
  return data as UserWithRelations[]
}
```

### 4. TRUNG BINH: `useTenant.ts` - Them cache config

**Thay doi**: Them 3 option vao useQuery:
```typescript
staleTime: 5 * 60 * 1000,      // 5 phut
gcTime: 10 * 60 * 1000,         // 10 phut
refetchOnWindowFocus: false,
```

### 5. TRUNG BINH: Giam polling frequency (6 files)

| File | Dong | Interval cu | Interval moi | Them |
|------|------|------------|-------------|------|
| `usePendingCounts.ts` | 133 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `useDashboardStats.ts` | 26 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `useStaffStatus.ts` | 107 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `useInventoryDashboard.ts` | 24,45 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `useLaundryDashboard.ts` | 26 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `usePendingPayments.ts` | 51 | 30000 | 60000 | `refetchOnWindowFocus: false` |
| `useBookingConflicts.ts` | 135 | 60000 | 120000 | `refetchOnWindowFocus: false` |
| `useOnShiftStaffList.ts` | 94 | 60000 | 120000 | - |
| `useLowStockItems` (trong useInventoryDashboard.ts) | 45 | 30000 | 120000 | `refetchOnWindowFocus: false` |

### 6. TRUNG BINH: `useStaffStatus.ts` - Filter realtime channel

**Thay doi** (dong 113-131): Cac channel `telegram_connections` va `users` da co filter `tenant_id`. Gio doi ten channel thanh unique:
- `staff-status-changes` -> `` `staff-status-${tenantId}` ``
- Them `refetchOnWindowFocus: false` cho query chinh

---

### Danh sach file thay doi

| # | File | Loai thay doi |
|---|------|--------------|
| 1 | Migration SQL | Tao function `get_users_by_hotel` |
| 2 | `src/hooks/useRevenueReport.ts` | Date filter, select cu the, limit |
| 3 | `src/hooks/useRooms.ts` | Filter realtime channel tenant_id |
| 4 | `src/hooks/useUsers.ts` | Dung RPC thay 3 query cascade |
| 5 | `src/hooks/useTenant.ts` | staleTime, gcTime, refetchOnWindowFocus |
| 6 | `src/hooks/usePendingCounts.ts` | interval 60s, refetchOnWindowFocus |
| 7 | `src/hooks/useDashboardStats.ts` | interval 60s, refetchOnWindowFocus |
| 8 | `src/hooks/useStaffStatus.ts` | interval 60s, channel name, refetchOnWindowFocus |
| 9 | `src/hooks/useInventoryDashboard.ts` | interval 60s/120s, refetchOnWindowFocus |
| 10 | `src/hooks/useLaundryDashboard.ts` | interval 60s, refetchOnWindowFocus |
| 11 | `src/hooks/usePendingPayments.ts` | interval 60s, refetchOnWindowFocus |
| 12 | `src/hooks/useBookingConflicts.ts` | interval 120s, refetchOnWindowFocus |
| 13 | `src/hooks/useOnShiftStaffList.ts` | interval 120s |

### Ket qua du kien

- Query/phut giam ~55% (900k -> 400k)
- Revenue report chinh xac (khong bi cat 1000 row)
- Realtime chi broadcast trong tenant
- useUsers giam 66% query (3 -> 1)
- Khong anh huong UX dang ke

