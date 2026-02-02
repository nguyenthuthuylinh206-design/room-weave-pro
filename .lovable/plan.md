

## Kế hoạch: Thêm nút Check-in/Check-out ca làm việc cho Nhân viên

### MỤC TIÊU

Tạo một nút Check-in/Check-out nổi bật hiển thị mỗi khi nhân viên (user_level_code = 'staff') mở app, cho phép họ đánh dấu bắt đầu và kết thúc ca làm việc.

---

### THIẾT KẾ UI/UX

```text
┌─────────────────────────────────────────────────────┐
│  [Header - Hotel Name]                              │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │  🕐 Ca làm việc                              │    │
│  │                                              │    │
│  │  Trạng thái: CHƯA VÀO CA                     │    │
│  │                                              │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │      📥 VÀO CA NGAY                 │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [Rest of dashboard content...]                     │
└─────────────────────────────────────────────────────┘
```

**Khi đã vào ca:**
```text
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐    │
│  │  ✓ Đang trong ca làm việc                   │    │
│  │  Bắt đầu: 08:30 (2 giờ 15 phút trước)       │    │
│  │                                              │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │      📤 KẾT THÚC CA                 │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

### CẤU TRÚC DỮ LIỆU

Bảng `staff_status` đã có sẵn các cột cần thiết:
- `shift_start_at` - Thời điểm bắt đầu ca
- `shift_end_at` - Thời điểm kết thúc ca

**Logic xác định trạng thái:**
| Điều kiện | Trạng thái |
|-----------|------------|
| `shift_start_at = NULL` hoặc `shift_end_at` >= `shift_start_at` | Chưa vào ca |
| `shift_start_at != NULL` và (`shift_end_at = NULL` hoặc `shift_end_at` < `shift_start_at`) | Đang trong ca |

---

### CHI TIẾT IMPLEMENTATION

#### Phase 1: Tạo Component ShiftCheckInCard

**File mới: `src/components/staff/ShiftCheckInCard.tsx`**

Component hiển thị trạng thái ca làm việc và nút Check-in/Check-out:

```typescript
interface ShiftCheckInCardProps {
  className?: string
}

export function ShiftCheckInCard({ className }: ShiftCheckInCardProps) {
  const { user, tenantId } = useUser()
  const { data: myStatus } = useMyStaffStatus()
  const { mutate: checkIn, isPending: isCheckingIn } = useShiftCheckIn()
  const { mutate: checkOut, isPending: isCheckingOut } = useShiftCheckOut()
  
  const isOnShift = isCurrentlyOnShift(myStatus)
  const shiftDuration = calculateShiftDuration(myStatus?.shift_start_at)
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <span className="font-medium">Ca làm việc</span>
      </div>
      
      {isOnShift ? (
        // Đang trong ca
        <>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span>Đang trong ca làm việc</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Bắt đầu: {formatTime(myStatus.shift_start_at)} ({shiftDuration})
          </p>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={checkOut}
            disabled={isCheckingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Kết thúc ca
          </Button>
        </>
      ) : (
        // Chưa vào ca
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Bạn chưa vào ca hôm nay
          </p>
          <Button 
            className="w-full" 
            onClick={checkIn}
            disabled={isCheckingIn}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Vào ca ngay
          </Button>
        </>
      )}
    </div>
  )
}
```

---

#### Phase 2: Tạo Hooks cho Shift Management

**File mới: `src/hooks/useShiftManagement.ts`**

```typescript
// Hook lấy trạng thái ca của user hiện tại
export function useMyStaffStatus() {
  const { user, tenantId } = useUser()
  
  return useQuery({
    queryKey: ['my-staff-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_status')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!user?.id && !!tenantId
  })
}

// Hook check-in ca làm việc
export function useShiftCheckIn() {
  const { user, tenantId } = useUser()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()
      
      const { error } = await supabase
        .from('staff_status')
        .upsert({
          user_id: user!.id,
          tenant_id: tenantId!,
          shift_start_at: now,
          shift_end_at: null,
          status: 'available',
          last_seen_at: now
        }, { onConflict: 'user_id' })
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-staff-status'] })
      queryClient.invalidateQueries({ queryKey: ['staff-status'] })
      toast.success('Đã vào ca làm việc')
    }
  })
}

// Hook check-out ca làm việc
export function useShiftCheckOut() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()
      
      const { error } = await supabase
        .from('staff_status')
        .update({
          shift_end_at: now,
          status: 'offline',
          last_seen_at: now
        })
        .eq('user_id', user!.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-staff-status'] })
      queryClient.invalidateQueries({ queryKey: ['staff-status'] })
      toast.success('Đã kết thúc ca làm việc')
    }
  })
}

// Helper functions
export function isCurrentlyOnShift(status: StaffStatus | null): boolean {
  if (!status?.shift_start_at) return false
  if (!status.shift_end_at) return true
  return new Date(status.shift_start_at) > new Date(status.shift_end_at)
}

export function calculateShiftDuration(startAt: string | null): string {
  if (!startAt) return ''
  return formatDistanceToNow(new Date(startAt), { locale: vi })
}
```

---

#### Phase 3: Tích hợp vào MobileDashboard

**Sửa file: `src/components/dashboard/MobileDashboard.tsx`**

Thêm ShiftCheckInCard ngay dưới header cho nhân viên:

```typescript
import { isStaff } from '@/lib/userAccess'
import { ShiftCheckInCard } from '@/components/staff/ShiftCheckInCard'

export function MobileDashboard() {
  const { user } = useUser()
  const isStaffUser = isStaff(user)
  
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-4 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br ...">
          ...
        </div>

        {/* Shift Check-in Card - CHỈ HIỂN THỊ CHO STAFF */}
        {isStaffUser && (
          <div className="px-4">
            <ShiftCheckInCard />
          </div>
        )}

        {/* Stats - Horizontal Scroll */}
        ...
      </div>
    </PullToRefresh>
  )
}
```

---

#### Phase 4: Tích hợp vào Desktop Dashboard (Manager/Staff view)

**Sửa file: `src/pages/Dashboard.tsx`**

Thêm ShiftCheckInCard cho staff trên desktop:

```typescript
import { isStaff } from '@/lib/userAccess'
import { ShiftCheckInCard } from '@/components/staff/ShiftCheckInCard'

export default function Dashboard() {
  const { user } = useUser()
  const isStaffUser = isStaff(user)
  
  // ... existing code
  
  return (
    <div className="space-y-6">
      <PageHeader ... />

      {/* Shift Check-in Card - CHỈ HIỂN THỊ CHO STAFF */}
      {isStaffUser && (
        <div className="max-w-md">
          <ShiftCheckInCard />
        </div>
      )}

      {/* Stats Grid */}
      ...
    </div>
  )
}
```

---

#### Phase 5: Cập nhật Staff Management hiển thị trạng thái ca

**Sửa file: `src/components/staff/StaffCard.tsx`**

Thêm indicator cho nhân viên đang trong ca:

```typescript
// Thêm vào StaffWithStatus interface trong useStaffStatus.ts
shift_start_at: string | null
shift_end_at: string | null

// Trong StaffCard, hiển thị badge "Đang trong ca"
{isCurrentlyOnShift(staff) && (
  <Badge variant="outline" className="text-green-600 border-green-600">
    Đang trong ca
  </Badge>
)}
```

---

#### Phase 6: Cập nhật i18n

**Sửa file: `src/i18n/locales/vi/common.json`**

```json
{
  "shift": {
    "title": "Ca làm việc",
    "notOnShift": "Bạn chưa vào ca hôm nay",
    "onShift": "Đang trong ca làm việc",
    "startedAt": "Bắt đầu: {{time}}",
    "duration": "{{duration}}",
    "checkIn": "Vào ca ngay",
    "checkOut": "Kết thúc ca",
    "checkedIn": "Đã vào ca làm việc",
    "checkedOut": "Đã kết thúc ca làm việc",
    "onShiftBadge": "Đang trong ca"
  }
}
```

**Sửa file: `src/i18n/locales/en/common.json`**

```json
{
  "shift": {
    "title": "Work Shift",
    "notOnShift": "You haven't started your shift today",
    "onShift": "Currently on shift",
    "startedAt": "Started: {{time}}",
    "duration": "{{duration}}",
    "checkIn": "Start Shift",
    "checkOut": "End Shift",
    "checkedIn": "Shift started",
    "checkedOut": "Shift ended",
    "onShiftBadge": "On shift"
  }
}
```

---

### TÓM TẮT CÁC FILE CẦN TẠO/SỬA

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/components/staff/ShiftCheckInCard.tsx` | **Tạo mới** | Component chính hiển thị nút Check-in/out |
| `src/hooks/useShiftManagement.ts` | **Tạo mới** | Hooks: useMyStaffStatus, useShiftCheckIn, useShiftCheckOut |
| `src/components/dashboard/MobileDashboard.tsx` | **Sửa** | Thêm ShiftCheckInCard cho staff |
| `src/pages/Dashboard.tsx` | **Sửa** | Thêm ShiftCheckInCard cho staff (desktop) |
| `src/hooks/useStaffStatus.ts` | **Sửa** | Thêm shift_start_at, shift_end_at vào StaffWithStatus |
| `src/components/staff/StaffCard.tsx` | **Sửa** | Hiển thị badge "Đang trong ca" |
| `src/i18n/locales/vi/common.json` | **Sửa** | Thêm shift translations |
| `src/i18n/locales/en/common.json` | **Sửa** | Thêm shift translations |

---

### PHÂN QUYỀN HIỂN THỊ

| User Level | Thấy ShiftCheckInCard | Thấy badge "Đang trong ca" trên StaffCard |
|------------|----------------------|-------------------------------------------|
| super_admin | Không | Có (trong Staff Management) |
| tenant_owner | Không | Có (trong Staff Management) |
| manager | Không | Có (trong Staff Management) |
| staff | **CÓ** (trên dashboard) | Có |

---

### KẾT QUẢ MONG ĐỢI

1. **Nhân viên mở app** → Thấy ngay card "Ca làm việc" với nút **Vào ca ngay**
2. **Nhấn Vào ca** → Cập nhật `shift_start_at`, status = 'available', toast thông báo
3. **Card đổi sang trạng thái** → Hiển thị "Đang trong ca" + thời gian + nút **Kết thúc ca**
4. **Nhấn Kết thúc ca** → Cập nhật `shift_end_at`, status = 'offline', toast thông báo
5. **Quản lý xem Staff Management** → Thấy badge "Đang trong ca" bên cạnh tên nhân viên đang làm việc

