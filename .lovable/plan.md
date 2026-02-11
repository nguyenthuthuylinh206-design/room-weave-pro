

## Fix camera luon dung camera sau (khong bi nguoc)

### Nguyen nhan

Hien tai code dung `facingMode: 'environment'` - day chi la **goi y** (preference), trinh duyet co the van chon camera truoc neu khong tim thay camera sau. Camera truoc thi hinh bi lat nguoc (mirror), thao tac di chuyen tay trai nhung tren man hinh lai thay di chuyen phai.

### Giai phap

Dung `facingMode: { exact: 'environment' }` de **bat buoc** dung camera sau. Neu thiet bi khong co camera sau (VD laptop chi co webcam truoc), fallback ve `facingMode: 'user'`.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/WebcamCaptureDialog.tsx` | Dung `exact: 'environment'` voi fallback |
| 2 | `src/components/bookings/QRScannerDialog.tsx` | Dung `exact: 'environment'` voi fallback |

### Chi tiet ky thuat

**1. WebcamCaptureDialog.tsx - startCamera()**

Thay dong 29-31:
```typescript
// Thu camera sau truoc
try {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  })
} catch {
  // Fallback camera truoc (laptop/desktop)
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  })
}
```

**2. QRScannerDialog.tsx - startScanning()**

Thay dong 108-109 tuong tu:
```typescript
facingMode: { exact: 'environment' },
```
Voi try/catch fallback ve `facingMode: 'user'`.

### Ket qua

- Tren dien thoai: Luon dung camera sau, khong bi nguoc/lat hinh
- Tren may tinh: Fallback ve webcam truoc (vi khong co camera sau)
- QR scanner va chup anh deu ap dung

