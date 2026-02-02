

## Kế hoạch: Chỉ hiện nhân viên đang trong ca khi giao việc

### VẤN ĐỀ HIỆN TẠI

Các tính năng giao việc cho nhân viên hiện hiển thị **TẤT CẢ** nhân viên, bao gồm cả những người chưa vào ca. Điều này gây khó khăn khi quản lý vì:
- Giao việc cho người chưa đi làm
- Danh sách dài, khó tìm người đang có mặt

---

### GIẢI PHÁP

**Tạo hook mới `useOnShiftStaffList`** để lấy danh sách nhân viên đang trong ca, sau đó update các components sử dụng staff selection.

---

### CÁC THÀNH PHẦN CẦN CẬP NHẬT

| Component | File | Hiện tại dùng | Cần thay đổi |
|-----------|------|---------------|--------------|
| CreateTaskDialog | `src/components/housekeeping/CreateTaskDialog.tsx` | `useHotelStaffList` | Thêm filter shift |
| CleaningRequestBanner | `src/components/rooms/CleaningRequestBanner.tsx` | `useHotelStaffList` | Thêm filter shift |
| CheckoutInspectionSection | `src/components/bookings/CheckoutInspectionSection.tsx` | `useHotelStaffList` | Thêm filter shift |
| DistributionForm | `src/components/distribution/forms/DistributionForm.tsx` | `useUsers` + filter | Dùng hook mới |
| ApproveSupplementDialog | `src/components/supplements/ApproveSupplementDialog.tsx` | Inline Supabase query | Dùng hook mới |
| CreateFromSupplementsPage | `src/pages/inventory/CreateFromSupplementsPage.tsx` | `useUsers` + filter | Dùng hook mới |

---

### CHI TIẾT IMPLEMENTATION

#### 1. Tạo hook `useOnShiftStaffList`

**Tạo file mới: `src/hooks/useOnShiftStaffList.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { isCurrentlyOnShift } from './useShiftManagement'

export interface OnShiftStaffMember {
  id: string
  full_name: string
  avatar_url: string | null
  email: string | null
  phone: string | null
  user_level_code: string | null
  position_name: string | null
  telegram_username: string | null
  telegram_chat_id: string | null
  shift_start_at: string | null
}

export function useOnShiftStaffList(hotelId: string | undefined) {
  return useQuery({
    queryKey: ['on-shift-staff-list', hotelId],
    queryFn: async () => {
      if (!hotelId) return []
      
      // Get all users assigned to this hotel with their shift status
      const { data: userHotels, error: uhError } = await supabase
        .from('user_hotels')
        .select(`
          user_id,
          user:users!user_hotels_user_id_fkey(
            id, full_name, avatar_url, email, phone, user_level_code,
            telegram_username,
            position:positions(name),
            telegram_connections(chat_id, is_active)
          )
        `)
        .eq('hotel_id', hotelId)
      
      if (uhError) throw uhError

      // Get staff_status for all users
      const userIds = userHotels?.map(uh => uh.user_id).filter(Boolean) || []
      
      const { data: statuses, error: statusError } = await supabase
        .from('staff_status')
        .select('user_id, shift_start_at, shift_end_at')
        .in('user_id', userIds)
      
      if (statusError) throw statusError

      const statusMap = new Map(statuses?.map(s => [s.user_id, s]) || [])

      // Filter only on-shift staff
      const onShiftStaff: OnShiftStaffMember[] = userHotels
        .filter(item => item.user)
        .filter(item => {
          const status = statusMap.get(item.user_id)
          return isCurrentlyOnShift(status || null)
        })
        .map(item => {
          const user = item.user as any
          const status = statusMap.get(item.user_id)
          const activeConnection = user.telegram_connections?.find((tc: any) => tc.is_active)
          
          return {
            id: user.id,
            full_name: user.full_name || 'Không tên',
            avatar_url: user.avatar_url,
            email: user.email,
            phone: user.phone,
            user_level_code: user.user_level_code,
            position_name: user.position?.name || null,
            telegram_username: user.telegram_username || null,
            telegram_chat_id: activeConnection?.chat_id || null,
            shift_start_at: status?.shift_start_at || null,
          }
        })
      
      // Sort by name
      return onShiftStaff.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    },
    enabled: !!hotelId,
    refetchInterval: 60000, // Refetch every minute để cập nhật khi có người vào/kết thúc ca
  })
}
```

---

#### 2. Cập nhật các Components

**2.1 CreateTaskDialog.tsx** - Thay `useHotelStaffList` bằng `useOnShiftStaffList`

```typescript
// Before
import { useHotelStaffList } from '@/hooks/useHotelStaffList'
const { data: staffList } = useHotelStaffList(hotelId)

// After
import { useOnShiftStaffList } from '@/hooks/useOnShiftStaffList'
const { data: staffList } = useOnShiftStaffList(hotelId)
```

**2.2 CleaningRequestBanner.tsx** - Tương tự

**2.3 CheckoutInspectionSection.tsx** - Tương tự

**2.4 DistributionForm.tsx** - Thay useUsers bằng useOnShiftStaffList

```typescript
// Before
import { useUsers } from '@/hooks/useUsers'
const { users = [] } = useUsers()
const staffUsers = users.filter(u => 
  u.user_level_code === 'staff' || u.user_level_code === 'hotel_manager'
)

// After
import { useOnShiftStaffList } from '@/hooks/useOnShiftStaffList'
import { useHotelContext } from '@/contexts/HotelContext'

const { selectedHotel } = useHotelContext()
const { data: staffUsers = [] } = useOnShiftStaffList(selectedHotel?.id)
```

**2.5 ApproveSupplementDialog.tsx** - Thay inline query bằng useOnShiftStaffList

**2.6 CreateFromSupplementsPage.tsx** - Tương tự DistributionForm

---

### UI INDICATION

Thêm indicator cho user biết danh sách chỉ hiện nhân viên đang trong ca:

```typescript
<div className="space-y-1.5">
  <Label className="text-xs flex items-center gap-1">
    Người giao hàng
    <span className="text-muted-foreground">(đang trong ca)</span>
  </Label>
  <Select ...>
```

Nếu không có ai trong ca:
```typescript
{staffUsers.length === 0 ? (
  <div className="py-2 px-3 text-sm text-muted-foreground">
    Không có nhân viên nào đang trong ca
  </div>
) : (
  staffUsers.map(...)
)}
```

---

### TÓM TẮT FILES CẦN SỬA/TẠO

| Action | File |
|--------|------|
| Tạo mới | `src/hooks/useOnShiftStaffList.ts` |
| Sửa | `src/components/housekeeping/CreateTaskDialog.tsx` |
| Sửa | `src/components/rooms/CleaningRequestBanner.tsx` |
| Sửa | `src/components/bookings/CheckoutInspectionSection.tsx` |
| Sửa | `src/components/distribution/forms/DistributionForm.tsx` |
| Sửa | `src/components/supplements/ApproveSupplementDialog.tsx` |
| Sửa | `src/pages/inventory/CreateFromSupplementsPage.tsx` |

---

### KẾT QUẢ MONG ĐỢI

1. Khi giao việc, dropdown chỉ hiện những nhân viên đã "Vào ca"
2. Nhân viên chưa vào ca hoặc đã kết thúc ca sẽ không xuất hiện
3. Danh sách tự động refresh mỗi phút để cập nhật khi có người vào/kết thúc ca
4. Label indicator cho user biết "đang trong ca"
5. Empty state khi không có ai trong ca

