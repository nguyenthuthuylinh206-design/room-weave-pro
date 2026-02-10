

## Lam lai toan bo Group Checkout - Giong Checkout Don Le

### VAN DE HIEN TAI

Group Checkout hien tai dung **2 dialog phuc tap**:
- **Buoc 1** (`GroupCheckoutDialog`): 1533 dong code - vua chon phong, vua gan nhan vien, vua hien payment summary tong. Qua nhieu trach nhiem trong 1 component.
- **Buoc 2** (`GroupCheckoutConfirmDialog`): 643 dong - hien chi tiet per-room voi collapsible, cho chinh sua phu thu/den bu.

**Van de chinh**:
- Thong tin tung phong o Buoc 1 qua so sai (chi hien room number + damage charge)
- Phai qua 2 buoc moi thay chi tiet thanh toan tung phong
- Logic tinh toan bi phan tan giua 2 component
- Luong thanh toan phai qua 3 dialog (Step1 -> Payment -> Step2)

### Y TUONG MOI

Thay vi 2 dialog, lam lai thanh **1 dialog duy nhat** voi cau truc:

```text
+------------------------------------------+
| Checkout Nhom - Ten Khach (N phong)      |
+------------------------------------------+
| [x] Chon tat ca (N phong dang o)         |
+------------------------------------------+
| Canh bao qua han (neu co)               |
+------------------------------------------+
| PHONG 101 - Daily                         |
|   [x] Chon | Badge trang thai kiem tra   |
|   > Chon NV kiem tra / Trang thai KT     |
|   > Bang phu thu tre (nhu checkout le)   |
|   > Chi tiet thanh toan:                 |
|     - 3 dem x 500.000/dem = 1.500.000    |
|     - Phu thu check-in som: 150.000      |
|     - Phu thu checkout tre (editable)    |
|     - Dich vu su dung: 200.000           |
|     - DamageChargesSection (edit/waive)   |
|     - Subtotal / VAT / Phi DV            |
|     - Tong phong nay: 1.850.000          |
|-------------------------------------------
| PHONG 102 - Hourly                        |
|   (tuong tu - hien theo loai hinh)       |
+------------------------------------------+
| === TONG HOP ===                          |
|   Tien phong:          3.000.000          |
|   Phu thu:               300.000          |
|   Dich vu:               200.000          |
|   Den bu:                100.000          |
|   Subtotal:            3.600.000          |
|   VAT / Phi DV (neu co)                  |
|   TONG CONG:           3.600.000          |
|   Tien coc:             -500.000          |
|   Da thanh toan:        -500.000          |
|   CON LAI:             2.600.000          |
+------------------------------------------+
| Warning chua thanh toan (neu co)         |
+------------------------------------------+
| [Huy] [Checkout no xxx] [Thu tien & COut]|
+------------------------------------------+
```

### CHI TIET KY THUAT

#### 1. Xoa `GroupCheckoutConfirmDialog.tsx`

Khong con can Buoc 2 rieng. Tat ca chi tiet per-room duoc hien truc tiep trong `GroupCheckoutDialog`.

#### 2. Viet lai `GroupCheckoutDialog.tsx` voi cau truc moi

**Phan Room List**: Moi phong la 1 `Collapsible` section (giong ConfirmDialog hien tai nhung day du hon):

- **Header**: Checkbox + Room number + Guest name + Badge trang thai kiem tra + Tong phong
- **Expanded content** (giong hoan toan `CheckoutSummaryDialog`):
  - `CheckoutInspectionSection` hoac `InspectionStatusCard` tuong ung voi trang thai
  - Staff assignment (neu chua gui yeu cau)
  - Bang `LATE_CHECKOUT_TIERS` (conditional, chi cho daily)
  - Early checkout detection per-room
  - Chi tiet thanh toan:
    - Tien phong (N dem x gia/dem, N gio x gia/gio, N thang x gia/thang)
    - Phu thu check-in som (read-only)
    - Phu thu checkout tre (**editable** voi Input + Mien phi / Theo chuan + Textarea ly do)
    - Phi vuot gio (cho hourly, editable)
    - Dich vu su dung
    - Chi phi khac
    - `DamageChargesSection` component (edit/waive/reset per item + note + in bien ban)
    - Subtotal phong
  - Tat ca deu dung cung component va logic nhu `CheckoutSummaryDialog`

**Phan Tong Hop**: Giong hien tai nhung lay du lieu tu `roomCosts` Map da tinh toan day du.

**Footer**: 3 nut giong checkout le: Huy | Checkout no | Thu tien & Checkout

#### 3. Giu nguyen cac hook va logic hien tai

- `useGroupBooking` - da fix select day du cot
- `useGroupCheckoutCalculations` - tinh toan per-room
- `GroupPaymentDialog` - xu ly thanh toan nhom
- Realtime subscriptions cho inspections, room_checks, chargeables
- Overdue detection, auto-calculate khi dialog mo

#### 4. Loai bo logic trung lap

- Xoa `confirmRooms`, `confirmTotals` useMemo (khong con Buoc 2)
- Xoa `showConfirmDialog` state
- `handleSelectiveCheckout` goi truc tiep `performCheckout` hoac mo PaymentDialog
- Nut "Checkout no" -> goi `performCheckout` truc tiep (khong can qua ConfirmDialog)
- Nut "Thu tien & Checkout" -> mo `GroupPaymentDialog` -> auto checkout sau khi thanh toan

#### 5. Cach hien chi tiet tung phong

Moi phong se duoc render tuong tu nhu phan body cua `CheckoutSummaryDialog` (dong 549-750), bao gom:

1. **Room charges theo booking type**:
   - Daily: `N dem x gia/dem`
   - Hourly: `N gio x gia/gio`
   - Monthly: `N thang x gia/thang + chiet khau`

2. **Phu thu check-in som** (read-only, chi khi > 0)

3. **Phu thu checkout tre** (editable):
   - Input so tien
   - Nut "Mien phi" / "Theo chuan"
   - Textarea ly do khi giam
   - Hien thi dieu kien (chi khi daily, khong early checkout, sau 12h)

4. **Phi vuot gio** (editable, chi cho hourly)

5. **Dich vu su dung** (read-only)

6. **Chi phi khac** (read-only)

7. **DamageChargesSection** component:
   - Phan nhom: Mat / Hong / Da dung
   - Edit/Waive/Reset per item
   - Note khi dieu chinh
   - Nut in bien ban

8. **Subtotal phong**

### TONG KET THAY DOI

| File | Thay doi |
|------|---------|
| `GroupCheckoutDialog.tsx` | Viet lai - gop Buoc 1 + Buoc 2 thanh 1 dialog duy nhat voi chi tiet per-room day du |
| `GroupCheckoutConfirmDialog.tsx` | **XOA** - khong con can thiet |
| Cac file khac | Khong thay doi |

### UU DIEM CUA CACH MOI

1. **Mot dialog duy nhat** - khong can qua lai giua 2 buoc
2. **Chi tiet tung phong ro rang** - giong hoan toan checkout le
3. **Chinh sua truc tiep** - phu thu, den bu chinh sua ngay tai phong, khong can doi Buoc 2
4. **Luong thanh toan don gian** - 1 click "Thu tien" -> Payment -> Auto checkout
5. **Code gon hon** - loai bo ~650 dong cua ConfirmDialog va logic trung lap
6. **Nhat quan UX** - nguoi dung da quen voi checkout le, group checkout giong y het

