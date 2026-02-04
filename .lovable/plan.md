

## Kế hoạch: Thêm chức năng Theo dõi và Gọi nhân viên trong Group Checkout

### VẤN ĐỀ HIỆN TẠI

Trong dialog Group Checkout, khi phòng đang chờ kiểm tra (pending/in_progress), chỉ hiển thị tên nhân viên được gán:

```text
┌─────────────────────────────────────────────┐
│ P.P106  deluxe                    [Chờ kiểm tra]
│ Đang chờ: NV Linh                            
└─────────────────────────────────────────────┘
```

**Thiếu:**
- Trạng thái nhân viên (Available/Busy/Offline)
- Nút gọi điện & Telegram để liên lạc nhanh
- Khả năng xem chi tiết nhân viên (vị trí, hoạt động)

---

### GIẢI PHÁP

Cập nhật phần hiển thị nhân viên được gán để bao gồm:
1. **Status badge** cho thấy nhân viên đang Available/Busy/Offline
2. **Nút Telegram** để gửi tin nhắn nhanh
3. **Nút gọi điện** nếu có số điện thoại
4. **Click vào tên** để mở StaffDetailSheet xem chi tiết

**UI mới:**

```text
┌─────────────────────────────────────────────┐
│ P.P106  deluxe                    [Chờ kiểm tra]
│ NV kiểm tra: Linh 🟢 [Telegram] [📞]         
└─────────────────────────────────────────────┘
```

---

### THAY ĐỔI CẦN THỰC HIỆN

#### 1. Thêm imports và state cần thiết

```typescript
// Thêm imports
import { StaffStatusBadge } from '@/components/staff/StaffStatusBadge'
import { StaffDetailSheet } from '@/components/staff/StaffDetailSheet'
import { Phone, Send } from 'lucide-react'
import { getTelegramPhoneLink, openTelegramWithFallback, getTelegramDownloadLink } from '@/lib/phone-utils'
import { StaffWithStatus } from '@/hooks/useStaffStatus'

// Thêm state cho sheet chi tiết
const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffWithStatus | null>(null)
const [staffDetailOpen, setStaffDetailOpen] = useState(false)
```

#### 2. Cập nhật hook useOnShiftStaffList

Thêm thông tin status từ `staff_status` table để có thể hiển thị trạng thái nhân viên:

```typescript
// useOnShiftStaffList.ts - mở rộng interface
export interface OnShiftStaffMember {
  // ... existing fields
  status: 'available' | 'busy' | 'break' | 'offline'
  current_activity: string | null
  current_location: string | null
}
```

#### 3. Cập nhật phần hiển thị nhân viên trong GroupCheckoutDialog

Thay thế dòng 746-751:

```tsx
{/* Show assigned staff for pending/in_progress inspections */}
{isSelected && !isCheckedOut && inspection && ['pending', 'in_progress'].includes(inspection.status) && (
  <AssignedStaffRow
    staffId={inspection.assignedTo}
    staffList={staffList}
    onViewDetail={(staff) => {
      setSelectedStaffForDetail(staff)
      setStaffDetailOpen(true)
    }}
  />
)}
```

#### 4. Tạo component AssignedStaffRow

Hiển thị nhân viên được gán với các nút liên lạc:

```tsx
function AssignedStaffRow({ 
  staffId, 
  staffList, 
  onViewDetail 
}: { 
  staffId: string | undefined
  staffList: OnShiftStaffMember[]
  onViewDetail: (staff: StaffWithStatus) => void 
}) {
  const staff = staffList.find(s => s.id === staffId)
  
  if (!staff) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>NV kiểm tra:</span>
        <span className="text-amber-600">Không xác định</span>
      </div>
    )
  }
  
  const hasTelegramConnection = staff.telegram_username || staff.phone || staff.telegram_chat_id
  
  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation()
    let url: string | null = null
    if (staff.telegram_username) url = `tg://resolve?domain=${staff.telegram_username}`
    else if (staff.phone) url = getTelegramPhoneLink(staff.phone)
    else if (staff.telegram_chat_id) url = `tg://user?id=${staff.telegram_chat_id}`
    
    if (url) {
      openTelegramWithFallback(url, () => {
        toast.info(...)
      })
    }
  }
  
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (staff.phone) window.location.href = `tel:${staff.phone}`
  }
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">NV kiểm tra:</span>
      
      {/* Staff name - clickable to view detail */}
      <button 
        type="button"
        onClick={() => onViewDetail(staff as StaffWithStatus)}
        className="font-medium text-primary hover:underline"
      >
        {staff.full_name}
      </button>
      
      {/* Status badge */}
      <StaffStatusBadge status={staff.status} size="sm" showLabel={false} />
      
      {/* Quick action buttons */}
      <div className="flex items-center gap-0.5 ml-auto">
        {hasTelegramConnection && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500" onClick={handleTelegram}>
            <Send className="h-3 w-3" />
          </Button>
        )}
        {staff.phone && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCall}>
            <Phone className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
```

#### 5. Thêm StaffDetailSheet vào cuối dialog

```tsx
{/* Staff Detail Sheet */}
<StaffDetailSheet
  staff={selectedStaffForDetail}
  open={staffDetailOpen}
  onOpenChange={setStaffDetailOpen}
/>
```

---

### FILES CẦN THAY ĐỔI

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/hooks/useOnShiftStaffList.ts` | Thêm fields: status, current_activity, current_location |
| 2 | `src/components/bookings/GroupCheckoutDialog.tsx` | Thêm component AssignedStaffRow với nút Telegram/Phone + StaffDetailSheet |

---

### KẾT QUẢ MONG ĐỢI

**Trước:**
```text
Đang chờ: NV Linh
```

**Sau:**
```text
NV kiểm tra: Linh 🟢 [📤] [📞]
                ↑     ↑    ↑
          Status  Telegram  Gọi điện
          badge
```

**Khi click vào tên nhân viên:** Mở StaffDetailSheet hiển thị:
- Avatar, tên, chức vụ
- Trạng thái hiện tại (Available/Busy/Offline)
- Hoạt động hiện tại (nếu đang busy)
- Vị trí hiện tại
- Lịch sử hoạt động gần đây
- Nút Telegram, Gọi điện, Email

