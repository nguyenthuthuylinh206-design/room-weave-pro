

## Kiem tra lai mobile UX/UI cho nhan vien buong phong - Ket qua

Sau khi doc ky toan bo code hien tai, day la danh gia chi tiet ve nhung gi da duoc fix va cac van de con lai:

---

### PHAN 1: XAC NHAN CAC FIX DA AP DUNG DUNG

| # | Fix | Trang thai | Ghi chu |
|---|-----|------------|---------|
| 1 | Auto-skip CheckTypeSelector khi cleaning/checkout | OK | `StaffRoomCheckView.tsx` dong 83-91: navigate thang, khong mo modal |
| 2 | Auto-skip Phase1 Confirm khi khong co phu thu | OK | `RoomCheckPage.tsx` dong 552-564: skip step 3, nhay thang step 4 |
| 3 | Gop Cleaning + Review (5 buoc checkout) | OK | `RoomCheckPage.tsx` dong 1327-1331: Step 5 render CleaningRequestStep + ReviewStep |
| 4 | Toast chi hien cho mat/hong | OK | `CategoryBasedItemsCheck.tsx` dong 236-248: chi `lost` va `damaged` co toast |
| 5 | Compact header, an PageHeader tren mobile | OK | `RoomCheckPage.tsx` dong 1112: `hidden sm:block` |
| 6 | Nut Huy thanh X o goc tren phai | OK | `RoomCheckPage.tsx` dong 1141-1149: nut X trong header |
| 7 | Label "Het" cho consumable | OK | `CategoryItemRow.tsx` dong 57, 68: `consumed: { label: 'Het' }` |
| 8 | Sticky bottom navigation | OK | `RoomCheckPage.tsx` dong 1340: `sticky bottom-0` |
| 9 | Photo remove button hien tren mobile | OK | `ReviewStep.tsx` dong 383: `sm:opacity-0 sm:group-hover:opacity-100` |
| 10 | Phase1ConfirmStep dung div thay Card | OK | `Phase1ConfirmStep.tsx` dong 86: `div className="border border-orange-200 rounded-lg"` |
| 11 | An search bar khi it items | OK | `CategoryBasedItemsCheck.tsx` dong 425: `totalItems > 10 &&` |
| 12 | Sticky progress header offset | OK | `CategoryBasedItemsCheck.tsx` dong 342: `sticky top-12 z-10` |

**Tat ca 12 fix da duoc ap dung dung.** Khong co fix nao bi thieu hoac bi revert.

---

### PHAN 2: VAN DE CON TON TAI (nho, khong anh huong nghiem trong)

#### VAN DE 1: Sticky bottom nav bi de len boi MobileBottomNav (TRUNG BINH)

**Hien tai**: `RoomCheckPage.tsx` dong 1340 dung `sticky bottom-0 z-10`. Nhung `MobileBottomNav.tsx` dong 72 la `fixed bottom-0 z-50`. Tren mobile, MobileBottomNav se de len cac nut "Tiep theo"/"Hoan thanh".

**Van de cu the**: Sticky bottom nav cua RoomCheckPage (`z-10`) nam **duoi** MobileBottomNav (`z-50, fixed`), nghia la nhan vien se thay MobileBottomNav (Home, Tasks, Phong...) phu len nut "Tiep theo". Tuy nhien, day phu thuoc vao viec trang `/rooms/:id/check` co render MobileBottomNav hay khong - can xac nhan.

**Giai phap**: Them `pb-16` (padding-bottom 64px = chieu cao MobileBottomNav) vao container chinh cua RoomCheckPage tren mobile, hoac an MobileBottomNav khi dang o trang check. Cach tot nhat la an MobileBottomNav khi pathname chua `/check` vi nhan vien dang tap trung kiem tra, khong can nav bar.

---

#### VAN DE 2: `handleBack` khi checkout skip buoc khong chinh xac

**Hien tai**: `handleBack()` dong 701-704 chi don gian la `setCurrentStep(currentStep - 1)`. Nhung khi Phase1 duoc auto-skip (tu step 2 nhay thang step 4), nhan "Quay lai" o step 4 se ve step 3 (Phase1 Confirm) - mot buoc ma ban dau da skip vi khong co phu thu.

**Van de**: Nhan vien se thay man hinh Phase1 Confirm trang (khong co phu thu) - gay nham lan. Nen skip nguoc ve step 2.

**Giai phap**: Trong `handleBack()`, kiem tra neu `currentStep === 4 && isCheckoutType && phase1Submitted && !hasChargesInPhase1` thi nhay ve step 2 thay vi step 3.

---

#### VAN DE 3: Checkout step 3 an nut "Tiep theo" nhung khong co chi dan ro rang

**Hien tai**: `RoomCheckPage.tsx` dong 1357: `(currentStep === 3 && isCheckoutType && !phase1Submitted) ? null : (...)`. Khi nhan vien o step 3 va chua gui bao cao, nut "Tiep theo" bi an hoan toan. Nhan vien chi thay nut "Quay lai" va khong biet lam gi de chuyen buoc.

**Thuc te**: Phase1ConfirmStep co nut "Gui cho le tan & Tiep tuc" rieng (dong 213-230), va sau khi submit se hien nut "Tiep tuc kiem tra do bo sung" (dong 64-67). Nhung khi phase1Submitted = true va nhan vien o step 3, sticky bottom nav chi co nut "Quay lai" va **khong co** "Tiep theo" vi `onContinue` (dong 1306) goi `setCurrentStep(4)` truc tiep tu Phase1ConfirmStep.

**Van de**: Logic nay dung nhung UX khong nhat quan - o moi buoc khac, nhan vien dung nut "Tiep theo" o bottom. Rieng step 3 phai dung nut trong noi dung. Co the gay nham lan.

**Giai phap**: Khi `phase1Submitted === true` o step 3, hien lai nut "Tiep theo" trong sticky bottom (thay vi an hoan toan). Logic hien tai `handleNext` dong 572-583 da handle case nay (return isValid = true khi phase1Submitted).

---

#### VAN DE 4: `occupied` rooms khong co action nao tren StaffRoomCheckView

**Hien tai**: `CompactRoomRow` chi render action buttons cho `check_out`, `cleaning`, va `vacant`. Phong `occupied` khong co nut nao. Nhan vien muon lam daily check cho phong `occupied` (vi du kiem tra minibar) phai lam sao?

**Van de**: Nhan vien khong the bat dau kiem tra phong `occupied` tu danh sach. Phai vao chi tiet phong roi moi tim cach kiem tra.

**Giai phap**: Them nut "Kiem tra" cho phong `occupied`, navigate thang `/rooms/{id}/check?type=daily`.

---

### PHAN 3: TONG KET

| # | Van de | Muc do | Thay doi |
|---|--------|--------|----------|
| 1 | Sticky bottom bi MobileBottomNav de len | **Trung binh** | An MobileBottomNav khi dang o trang `/rooms/:id/check` |
| 2 | handleBack skip buoc khong dung | **Thap** | Them logic skip nguoc trong handleBack |
| 3 | Step 3 checkout an nut "Tiep theo" | **Thap** | Hien lai "Tiep theo" khi phase1Submitted |
| 4 | Phong occupied khong co nut kiem tra | **Thap** | Them nut "Kiem tra" cho occupied rooms |

---

### KE HOACH THUC HIEN

#### Fix 1: An MobileBottomNav khi dang kiem tra phong
- **File**: `src/components/layout/MobileBottomNav.tsx`
- **Thay doi**: Kiem tra `location.pathname` chua `/check` -> return null (khong render). Dieu nay giai phong khong gian cho sticky bottom nav cua RoomCheckPage va giup nhan vien tap trung vao quy trinh kiem tra.

#### Fix 2: handleBack skip dung buoc khi Phase1 da auto-skip
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 701-704
- **Thay doi**: Them dieu kien: neu `currentStep === 4 && isCheckoutType && phase1Submitted` va khong co charges (chargeableItems.length === 0 va items_lost/items_damaged rong) thi `setCurrentStep(2)` thay vi `setCurrentStep(3)`.

#### Fix 3: Hien "Tiep theo" khi phase1 da submitted o step 3
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 1357
- **Thay doi**: Doi dieu kien tu `!phase1Submitted ? null` thanh chi an khi `!phase1Submitted`. Khi `phase1Submitted === true`, hien nut "Tiep theo" binh thuong de nhat quan UX.

#### Fix 4: Them nut kiem tra cho phong occupied
- **File**: `src/components/rooms/StaffRoomCheckView.tsx` dong 341
- **Thay doi**: Them block render cho `room.status === 'occupied' && !hasSession`:
```text
<Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
  onClick={(e) => { e.stopPropagation(); onStartCheck(room.id, room.status) }}>
  <ClipboardList className="h-3 w-3" />
  <span className="hidden sm:inline">Kiem tra</span>
</Button>
```

