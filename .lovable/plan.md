
## Kế hoạch triển khai: Phân biệt quy trình kiểm tra phòng theo loại

### Tổng quan tiến độ

Dựa trên phân tích codebase hiện tại, tôi sẽ triển khai theo 4 Phase:

---

### Phase 1: Tạo file cấu hình actions theo check_type

**File mới:** `src/lib/roomCheckConfig.ts`

```typescript
export type CheckType = 'daily' | 'checkin' | 'checkout' | 'maintenance'

export type LinenAction = 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'missing' | 'damaged'
export type ConsumableAction = 'ok' | 'empty' | 'consumed' | 'missing' | 'lost'
export type EquipmentAction = 'ok' | 'lost' | 'damaged'
export type FurnitureAction = 'ok' | 'lost' | 'damaged'

export interface CheckTypeConfig {
  label: string
  description: string
  headerColor: string
  linenActions: LinenAction[]
  consumableActions: ConsumableAction[]
  equipmentActions: EquipmentAction[]
  furnitureActions: FurnitureAction[]
  showBookingInfo: boolean
  allowDamageCharges: boolean
  blockOnDamaged: boolean
  requireInspection: boolean
}

export const CHECK_TYPE_CONFIG: Record<CheckType, CheckTypeConfig> = {
  daily: {
    label: 'Kiểm tra hàng ngày',
    description: 'Kiểm tra vệ sinh và đồ dùng thường ngày',
    headerColor: 'bg-blue-50 border-blue-200',
    linenActions: ['ok', 'change'],      // Chỉ OK hoặc Đổi (giặt + thay)
    consumableActions: ['ok', 'empty'],  // Chỉ OK hoặc Hết
    equipmentActions: ['ok', 'damaged'], // Chỉ OK hoặc Hỏng
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: false,
    allowDamageCharges: false,
    blockOnDamaged: false,
    requireInspection: false,
  },
  checkin: {
    label: 'Kiểm tra trước check-in',
    description: 'Đảm bảo phòng sẵn sàng cho khách',
    headerColor: 'bg-green-50 border-green-200',
    linenActions: ['ok', 'missing', 'add'],     // OK, Thiếu, Thêm
    consumableActions: ['ok', 'missing'],       // OK hoặc Thiếu
    equipmentActions: ['ok', 'damaged'],        // OK hoặc Hỏng (block check-in)
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: true,
    allowDamageCharges: false,
    blockOnDamaged: true,   // Cảnh báo nếu có đồ hỏng
    requireInspection: false,
  },
  checkout: {
    label: 'Kiểm tra sau check-out',
    description: 'Kiểm kê sau khi khách rời đi',
    headerColor: 'bg-orange-50 border-orange-200',
    linenActions: ['ok', 'laundry', 'change', 'lost', 'damaged'], // Full actions
    consumableActions: ['ok', 'consumed', 'lost'],                // Đã dùng, Mất
    equipmentActions: ['ok', 'lost', 'damaged'],                   // Full + charge
    furnitureActions: ['ok', 'lost', 'damaged'],
    showBookingInfo: true,
    allowDamageCharges: true,
    blockOnDamaged: false,
    requireInspection: true,
  },
  maintenance: {
    label: 'Kiểm tra bảo trì',
    description: 'Kiểm tra sau sửa chữa',
    headerColor: 'bg-purple-50 border-purple-200',
    linenActions: ['ok', 'missing'],
    consumableActions: ['ok', 'missing'],
    equipmentActions: ['ok', 'damaged'],
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: false,
    allowDamageCharges: false,
    blockOnDamaged: false,
    requireInspection: false,
  },
}
```

---

### Phase 2: Cập nhật các Tab components

**2.1 File:** `src/components/rooms/check-steps/item-type-tabs/LinenTab.tsx`

Thay đổi:
- Thêm prop `checkType: CheckType`
- Import config từ `roomCheckConfig.ts`
- Filter buttons dựa trên `CHECK_TYPE_CONFIG[checkType].linenActions`

```typescript
// Props mới
interface LinenTabProps {
  items: ExtendedRoomItem[]
  checkType: CheckType  // THÊM
  // ...existing props
}

// Trong component
const config = CHECK_TYPE_CONFIG[checkType]
const allowedActions = config.linenActions

// Render buttons có điều kiện
{allowedActions.includes('laundry') && (
  <Button onClick={() => handleStatusChange(item, 'laundry')}>Giặt</Button>
)}
{allowedActions.includes('change') && (
  <Button onClick={() => handleStatusChange(item, 'change')}>Đổi</Button>
)}
// ... tương tự cho các actions khác
```

**2.2 File:** `src/components/rooms/check-steps/item-type-tabs/ConsumableTab.tsx`

- Thêm prop `checkType`
- Daily: Chỉ hiện "OK" và "Hết"
- Checkin: Chỉ hiện "OK" và "Thiếu"
- Checkout: Hiện "OK", "Đã dùng", "Mất" với unit_price

**2.3 File:** `src/components/rooms/check-steps/item-type-tabs/EquipmentTab.tsx`

- Thêm prop `checkType`
- Daily/Checkin: Ẩn nút "Mất", chỉ hiện "OK" và "Hỏng"
- Checkout: Hiện đầy đủ với estimated value

**2.4 File:** `src/components/rooms/check-steps/item-type-tabs/FurnitureTab.tsx`

- Tương tự EquipmentTab

---

### Phase 3: Cập nhật ItemsCheckStep để truyền checkType

**File:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

```typescript
// Thêm prop
interface ItemsCheckStepProps {
  // ...existing
  checkType: CheckType  // THÊM
}

// Truyền xuống các tab
<LinenTab
  items={filterBySearch(linenItems)}
  checkType={checkType}  // THÊM
  laundryItems={laundryItems}
  // ...
/>

<ConsumableTabBooking
  items={filterBySearch(consumableItemsList)}
  checkType={checkType}  // THÊM
  // ...
/>
```

---

### Phase 4: Cập nhật RoomCheckPage

**File:** `src/pages/rooms/RoomCheckPage.tsx`

**4.1 Thêm header màu theo check_type:**

```typescript
import { CHECK_TYPE_CONFIG } from '@/lib/roomCheckConfig'

// Trong render
const checkType = form.watch('check_type')
const config = CHECK_TYPE_CONFIG[checkType]

<Card className={config.headerColor}>
  <CardHeader>
    <CardTitle>{config.label}</CardTitle>
    <p className="text-sm text-muted-foreground">{config.description}</p>
  </CardHeader>
</Card>
```

**4.2 Hiển thị booking info khi checkin/checkout:**

```typescript
{config.showBookingInfo && currentBooking && (
  <Card className="mb-4">
    <CardContent className="p-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        <span className="font-medium">{currentBooking.guest_name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {format(currentBooking.check_in_date, 'dd/MM')} - {format(currentBooking.check_out_date, 'dd/MM/yyyy')}
      </div>
    </CardContent>
  </Card>
)}
```

**4.3 Cảnh báo khi checkin có đồ hỏng:**

```typescript
// Trong ReviewStep hoặc trước submit
if (config.blockOnDamaged && (itemsDamaged.length > 0 || itemsMissing.length > 0)) {
  // Hiển thị AlertDialog cảnh báo
  <AlertDialog>
    <AlertDialogTitle>Phòng chưa sẵn sàng</AlertDialogTitle>
    <AlertDialogDescription>
      Có {itemsDamaged.length} thiết bị hỏng và {itemsMissing.length} đồ dùng thiếu.
      Không nên cho khách check-in.
    </AlertDialogDescription>
  </AlertDialog>
}
```

---

### Phase 5: Cập nhật ReviewStep

**File:** `src/components/rooms/check-steps/ReviewStep.tsx`

**5.1 Summary khác nhau theo checkType:**

```typescript
// Nhận thêm prop
interface ReviewStepProps {
  form: UseFormReturn<RoomCheckFormData>
  room: any
  checkType: CheckType  // THÊM
  currentBooking?: any  // THÊM
}

// Render summary khác nhau
{checkType === 'daily' && (
  <div>
    <p>Vệ sinh: {cleanlinessScore}/5</p>
    <p>{itemsReplaced.length} item cần thay</p>
  </div>
)}

{checkType === 'checkin' && (
  <div>
    <Badge variant={isReady ? 'success' : 'warning'}>
      {isReady ? 'Phòng sẵn sàng' : 'Chưa sẵn sàng'}
    </Badge>
    <p>{itemsMissing.length} item thiếu</p>
  </div>
)}

{checkType === 'checkout' && currentBooking && (
  <div>
    <p>Khách: {currentBooking.guest_name}</p>
    <p>Tổng phí charge: {formatCurrency(totalCharge)}</p>
  </div>
)}
```

---

### Tổng kết Files thay đổi

| STT | File | Thay đổi |
|-----|------|----------|
| 1 | `src/lib/roomCheckConfig.ts` | TẠO MỚI - Config actions theo check_type |
| 2 | `src/components/rooms/check-steps/ItemsCheckStep.tsx` | Nhận và truyền checkType xuống tabs |
| 3 | `src/components/rooms/check-steps/item-type-tabs/LinenTab.tsx` | Filter actions theo checkType |
| 4 | `src/components/rooms/check-steps/item-type-tabs/ConsumableTab.tsx` | Filter actions theo checkType |
| 5 | `src/components/rooms/check-steps/item-type-tabs/ConsumableTabBooking.tsx` | Filter actions theo checkType |
| 6 | `src/components/rooms/check-steps/item-type-tabs/EquipmentTab.tsx` | Filter actions theo checkType |
| 7 | `src/components/rooms/check-steps/item-type-tabs/FurnitureTab.tsx` | Filter actions theo checkType |
| 8 | `src/components/rooms/check-steps/ReviewStep.tsx` | Summary khác nhau theo checkType |
| 9 | `src/pages/rooms/RoomCheckPage.tsx` | Header màu, booking info, warning |

---

### Kết quả mong đợi

| Loại check | UI thay đổi | Actions cho phép |
|------------|-------------|------------------|
| **Daily** | Header xanh dương, không hiện booking | Đồ vải: OK/Đổi. Tiêu hao: OK/Hết. Thiết bị: OK/Hỏng |
| **Check-in** | Header xanh lá, hiện booking sắp tới, warning nếu chưa ready | Đồ vải: OK/Thiếu/Thêm. Tiêu hao: OK/Thiếu. Thiết bị: OK/Hỏng (block) |
| **Check-out** | Header cam, hiện booking vừa rời, tính charge | Full actions + estimated value |
| **Maintenance** | Header tím | Đồ vải: OK/Thiếu. Thiết bị: OK/Hỏng |
