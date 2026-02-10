

## So sanh chi tiet Checkout Don Le vs Group Checkout - Cac tinh nang con thieu

### PHAN TICH HIEN TAI

Sau nhieu lan nang cap, Group Checkout da co gan day du cac tinh nang cua Checkout don le. Duoi day la danh sach **nhung gi con thieu hoac khac biet**:

---

### 1. THIEU: Phu thu Check-in som (Early Checkin Charge)

**Checkout don le** (dong 581-586): Hien dong "Phu thu check-in som" trong phan chi tiet thanh toan khi `earlyCheckinCharge > 0`.

**Group Checkout Buoc 1** (`GroupCheckoutDialog`): **KHONG** hien phu thu check-in som trong phan Payment Summary (dong 1191-1273). Chi hien: Tien phong, Phi den bu, Dich vu. Thieu dong early checkin.

**Group Checkout Buoc 2** (`GroupCheckoutConfirmDialog` dong 399-405): DA CO hien early checkin per-room.

**Can lam**: Them dong "Phu thu check-in som" vao phan Payment Summary cua `GroupCheckoutDialog.tsx` (Buoc 1). Du lieu da co trong `useGroupCheckoutCalculations` qua `costBreakdown.earlyCheckinCharge`.

---

### 2. THIEU: Phu thu checkout tre (late charge) tach rieng trong Payment Summary (Buoc 1)

**Checkout don le** (dong 626-688): Hien phu thu checkout tre nhu dong rieng voi so tien **editable** (Input + nut Mien phi / Theo chuan + Textarea ly do).

**Group Checkout Buoc 1**: **KHONG** hien late charge nhu dong rieng trong Payment Summary. Chi hien bang tiers nhung khong co dong "Phu thu checkout tre: xxx" trong bang ke. Nguoi dung phai doi den Buoc 2 moi thay va chinh sua duoc.

**Can lam**: Them dong "Phu thu checkout tre" (tong tat ca phong) vao Payment Summary Buoc 1. Khong can editable o Buoc 1 (vi chinh sua chi tiet per-room o Buoc 2).

---

### 3. THIEU: Hien thi "Chi phi khac" (Extra Charges) trong Payment Summary

**Checkout don le** (dong 706-710): Hien dong "Chi phi khac" khi `extraCharges > 0`.

**Group Checkout**: **KHONG** hien chi phi khac. Du lieu co the co trong `costBreakdown.extraCharges` nhung khong duoc hien.

**Can lam**: Them dong "Chi phi khac" vao ca 2 buoc Group Checkout.

---

### 4. KHAC BIET: Checkout don le co BookingPaymentDialog tich hop, Group dung GroupPaymentDialog rieng

**Checkout don le** (dong 870-886): Khi nhan "Thu tien & Tra phong", mo `BookingPaymentDialog` - cho phep chon thanh toan tien mat hoac chuyen khoan QR. Sau khi thanh toan xong, tu dong goi callback checkout.

**Group Checkout** (dong 1338-1349): Dung `GroupPaymentDialog` rieng - chi thanh toan chung cho ca nhom, **KHONG** tu dong trigger checkout sau khi thanh toan. Nguoi dung phai dong payment dialog roi nhan checkout lai.

**Can lam**: Sau khi thanh toan thanh cong trong `GroupPaymentDialog`, tu dong quay lai `GroupCheckoutConfirmDialog` va cho phep proceed checkout ngay (hoac tu dong checkout).

---

### 5. THIEU: Chinh sua phu thu tre ngay tai Buoc 1 (nhu checkout don le)

**Checkout don le**: Phu thu checkout tre duoc **editable truc tiep** trong dialog chinh (Input, nut Mien phi/Theo chuan, Textarea ly do). Khong can buoc phu.

**Group Checkout**: Phu thu checkout tre chi chinh sua duoc o **Buoc 2** (ConfirmDialog) per-room. Buoc 1 chi hien bang tiers ma khong cho edit.

**Nhan xet**: Day la su khac biet co y (vi group co nhieu phong, edit tung phong can trang rieng). KHONG CAN thay doi - Buoc 2 da xu ly tot.

---

### 6. THIEU: Checkout som (Early Checkout) detection trong Group

**Checkout don le** (dong 264, 479-490): Phat hien checkout som (truoc ngay du kien) va hien thong bao xanh "Checkout som - Khong phu thu". An bang tiers khi checkout som.

**Group Checkout Buoc 1**: **KHONG** phat hien checkout som. Luon hien bang tiers hoac "Checkout dung gio" dua tren gio. Khong kiem tra ngay.

**Group Checkout Buoc 2**: DA CO `isRoomEarlyCheckout()` per-room.

**Can lam**: Them kiem tra early checkout o Buoc 1. Neu **TAT CA** phong deu checkout som, hien "Checkout som - Khong phu thu" thay vi bang tiers.

---

### 7. THIEU: Hien dong "Phu thu checkout tre" (tong) trong Payment Summary Buoc 1

Nhu muc 2, hien tai Payment Summary o Buoc 1 chi hien:
- Tien phong
- Phi den bu thiet hai
- Dich vu su dung

**Thieu**: Phu thu checkout tre, Phu thu check-in som, Chi phi khac - deu la cac dong co trong checkout don le.

**Can lam**: Them cac dong nay bang cach tinh tong tu `inspectionStatuses` va `roomCosts` (neu da calculate) hoac uoc tinh tu late tiers.

---

### TONG KET CAC THAY DOI CAN THUC HIEN

| # | Thay doi | File | Muc do |
|---|---------|------|--------|
| 1 | Them dong "Phu thu check-in som" vao Payment Summary Buoc 1 | GroupCheckoutDialog.tsx | Trung binh |
| 2 | Them dong "Phu thu checkout tre" (tong) vao Payment Summary Buoc 1 | GroupCheckoutDialog.tsx | Trung binh |
| 3 | Them dong "Chi phi khac" vao Payment Summary ca 2 buoc | GroupCheckoutDialog.tsx, GroupCheckoutConfirmDialog.tsx | Thap |
| 4 | Phat hien early checkout o Buoc 1 - hien thong bao phu hop | GroupCheckoutDialog.tsx | Trung binh |
| 5 | Auto-proceed checkout sau khi thanh toan trong GroupPaymentDialog | GroupCheckoutDialog.tsx | Trung binh |

Tong cong: 5 thay doi, chu yeu o `GroupCheckoutDialog.tsx`. Khong can thay doi database.

### CHI TIET KY THUAT

#### Thay doi 1-2-3: Bo sung cac dong thieu trong Payment Summary (Buoc 1)

Hien tai `totals` useMemo (dong 404-465) chi tinh: `roomTotal`, `damageCharges`, `serviceCharges`. Can them:
- `lateCharges`: Tinh tu `roomCosts` Map (neu da calculate) hoac uoc tinh tu `activeTier.percent * avgRoomPrice`
- `earlyCheckinCharges`: Lay tu booking data hoac `roomCosts`
- `extraCharges`: Lay tu `roomCosts`

Sau do hien cac dong nay trong Payment Summary (dong 1191-1273).

#### Thay doi 4: Early checkout detection

Them logic kiem tra: Neu ngay hien tai < ngay checkout du kien cua **TAT CA** phong selected, hien "Checkout som" va an bang late tiers.

```text
const allEarlyCheckout = selectedBookings.every(b => {
  const scheduledDate = new Date(b.check_out_date)
  return new Date() < scheduledDate // Dang gian hoa
})
```

#### Thay doi 5: Auto-proceed sau payment

Trong `GroupPaymentDialog` callback `onPaymentComplete`, sau khi refetch data, tu dong show lai `GroupCheckoutConfirmDialog` va trigger checkout. Hoac don gian hon: sau khi payment thanh cong, goi `performCheckout` truc tiep.

