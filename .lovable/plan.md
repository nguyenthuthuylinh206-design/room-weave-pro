

## Phan tich UX/UI quy trinh kiem tra phong cho nhan vien buong phong

Toi da kiem tra ky toan bo luong kiem tra phong, tu man hinh danh sach phong (StaffRoomCheckView) den RoomCheckPage voi 6 loai kiem tra khac nhau. Duoi day la phan tich chi tiet va de xuat cai thien.

---

### PHAN 1: TONG QUAN LUONG HIEN TAI

```text
StaffRoomCheckView           RoomCheckPage
+-------------------+       +------------------------------------+
| Danh sach phong   |       | Buoc 1: Chon loai kiem tra         |
| (Group theo tang) | --->  | Buoc 2: Kiem tra do dung           |
| Tap phong -> Modal|       | Buoc 3: Danh gia & Hoan tat       |
+-------------------+       +------------------------------------+
                             (Checkout: 6 buoc, Delivery: 3, ...)
```

---

### PHAN 2: DIEM TOT (Da lam duoc)

1. **Tap-to-OK pattern**: Nhan vao dong item -> tu dong danh dau OK. Rat nhanh.
2. **Mark All OK**: Nut "Tat ca OK" o header va theo category. Tiet kiem thoi gian.
3. **Sticky progress header**: Hien thi tien do kiem tra luon o dau trang.
4. **Category tabs voi checkmark**: Biet ngay category nao da xong.
5. **Session persistence**: Luu tien do vao localStorage, cho phep tiep tuc khi bi gian doan.
6. **Auto-skip Step 1**: Khi vao tu URL co `type=checkout`, bo qua buoc chon loai.
7. **Inline forms**: Form nhap thong tin "Mat/Hong" xuat hien ngay tai cho, khong mo modal.

---

### PHAN 3: VAN DE UX CAN CAI THIEN

#### VAN DE 1: Buoc 1 "Chon loai kiem tra" thua khi di tu luong co ngoc canh (QUAN TRONG)

**Hien tai**: Khi nhan vien tap vao phong co trang thai `cleaning` va chon "Kiem tra", he thong mo `CheckTypeSelector` modal de chon loai kiem tra. Sau do vao `RoomCheckPage` va lai hien thi **Step 1: Chon loai kiem tra** nua.

**Van de**: 
- Phong dang `cleaning` -> kiem tra luon la `daily`. Khong can hoi 2 lan.
- Phong dang `check_out` -> kiem tra luon la `checkout`. Khong can hoi.
- Chi co phong `vacant` moi that su can hoi loai kiem tra.

**Giai phap**: 
- Khi nhan vien tap vao phong `cleaning` -> navigate thang `/rooms/{id}/check?type=daily` (bo qua modal).
- Khi tap vao phong `check_out` -> da dung, navigate thang voi `type=checkout`.
- Chi hien `CheckTypeSelector` modal khi phong `vacant`.

---

#### VAN DE 2: Nhan vien khong biet phong nao can kiem tra gap nhat

**Hien tai**: Danh sach phong chi hien thi "X phut truoc" cho lan kiem tra cuoi. Khong co chi bao uu tien.

**Giai phap**: Them badge "Chua KT" (chua kiem tra hom nay) hoac sap xep phong chua kiem tra len dau trong moi tang.

---

#### VAN DE 3: Checkout 6 buoc - Qua nhieu buoc cho 1 quy trinh

**Hien tai** (Checkout flow):
1. Chon loai (thuong auto-skip)
2. Kiem tra do tinh phi/mat/hong (GD1)
3. Gui bao cao cho le tan (GD1 Confirm)
4. Kiem tra do bo sung/giat/thay (GD2)
5. Tinh trang don dep
6. Danh gia & Hoan tat

**Van de**: 
- Buoc 3 (Phase1 Confirm) la buoc "xem lai va gui". Nhung neu KHONG co phu thu nao, nhan vien van phai qua buoc nay va nhan nut "Khong co phu thu - Tiep tuc". Day la tap thua.
- Buoc 5 (Cleaning) va Buoc 6 (Review) co the gop lai. Review da co "Danh gia do sach" va "Ghi chu", Cleaning co "Tinh trang phong" va "Yeu cau don dep". Ca hai deu la buoc cuoi, khong can tach.

**Giai phap**:
- Khi khong co phu thu o buoc 2 (khong co item mat/hong/tinh phi) -> **Tu dong skip buoc 3**, chuyen thang sang buoc 4 (GD2).
- Gop buoc 5 (Cleaning) vao buoc 6 (Review) -> Con 5 buoc (hoac 4 neu auto-skip).

---

#### VAN DE 4: Nhan vien dung app o man hinh nho nhung Card + CardHeader chiem nhieu khong gian

**Hien tai**: `RoomCheckPage` wrap toan bo form trong `<Card>` voi `<CardHeader>` chua tieu de buoc va progress bar. Tren mobile, rieng header da chiem ~120px, cong voi PageHeader (~60px) va Check Type Header (~60px) = ~240px truoc khi nhan vien thay noi dung chinh.

**Giai phap**: 
- Thay Card bang div don gian voi border (theo design guidelines cua du an).
- Gop Check Type Header vao progress bar (1 dong: icon + ten loai + progress).
- Loai bo PageHeader tren mobile (thong tin da co trong Check Type Header).

---

#### VAN DE 5: Nut "Quay lai" va "Huy" cung o ben trai, gay nham lan

**Hien tai**: 
- Buoc 1: Nut "Huy" (ben trai)
- Buoc 2+: Nut "Quay lai" (ben trai)

Ca hai deu co icon `ChevronLeft`, nhung "Huy" se huy toan bo qua trinh (co dialog xac nhan), con "Quay lai" chi quay ve buoc truoc. Nhan vien co the nham khi thao tac nhanh.

**Giai phap**: 
- Nut "Huy" -> Doi thanh icon X nho o goc tren phai (nhu close button).
- Nut "Quay lai" -> Giu nguyen ben trai voi ChevronLeft.
- Tach biet ro rang 2 hanh dong nay.

---

#### VAN DE 6: Toast lien tuc khi kiem tra do dung

**Hien tai**: Moi lan nhan vien chon action cho 1 item (Giat, Mat, Hong...), he thong hien 1 toast thong bao. Voi phong co 20-30 items, se co rat nhieu toast xuat hien lien tuc, gay mat tap trung.

**Giai phap**: Loai bo toast cho cac action thong thuong (giat, them, doi, thieu). Chi giu toast cho action nghiem trong (mat, hong) de canh bao. Trang thai item da duoc hien thi truc tiep tren dong item (mau xanh/do/vang) nen khong can toast nua.

---

#### VAN DE 7: "empty" va "consumed" mapping khong ro rang cho consumable

**Hien tai**: Trong `roomCheckConfig.ts`, daily check co `consumableActions: ['ok', 'empty']` nhung trong `CategoryItemRow.tsx`, nut action label hien thi la "Thieu" (dong 68-69). Logic mapping o `getActionsForItemType()` (dong 187): neu `allowedActions` chua `empty` hoac `consumed` -> hien nut `consumed`. Nhung "consumed" (da dung) va "empty" (het) la 2 khai niem khac nhau:
- "empty/consumed" = khach da dung het -> can bo sung
- "missing" = khong thay do dau -> co the mat

Label "Thieu" cho consumed khong chinh xac. Nen doi thanh "Het" hoac "Da dung".

---

### PHAN 4: KE HOACH CAI THIEN (Thu tu uu tien)

| # | Cai thien | Muc do | Thay doi |
|---|-----------|--------|----------|
| 1 | Bo modal CheckTypeSelector khi phong cleaning/checkout | **Cao** | `StaffRoomCheckView.tsx`: Navigate truc tiep thay vi mo modal |
| 2 | Auto-skip Phase1 Confirm khi khong co phu thu | **Cao** | `RoomCheckPage.tsx`: Kiem tra chargeableItems + lost + damaged, neu rong thi skip buoc 3 |
| 3 | Gop Cleaning step vao Review step | **Trung binh** | `ReviewStep.tsx` + `RoomCheckPage.tsx`: Them CleaningRequestStep vao ReviewStep cho checkout |
| 4 | Giam toast spam khi kiem tra do dung | **Trung binh** | `CategoryBasedItemsCheck.tsx`: Bo toast cho ok/giat/them/doi/thieu, chi giu mat/hong |
| 5 | Thu gon header tren mobile | **Trung binh** | `RoomCheckPage.tsx`: Thay Card bang div, gop headers |
| 6 | Fix label "Thieu" -> "Het" cho consumable action | **Thap** | `CategoryItemRow.tsx`: Doi label consumed thanh "Het" |
| 7 | Tach nut Huy thanh icon X o goc tren | **Thap** | `RoomCheckPage.tsx`: Doi layout nut cancel |

### CHI TIET KY THUAT

**Fix 1 - Bo modal khi phong cleaning/checkout:**
- File: `src/components/rooms/StaffRoomCheckView.tsx`
- Thay doi: Trong `CompactRoomRow`, khi phong `cleaning` va nhan "Kiem tra", navigate thang `/rooms/{id}/check?type=daily` thay vi goi `onStartCheck` (mo modal).
- Phong `check_out` da navigate thang - khong can sua.
- Chi mo `CheckTypeSelector` modal khi phong `vacant`.

**Fix 2 - Auto-skip Phase1 Confirm:**
- File: `src/pages/rooms/RoomCheckPage.tsx`
- Thay doi: Trong `handleNext()`, khi `currentStep === 2` va `isCheckoutType`:
  - Kiem tra form values: `items_lost`, `items_damaged` rong VA `chargeableItems` rong
  - Neu rong -> setPhase1Submitted(true), setCurrentPhase(2), setCurrentStep(4) (skip buoc 3)
  - Neu co du lieu -> chuyen binh thuong sang buoc 3

**Fix 3 - Gop Cleaning vao Review:**
- File: `src/pages/rooms/RoomCheckPage.tsx`
- Thay doi: Checkout flow tu 6 buoc giam con 5 buoc:
  - Buoc 1: Chon loai (auto-skip)
  - Buoc 2: GD1 - Mat/Hong/Tinh phi
  - Buoc 3: Gui bao cao le tan (co the auto-skip)
  - Buoc 4: GD2 - Bo sung/Giat/Thay
  - Buoc 5: Danh gia + Don dep + Hoan tat (gop)
- File: `src/components/rooms/check-steps/ReviewStep.tsx` - import va render `CleaningRequestStep` truoc phan danh gia sao khi la checkout type.

**Fix 4 - Giam toast spam:**
- File: `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx`
- Thay doi: Trong `handleItemAction()`, bo cac dong `toast(...)` cho action `ok`, `laundry`, `add`, `change`, `missing`, `consumed`. Chi giu `toast` cho `lost` va `damaged`.

**Fix 5 - Thu gon header:**
- File: `src/pages/rooms/RoomCheckPage.tsx`
- Thay doi:
  - Thay `<Card>` + `<CardHeader>` + `<CardContent>` bang `<div className="border rounded-lg">`
  - Gop Check Type Header va Step indicator thanh 1 dong compact
  - An PageHeader tren mobile (hidden sm:block)

**Fix 6 - Label consumed:**
- File: `src/components/rooms/check-steps/item-type-tabs/CategoryItemRow.tsx` dong 68
- Thay doi: `consumed: { icon: Package, label: 'Het', color: ... }` (tu 'Thieu' thanh 'Het')

**Fix 7 - Nut Huy:**
- File: `src/pages/rooms/RoomCheckPage.tsx` dong 1323-1343
- Thay doi: Chuyen nut "Huy" len goc tren phai cua page, dung icon X nho thay vi nut text.

