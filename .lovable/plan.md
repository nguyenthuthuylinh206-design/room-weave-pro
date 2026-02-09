

## Kiem tra mobile UX/UI cho nhan vien buong phong - Dot tiep theo

Sau khi cac fix truoc da duoc ap dung (auto-skip modal, auto-skip phase1, gop cleaning+review, giam toast, label "Het", nut X huy, compact header), toi da kiem tra lai toan bo luong tren mobile va phat hien cac van de con ton tai.

---

### PHAN 1: NHUNG GI DA LAM TOT (Xac nhan)

| # | Tinh nang | Trang thai |
|---|-----------|------------|
| 1 | Auto-skip CheckTypeSelector khi phong cleaning/checkout | Da xong |
| 2 | Auto-skip Phase1 Confirm khi khong co phu thu | Da xong |
| 3 | Gop Cleaning + Review thanh 1 buoc (5 buoc checkout) | Da xong |
| 4 | Toast chi hien cho mat/hong | Da xong |
| 5 | Compact header, an PageHeader tren mobile | Da xong |
| 6 | Nut Huy thanh X o goc tren phai | Da xong |
| 7 | Label "Het" cho consumable | Da xong |
| 8 | Tap-to-OK, Mark All OK, Category tabs | Da co |
| 9 | Session persistence qua localStorage | Da co |

---

### PHAN 2: VAN DE CON TON TAI TREN MOBILE

#### VAN DE 1: Nut "Tiep theo" / "Hoan thanh" bi an duoi cung trang (QUAN TRONG)

**Hien tai**: Nut "Quay lai" va "Tiep theo" nam trong `<div className="flex items-center justify-between pt-6 border-t">` o **cuoi cung** cua form. Khi nhan vien kiem tra 20-30 items, phai cuon xuong cuoi trang moi thay nut "Tiep theo".

**Van de tren mobile**: 
- Nhan vien kiem tra xong tat ca items (progress 100%) nhung khong thay nut chuyen buoc
- Phai cuon xuong, mat thoi gian va tao cam giac "khong biet lam gi tiep"
- Dac biet anh huong o buoc Items Check (buoc dai nhat)

**Giai phap**: Lam nut dieu huong **sticky o bottom** tren mobile. Dung `sticky bottom-0` voi background de phu len noi dung, dam bao nhan vien luon thay duoc nut chuyen buoc.

---

#### VAN DE 2: ReviewStep lap lai Check Type Header (Trung lap UI)

**Hien tai**: `ReviewStep.tsx` dong 111-120 render **lai** mot "Check Type Header" giong het cai da co o `RoomCheckPage.tsx` dong 1120-1170. Tren mobile, nguoi dung thay 2 khoi header giong nhau:
- Header chinh cua trang (voi progress bar)
- Header trong ReviewStep (voi mo ta)

**Van de**: Lap thong tin, chiem them ~60px tren mobile.

**Giai phap**: Xoa Check Type Header trong ReviewStep. Thong tin da duoc hien thi o header chinh cua trang.

---

#### VAN DE 3: Photo remove button khong hoat dong tot tren touch

**Hien tai**: `ReviewStep.tsx` dong 393 dung `opacity-0 group-hover:opacity-100` cho nut xoa anh. Tren mobile (touch), `hover` khong hoat dong nhu tren desktop.

**Van de**: Nhan vien khong thay nut xoa anh tren dien thoai, hoac phai tap 2 lan (lan 1 trigger hover, lan 2 moi tap duoc).

**Giai phap**: Hien thi nut xoa anh luon (bo `opacity-0 group-hover:opacity-100` tren mobile), hoac dung pattern khac nhu long-press.

---

#### VAN DE 4: Phase1ConfirmStep con dung `Card` component (Vi pham design guidelines)

**Hien tai**: `Phase1ConfirmStep.tsx` dong 86-199 van dung `<Card>`, `<CardHeader>`, `<CardContent>` - trai voi design guidelines cua du an (thay Card bang div voi border).

**Van de**: Khong nhat quan voi phan con lai cua trang da duoc sua. Card co padding lon hon, gay lech padding tren mobile.

**Giai phap**: Doi `<Card>` thanh `<div className="border rounded-lg">`, bo `CardHeader`/`CardContent` thanh padding truc tiep.

---

#### VAN DE 5: Buoc "Chon loai kiem tra" (Step 1) van hien thi khi da auto-skip

**Hien tai**: Logic auto-skip dung `initialStep = shouldAutoSkip ? 2 : 1` (dong 130). Tuy nhien, trong phan render step titles (dong 1177), `currentStep === 1 && 'Chon loai kiem tra'` van hien khi `currentStep === 1`. Buoc 1 chi hien thi khi **khong co** `type` param tu URL.

**Thuc te**: Day khong phai bug vi step 1 chi render khi can. Nhung nen xac nhan: khi nhan vien vao tu StaffRoomCheckView voi `type=daily` hoac `type=checkout`, step 1 **khong hien** -> **Dung**, khong co van de.

---

#### VAN DE 6: Search bar trong ItemsCheck chiem khong gian khi so luong items nho

**Hien tai**: `CategoryBasedItemsCheck.tsx` dong 424-433 luon hien thi search bar. Voi phong chi co 5-8 items, search bar chiem them ~40px nhung khong can thiet.

**Giai phap**: An search bar khi so luong items <= 10. Chi hien khi co nhieu items.

---

#### VAN DE 7: Sticky progress header trong CategoryBasedItemsCheck bi chong len header chinh

**Hien tai**: Progress header trong `CategoryBasedItemsCheck.tsx` dung `sticky top-0 z-20` (dong 342). Header chinh cua trang (Check Type Header) cung sticky. Khi cuon, 2 sticky elements co the chong len nhau hoac header check type bi an mat.

**Van de**: Tren mobile, nhan vien mat thong tin progress hoac check type khi cuon.

**Giai phap**: Doi `top-0` cua progress header thanh gia tri phu hop de nam duoi header chinh, hoac loai bo sticky cua 1 trong 2 (giu progress header vi huu ich hon khi kiem tra items).

---

### PHAN 3: TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | Thay doi |
|---|--------|--------|----------|
| 1 | Nut dieu huong bi an duoi cung | **Cao** | Sticky bottom navigation bar tren mobile |
| 2 | ReviewStep lap lai header | **Trung binh** | Xoa duplicate header trong ReviewStep |
| 3 | Photo remove button touch | **Trung binh** | Hien nut xoa anh luon tren mobile |
| 4 | Phase1ConfirmStep dung Card | **Thap** | Doi Card thanh div border |
| 5 | Search bar khong can voi phong nho | **Thap** | An khi <= 10 items |
| 6 | Sticky header bi chong | **Trung binh** | Dieu chinh z-index va top offset |

---

### KE HOACH THUC HIEN

#### Fix 1: Sticky bottom navigation bar
- **File**: `src/pages/rooms/RoomCheckPage.tsx` dong 1340-1395
- **Thay doi**: Wrap navigation buttons trong `<div className="sticky bottom-0 bg-background border-t p-3 -mx-4 z-10 safe-area-bottom">`. Phan biet mobile va desktop de khong anh huong layout desktop.

#### Fix 2: Xoa duplicate header trong ReviewStep
- **File**: `src/components/rooms/check-steps/ReviewStep.tsx` dong 111-120
- **Thay doi**: Xoa khoi `<div className={cn('p-3 rounded-lg border', config.headerColor)}>...</div>`. Thong tin check type da co o header chinh.

#### Fix 3: Photo remove button luon hien tren mobile
- **File**: `src/components/rooms/check-steps/ReviewStep.tsx` dong 393
- **Thay doi**: Doi `opacity-0 group-hover:opacity-100` thanh `sm:opacity-0 sm:group-hover:opacity-100` de luon hien tren mobile nhung van co hover effect tren desktop.

#### Fix 4: Phase1ConfirmStep - doi Card thanh div
- **File**: `src/components/rooms/check-steps/Phase1ConfirmStep.tsx` dong 86-199
- **Thay doi**: 
  - `<Card className="border-orange-200">` -> `<div className="border border-orange-200 rounded-lg">`
  - `<CardHeader className="pb-2">` -> `<div className="p-3 pb-2">`
  - `<CardTitle>` -> `<h3 className="text-base font-semibold flex items-center justify-between">`
  - `<CardContent>` -> `<div className="px-3 pb-3">`

#### Fix 5: An search bar khi it items
- **File**: `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx` dong 424-433
- **Thay doi**: Wrap search trong `{totalItems > 10 && (...)}` hoac dung Collapsible mac dinh dong.

#### Fix 6: Fix sticky header chong nhau
- **File**: `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx` dong 342
- **Thay doi**: Giu sticky progress header nhung loai bo Check Type Header khoi sticky (vi progress bar huu ich hon khi dang kiem tra items). Hoac dieu chinh top offset de items progress header nam ben duoi.

