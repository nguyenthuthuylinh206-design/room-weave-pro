

## Kế hoạch: Quy trình xử lý Khách Quá Hạn có Booking Conflict

### VẤN ĐỀ HIỆN TẠI

Khi khách ở quá ngày checkout mà **đã có khách khác đặt phòng**, hệ thống:
- Chỉ hiển thị dialog "Gia hạn" yêu cầu chọn ngày mới
- Chỉ báo conflict **khi chọn ngày** (chậm - người dùng đã mất thời gian)
- **Không thông báo ngay** rằng phòng đang bị block bởi booking khác
- **Không có quy trình xử lý** cho tình huống khẩn cấp này

**Ví dụ thực tế từ database:**

| Phòng | Khách hiện tại | Ngày checkout dự kiến | Khách tiếp theo | Ngày check-in |
|-------|---------------|----------------------|----------------|---------------|
| P102 | Nguyễn Đức Phước | 31/01/2026 (QUÁ HẠN) | Nguyễn Đức Phuww | 03/02/2026 (ĐÃ QUA) |

Khách tiếp theo đã đến ngày check-in nhưng không được thông báo!

---

### GIẢI PHÁP ĐỀ XUẤT

#### 1. Cải tiến ExtendBookingDialog - Phát hiện conflict ngay khi mở

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ TÌNH HUỐNG KHẨN CẤP                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔴 PHÒNG P102 CÓ BOOKING CONFLICT!                                  │
│                                                                      │
│  Khách hiện tại: Nguyễn Đức Phước                                   │
│  Đã quá hạn: 4 đêm (từ 31/01 → 04/02)                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ⚠️ KHÁCH TIẾP THEO ĐÃ ĐẾN NGÀY CHECK-IN!                    │    │
│  │                                                              │    │
│  │ Tên khách: Nguyễn Đức Phuww                                 │    │
│  │ Ngày check-in: 03/02/2026 (đã qua 1 ngày)                   │    │
│  │ Liên hệ: 0828686861                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  CHỌN PHƯƠNG ÁN XỬ LÝ:                                              │
│                                                                      │
│  ○ 1. Checkout khách hiện tại ngay + Thông báo khách mới           │
│       (Thu phí 4 đêm quá hạn, chuyển phòng sang cleaning)          │
│                                                                      │
│  ○ 2. Chuyển booking khách mới sang phòng khác                      │
│       (Tìm phòng trống tương đương, thông báo khách mới)           │
│                                                                      │
│  ○ 3. Liên hệ khách mới để dời lịch                                │
│       (Gọi điện/nhắn tin, đề xuất ngày mới hoặc hoàn tiền)         │
│                                                                      │
│  [Xem phòng trống]   [Gọi khách mới]   [Tiếp tục xử lý]            │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Thêm Alert cho Dashboard - Cảnh báo Conflict

Thêm loại alert mới vào `OwnerSmartAlerts`:

```typescript
{
  id: 'booking-conflict',
  label: 'Conflict booking',
  count: conflictBookings.length,
  icon: AlertOctagon,
  color: 'text-red-600',
  bgColor: 'bg-red-100',
  link: '/bookings?filter=conflict',
  description: 'Cần xử lý gấp',
  priority: 'urgent', // Hiển thị đầu tiên
}
```

#### 3. Logic kiểm tra conflict

Tạo hook mới `useBookingConflicts`:

```typescript
// Kiểm tra conflict khi khách quá hạn
async function checkBookingConflicts(roomId: string, currentBookingId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const { data: conflicts } = await supabase
    .from('room_bookings')
    .select(`
      id, guest_name, guest_phone, 
      check_in_date, check_out_date, status,
      booking_source, deposit_amount
    `)
    .eq('room_id', roomId)
    .neq('id', currentBookingId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in_date', today)  // Check-in date đã đến
    .order('check_in_date')
    
  return {
    hasConflict: conflicts && conflicts.length > 0,
    conflictBookings: conflicts || [],
    urgencyLevel: calculateUrgency(conflicts),
  }
}
```

---

### CHI TIẾT THAY ĐỔI

#### File 1: `src/components/bookings/ExtendBookingDialog.tsx`

**Thay đổi:**
1. Thêm state `conflictData` để lưu booking xung đột
2. Thêm `useEffect` fetch conflict khi dialog mở
3. Thay đổi UI để hiển thị warning nếu có conflict
4. Thêm các action buttons: Checkout ngay, Chuyển phòng, Liên hệ khách

```typescript
// State mới
const [conflictData, setConflictData] = useState<{
  hasConflict: boolean
  nextBooking: any | null
  daysOverdue: number
}>({ hasConflict: false, nextBooking: null, daysOverdue: 0 })

// Fetch conflict khi mở dialog
useEffect(() => {
  if (open && booking) {
    checkForConflicts()
  }
}, [open, booking])

const checkForConflicts = async () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const { data } = await supabase
    .from('room_bookings')
    .select('id, guest_name, guest_phone, check_in_date, deposit_amount')
    .eq('room_id', booking.room_id)
    .neq('id', booking.id)
    .in('status', ['confirmed'])
    .lte('check_in_date', today)
    .order('check_in_date')
    .limit(1)
    
  if (data && data.length > 0) {
    setConflictData({
      hasConflict: true,
      nextBooking: data[0],
      daysOverdue: differenceInCalendarDays(
        new Date(), 
        parseISO(data[0].check_in_date)
      ),
    })
  }
}
```

#### File 2: `src/hooks/useBookingConflicts.ts` (MỚI)

Hook chuyên xử lý conflict:

```typescript
export interface BookingConflict {
  currentBooking: {
    id: string
    guest_name: string
    room_number: string
    check_out_date: string
    nights_overdue: number
  }
  nextBooking: {
    id: string
    guest_name: string
    guest_phone: string
    check_in_date: string
    days_waiting: number
    deposit_amount: number
  }
  urgency: 'critical' | 'high' | 'medium'
}

export function useBookingConflicts() {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['booking-conflicts', tenantId, selectedHotel?.id],
    queryFn: async (): Promise<BookingConflict[]> => {
      const today = format(new Date(), 'yyyy-MM-dd')
      
      // Find overdue checked-in bookings
      const { data: overdueBookings } = await supabase
        .from('room_bookings')
        .select(`
          id, guest_name, room_id, check_out_date,
          room:rooms(room_number)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .lt('check_out_date', today)
        
      // For each, check if there's a conflicting booking
      const conflicts: BookingConflict[] = []
      
      for (const current of overdueBookings || []) {
        const { data: next } = await supabase
          .from('room_bookings')
          .select('id, guest_name, guest_phone, check_in_date, deposit_amount')
          .eq('room_id', current.room_id)
          .neq('id', current.id)
          .eq('status', 'confirmed')
          .lte('check_in_date', today)
          .order('check_in_date')
          .limit(1)
          
        if (next && next.length > 0) {
          const nightsOverdue = differenceInCalendarDays(
            new Date(), 
            parseISO(current.check_out_date)
          )
          const daysWaiting = differenceInCalendarDays(
            new Date(),
            parseISO(next[0].check_in_date)
          )
          
          conflicts.push({
            currentBooking: {
              id: current.id,
              guest_name: current.guest_name,
              room_number: (current.room as any)?.room_number,
              check_out_date: current.check_out_date,
              nights_overdue: nightsOverdue,
            },
            nextBooking: {
              id: next[0].id,
              guest_name: next[0].guest_name,
              guest_phone: next[0].guest_phone,
              check_in_date: next[0].check_in_date,
              days_waiting: daysWaiting,
              deposit_amount: next[0].deposit_amount,
            },
            urgency: daysWaiting > 1 ? 'critical' : daysWaiting > 0 ? 'high' : 'medium',
          })
        }
      }
      
      return conflicts.sort((a, b) => 
        b.nextBooking.days_waiting - a.nextBooking.days_waiting
      )
    },
    refetchInterval: 60000, // Refresh mỗi phút
  })
}
```

#### File 3: `src/components/dashboard/owner/OwnerSmartAlerts.tsx`

Thêm alert cho booking conflicts:

```typescript
const { data: conflictData } = useBookingConflicts()

// Thêm vào mảng alerts
{
  id: 'booking-conflict',
  label: 'Xung đột lịch phòng',
  count: conflictData?.length || 0,
  icon: AlertOctagon,
  color: 'text-red-600',
  bgColor: 'bg-red-100 dark:bg-red-950/50',
  borderColor: 'border-red-300 dark:border-red-800',
  link: '/bookings?filter=conflict',
  description: 'Khách mới đang chờ',
  show: (conflictData?.length || 0) > 0,
  priority: 0, // Highest priority - show first
}
```

#### File 4: `src/hooks/useRevenueReport.ts`

Cập nhật `useOwnerAlerts` để include conflicts:

```typescript
// Thêm query conflicts
const { data: conflictingBookings } = await supabase
  .rpc('get_booking_conflicts', { p_tenant_id: tenantId })
  
return {
  overdueCheckouts: overdueCheckouts || [],
  unpaidBookings: unpaidBookings || [],
  unresolvedDamages: unresolvedDamages || [],
  bookingConflicts: conflictingBookings || [], // NEW
  totalAlerts: /* ... */,
}
```

---

### QUY TRÌNH NGƯỜI DÙNG SAU TRIỂN KHAI

```text
                    ┌─────────────────────────┐
                    │ Dashboard hiển thị      │
                    │ 🔴 "Xung đột lịch: 1"   │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ Click vào alert hoặc    │
                    │ bấm Checkout phòng P102 │
                    └──────────┬──────────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │ DIALOG HIỂN THỊ CẢNH BÁO CONFLICT         │
         │                                            │
         │ "Phòng P102 có booking conflict!          │
         │  Khách Nguyễn Đức Phuww đã đến ngày       │
         │  check-in từ 1 ngày trước."               │
         │                                            │
         │ Chọn phương án:                           │
         │ [1] Checkout ngay   ← Phổ biến nhất       │
         │ [2] Chuyển phòng khách mới                │
         │ [3] Liên hệ khách mới                     │
         └─────────────────────┬─────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
  ┌───────▼──────┐   ┌────────▼───────┐   ┌───────▼──────┐
  │ Checkout ngay │   │ Chuyển phòng  │   │ Liên hệ     │
  ├──────────────┤   ├───────────────┤   ├──────────────┤
  │ - Tính phí   │   │ - Hiển thị    │   │ - Copy SĐT  │
  │   quá hạn    │   │   phòng trống │   │ - Gọi điện  │
  │ - Checkout   │   │ - Update      │   │ - Gửi SMS   │
  │   booking    │   │   booking mới │   │ - Ghi note  │
  │ - Thông báo  │   │ - Thông báo   │   │              │
  │   staff      │   │   lễ tân      │   │              │
  └──────────────┘   └───────────────┘   └──────────────┘
```

---

### CÁC FILE CẦN THAY ĐỔI

| File | Thay đổi | Độ phức tạp |
|------|----------|------------|
| `src/hooks/useBookingConflicts.ts` | **TẠO MỚI** - Hook xử lý conflict | Trung bình |
| `src/components/bookings/ExtendBookingDialog.tsx` | Cập nhật UI với conflict warning | Cao |
| `src/components/dashboard/owner/OwnerSmartAlerts.tsx` | Thêm conflict alert | Thấp |
| `src/hooks/useRevenueReport.ts` | Thêm conflicts vào alerts | Thấp |
| `src/pages/bookings/BookingsPage.tsx` | Filter `?filter=conflict` | Thấp |

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Thời gian phát hiện conflict | Khi chọn ngày (chậm) | Ngay khi mở dialog |
| Thông báo cho quản lý | Không có | Dashboard alert real-time |
| Phương án xử lý | Chỉ gia hạn | 3 phương án rõ ràng |
| Thông tin khách mới | Không hiển thị | SĐT, ngày chờ, số tiền cọc |
| Urgency level | Không có | Critical/High/Medium |

