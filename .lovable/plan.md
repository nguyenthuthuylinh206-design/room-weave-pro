

## Hien thi chi tiet do mat/hong/tieu hao trong Group Checkout giong checkout don le

### SO SANH HIEN TAI

| Tinh nang | Checkout don le | Group Checkout (Buoc 1 - Chon phong) | Group Checkout (Buoc 2 - Xac nhan) |
|-----------|----------------|--------------------------------------|-------------------------------------|
| Do da dung (consumed/minibar) | Co - icon Coffee, ten, so luong | KHONG co | KHONG co |
| Do mat (lost) | Co - icon, ten, so luong, notes, gia tri | Co (compact, khong notes) | Co - ten, badge, so luong, gia tri |
| Do hong (damaged) | Co - icon, ten, so luong, notes, loai | Co (compact, khong notes) | Co - ten, badge, so luong, gia tri |
| Tong thiet hai | Co - highlight box | Chi tong so | Co |
| In bien ban | Co | KHONG co | Co |
| Chinh sua gia | Co - per item | KHONG (chi xem) | Co - per item |

### THAY DOI CAN THUC HIEN

#### Buoc 1: Fetch `items_consumed` tu `room_checks` trong GroupCheckoutDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 170-175

Hien tai query `room_checks` chi select `id, room_id, items_lost, items_damaged`. Can them `items_consumed`:

```text
.select('id, room_id, items_lost, items_damaged, items_consumed')
```

Tuong tu cho fallback query dong 180-185.

#### Buoc 2: Mo rong `Phase1DamageData` interface them consumed items

**File**: `src/components/bookings/InspectionStatusCard.tsx`

Them vao interface `Phase1DamageData`:
```text
consumed_items?: Array<{ item_id: string; item_name: string; quantity: number }>
```

#### Buoc 3: Map `items_consumed` vao phase1DamageData trong GroupCheckoutDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 197-226

Khi doc tu `roomCheck`, them logic map consumed items:
```text
const consumed = roomCheck.items_consumed as any[] || []

phase1DamageData = {
  ...existing fields...,
  consumed_items: consumed.map((item: any) => ({
    item_id: item.item_id || '',
    item_name: item.item_name || 'Khong ro',
    quantity: item.quantity || 1,
  })),
}
```

Dieu kien tao phase1DamageData mo rong: `lost.length > 0 || damaged.length > 0 || consumed.length > 0`

#### Buoc 4: Nang cap `Phase1DamageSummary` hien thi consumed items

**File**: `src/components/bookings/InspectionStatusCard.tsx`

Them section "Do da dung" voi icon Coffee, tuong tu `CheckoutReportCard`:
```text
{consumedCount > 0 && (
  <div>
    <div className="text-xs font-medium text-blue-600">
      Do da dung ({consumedCount})
    </div>
    <div className="pl-2 space-y-0.5 mt-0.5">
      {data.consumed_items!.map((item, idx) => (
        <div key={idx} className="text-xs text-blue-600/80">
          - {item.item_name} x{item.quantity}
        </div>
      ))}
    </div>
  </div>
)}
```

#### Buoc 5: Them `items_consumed` vao `InspectionStatus` interface trong GroupCheckoutDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 36-50

Them `items_consumed` vao `InspectionStatus` interface de truyen xuong component.

#### Buoc 6: Truyen consumed items vao GroupCheckoutConfirmDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx`

Khi tao `confirmRooms` va `roomCosts` cho `GroupCheckoutConfirmDialog`, them `items_consumed` vao `damageItems` voi `item_type: 'consumed'`. Dieu nay cho phep `GroupCheckoutConfirmDialog` hien thi do da dung trong phan "Phi den bu thiet hai" giong nhu `DamageChargesSection` cua checkout don le.

#### Buoc 7: Cap nhat GroupCheckoutConfirmDialog hien consumed items

**File**: `src/components/bookings/GroupCheckoutConfirmDialog.tsx` dong 414-498

Hien tai chi hien "Mat" va "Hong" trong badge. Them loai "Da dung":
```text
<Badge ...>
  {item.item_type === 'lost' ? 'Mat' : item.item_type === 'damaged' ? 'Hong' : 'Da dung'} x{item.quantity}
</Badge>
```

---

### TONG KET

| # | Thay doi | File | Muc do |
|---|---------|------|--------|
| 1 | Fetch items_consumed tu room_checks | GroupCheckoutDialog.tsx | Cao |
| 2 | Mo rong Phase1DamageData interface | InspectionStatusCard.tsx | Thap |
| 3 | Map consumed items vao phase1DamageData | GroupCheckoutDialog.tsx | Trung binh |
| 4 | Hien consumed items trong Phase1DamageSummary | InspectionStatusCard.tsx | Trung binh |
| 5 | Them consumed vao InspectionStatus interface | GroupCheckoutDialog.tsx | Thap |
| 6 | Truyen consumed vao GroupCheckoutConfirmDialog | GroupCheckoutDialog.tsx | Trung binh |
| 7 | Hien consumed trong GroupCheckoutConfirmDialog | GroupCheckoutConfirmDialog.tsx | Thap |

Khong can them cot database hay migration. Chi thay doi code frontend.
