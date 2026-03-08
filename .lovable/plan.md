

## Nang cap UX/UI trang chi tiet phieu giao hang

### Van de hien tai

1. **Trung lap guidance**: `DistributionOrderDetailPage` hien thi cac banner huong dan (pending, released...) va `DeliveryStepWizard` cung hien thi guidance tuong tu -> nguoi dung thay 2 khu vuc noi cung 1 dieu.

2. **Step wizard qua don gian**: Chi hien thi cham tron nho (dot), khong dung icon da define, label bi cat (`max-w-[60px]`), kho doc tren mobile.

3. **Info header roi rac**: Thong tin tang, ngay, nhan vien, tien do nam rieng le, khong co visual hierarchy.

4. **Room list thieu phan biet trang thai**: Border-left mau la dau hieu duy nhat, chua co feedback ro khi hover/tap. Nut "GIAO" nho, kho bam tren mobile.

5. **Notes dung Card** thay vi `div border rounded-lg` theo design spec.

6. **Mobile: duplicate confirm receive button** - DistributionOrderDetailPage render nut "Xac nhan da nhan du hang" rieng, trong khi DeliveryStepWizard cung render nut nay.

### Ke hoach thay doi

#### 1. Loai bo guidance banners trung lap trong DistributionOrderDetailPage
**File**: `src/pages/inventory/DistributionOrderDetailPage.tsx`
- Xoa cac block guidance cho pending/released/assignee (dong 144-195 mobile, 272-310 desktop) vi DeliveryStepWizard da xu ly day du
- Xoa nut "Xac nhan da nhan du hang" rieng (dong 179-195) vi wizard da co
- Giu lai warning "Chua phan cong" vi do la action (phan cong nhan vien), khong phai guidance

#### 2. Nang cap DeliveryStepWizard UI
**File**: `src/components/distribution/components/DeliveryStepWizard.tsx`
- Thay dot bang icon thuc su (Package, Truck, CheckCircle, Lock) da define trong step config
- Tang kich thuoc step indicator: `w-8 h-8` thay vi `w-6 h-6`
- Bo `max-w-[60px]` truncate, dung `text-[11px]` voi wrap thay vi cat
- Them mau nen nhe cho current step (e.g. `bg-primary/10 rounded-lg p-2`)
- Progress bar cho buoc "Giao hang" hien thi ngay trong step area thay vi rieng

#### 3. Gop info header vao compact bar tot hon
**File**: `src/components/distribution/components/RouteDetailView.tsx`
- Gop shift badge + info header thanh 1 bar duy nhat
- Hien thi progress voi progress bar nho inline thay vi chi text "0/1 (0%)"
- Layout: `[ShiftBadge] [Tang X] [Ngay] [NV Ten] [===progress===] [0/1]`

#### 4. Nang cap Room Card UX
**File**: `src/components/distribution/components/UnifiedRoomList.tsx`
- Tang kich thuoc nut "GIAO" tren mobile: `h-11 px-5` voi mau noi bat hon
- Them animation nhe khi expand (framer-motion hoac CSS transition)
- Hien thi item summary mac dinh (khong can bam expand) voi 1-2 item dau + "va X khac"
- Nut "Khong vao duoc" chuyen tu text link sang icon button (compact hon)
- Them visual feedback khi phong da giao: strikethrough hoac opacity giam

#### 5. Notes section theo design spec
**File**: `src/components/distribution/components/RouteDetailView.tsx`  
- Chuyen tu `Card > CardHeader > CardContent` sang `div border rounded-lg p-3`
- Icon nho + label inline thay vi card title

### Do uu tien
1. Loai bo duplicate guidance (giam nhieu thong tin)
2. Nang cap step wizard (visual hierarchy chinh)
3. Gop info bar (compact hon)
4. Room card UX (mobile-friendly)
5. Notes design spec (nho, de lam)

