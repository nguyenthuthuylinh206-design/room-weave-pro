

## Them chuc nang quet ma QR de lay thong tin khach hang

### Tong quan

Them nut "Quet QR" vao `DocumentScanner` de quet ma QR tren CCCD/CMND gán chip. Ma QR tren CCCD Viet Nam chua thong tin ca nhan duoi dang chuoi phan cach boi ky tu `|`, bao gom: so CCCD, so CMND cu, ho ten, ngay sinh, gioi tinh, dia chi, ngay cap.

### Cach hoat dong

1. Nhan vien an nut "Quet QR" -> mo camera
2. Dua QR code tren CCCD vao vung quet
3. Thu vien doc va giai ma QR -> parse chuoi pipe-separated
4. Tu dong dien thong tin khach hang vao form (khong can goi AI/edge function)

### Dinh dang QR code CCCD Viet Nam

QR code tren CCCD gán chip chua chuoi dang:

```text
012345678901|123456789|Nguyen Van A|01011990|Nam|TP Ho Chi Minh, Quan 1, ....|01012021
```

Cac truong phan cach boi `|`:
- Field 0: So CCCD (12 so)
- Field 1: So CMND cu (9 so, co the rong)
- Field 2: Ho ten
- Field 3: Ngay sinh (ddMMyyyy)
- Field 4: Gioi tinh (Nam/Nu)
- Field 5: Dia chi thuong tru
- Field 6: Ngay cap (ddMMyyyy)

### Danh sach thay doi

| # | File | Loai | Mo ta |
|---|------|------|-------|
| 1 | `package.json` | Them dependency | Cai dat `html5-qrcode` |
| 2 | `src/components/bookings/QRScannerDialog.tsx` | Tao moi | Component dialog chua camera QR scanner su dung `html5-qrcode`, parse ket qua CCCD QR |
| 3 | `src/components/bookings/DocumentScanner.tsx` | Sua | Them nut "Quet QR" va tich hop `QRScannerDialog` |
| 4 | `src/lib/parseCCCDQR.ts` | Tao moi | Ham parse chuoi QR CCCD thanh `ScannedDocumentData` |

### Chi tiet ky thuat

#### 1. `src/lib/parseCCCDQR.ts`

Ham tien ich parse chuoi QR code CCCD:

```text
export function parseCCCDQR(raw: string): ScannedDocumentData | null {
  const parts = raw.split('|')
  if (parts.length < 6) return null  // Khong phai QR CCCD

  const idNumber = parts[0]?.trim()
  if (!/^\d{12}$/.test(idNumber)) return null  // CCCD phai 12 so

  const fullName = parts[2]?.trim()
  const dobRaw = parts[3]?.trim()  // ddMMyyyy
  const genderRaw = parts[4]?.trim()
  const address = parts[5]?.trim()

  // Parse ngay sinh tu ddMMyyyy -> dd/MM/yyyy
  const dob = dobRaw?.length === 8
    ? `${dobRaw.slice(0,2)}/${dobRaw.slice(2,4)}/${dobRaw.slice(4)}`
    : dobRaw

  const gender = genderRaw === 'Nam' ? 'male' : genderRaw === 'Nữ' ? 'female' : undefined

  return { full_name: fullName, id_number: idNumber, date_of_birth: dob, gender, nationality: 'Việt Nam', address }
}
```

#### 2. `src/components/bookings/QRScannerDialog.tsx`

- Su dung `Html5Qrcode` (khong phai Scanner) de kiem soat camera manually
- Hien thi video stream voi vung quet QR
- Khi doc thanh cong -> goi `parseCCCDQR()` -> tra ve data
- Neu chuoi QR khong phai CCCD -> hien thi toast loi
- Co nut dong va tu dong tat camera khi dong

#### 3. Sua `DocumentScanner.tsx`

Them 1 nut "Quet QR" (icon `QrCode` tu lucide-react) ben canh cac nut hien co. Khi quet thanh cong, goi `onScanComplete()` voi document type = 'cccd' va du lieu da parse.

### Uu diem so voi quet anh (OCR)

- Nhanh hon nhieu (quet tuc thi, khong doi AI xu ly)
- Chinh xac 100% (du lieu tu QR code, khong phai nhan dang anh)
- Khong ton chi phi AI/edge function
- Hoat dong offline

