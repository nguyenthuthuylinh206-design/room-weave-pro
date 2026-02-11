

## Cai thien UX cho All Hotels mode - 4 form tao moi

### Tong quan

Them guard UI cho 4 form tao moi: khi nguoi dung dang o che do "Tat ca khach san", hien thi canh bao va disable nut submit. Pattern tham khao tu `ItemFormPage.tsx` va `RoomFormPage.tsx` da lam dung.

---

### 1. `src/pages/inventory/CreateDistributionPage.tsx`

- Import `useHotelContext` va `Alert, AlertDescription` va `AlertCircle`
- Lay `isAllHotelsMode` tu `useHotelContext()`
- Them Alert canh bao ngay tren DistributionForm khi `isAllHotelsMode`
- Disable nut "Tao phieu giao hang": them `isAllHotelsMode` vao dieu kien `disabled`
- Them guard trong `handleSubmit`: return som voi toast.error neu `isAllHotelsMode`

---

### 2. `src/pages/maintenance/MaintenanceRequestForm.tsx` (Desktop)

- Import `useHotelContext`
- Lay `isAllHotelsMode` tu `useHotelContext()`
- Them Alert canh bao truoc form content khi `isAllHotelsMode`
- Disable nut submit: them `isAllHotelsMode` vao disabled

---

### 3. `src/components/maintenance/MobileMaintenanceRequestForm.tsx` (Mobile)

- Import `useHotelContext`
- Lay `isAllHotelsMode` tu `useHotelContext()`
- Them Alert canh bao o dau form khi `isAllHotelsMode`
- Disable nut "Tiep theo" (Step 1) va nut submit (Step 3)

---

### 4. `src/pages/laundry/CreateBatchPage.tsx`

- Import `useHotelContext` va `Alert, AlertDescription, AlertCircle`
- Lay `isAllHotelsMode` tu `useHotelContext()`
- Them Alert canh bao truoc Stepper khi `isAllHotelsMode`
- Disable Step 1 "Tiep theo" button - can kiem tra `CreateBatchStep1` co prop disabled khong

---

### Noi dung Alert chung

```
Vui long chon mot khach san cu the de tao moi. Che do "Tat ca khach san" chi ho tro xem du lieu.
```

### Pattern chung (tham khao ItemFormPage)

```tsx
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useHotelContext } from '@/contexts/HotelContext'

const { isAllHotelsMode } = useHotelContext()

// Alert
{isAllHotelsMode && (
  <Alert variant="destructive" className="py-2">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription className="text-sm">
      Vui long chon mot khach san cu the de tao moi. Che do "Tat ca khach san" chi ho tro xem du lieu.
    </AlertDescription>
  </Alert>
)}

// Disable button
<Button disabled={isPending || isAllHotelsMode}>...</Button>
```

---

### Danh sach file thay doi

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/pages/inventory/CreateDistributionPage.tsx` | Alert + disable button + guard submit |
| 2 | `src/pages/maintenance/MaintenanceRequestForm.tsx` | Alert + disable button |
| 3 | `src/components/maintenance/MobileMaintenanceRequestForm.tsx` | Alert + disable buttons |
| 4 | `src/pages/laundry/CreateBatchPage.tsx` | Alert + disable step navigation |

