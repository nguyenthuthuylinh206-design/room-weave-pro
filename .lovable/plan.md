

## Kiem tra nghiep vu Group Checkout - Cac van de con thieu

### PHAN TICH TOAN DIEN

Sau khi so sanh chi tiet code cua Checkout Don Le (`CheckoutSummaryDialog` + `BookingsPage.tsx`) voi Group Checkout (`GroupCheckoutDialog` + `GroupCheckoutConfirmDialog`), phat hien cac van de nghiep vu sau:

---

### 1. LOI NGHIEM TRONG: Thieu cot du lieu trong useGroupBooking (gia phong = 0)

**Van de**: `useGroupBooking.ts` (dong 60-78) KHONG select cac cot: `room_price`, `hourly_rate`, `monthly_rate`, `booking_hours`, `booking_months` tu bang `room_bookings`.

**Hau qua**: Trong `GroupCheckoutDialog.tsx`, tat ca truy cap `(booking as any).room_price`, `(booking as any).hourly_rate` v.v. deu tra ve `undefined` (= 0). Dieu nay lam sai toan bo tinh toan chi phi:
- Phu thu checkout tre = 0 (vi roomPrice = 0, nen 30%/50%/100% cua 0 = 0)
- Bang tiers hien `0d/phong` thay vi gia thuc
- `GroupBookingCostData.roomPrice` = 0 -> `calculateBookingCost` sai toan bo

**Can lam**: Them cac cot vao select query cua `useGroupBooking` va cap nhat `GroupBookingRoom` interface.

**Muc do**: **NGHIEM TRONG** - Sai so lieu tai chinh

---

### 2. THIEU: Xu ly checkout qua han (Overdue Checkout)

**Checkout don le** (trong `BookingsPage.tsx` va `ExtendBookingDialog`): Khi khach o qua ngay checkout, he thong phat hien va:
- Hien dialog gia han (ExtendBookingDialog) voi thong bao so dem qua han
- Cho phep "Checkout ngay" - tu dong gia han den hom nay roi checkout
- Kiem tra xung dot voi booking tiep theo

**Group Checkout**: **KHONG** kiem tra overdue. Neu khach nhom o qua ngay, khong co canh bao, khong co xu ly gia han tu dong. Luong checkout van chay binh thuong nhung voi du lieu `check_out_date` cu -> tinh toan sai.

**Can lam**: Them kiem tra overdue cho tung phong trong group. Neu co phong overdue, hien canh bao va tu dong cap nhat `check_out_date` truoc khi tinh toan chi phi.

---

### 3. THIEU: p_new_amount_paid trong RPC khi "Thu tien & Checkout"

**Checkout don le** (dong 820-833 BookingsPage.tsx): Khi chon "Thu tien & Checkout", goi `perform_checkout` voi `p_new_amount_paid` de cap nhat `amount_paid` atomic cung checkout. Dam bao `payment_status` chinh xac.

**Group Checkout** (dong 818-830 GroupCheckoutDialog.tsx): Goi `perform_checkout` **KHONG** truyen `p_new_amount_paid`. Khi auto-checkout sau payment, `GroupPaymentDialog` da cap nhat `amount_paid` rieng, nhung co the race condition.

**Can lam**: Khi group checkout co payment, truyen `p_new_amount_paid` vao RPC de dam bao atomicity. Hoac dam bao `GroupPaymentDialog.distributePayment()` da hoan tat truoc khi goi `performCheckout`.

---

### 4. THIEU: BookingPaymentDialog tich hop (chon phuong thuc thanh toan tai buoc 2)

**Checkout don le**: Dung `BookingPaymentDialog` voi VietQR, tien mat, realtime webhook. Sau khi thanh toan xong -> tu dong callback checkout.

**Group Checkout**: Dung `GroupPaymentDialog` rieng biet - chi hien o Buoc 1 khi nhan "Thu tien & Tra phong". O Buoc 2 (`GroupCheckoutConfirmDialog`), khi nhan "Thu tien & Checkout" -> quay lai Buoc 1 -> mo payment dialog. Luong nay kho su dung - phai qua 3 dialog.

**Can lam**: Khi nhan "Thu tien & Checkout" o Buoc 2, mo truc tiep `GroupPaymentDialog` tu Buoc 2, khong can quay lai Buoc 1.

---

### 5. THIEU: Hien thi chi tiet phong trong Payment Summary (N dem x gia/phong)

**Checkout don le** (dong 549-577): Hien ro `N dem x GIA/dem` hoac `N gio x GIA/gio` hoac `N thang x GIA/thang` + chiet khau.

**Group Checkout Buoc 1**: Chi hien tong "Tien phong" ma KHONG co chi tiet. Nguoi dung khong biet gia phong, so dem, hay loai hinh.

**Can lam**: Them thong tin chi tiet trong Payment Summary: "Tien phong (N phong, M dem)" hoac liet ke tung phong.

---

### 6. THIEU: Nut "Huy" trong footer Buoc 1

**Checkout don le**: Footer co 3 nut: Huy | Cho tra phong (no xxx) | Thu tien & Checkout.

**Group Checkout Buoc 1** (dong 1371-1416): Chi co "Thu nho" + "Cho tra phong (no)" + "Thu tien & Tra phong". KHONG co nut "Huy" de dong dialog hoan toan. Nguoi dung phai click X hoac click ngoai dialog.

**Can lam**: Them nut "Huy" vao footer.

---

### 7. THIEU: Xac nhan khi checkout co no (confirmation)

**Checkout don le**: Khi nhan "Cho tra phong (no xxx)", goi `onConfirmCheckout` truc tiep - khong can xac nhan them (vi da o trong CheckoutSummaryDialog).

**Group Checkout Buoc 1**: Khi nhan "Cho tra phong (no xxx)", goi `handleSelectiveCheckout` -> mo `GroupCheckoutConfirmDialog` (Buoc 2). Nhung o Buoc 2, nut "Checkout (no xxx)" cung goi `onConfirm` truc tiep. **Van de**: Ca 2 nut ("Cho tra phong no" o Buoc 1 va Buoc 2) deu goi cung `handleSelectiveCheckout` -> Buoc 2 luon duoc mo bat ke nguoi dung nhan nut nao.

**Nhan xet**: Luong nay hop ly cho group (can review per-room o Buoc 2). KHONG CAN thay doi.

---

### 8. THIEU: Tinh toan chi phi TRUOC khi hien Payment Summary o Buoc 1

**Van de hien tai**: `totals` useMemo o Buoc 1 lay `lateCharges`, `earlyCheckinCharges`, `extraCharges` tu `roomCosts` Map. Nhung `roomCosts` chi duoc populate KHI nguoi dung nhan "Checkout" (dong 718 `calculateAllCosts`). Truoc do, cac gia tri nay = 0.

**Hau qua**: Payment Summary o Buoc 1 luon hien "Phu thu checkout tre: 0" va "Phu thu check-in som: 0" cho den khi nguoi dung nhan nut Checkout. Thong tin khong chinh xac.

**Can lam**: Tu dong goi `calculateAllCosts` khi dialog mo va khi `selectedRooms` thay doi, de Payment Summary luon hien so lieu dung.

---

### 9. THIEU: Realtime cap nhat booking_payments trong GroupPaymentDialog

**Checkout don le**: `BookingPaymentDialog` co realtime subscription de lang nghe khi SePay webhook confirm payment -> tu dong cap nhat UI.

**GroupPaymentDialog** (dong 178-220): Tao payment record va hien QR, nhung **KHONG** co realtime subscription de tu dong detect khi webhook confirm. Nguoi dung phai nhan "Xac nhan thu cong" sau khi chuyen khoan.

**Can lam**: Them realtime subscription cho `booking_payments` trong `GroupPaymentDialog` de tu dong detect thanh toan thanh cong.

---

### TONG KET CAC THAY DOI CAN THUC HIEN (THEO MUC DO UU TIEN)

| # | Van de | File | Muc do |
|---|--------|------|--------|
| 1 | **NGHIEM TRONG**: Thieu cot room_price, hourly_rate, monthly_rate, booking_hours, booking_months trong useGroupBooking | useGroupBooking.ts | Cao |
| 2 | Thieu xu ly overdue checkout | GroupCheckoutDialog.tsx | Trung binh |
| 3 | Thieu p_new_amount_paid trong RPC khi payment + checkout | GroupCheckoutDialog.tsx | Trung binh |
| 4 | Payment dialog luong kho su dung (3 dialog) | GroupCheckoutDialog.tsx, GroupCheckoutConfirmDialog.tsx | Trung binh |
| 5 | Thieu chi tiet N dem x gia trong Payment Summary | GroupCheckoutDialog.tsx | Thap |
| 6 | Thieu nut "Huy" trong footer Buoc 1 | GroupCheckoutDialog.tsx | Thap |
| 7 | Tinh toan chi phi chua chay truoc khi hien Summary | GroupCheckoutDialog.tsx | Cao |
| 8 | Thieu realtime cho bank transfer trong GroupPaymentDialog | GroupPaymentDialog.tsx | Trung binh |

### CHI TIET KY THUAT

#### Thay doi 1: Bo sung cot vao useGroupBooking

```text
// Them vao select query:
room_price,
hourly_rate,
monthly_rate,
booking_hours,
booking_months,
notes

// Them vao GroupBookingRoom interface:
room_price: number
hourly_rate: number | null
monthly_rate: number | null
booking_hours: number | null
booking_months: number | null
notes: string | null
```

Sau do sua GroupCheckoutDialog bo tat ca `(booking as any).room_price` thanh `booking.room_price`.

#### Thay doi 7: Auto-calculate khi dialog mo

```text
// Trong GroupCheckoutDialog, them useEffect:
useEffect(() => {
  if (open && groupData && selectedRooms.size > 0) {
    // Build GroupBookingCostData for selected rooms
    const bookingsToCalc = ...
    calculateAllCosts(bookingsToCalc)
  }
}, [open, selectedRooms, groupData])
```

#### Thay doi 8: Realtime cho GroupPaymentDialog

```text
// Them subscription khi step === 'qr':
useEffect(() => {
  if (step !== 'qr' || !createdPayment) return
  const channel = supabase.channel(`payment-${createdPayment.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'booking_payments',
      filter: `id=eq.${createdPayment.id}`,
    }, (payload) => {
      if (payload.new.payment_status === 'completed') {
        // Auto distribute va chuyen sang success
        distributePayment(parsedAmount, groupData.bookings)
        setStep('success')
        onPaymentComplete?.()
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [step, createdPayment])
```

