
## Them nut "Thu nho" cho Group Checkout

### Van de

Trong `BookingsPage.tsx` (dong 1665-1679), `GroupCheckoutDialog` **khong duoc truyen prop `onMinimize`**, mac du component da ho tro san prop nay va co nut "Thu nho" trong code.

Checkout don le (daily/hourly/monthly) deu co `onMinimize={handleMinimizeCheckout}` hoat dong tot. Chi rieng Group Checkout bi thieu.

### Nguyen nhan

Ham `handleMinimizeCheckout` (dong 984) chi luu 1 booking (`actionBooking`) vao `MinimizedCheckout`. Khong tuong thich voi group (nhieu phong).

### Giai phap

#### 1. Tao ham `handleMinimizeGroupCheckout` trong BookingsPage

Khi thu nho group checkout:
- Luu `selectedGroupId` va thong tin nhom vao state rieng (hoac dung chung `minimizedCheckouts` voi 1 truong `isGroup`)
- Dong `GroupCheckoutDialog`
- Hien widget thu nho hien ten khach + so phong

#### 2. Truyen `onMinimize` cho GroupCheckoutDialog

```text
<GroupCheckoutDialog
  ...
  onMinimize={handleMinimizeGroupCheckout}
/>
```

#### 3. Mo rong MinimizedCheckout interface

Them truong `isGroup` va `bookingGroupId` de phan biet group voi single:

```text
export interface MinimizedCheckout {
  booking: { ... }
  // Group checkout fields
  isGroup?: boolean
  bookingGroupId?: string
  groupRoomCount?: number
  ...
}
```

#### 4. Cap nhat MinimizedCheckoutWidget

- Khi `isGroup = true`, hien "N phong" thay vi room number
- Khi restore group, mo lai `GroupCheckoutDialog` voi `bookingGroupId`

#### 5. Cap nhat handleRestoreCheckout

- Kiem tra `isGroup` -> neu la group, set `selectedGroupId` va `showGroupCheckoutDialog = true`
- Neu la single, giu logic hien tai

### File thay doi

| File | Thay doi |
|------|---------|
| `BookingsPage.tsx` | Them `handleMinimizeGroupCheckout`, truyen `onMinimize` cho GroupCheckoutDialog, cap nhat `handleRestoreCheckout` xu ly group |
| `MinimizedCheckoutWidget.tsx` | Mo rong interface, hien thi khac cho group (N phong) |
