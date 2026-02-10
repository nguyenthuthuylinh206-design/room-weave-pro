

## Lam Group Checkout giong hinh thuc Checkout Don Le

### HIEN TAI vs MOI

**Checkout don le** (`CheckoutSummaryDialog`) co 1 dialog duy nhat voi:
1. Thong tin khach + phong
2. Thoi gian checkout + mo ta tre/som
3. Section kiem tra phong (chon nhan vien, theo doi trang thai)
4. Bang phu thu checkout tre (4 muc: 0%/30%/50%/100%)
5. Chi tiet thanh toan chi tiet: Tien phong, phu thu check-in som, phu thu tre (editable), dich vu, `DamageChargesSection` (itemized, edit/waive/reset), in bien ban
6. Subtotal, VAT, Phi dich vu, TONG CONG, Da thanh toan, Tien coc, CON LAI
7. Warning khi chua thanh toan
8. Footer: Huy / Checkout no / Thu tien & Checkout

**Group Checkout** hien tai co 2 buoc:
- **Buoc 1** (`GroupCheckoutDialog`): Chon phong, chon nhan vien, gui yeu cau kiem tra, xem trang thai. **Phan thanh toan chi don gian**: chi co tong tien phong, phi den bu, dich vu, da TT, tien coc, CAN THU. **KHONG CO**: bang phu thu tre, chi tiet per-item, DamageChargesSection, VAT, Subtotal...
- **Buoc 2** (`GroupCheckoutConfirmDialog`): Da chi tiet hon - co late checkout tiers, editable charges, damage items. Nhung dung inline rendering thay vi `DamageChargesSection` component.

### KE HOACH THAY DOI

#### 1. Nang cap phan Payment Summary trong GroupCheckoutDialog (Buoc 1)

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 1099-1165

Thay the phan "Thanh toan" don gian hien tai bang layout chi tiet giong `CheckoutSummaryDialog`:

```text
TRUOC (don gian):
  Tien phong: xxx
  Phi den bu: xxx
  Phu thu dich vu: xxx
  Da thanh toan: -xxx
  Tien coc: -xxx
  CAN THU: xxx

SAU (chi tiet nhu checkout don le):
  Chi tiet thanh toan
  ─────────────────
  Tien phong (tong)             xxx
  Phu thu check-out tre         xxx (neu co)
  Phu thu check-in som          xxx (neu co)
  Dich vu su dung               xxx (neu co)
  Phi den bu thiet hai          xxx (neu co, hien per-item)
  ─────────────────
  Subtotal                      xxx
  VAT (8%)                      xxx
  Phi dich vu (5%)              xxx
  ─────────────────
  TONG CONG                     xxx
  Tien dat coc                  -xxx
  Da thanh toan                 -xxx
  ─────────────────
  CON LAI                       xxx (do/xanh)
```

Can tinh them VAT va service fee trong `totals` (hien chua co). Thay doi `totals` useMemo de tinh Subtotal, VAT, Service Fee, Grand Total.

#### 2. Them bang phu thu checkout tre vao GroupCheckoutDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx`

Them bang `LATE_CHECKOUT_TIERS` (giong `CheckoutSummaryDialog` dong 39-44) va hien thi truoc phan thanh toan. Neu gio hien tai truoc 12h, hien "Checkout dung gio - Khong phu thu". Neu sau 12h, hien bang 4 muc voi muc dang ap dung duoc highlight.

Chi can hien 1 bang chung (vi tat ca phong cung checkout cung gio), khong can per-room.

#### 3. Hien chi tiet do mat/hong/tieu hao per-room trong GroupCheckoutDialog

Hien tai moi room card chi hien tong damage charge ("+225.000d"). Can hien them danh sach items tuong tu `CheckoutReportCard`:
- Do mat: ten x so luong - gia tri
- Do hong: ten x so luong
- Do da dung: ten x so luong

Su dung du lieu `phase1DamageData` da co trong `InspectionStatusCard`. Phan nay da duoc implement o plan truoc - chi can dam bao no hien day du.

#### 4. Them phan Warning khi chua thanh toan vao GroupCheckoutDialog

**File**: `src/components/bookings/GroupCheckoutDialog.tsx`

Them warning box giong `CheckoutSummaryDialog` dong 811-819:
```text
"Khach chua thanh toan day du. Vui long thu tien truoc khi cho tra phong hoac xac nhan checkout voi so no."
```

Hien khi `totals.remaining > 0`.

#### 5. Sua footer GroupCheckoutDialog co 2 nut giong checkout don le

**File**: `src/components/bookings/GroupCheckoutDialog.tsx` dong 1167-1199

Hien tai chi co 1 nut "Thu tien & Checkout" hoac "Checkout". Can tach ra giong checkout don le:
- Khi con no: 2 nut "Cho tra phong (no xxx)" + "Thu tien & Tra phong"
- Khi het no: 1 nut "Xac nhan Checkout (N phong)"

#### 6. Dung `DamageChargesSection` trong GroupCheckoutConfirmDialog

**File**: `src/components/bookings/GroupCheckoutConfirmDialog.tsx` dong 414-498

Thay the inline damage rendering bang component `DamageChargesSection` (da duoc dung trong `CheckoutSummaryDialog`). Component nay cung cap:
- Phan nhom theo loai (Mat/Hong/Da dung) voi icon va mau sac
- Edit inline per item (click icon Edit2)
- Waive per item (click Trash2)
- Reset per item (click RotateCcw)
- Hien gia goc khi da dieu chinh

Can tao adapter de chuyen tu `onAdjustDamageItem(bookingId, itemId, charge)` sang `onAdjustCharge(itemId, charge)`.

---

### TONG KET

| # | Thay doi | File | Muc do |
|---|---------|------|--------|
| 1 | Nang cap Payment Summary chi tiet (Subtotal/VAT/Fee/Total/Paid/Deposit/Remaining) | GroupCheckoutDialog.tsx | Cao |
| 2 | Them bang phu thu checkout tre | GroupCheckoutDialog.tsx | Trung binh |
| 3 | Dam bao chi tiet items hien day du per-room | GroupCheckoutDialog.tsx | Thap (da lam) |
| 4 | Them warning khi chua thanh toan | GroupCheckoutDialog.tsx | Thap |
| 5 | Sua footer 2 nut giong checkout don le | GroupCheckoutDialog.tsx | Trung binh |
| 6 | Dung DamageChargesSection trong ConfirmDialog | GroupCheckoutConfirmDialog.tsx | Trung binh |

Khong can thay doi database. Chi thay doi frontend UI.

