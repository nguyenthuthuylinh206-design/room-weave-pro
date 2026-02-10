

## Hien thi chi tiet do mat/hong trong Group Checkout (nhu checkout don le)

### VAN DE

Hien tai, Group Checkout chi hien **tong so tien** phi den bu (VD: "+225.000d") nhung **KHONG hien chi tiet** tung mon do mat/hong (ten, so luong, gia tri). Trong khi checkout don le (`CheckoutReportCard`) hien day du:
- "King Sheets Set x1 — 33.333d"
- "Dieu hoa — hong x1"

Nguyen nhan: Khi `room_checks` co du lieu (dong 197-206), code chi tinh tong `damageCharge` ma **khong truyen danh sach items** vao `phase1DamageData`. Component `InspectionStatusCard` chi hien chi tiet khi co `phase1DamageData`, nen khi room_checks da co thi items bi mat.

---

### GIAI PHAP

#### Buoc 1: Truyen item details tu room_checks vao phase1DamageData

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 197-206

Khi `roomCheck` ton tai, **chuyen doi** `items_lost` va `items_damaged` sang dinh dang `Phase1DamageData` de `InspectionStatusCard` co the hien thi chi tiet:

```text
if (roomCheck) {
  const lost = roomCheck.items_lost as any[] || []
  const damaged = roomCheck.items_damaged as any[] || []
  const lostTotal = lost.reduce(...)
  const damagedTotal = damaged.reduce(...)
  damageCharge = lostTotal + damagedTotal
  
  // THEM: Convert sang Phase1DamageData de hien chi tiet
  if (lost.length > 0 || damaged.length > 0) {
    phase1DamageData = {
      lost_items: lost.map(item => ({
        item_id: item.item_id || '',
        item_name: item.item_name || 'Khong ro',
        quantity: item.quantity || 1,
        estimated_value: item.estimated_value || 0,
      })),
      damaged_items: damaged.map(item => ({
        item_id: item.item_id || '',
        item_name: item.item_name || 'Khong ro',
        quantity: item.quantity || 1,
        damage_cost: item.damage_cost || 0,
        damage_type: item.damage_type,
      })),
      lost_total: lostTotal,
      damaged_total: damagedTotal,
    }
  }
}
```

#### Buoc 2: Nang cap Phase1DamageSummary hien chi tiet tung mon

**File**: `src/components/bookings/InspectionStatusCard.tsx` dong 230-249

Hien tai `Phase1DamageSummary` chi hien tom tat 1 dong ("Do mat: 2 mon — 150.000d"). Can hien chi tiet tung item:

```text
// TRUOC:
"Do mat: 2 mon — 150.000d"

// SAU:
Do mat (2):
  - King Sheets Set x1 — 33.333d
  - Pillow Case x1 — 20.000d
Do hong (1):
  - Dieu hoa x1 — 6.000.000d (can thay the)
```

Dung Collapsible hoac hien truc tiep (compact) vi khong gian nho trong card. Giu style `text-xs` de phu hop voi InspectionStatusCard.

---

### TONG KET

| # | Thay doi | File | Muc do |
|---|---------|------|--------|
| 1 | Convert room_checks items sang Phase1DamageData | GroupCheckoutDialog.tsx | Cao |
| 2 | Hien chi tiet tung item trong Phase1DamageSummary | InspectionStatusCard.tsx | Cao |

Chi can 2 thay doi nho, khong can them cot database hay query moi.
