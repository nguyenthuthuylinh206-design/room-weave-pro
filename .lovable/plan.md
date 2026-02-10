

## Cap nhat Realtime cho Group Checkout - Do thieu, mat, hong va phu thu

### VAN DE CHINH

Khi nhan vien kiem tra phong va bao cao do thieu/mat/hong (Phase 1 cua checkout), man hinh Group Checkout cua le tan **KHONG cap nhat realtime**. Cu the:

#### Van de 1: Damage charges chi hien sau khi nhan vien hoan tat TOAN BO kiem tra (CAO)

**Nguyen nhan**: GroupCheckoutDialog lay du lieu `items_lost` va `items_damaged` tu bang `room_checks`. Nhung ban ghi `room_checks` chi duoc tao khi nhan vien **hoan tat tat ca cac buoc** (Phase 1 + Phase 2 + Review). Trong khi do, o Phase 1, nhan vien da bao cao do mat/hong va gui thong bao cho le tan qua `notify-chargeable`, nhung `room_checks` chua co du lieu.

**He qua**: Le tan phai doi den khi nhan vien hoan tat toan bo quy trinh (co the 5-10 phut) moi thay duoc phi den bu tren man hinh Group Checkout. Trong khi thuc te, thong tin mat/hong da duoc xac dinh tu Phase 1.

**Giai phap**: Sau khi Phase 1 gui thong bao notify-chargeable, **luu du lieu mat/hong tam thoi** vao bang `checkout_inspection_requests` (them cot `phase1_damage_data` kieu JSONB). GroupCheckoutDialog se doc du lieu nay de hien thi phi den bu ngay lap tuc, truoc khi `room_checks` duoc tao.

#### Van de 2: Phu thu minibar/tieu hao KHONG hien trong tong tien Group Checkout (CAO)

**Nguyen nhan**: Phan tinh `totals` trong GroupCheckoutDialog (dong 287-332) chi tinh:
- `roomTotal` (tien phong)
- `damageCharges` (phi den bu)
- `totalPaid` (da thanh toan)
- `depositApplied` (tien coc)

**THIEU**: `serviceCharges` tu bang `chargeable_consumptions`. Khi nhan vien Phase 1 ghi nhan minibar/tieu hao, du lieu duoc luu vao `chargeable_consumptions` nhung GroupCheckout khong doc bang nay.

**Giai phap**: 
1. Them query doc tong `chargeable_consumptions` cho cac booking trong nhom
2. Hien thi "Phu thu dich vu" trong phan thanh toan
3. Cong vao `grandTotal`

#### Van de 3: Khong co realtime subscription cho `chargeable_consumptions` (TRUNG BINH)

**Nguyen nhan**: GroupCheckoutDialog subscribe realtime cho `checkout_inspection_requests` va `room_checks`, nhung **KHONG subscribe cho `chargeable_consumptions`** (du bang nay da duoc enable realtime).

**Giai phap**: Them realtime channel cho `chargeable_consumptions` de cap nhat phu thu ngay khi nhan vien ghi nhan.

---

### KE HOACH THUC HIEN

#### Buoc 1: Database Migration - Them cot `phase1_damage_data` vao `checkout_inspection_requests`

Tao migration them cot JSONB nullable vao `checkout_inspection_requests`:

```text
ALTER TABLE public.checkout_inspection_requests 
ADD COLUMN IF NOT EXISTS phase1_damage_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.checkout_inspection_requests.phase1_damage_data 
IS 'Temporary storage for Phase 1 damage/lost data before room_checks record is created';
```

Cot nay luu du lieu dang:
```text
{
  "lost_items": [{ "item_id": "...", "item_name": "...", "quantity": 1, "estimated_value": 50000 }],
  "damaged_items": [{ "item_id": "...", "item_name": "...", "quantity": 1, "damage_cost": 100000, "damage_type": "repairable" }],
  "lost_total": 50000,
  "damaged_total": 100000
}
```

#### Buoc 2: Cap nhat RoomCheckPage - Luu phase1_damage_data khi gui Phase 1

**File**: `src/pages/rooms/RoomCheckPage.tsx` (ham `handlePhase1Submit`)

Sau khi gui notify-chargeable, them logic:
- Lay `items_lost` va `items_damaged` tu form
- Tinh `lost_total` va `damaged_total`
- Update `checkout_inspection_requests` bang `phase1_damage_data` cho inspection hien tai
- Du lieu nay se trigger realtime event cho GroupCheckoutDialog

#### Buoc 3: Cap nhat GroupCheckoutDialog - Doc phase1_damage_data va chargeable_consumptions

**File**: `src/components/bookings/GroupCheckoutDialog.tsx`

3a. **Cap nhat query `group-inspections`** (dong 138-212):
- Khi tinh `damageCharge`: Uu tien doc tu `room_checks` (du lieu cuoi cung). Neu chua co `room_checks`, fallback doc tu `checkout_inspection_requests.phase1_damage_data`
- Dieu nay dam bao damage hien ngay khi Phase 1 hoan tat

3b. **Them query doc chargeable consumptions**:
- Query `chargeable_consumptions` theo booking_ids cua nhom
- Tinh tong `total_price` cho tung booking
- Luu vao state `chargeableTotals: Map<bookingId, number>`

3c. **Them realtime subscription cho `chargeable_consumptions`**:
- Subscribe event INSERT/UPDATE tren bang `chargeable_consumptions`
- Filter theo `booking_id` cua nhom
- Khi co thay doi: refetch chargeable totals

3d. **Cap nhat totals calculation** (dong 287-332):
- Them `serviceCharges` vao totals:
```text
const serviceCharges = selectedBookings.reduce((sum, b) => {
  return sum + (chargeableTotals.get(b.id) || 0)
}, 0)
const grandTotal = roomTotal + damageCharges + serviceCharges
```

3e. **Cap nhat UI hien thi** (dong 999-1045):
- Them dong "Phu thu dich vu" giua "Phi den bu" va "Da thanh toan":
```text
{totals.serviceCharges > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Phu thu dich vu</span>
    <span className="font-mono text-amber-600">+{formatVNCurrency(totals.serviceCharges)}</span>
  </div>
)}
```

3f. **Hien thi chi tiet damage/chargeable per room** (dong 877-881):
- Ben canh so tien damage, them hien thi so tien chargeable:
```text
{chargeableTotal > 0 && (
  <span className="text-xs text-amber-600 font-medium">
    Phu thu: +{formatVNCurrency(chargeableTotal)}
  </span>
)}
```

#### Buoc 4: Cap nhat InspectionStatusCard - Hien thi tom tat Phase 1

**File**: `src/components/bookings/InspectionStatusCard.tsx`

Khi inspection status la `in_progress` hoac `completed`:
- Neu co `phase1_damage_data`, hien them thong tin tom tat:
  - "Do mat: 2 mon - 150.000d"
  - "Do hong: 1 mon - 100.000d"
- Giup le tan biet ngay ket qua kiem tra ma khong can doi hoan tat

Them prop `phase1DamageData` vao `InspectionData` interface va `InspectionStatusCard`.

#### Buoc 5: Truyen phase1DamageData tu GroupCheckoutDialog vao InspectionStatusCard

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 936-942

Cap nhat InspectionStatus interface them `phase1DamageData`. Query `group-inspections` se doc `phase1_damage_data` tu `checkout_inspection_requests` va truyen vao.

---

### TONG KET

| # | Thay doi | File | Muc do |
|---|---------|------|--------|
| 1 | Them cot phase1_damage_data | Migration SQL | Cao |
| 2 | Luu phase1_damage_data khi Phase 1 | RoomCheckPage.tsx | Cao |
| 3a | Doc phase1_damage_data trong query | GroupCheckoutDialog.tsx | Cao |
| 3b | Them query chargeable_consumptions | GroupCheckoutDialog.tsx | Cao |
| 3c | Them realtime cho chargeable_consumptions | GroupCheckoutDialog.tsx | Trung binh |
| 3d | Cap nhat totals tinh serviceCharges | GroupCheckoutDialog.tsx | Cao |
| 3e | Hien thi "Phu thu dich vu" trong UI | GroupCheckoutDialog.tsx | Trung binh |
| 3f | Hien chi tiet per room | GroupCheckoutDialog.tsx | Thap |
| 4 | Hien Phase 1 summary trong InspectionStatusCard | InspectionStatusCard.tsx | Trung binh |
| 5 | Truyen phase1DamageData vao component | GroupCheckoutDialog.tsx | Thap |

