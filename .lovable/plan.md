

## Chuc nang chup anh giay to: Camera desktop + Gui thong bao chup bang dien thoai

### Van de hien tai

Nut "Chup anh" chi mo file picker (chon file), khong mo camera thuc su. User muon 2 tuy chon:
1. **Chup bang may tinh** - Mo camera webcam truc tiep tren desktop
2. **Chup bang dien thoai** - Gui push notification sang dien thoai de chup anh, roi tu dong cap nhat ket qua len desktop (giong flow QR thanh toan)

### Giai phap

#### Luong hoat dong

```text
Option A: Chup tren may tinh
+-------------------+     +------------------+     +-------------------+
| Mo webcam stream  | --> | User chup anh    | --> | Gui OCR + fill    |
| (getUserMedia)    |     | (canvas capture) |     | form tu dong      |
+-------------------+     +------------------+     +-------------------+

Option B: Chup bang dien thoai (giong QR Payment)
+-------------------+     +-------------------+     +-------------------+
| Tao scan_session  | --> | Push notification | --> | Dien thoai mo     |
| trong DB          |     | sang dien thoai   |     | /scan-document/:id|
+-------------------+     +-------------------+     +-------------------+
        |                                                     |
        | Realtime subscribe                                  | Chup anh + OCR
        |                                                     | + Upload anh
        v                                                     v
+-------------------+     +-------------------+     +-------------------+
| Desktop nhan      | <-- | Update session    | <-- | Luu ket qua vao   |
| realtime update   |     | status=completed  |     | scan_session      |
+-------------------+     +-------------------+     +-------------------+
```

---

### 1. Database: Bang `document_scan_sessions`

| Cot | Kieu | Mo ta |
|-----|------|-------|
| `id` | UUID (PK) | Session ID |
| `tenant_id` | UUID (FK) | Tenant |
| `created_by` | UUID | User tao session |
| `document_type` | TEXT | cccd / passport / visa |
| `status` | TEXT | pending / completed / expired |
| `scanned_data` | JSONB | Ket qua OCR (full_name, id_number, ...) |
| `image_url` | TEXT | URL anh giay to da upload |
| `created_at` | TIMESTAMPTZ | Thoi gian tao |
| `completed_at` | TIMESTAMPTZ | Thoi gian hoan thanh |

RLS: Chi user cung tenant doc/ghi. Anonymous SELECT theo UUID (cho public page).
Realtime: Enable cho bang nay de desktop nhan update ngay.

---

### 2. Public Page: `/scan-document/:sessionId`

Trang public (giong `/payment-qr/:id`):
- Mo tren dien thoai qua push notification
- Hien thi giao dien chup anh (dung `capture="environment"` tren mobile)
- Sau khi chup, gui OCR, upload anh
- Luu ket qua vao `document_scan_sessions` (status = completed)
- Desktop nhan realtime update va tu dong fill form

---

### 3. Cap nhat `DocumentScanner.tsx`

Thay doi UI thanh 3 nut:
- **Chup ảnh** (Camera icon) - Mo webcam tren desktop (dung `navigator.mediaDevices.getUserMedia`)
- **Tải ảnh** (Upload icon) - Giu nguyen, mo file picker
- **Chụp bằng ĐT** (Smartphone icon) - Tao scan session + gui push notification

Them:
- **WebcamCapture dialog**: Hien thi video stream tu webcam, nut chup, preview anh
- **Realtime listener**: Subscribe `document_scan_sessions` de nhan ket qua tu dien thoai
- **Waiting state**: Hien thi "Dang cho chup tu dien thoai..." voi animation

---

### 4. Component moi: `WebcamCaptureDialog`

- Dung `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Hien thi video stream trong dialog
- Nut "Chup" capture frame tu canvas
- Preview anh vua chup, cho phep chup lai hoac xac nhan
- Xac nhan -> gui OCR giong flow hien tai

---

### 5. Route moi trong App.tsx

```text
/scan-document/:sessionId -> ScanDocumentPage (public, no auth)
```

---

### Danh sach file thay doi

| # | File | Thay doi |
|---|------|---------|
| 1 | Migration SQL | Tao bang `document_scan_sessions` + RLS + realtime |
| 2 | `src/components/bookings/DocumentScanner.tsx` | Them 3 nut, webcam, realtime listener, waiting state |
| 3 | `src/components/bookings/WebcamCaptureDialog.tsx` | **Moi** - Dialog chup webcam |
| 4 | `src/pages/scan/ScanDocumentPage.tsx` | **Moi** - Trang public chup tren dien thoai |
| 5 | `src/App.tsx` | Them route `/scan-document/:sessionId` |
| 6 | `supabase/config.toml` | Them `navigateFallbackDenylist` neu can |

