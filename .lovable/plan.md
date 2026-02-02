

## Kế hoạch: Thêm xác nhận cho Vào ca / Kết thúc ca

### MỤC TIÊU

Thêm AlertDialog xác nhận trước khi thực hiện Check-in và Check-out để tránh nhấn nhầm.

---

### THIẾT KẾ UI

**Dialog xác nhận Vào ca:**
```text
┌─────────────────────────────────────┐
│  Xác nhận vào ca                    │
│                                     │
│  Bạn có chắc muốn bắt đầu ca làm    │
│  việc ngay bây giờ?                 │
│                                     │
│         [Hủy]    [Vào ca]           │
└─────────────────────────────────────┘
```

**Dialog xác nhận Kết thúc ca:**
```text
┌─────────────────────────────────────┐
│  Xác nhận kết thúc ca               │
│                                     │
│  Bạn đã làm việc được 2 giờ 30      │
│  phút. Bạn có chắc muốn kết thúc    │
│  ca làm việc?                       │
│                                     │
│         [Hủy]    [Kết thúc]         │
└─────────────────────────────────────┘
```

---

### CHI TIẾT IMPLEMENTATION

**Sửa file: `src/components/staff/ShiftStatusBanner.tsx`**

Thêm 2 AlertDialog với state quản lý:

```typescript
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ShiftStatusBanner() {
  const [showCheckInConfirm, setShowCheckInConfirm] = useState(false)
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false)
  
  // ... existing hooks
  
  const handleCheckIn = () => {
    checkIn()
    setShowCheckInConfirm(false)
  }
  
  const handleCheckOut = () => {
    checkOut()
    setShowCheckOutConfirm(false)
  }
  
  // On shift - Green banner
  if (isOnShift) {
    return (
      <>
        <div className="bg-green-50 ...">
          {/* ... existing content */}
          <Button onClick={() => setShowCheckOutConfirm(true)} ...>
            Kết thúc ca
          </Button>
        </div>
        
        {/* Check-out confirmation dialog */}
        <AlertDialog open={showCheckOutConfirm} onOpenChange={setShowCheckOutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận kết thúc ca</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn đã làm việc được {duration}. 
                Bạn có chắc muốn kết thúc ca làm việc?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleCheckOut} disabled={isCheckingOut}>
                {isCheckingOut ? 'Đang xử lý...' : 'Kết thúc ca'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }
  
  // Not on shift - Yellow banner
  return (
    <>
      <div className="bg-amber-50 ...">
        {/* ... existing content */}
        <Button onClick={() => setShowCheckInConfirm(true)} ...>
          Vào ca ngay
        </Button>
      </div>
      
      {/* Check-in confirmation dialog */}
      <AlertDialog open={showCheckInConfirm} onOpenChange={setShowCheckInConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận vào ca</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn bắt đầu ca làm việc ngay bây giờ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckIn} disabled={isCheckingIn}>
              {isCheckingIn ? 'Đang xử lý...' : 'Vào ca'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

### CẬP NHẬT I18N

**Thêm vào `src/i18n/locales/vi/common.json`:**

```json
{
  "shift": {
    "confirmCheckInTitle": "Xác nhận vào ca",
    "confirmCheckInDescription": "Bạn có chắc muốn bắt đầu ca làm việc ngay bây giờ?",
    "confirmCheckOutTitle": "Xác nhận kết thúc ca",
    "confirmCheckOutDescription": "Bạn đã làm việc được {{duration}}. Bạn có chắc muốn kết thúc ca làm việc?",
    "cancel": "Hủy",
    "processing": "Đang xử lý..."
  }
}
```

**Thêm vào `src/i18n/locales/en/common.json`:**

```json
{
  "shift": {
    "confirmCheckInTitle": "Confirm Check-in",
    "confirmCheckInDescription": "Are you sure you want to start your shift now?",
    "confirmCheckOutTitle": "Confirm Check-out",
    "confirmCheckOutDescription": "You've been working for {{duration}}. Are you sure you want to end your shift?",
    "cancel": "Cancel",
    "processing": "Processing..."
  }
}
```

---

### TÓM TẮT FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/staff/ShiftStatusBanner.tsx` | Thêm AlertDialog xác nhận cho cả Check-in và Check-out |
| `src/i18n/locales/vi/common.json` | Thêm translations cho dialog xác nhận |
| `src/i18n/locales/en/common.json` | Thêm translations cho dialog xác nhận |

---

### KẾT QUẢ MONG ĐỢI

1. **Nhấn "Vào ca ngay"** → Hiện dialog "Xác nhận vào ca" → Nhấn "Vào ca" mới thực sự check-in
2. **Nhấn "Kết thúc ca"** → Hiện dialog "Xác nhận kết thúc ca" với thời gian đã làm → Nhấn "Kết thúc ca" mới thực sự check-out
3. **Nhấn "Hủy"** → Đóng dialog, không thay đổi gì

