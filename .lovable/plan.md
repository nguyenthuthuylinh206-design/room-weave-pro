

## Chuc nang quet CCCD / Passport / Visa - Tu dong dien thong tin khach

### Tong quan

Them kha nang chup anh hoac tai anh CCCD, ho chieu, visa len he thong. Su dung Lovable AI (Gemini 2.5 Flash - ho tro multimodal) de OCR va trich xuat thong tin, tu dong dien vao form dat phong.

### Luong hoat dong

```text
+-------------------+     +------------------+     +-------------------+
| User chup/tai anh | --> | Edge Function    | --> | Auto-fill form    |
| CCCD/Passport     |     | (Gemini OCR)     |     | Guest Info        |
+-------------------+     +------------------+     +-------------------+
```

1. User nhan nut "Quet giay to" tren form thong tin khach
2. Chon loai giay to (CCCD, Ho chieu, Visa)
3. Chup anh (camera) hoac tai anh tu thu vien
4. Anh duoc gui len edge function `scan-guest-document`
5. Edge function gui anh (base64) toi Lovable AI Gateway (Gemini 2.5 Flash) de OCR
6. Ket qua tra ve: ho ten, ngay sinh, gioi tinh, so giay to, quoc tich, dia chi
7. Tu dong dien vao cac truong tuong ung tren form
8. Luu anh giay to len Storage bucket `guest-documents` (private)
9. Luu thong tin giay to vao DB (so CCCD, loai giay to, URL anh)

---

### 1. Database Migration

Them cot moi vao bang `room_bookings`:

| Cot | Kieu | Mo ta |
|-----|------|-------|
| `guest_id_type` | TEXT | Loai giay to: cccd, passport, visa |
| `guest_id_number` | TEXT | So giay to |
| `guest_nationality` | TEXT | Quoc tich |
| `guest_date_of_birth` | DATE | Ngay sinh |
| `guest_gender` | TEXT | Gioi tinh |
| `guest_address` | TEXT | Dia chi |
| `guest_id_image_url` | TEXT | URL anh giay to (tu Storage) |

---

### 2. Storage Bucket

Tao bucket `guest-documents` (private, co RLS) de luu anh giay to. Chi authenticated users cung tenant moi xem duoc.

---

### 3. Edge Function: `scan-guest-document`

- Nhan anh base64 + loai giay to
- Gui toi Lovable AI Gateway (Gemini 2.5 Flash) voi prompt OCR chuyen biet:
  - CCCD: Trich xuat ho ten, so CCCD, ngay sinh, gioi tinh, quoc tich, dia chi
  - Passport: Ho ten, so ho chieu, ngay sinh, gioi tinh, quoc tich
  - Visa: Ho ten, so visa, quoc tich
- Dung tool calling de tra ve structured JSON
- Tra ket qua ve client

---

### 4. Component: `DocumentScanner`

Component dung chung, hien thi:
- Dropdown chon loai giay to (CCCD / Ho chieu / Visa)
- Nut "Chup anh" (mo camera tren mobile) hoac "Tai anh" (file picker)
- Preview anh da chup/tai
- Trang thai: dang xu ly, thanh cong, loi
- Ket qua trich xuat hien thi de user xac nhan truoc khi dien vao form

---

### 5. Tich hop vao form

**GuestInfoStep.tsx** (Booking Wizard Step 3):
- Them nut "Quet giay to" phia tren form
- Khi quet thanh cong, tu dong dien: guestName, guestPhone (neu co), guestIdType, guestIdNumber, guestNationality, guestDateOfBirth, guestGender, guestAddress

**RoomBookingDialog.tsx** (Quick booking tu room):
- Them nut "Quet giay to" tuong tu
- Tu dong dien cac truong tuong ung

---

### 6. Cap nhat BookingFormState

Them cac truong moi vao `BookingFormState` interface va `initialState`:

```text
guestIdType: string        // 'cccd' | 'passport' | 'visa' | ''
guestIdNumber: string
guestNationality: string
guestDateOfBirth: string
guestGender: string
guestAddress: string
guestIdImageUrl: string
```

Cap nhat `useBookingForm` submit logic de luu cac truong moi vao DB.

---

### Danh sach file thay doi

| # | File | Thay doi |
|---|------|---------|
| 1 | `supabase/migrations/xxx.sql` | Them 7 cot moi vao room_bookings + tao bucket guest-documents |
| 2 | `supabase/functions/scan-guest-document/index.ts` | Edge function OCR voi Lovable AI |
| 3 | `supabase/config.toml` | Them config cho scan-guest-document |
| 4 | `src/components/bookings/DocumentScanner.tsx` | Component chup/tai anh va hien thi ket qua |
| 5 | `src/components/bookings/booking-wizard/types.ts` | Them truong guest ID vao BookingFormState |
| 6 | `src/components/bookings/booking-wizard/hooks/useBookingForm.ts` | Cap nhat initialState va submit |
| 7 | `src/components/bookings/booking-wizard/steps/GuestInfoStep.tsx` | Tich hop DocumentScanner |
| 8 | `src/components/rooms/RoomBookingDialog.tsx` | Tich hop DocumentScanner |
| 9 | `src/components/bookings/booking-wizard/steps/ReviewStep.tsx` | Hien thi thong tin giay to |

---

### Luu y ky thuat

- Dung `google/gemini-2.5-flash` (ho tro multimodal, nhanh, re) qua Lovable AI Gateway
- Anh duoc gui dang base64 trong message content (inline image)
- Dung tool calling de dam bao structured output
- Private bucket voi RLS - chi user cung tenant doc duoc
- Kich thuoc anh: resize xuong max 1024px truoc khi gui de tiet kiem bandwidth
- Camera input tren mobile: dung `<input type="file" accept="image/*" capture="environment">`

