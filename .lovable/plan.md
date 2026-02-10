
## Fix: Group Checkout khong hien thi damage charges va service charges realtime

### NGUYEN NHAN GOC (ROOT CAUSE)

**Bug chinh**: Query `room_checks` trong `GroupCheckoutDialog.tsx` dong 169 su dung `.order('created_at', { ascending: false })` nhung bang `room_checks` **KHONG CO** cot `created_at`. Cot dung la `checked_at`. Loi nay lam query **THAT BAI AM THAM** (silent error) va tra ve `null/undefined`, khien toan bo du lieu `items_lost` va `items_damaged` khong bao gio duoc doc.

Da xac nhan tu database:
- Bang `room_checks` chi co cot `checked_at`, khong co `created_at`
- Du lieu damage TON TAI trong database (VD: P104 co King Sheets Set mat 33.333d, P103 co Dieu hoa hong 6.000.000d...)
- Nhung GroupCheckoutDialog khong doc duoc vi query loi

**Bug phu**: `phase1_damage_data` luon NULL trong tat ca cac ban ghi `checkout_inspection_requests`. Day la co che du phong (fallback) khi `room_checks` chua co. Can kiem tra them tai sao `handlePhase1Submit` khong luu duoc du lieu nay.

---

### KE HOACH SUA

#### Fix 1: Sua column name trong room_checks query (CRITICAL)

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 169

Thay doi:
```text
TRUOC: .order('created_at', { ascending: false })
SAU:   .order('checked_at', { ascending: false })
```

Chi can sua 1 dong nay se lam toan bo damage charges hoat dong:
- Damage amounts hien thi per room (dong 940-943)
- `totals.damageCharges` tinh dung
- "Phi den bu" hien trong phan thanh toan
- CAN THU tinh dung bao gom damage

#### Fix 2: Them filter theo booking de tranh lay room_checks cu (QUAN TRONG)

Hien tai query room_checks chi filter theo `room_id` va `check_type`. Neu phong da tung duoc checkout truoc (tu booking cu), se lay nham du lieu cu. Can them filter chinh xac hon.

**Giai phap**: Thay vi chi filter theo room_id, join voi `checkout_inspection_requests.room_check_id` de lay dung room_check cua booking hien tai.

```text
// Thay vi query tat ca room_checks theo room_id:
const roomCheckIds = inspections
  ?.filter(i => i.room_check_id)
  ?.map(i => i.room_check_id) || []

if (roomCheckIds.length > 0) {
  const { data: roomChecks } = await supabase
    .from('room_checks')
    .select('id, room_id, items_lost, items_damaged')
    .in('id', roomCheckIds)
}
```

Cach nay chinh xac hon vi dung `room_check_id` tu inspection request.

#### Fix 3: Debug va fix phase1_damage_data save (TRUNG BINH)

**File**: `src/pages/rooms/RoomCheckPage.tsx` dong 680-711

Them console.log de debug `finalInspectionId`:
```text
console.log('[RoomCheckPage] Phase 1: finalInspectionId sources:', {
  stableInspectionId,
  autoCreatedInspectionId,
  inspectionIdFromUrl,
  pendingInspectionId: pendingInspection?.id,
  final: finalInspectionId,
})
```

Dong thoi, mo rong dieu kien luu - hien tai chi luu khi co `lostItems.length > 0 || damagedItems.length > 0`. Can luu ca khi co chargeableItems (minibar/tieu hao) de dam bao le tan biet co phu thu.

#### Fix 4: Kiem tra useGroupCheckoutCalculations co cung bug khong

**File**: `src/hooks/useGroupCheckoutCalculations.ts` dong 56-65

Hook nay cung query `room_checks` voi `.order('created_at', ...)`. Can kiem tra va sua tuong tu. (Da search va KHONG thay bug nay trong file nay - chi co trong GroupCheckoutDialog)

---

### TONG KET

| # | Fix | File | Muc do |
|---|-----|------|--------|
| 1 | Sua `created_at` -> `checked_at` | GroupCheckoutDialog.tsx dong 169 | **CRITICAL** |
| 2 | Filter room_checks theo room_check_id | GroupCheckoutDialog.tsx dong 164-169 | Quan trong |
| 3 | Debug + fix phase1_damage_data save | RoomCheckPage.tsx dong 680-711 | Trung binh |

Fix 1 la nguyen nhan chinh, chi can sua 1 dong se giai quyet van de damage charges khong hien.
