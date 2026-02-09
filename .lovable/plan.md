

## Phan tich Quan ly Dat phong - Nghiep vu le tan & Phoi hop buong phong, kho

Sau khi kiem tra toan bo he thong dat phong (1553 dong BookingsPage, 880 dong CheckoutSummaryDialog, 543 dong useBookingForm, 389 dong useBookingActions, 451 dong BookingDetailPage, 365 dong CheckoutInspectionSection, 1122 dong GroupCheckoutDialog...), duoi day la phan tich chi tiet.

---

### PHAN 1: NHUNG GI DA LAM TOT

| # | Tinh nang | Danh gia |
|---|-----------|----------|
| 1 | 5-step Booking Wizard (Daily/Hourly/Monthly) voi overlap validation (RPC) | Tot |
| 2 | Check-in dialog voi bang phu thu som, dieu chinh gia, ghi chu ly do | Tot |
| 3 | Checkout dialog voi phu thu tre, damage items, kiemtra phong, minimize widget | Xuat sac |
| 4 | Group booking/checkout voi group_id, thanh toan chung, kiem tra nhom | Tot |
| 5 | Phoi hop buong phong: CheckoutInspectionSection giao viec, Telegram, push notification | Tot |
| 6 | Realtime: subscribe room_bookings + rooms, tu dong cap nhat UI | Tot |
| 7 | OTA integration: prepaid/partial/pay-at-hotel, commission, badge | Tot |
| 8 | Conflict detection + Overdue filter + ExtendBookingDialog | Tot |
| 9 | BookingDetailPage voi tabs: Info, Consumables, Issues, Payment | Tot |
| 10 | VietQR payment system voi sepay webhook | Tot |
| 11 | Session persistence cho minimized checkouts (sessionStorage) | Tot |
| 12 | Sorting logic: checkout hom nay len dau, cancelled/no_show xuong cuoi | Tot |

---

### PHAN 2: VAN DE NGHIEP VU CAN CAI THIEN

#### VAN DE 1: Check-in trong BookingsPage KHONG DUNG RPC atom (NGHIEM TRONG)

**Hien tai**: `BookingsPage.tsx` dong 496-509 thuc hien check-in bang 2 lenh rieng biet:
1. `supabase.from('room_bookings').update({status: 'checked_in'})` (dong 496-501)
2. `supabase.from('rooms').update({status: 'occupied'})` (dong 504-508)

Trong khi do, `useBookingActions.ts` dong 96-103 su dung `supabase.rpc('perform_checkin')` - mot RPC function dam bao tinh nguyen tu (atomic transaction) va kiem tra trang thai phong truoc khi check-in.

**Van de**: 
- Neu lenh 1 thanh cong nhung lenh 2 that bai -> booking la "checked_in" nhung phong van khong phai "occupied" -> **DU LIEU MAT DONG BO**.
- Khong co optimistic locking -> 2 nhan vien cung check-in 1 phong se gay conflict.
- Validation trang thai phong da lam o client (dong 410-454) nhung co the bi race condition.

**Giai phap**: Thay the 2 lenh update rieng le bang `supabase.rpc('perform_checkin')`, giong nhu `useBookingActions.ts` da lam. RPC se kiem tra trang thai phong va cap nhat atomic.

---

#### VAN DE 2: Khong co nut "Huy booking" tren danh sach (TRUNG BINH)

**Hien tai**: `BookingsPage.tsx` dong 1329-1374 chi co 2 action buttons:
- `confirmed` -> nut "Check-in"
- `checked_in` -> nut "Check-out"

Khong co nut "Huy" cho booking `confirmed`. Le tan phai click vao booking -> mo RoomBookingDialog -> tim nut huy o trong do.

**Van de**: Khi khach khong den (no-show) hoac huy dat, le tan phai mat nhieu buoc de huy booking. Day la thao tac thuong xuyen can nhanh.

**Giai phap**: Them nut "Huy" (icon X, variant destructive) cho booking `confirmed` trong cot "Thao tac", voi dialog xac nhan truoc khi huy. Su dung `cancel_booking` RPC da co san.

---

#### VAN DE 3: Khong co nut "No-show" rieng (THAP)

**Hien tai**: Khong co cach danh dau "No-show" nhanh tu danh sach. Le tan phai vao chi tiet booking. Tren he thong da co trang thai `no_show` nhung khong co action truc tiep.

**Van de**: Khi khach dat phong nhung khong den, le tan can danh dau nhanh de giai phong phong.

**Giai phap**: Them nut dropdown voi 2 lua chon "Huy" va "Khong den" cho booking `confirmed` da qua ngay check-in.

---

#### VAN DE 4: Checkout overdue block flow khong cho checkout truc tiep (TRUNG BINH)

**Hien tai**: `handleCheckOutClick` dong 549-554: Khi booking `checked_in` va hom nay da qua `check_out_date`, he thong **chan checkout** va mo `ExtendBookingDialog` thay vi cho phep checkout truc tiep.

**Van de**: 
- Le tan muon checkout khach ngay (khach dang tra phong) nhung he thong bat phai gia han truoc.
- Trong `ExtendBookingDialog`, nut "Checkout ngay" (dong 1494-1503) **khong tinh lai chi phi** - no chi goi `setShowCheckoutSummary(true)` nhung `checkoutCostBreakdown` **chua duoc tinh** (vi `handleCheckOutClick` da return som o dong 554). Ket qua: `checkoutCostBreakdown` la null -> `CheckoutSummaryDialog` khong render duoc.

**Giai phap**: Khi le tan nhan "Checkout ngay" tu ExtendBookingDialog, can thuc hien logic tinh chi phi tuong tu `handleCheckOutClick` truoc khi mo CheckoutSummaryDialog. Hoac cho phep checkout overdue truc tiep bang cach auto-gia han den hom nay truoc khi vao flow checkout.

---

#### VAN DE 5: "Chuyen phong" chua duoc implement (THAP)

**Hien tai**: `BookingsPage.tsx` dong 1504-1511: Nut "Chuyen phong" trong ExtendBookingDialog chi hien toast "Tinh nang dang phat trien".

**Van de**: Day la tinh nang quan trong khi co overstay + conflict. Le tan can chuyen khach moi sang phong khac nhanh chong.

**Giai phap**: Implement TransferRoomDialog cho phep chon phong moi, cap nhat room_id cua booking moi va giai phong phong cu.

---

#### VAN DE 6: Khong co lien ket truc tiep tu Bookings den Kho khi phat hien thieu do (TRUNG BINH)

**Hien tai**: Khi nhan vien buong phong kiem tra va phat hien do thieu/hong/mat, thong tin nay duoc ghi vao `room_checks`. O checkout dialog, le tan thay damage items va consumable charges. Tuy nhien:
- Khong co link tu BookingDetailPage.tsx (tab "Van de") den module Kho de tao phieu xuat bu do.
- `BookingIssuesCard` chi **hien thi** van de nhung khong co action de xu ly (vi du: tao phieu bo sung tu kho).

**Van de**: Le tan hoac quan ly biet phong thieu do nhung phai chuyen sang module Kho thu cong de tao phieu xuat.

**Giai phap**: Them nut "Tao phieu bo sung" trong BookingIssuesCard khi co items_missing/items_consumed, link den module inventory voi pre-fill danh sach do can bo sung.

---

#### VAN DE 7: BookingDetailPage khong hien thi booking_type cho hourly/monthly (THAP)

**Hien tai**: `BookingDetailPage.tsx` dong 92-95 luon tinh `nights = differenceInDays(...)` va hien thi "X dem". Khong phan biet hourly/monthly.

**Van de**: Booking theo gio hien thi "0 dem", booking theo thang hien thi so dem lon thay vi "X thang".

**Giai phap**: Them logic phan biet booking_type, hien thi "X gio" hoac "X thang" tuong ung. Da co pattern nay trong BookingsPage table.

---

#### VAN DE 8: Table khong responsive tren mobile (TRUNG BINH)

**Hien tai**: `BookingsPage.tsx` dong 1137-1381 render `<Table>` voi 8 cot: Khach, Phong, Thoi gian, Thoi han, Tong tien, Thanh toan, Trang thai, Thao tac.

**Van de**: Tren mobile, table bi tran ngang, can cuon ngang de xem het. Le tan dung dien thoai se kho thao tac.

**Giai phap**: Tren mobile, chuyen tu table sang card-based layout (nhu StaffRoomCheckView). Moi booking la 1 card compact voi thong tin chinh va action buttons.

---

### PHAN 3: TONG KET VA THU TU UU TIEN

| # | Van de | Muc do | Loai |
|---|--------|--------|------|
| 1 | Check-in khong dung RPC atomic | **Cao** | Bug nghiep vu |
| 2 | Checkout overdue khong tinh chi phi khi "Checkout ngay" | **Cao** | Bug nghiep vu |
| 3 | Khong co nut Huy booking nhanh | **Trung binh** | Thieu tinh nang |
| 4 | Khong lien ket Bookings -> Kho de bo sung do | **Trung binh** | Thieu lien ket |
| 5 | Table khong responsive tren mobile | **Trung binh** | UX mobile |
| 6 | BookingDetailPage khong hien thi booking_type | **Thap** | UI bug |
| 7 | Khong co nut No-show rieng | **Thap** | Thieu tinh nang |
| 8 | Chuyen phong chua implement | **Thap** | Thieu tinh nang |

---

### KE HOACH THUC HIEN (Chi fix cac van de Cao va Trung binh)

#### Fix 1: Check-in dung RPC atomic
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 473-529
- **Thay doi**: Thay the 2 lenh `supabase.from('room_bookings').update(...)` va `supabase.from('rooms').update(...)` bang `supabase.rpc('perform_checkin', { p_booking_id, p_room_id, p_early_checkin_charge })`. Loai bo validation client-side o dong 410-454 vi RPC da validate. Giu lai validation ngay check-in (dong 400-407) vi day la business logic can check truoc.

#### Fix 2: Checkout overdue tinh chi phi dung
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 532-554
- **Thay doi**: Khi booking overdue, thay vi block va chi mo ExtendBookingDialog, cho phep le tan **chon**: (1) Gia han, hoac (2) Checkout ngay. Neu chon checkout ngay, thuc hien auto-extend den hom nay (update check_out_date), sau do chay flow tinh chi phi binh thuong (dong 556-647) de dam bao checkoutCostBreakdown duoc tinh.
- Them them logic trong `onCheckoutNow` callback: tinh lai costBreakdown truoc khi mo CheckoutSummaryDialog.

#### Fix 3: Them nut Huy va No-show nhanh
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 1329-1374
- **Thay doi**: Cho booking `confirmed`, them dropdown menu (DropdownMenu) voi:
  - "Huy dat phong" -> xac nhan dialog -> goi `cancel_booking` RPC
  - "Khach khong den" (chi hien khi da qua ngay check-in) -> cap nhat status = 'no_show'

#### Fix 4: BookingDetailPage hien thi booking_type
- **File**: `src/pages/bookings/BookingDetailPage.tsx` dong 92-95, 144, 257-259
- **Thay doi**: Phan biet booking_type:
  - `hourly`: Hien thi "X gio" thay vi "X dem", hien thi thoi gian bat dau/ket thuc
  - `monthly`: Hien thi "X thang" thay vi so dem

#### Fix 5: Table responsive tren mobile
- **File**: `src/pages/bookings/BookingsPage.tsx` dong 1137-1381
- **Thay doi**: Tren mobile (`sm:` breakpoint), render card-based layout thay vi table. Moi card hien thi:
  - Dong 1: Ten khach + Phong + Badge trang thai
  - Dong 2: Ngay check-in/out + Badge loai booking
  - Dong 3: Tong tien + Trang thai thanh toan + Nut action
  - Dung `hidden sm:table` cho Table va `sm:hidden` cho card list
