
## Kiem tra ky chuc nang Checkout - Tat ca cac truong hop

Sau khi doc toan bo code lien quan den checkout (BookingsPage.tsx 1553 dong, CheckoutSummaryDialog.tsx 880 dong, ExtendBookingDialog.tsx 309 dong, bookingCalculations.ts 468 dong, perform_checkout RPC), duoi day la phan tich chi tiet theo tung truong hop.

---

### PHAN 1: CAC TRUONG HOP CHECKOUT VA TRANG THAI HIEN TAI

| # | Truong hop | Trang thai | Ghi chu |
|---|-----------|------------|---------|
| 1 | Checkout binh thuong (daily, dung ngay, truoc 12h) | OK | Khong phu thu, flow thong suot |
| 2 | Checkout tre (daily, dung ngay, sau 12h) | OK | Bang phu thu 30%/50%/100% hien dung, editable |
| 3 | Checkout som (daily, truoc ngay check_out) | OK | Hien "Checkout som - Khong phu thu" |
| 4 | Checkout overdue (daily, qua ngay check_out) | **LOI** | Xem Van de 1 |
| 5 | Checkout hourly (theo gio) | **THIEU** | Xem Van de 2 |
| 6 | Checkout monthly (theo thang) | **THIEU** | Xem Van de 3 |
| 7 | Checkout nhom (group booking) | OK | GroupCheckoutDialog xu ly rieng |
| 8 | Checkout voi do mat/hong (damage items) | OK | DamageChargesSection editable + in bien ban |
| 9 | Checkout voi minibar/phu thu (chargeable consumptions) | OK | Tinh tu get_booking_chargeable_total RPC |
| 10 | Checkout + Thu tien cung luc (Pay & Checkout) | **LOI** | Xem Van de 4 |
| 11 | Checkout voi kiem tra phong (inspection) | OK | Tich hop realtime + minimize widget |
| 12 | Checkout minimize (xu ly khach khac) | OK | sessionStorage persist |

---

### PHAN 2: VAN DE CAN SUA

#### VAN DE 1: Overdue checkout - "Checkout ngay" KHONG TINH CHI PHI (NGHIEM TRONG)

**Hien tai** (`BookingsPage.tsx` dong 1494-1502):
```text
onCheckoutNow={() => {
  setShowExtendDialog(false)
  setShowCheckoutSummary(true)  // <-- MO DIALOG NHUNG KHONG CO costBreakdown!
})
```

**Van de**: Khi booking overdue, `handleCheckOutClick` (dong 550-554) return som vi phat hien overdue -> `checkoutCostBreakdown` KHONG DUOC TINH. Sau do `onCheckoutNow` chi goi `setShowCheckoutSummary(true)` nhung `checkoutCostBreakdown` van la `null`. Dieu kien render (dong 1436): `actionBooking && checkoutCostBreakdown` -> Dialog KHONG HIEN vi `checkoutCostBreakdown === null`.

**Ket qua**: Le tan nhan "Checkout ngay" -> KHONG CO GI XAY RA. Khong thay dialog, khong thay loi.

**Giai phap**: Khi nhan "Checkout ngay", can:
1. Auto-extend `check_out_date` den hom nay (de tinh chi phi chinh xac)
2. Chay lai toan bo logic tinh chi phi (giong dong 560-647)
3. Sau do moi mo CheckoutSummaryDialog

---

#### VAN DE 2: Checkout hourly KHONG TRUYEN bookingType va cac props lien quan (NGHIEM TRONG)

**Hien tai** (`BookingsPage.tsx` dong 1437-1464): CheckoutSummaryDialog KHONG duoc truyen cac props:
- `bookingType` -> mac dinh la `'daily'`
- `hourlyRate` -> undefined
- `bookingHours` -> undefined
- `scheduledEndTime` -> undefined

**Van de**: Voi booking theo gio, dialog se:
- Tinh `nights` sai (vi hourly booking co check_in = check_out cung ngay -> nights = 0 -> bi force = 1)
- Hien thi "1 dem x gia phong" thay vi "X gio x gia/gio"
- Tinh phu thu tre theo bang daily (30%/50%/100%) thay vi tinh phi vuot gio

**Them nua**, `handleCheckOutClick` (dong 560-647) tinh cost voi `calculateBookingCost` nhung KHONG truyen `bookingType`, `hourlyRate`, `hours`, `hourlyOvertimeCharge`. Mac dinh se tinh theo daily.

**Giai phap**: 
1. Truyen `bookingType`, `hourlyRate`, `bookingHours`, `scheduledEndTime`, `monthlyRate`, `bookingMonths` vao CheckoutSummaryDialog
2. Trong `handleCheckOutClick`, phan biet booking_type de tinh cost dung:
   - Hourly: Tinh `hourlyOvertimeCharge` bang `calculateHourlyOvertimeCharge()`
   - Monthly: Tinh `months` va `monthlyRate`

---

#### VAN DE 3: Checkout monthly KHONG TRUYEN bookingType (TRUNG BINH)

Tuong tu Van de 2 nhung cho monthly. `monthlyRate` va `bookingMonths` khong duoc truyen vao dialog va khong duoc su dung khi tinh cost.

---

#### VAN DE 4: Pay & Checkout KHONG DUNG perform_checkout RPC dung cach (TRUNG BINH)

**Hien tai** (`BookingsPage.tsx` dong 780-810): `handlePayAndCheckout` thuc hien 2 buoc TACH BIET:
1. Update `amount_paid`, `payment_status`, `paid_at` bang `supabase.from('room_bookings').update(...)` (dong 784-792)
2. Goi `perform_checkout` RPC (dong 796-808)

**Van de**: 
- `perform_checkout` RPC (migration dong 28-40) **tinh lai `payment_status`** tu `deposit_amount + amount_paid`. Nhung buoc 1 da cap nhat `amount_paid` va `payment_status` roi.
- Race condition: Neu buoc 1 thanh cong nhung buoc 2 that bai -> `payment_status = 'paid'` nhung `status` van la `checked_in` -> du lieu mat dong bo.
- RPC se doc `amount_paid` tu DB (da duoc update o buoc 1), tinh `payment_status` la `'paid'` -> dung ket qua nhung logic redundant va khong atomic.

**Giai phap**: Bo buoc 1 (update amount_paid rieng). Thay vao do, truyen `p_new_amount_paid` vao `perform_checkout` RPC de cap nhat atomic. Can update RPC de nhan them tham so nay.

---

#### VAN DE 5: performCheckOut va handlePayAndCheckout KHONG truyen bookingType khi tinh lai cost (THAP)

**Hien tai**: Ca hai ham `performCheckOut` (dong 670-683) va `handlePayAndCheckout` (dong 766-779) goi `calculateBookingCost()` de tinh lai cost nhung **KHONG truyen `bookingType`, `hourlyRate`, `hours`, etc.** -> luon tinh theo daily mac dinh.

**Van de**: Doi voi booking hourly/monthly, so tien tinh lai se sai (tinh theo daily) truoc khi goi RPC checkout.

---

#### VAN DE 6: Late checkout tiers table luon hien cho daily dung ngay, ke ca khi checkout truoc 12h (NHO)

**Hien tai** (`CheckoutSummaryDialog.tsx` dong 492-532): Bang phu thu tre LUON hien khi khong phai early checkout (ke ca khi checkout dung gio, truoc 12h). Chi la khong highlight tier nao.

**Van de**: Khong phai loi nhung tao visual noise cho le tan. Khi checkout truoc 12h, bang phu thu tre van hien day du 4 dong nhung khong co dong nao active. Chi co 1 dong text nho "Checkout truoc/dung gio -> khong phu thu."

**Giai phap**: An bang phu thu khi checkout truoc 12h, chi hien thong bao "Khong phu thu" tuong tu nhu early checkout.

---

#### VAN DE 7: Mobile UX - Footer buttons bi trong CheckoutSummaryDialog (TRUNG BINH)

**Hien tai** (`CheckoutSummaryDialog.tsx` dong 816-842): Footer co 3 nut ("Huy", "Cho tra phong (no X)", "Thu tien & Tra phong") hien tren 1 dong.

**Van de**: Tren mobile, 3 nut nay bi chen chuc, text bi cat. Dac biet nut "Cho tra phong (no 500.000d)" rat dai.

**Giai phap**: Tren mobile, chuyen footer thanh stack doc (flex-col) de cac nut hien tren tung dong rieng.

---

### PHAN 3: TONG KET UU TIEN

| # | Van de | Muc do | Loai |
|---|--------|--------|------|
| 1 | Overdue "Checkout ngay" khong tinh chi phi | **Cao** | Bug nghiep vu |
| 2 | Hourly checkout khong truyen bookingType | **Cao** | Bug nghiep vu |
| 3 | Monthly checkout khong truyen bookingType | **Trung binh** | Bug nghiep vu |
| 4 | Pay & Checkout khong atomic | **Trung binh** | Bug ky thuat |
| 5 | performCheckOut/handlePayAndCheckout khong truyen bookingType | **Trung binh** | Bug tinh toan |
| 6 | Late checkout tiers table hien khi khong can | **Thap** | UX polish |
| 7 | Mobile footer buttons bi chen | **Trung binh** | UX mobile |

---

### KE HOACH THUC HIEN

#### Fix 1: Overdue "Checkout ngay" tinh chi phi dung
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 1494-1503
- **Thay doi**: Thay callback `onCheckoutNow` thanh async function:
  1. Goi `supabase.from('room_bookings').update({ check_out_date: format(today, 'yyyy-MM-dd') })` de auto-extend den hom nay
  2. Cap nhat `actionBooking.check_out_date = today` trong state
  3. Chay logic tinh chi phi giong `handleCheckOutClick` (dong 560-647)
  4. Set `checkoutCostBreakdown` va `checkoutDamageItems`
  5. Mo `setShowCheckoutSummary(true)`
- Dong `setShowExtendDialog(false)` truoc de dong ExtendBookingDialog

#### Fix 2+3+5: Truyen bookingType va tinh cost dung cho hourly/monthly
- **File**: `src/pages/bookings/BookingsPage.tsx`
  - Dong 560-647 (`handleCheckOutClick`): Phan biet `booking.booking_type`:
    - `hourly`: Tinh `hourlyOvertimeCharge` tu `calculateHourlyOvertimeCharge(scheduledEndTime, now, hourlyRate)`. Truyen `bookingType: 'hourly'`, `hourlyRate`, `hours`, `hourlyOvertimeCharge` vao `calculateBookingCost`.
    - `monthly`: Truyen `bookingType: 'monthly'`, `monthlyRate`, `months` vao `calculateBookingCost`.
  - Dong 1437-1464 (render CheckoutSummaryDialog): Them props `bookingType`, `hourlyRate`, `bookingHours`, `scheduledEndTime`, `monthlyRate`, `bookingMonths` tu `actionBooking`.
  - Dong 670-683 (`performCheckOut`): Them `bookingType`, hourly/monthly params khi goi `calculateBookingCost`.
  - Dong 766-779 (`handlePayAndCheckout`): Tuong tu.

#### Fix 4: Pay & Checkout atomic
- **File**: `supabase/migrations/` - Tao migration moi update `perform_checkout` RPC them tham so `p_new_amount_paid NUMERIC DEFAULT NULL`. Neu khong null, cap nhat `amount_paid = p_new_amount_paid` va `paid_at = now()` trong cung transaction.
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 780-810: Bo buoc update `amount_paid` rieng. Truyen `p_new_amount_paid` vao RPC.

#### Fix 6: An bang phu thu khi checkout dung gio
- **File**: `src/components/bookings/CheckoutSummaryDialog.tsx` dong 492-532
- **Thay doi**: Them dieu kien `currentHour > 12` de chi hien bang phu thu khi thuc su co phu thu. Khi `currentHour <= 12`, hien thong bao don gian "Checkout dung gio - Khong phu thu" (tuong tu early checkout).

#### Fix 7: Mobile footer buttons
- **File**: `src/components/bookings/CheckoutSummaryDialog.tsx` dong 816-842
- **Thay doi**: Them `className="flex-col sm:flex-row"` cho `AlertDialogFooter`. Cac nut tren mobile se xep doc de khong bi chen.
