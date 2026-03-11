

## Phan tich luong phieu giao hang (Distribution Order)

### Hien trang: Cau truc luong hien tai

Luong hien tai co **3 cach tao** va **5 buoc xu ly**, kha phuc tap:

#### 3 Dau vao (Entry Points)
1. **Tao thu cong** (`/inventory/distributions/new`) - CreateDistributionPage.tsx
2. **Tao tu yeu cau bo sung** (`/inventory/distributions/from-supplements`) - CreateFromSupplementsPage.tsx
3. **Tao tu Xuat kho** (`/inventory/outbound` voi category `room_assign`) - OutboundPage.tsx dung cung DistributionForm

#### 5 Buoc xu ly (Lifecycle)
```text
pending --> released --> in_progress --> completed --> closed
  (1)        (2)           (3)            (4)          (5)
```

1. **pending** - Kho chuan bi hang, kiem tra ton kho, giao cho nhan vien (Warehouse Manager click "Kiem tra & Giao hang")
2. **released** - Nhan vien xac nhan da nhan du hang (Assignee click "Xac nhan da nhan du hang")
3. **in_progress** - Nhan vien di giao tung phong, click "GIAO" -> chuyen sang room check
4. **completed** - Tat ca phong da giao xong
5. **closed** - Manager dong phieu

### Van de phat hien

#### 1. Trung lap dau vao: OutboundPage dung trung DistributionForm
- `OutboundPage.tsx` (Xuat kho) khi chon category `room_assign` se render cung `DistributionForm` va goi `useCreateDistributionOrder` - hoan toan giong `CreateDistributionPage.tsx`
- Nguoi dung co 2 noi tao cung 1 thu -> nhầm lẫn
- **De xuat**: Khi chon "Giao den phong" trong OutboundPage, chuyen huong (redirect) sang `/inventory/distributions/new` thay vi nhan doi form

#### 2. Buoc "released" co the thua (khong can thiet voi nhieu truong hop)
- Sau khi kho giao hang (pending -> released), nhan vien phai bam "Xac nhan da nhan du hang" de chuyen sang in_progress
- Voi hotel nho (kho va nhan vien la 1 nguoi), buoc nay thua
- Da co option `auto_release` nhung chi skip buoc kho, khong skip buoc nhan hang
- **De xuat**: Them option "Tu dong bat dau giao" de skip ca buoc released, chuyen thang tu pending -> in_progress khi assignee la chinh nguoi tao

#### 3. Qua trinh giao phong phuc tap - click "GIAO" -> navigate ra room check
- Khi nhan vien click "GIAO" tren 1 phong, he thong navigate sang `/rooms/{id}/check?type=delivery&...`
- Phai lam room check roi moi quay lai -> mat flow, phai quay lai trang phieu de giao phong tiep
- **De xuat**: Sau khi hoan thanh room check, tu dong quay lai trang phieu giao hang thay vi o lai trang room check

#### 4. Thieu thong tin tong hop khi tao phieu
- CreateDistributionPage khong hien thi summary (tong so phong, tong so item, tong so luong) truoc khi submit
- DistributionForm hien thi 2 panel (chon phong + phan bo san pham) nhung khong co summary bar
- **De xuat**: Them summary bar hien thi: X phong, Y loai SP, Z don vi truoc nut "Tao phieu"

#### 5. Auto-fill logic tot nhung UX chua ro rang
- `useDistributionForm` co `autoFillMissingItems` va `autoFillMissingItemsForRoom` de tu dong tinh so luong theo tieu chuan phong
- Nhung trong CreateDistributionPage, nut auto-fill khong duoc hien thi ro rang
- **De xuat**: Them nut "Tu dong phan bo theo tieu chuan" noi bat hon trong form

### Ke hoach khac phuc

#### Thay doi 1: Redirect OutboundPage khi chon "room_assign"
**File**: `src/pages/inventory/OutboundPage.tsx`
- Khi user chon category `room_assign`, hien thi thong bao va nut chuyen sang trang tao phieu giao hang chuyen dung thay vi render form trung lap

#### Thay doi 2: Them summary bar trong CreateDistributionPage
**File**: `src/pages/inventory/CreateDistributionPage.tsx`
- Hien thi summary compact (so phong, so SP, tong SL) ngay tren nut "Tao phieu"
- Hien thi canh bao stock validation o footer thay vi chi trong form

#### Thay doi 3: Auto-navigate ve phieu sau room check
**File**: `src/components/distribution/components/UnifiedRoomList.tsx`
- Them query param `returnTo` khi navigate sang room check
- Sau khi room check xong, tu dong quay ve trang phieu giao hang

#### Thay doi 4: Don gian hoa flow cho hotel nho
**File**: `src/components/distribution/components/DeliveryStepWizard.tsx`
- Khi nguoi tao phieu cung la nguoi duoc phan cong (assignee), gop buoc "Kiem tra kho" va "Nhan hang" thanh 1 buoc duy nhat
- Giam so buoc tu 5 xuong 3-4 tuy truong hop

#### Thay doi 5: Lam ro auto-fill trong form
**File**: `src/components/distribution/forms/ItemAllocator.tsx`
- Them nut "Tu dong phan bo" noi bat, co tooltip giai thich
- Hien thi ket qua auto-fill (bao nhieu SP da them, bao nhieu thieu) ro rang hon

### Uu tien thuc hien

1. **Thay doi 2** (Summary bar) - De lam, giam nhầm lẫn ngay
2. **Thay doi 1** (Redirect OutboundPage) - Loai bo trung lap
3. **Thay doi 3** (Auto-navigate ve phieu) - Cai thien flow giao hang
4. **Thay doi 4** (Don gian hoa step) - Giam buoc cho hotel nho
5. **Thay doi 5** (Auto-fill ro rang) - Cai thien UX

