

## Fix hinh bi nguoc (mirror) khi dung camera truoc tren may tinh

### Van de

Khi dung camera truoc (webcam may tinh), hinh bi lat ngang (mirror) - dua tay sang trai nhung tren man hinh thay sang phai. Day la hanh vi mac dinh cua camera truoc, nhung gay kho chiu khi chup anh giay to hoac thao tac.

### Giai phap

Khi phat hien dang dung camera truoc (fallback), ap dung CSS `transform: scaleX(-1)` len the `video` de lat nguoc hinh lai cho dung chieu. Dong thoi khi chup anh (capture), cung lat nguoc canvas de anh luu dung chieu thuc te.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/WebcamCaptureDialog.tsx` | Them state `isFrontCamera`, ap dung mirror CSS va flip canvas khi capture |
| 2 | `src/components/bookings/QRScannerDialog.tsx` | Them state `isFrontCamera`, ap dung mirror CSS cho video |

### Chi tiet ky thuat

**1. WebcamCaptureDialog.tsx**

- Them state `isFrontCamera` (default `false`)
- Trong `startCamera()`: khi vao catch (fallback camera truoc), set `isFrontCamera = true`
- Ap dung class `style={{ transform: 'scaleX(-1)' }}` len `<video>` khi `isFrontCamera = true`
- Trong ham `capture()`: neu `isFrontCamera`, dung `ctx.scale(-1, 1)` va `ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)` de anh chup ra dung chieu thuc te (khong bi mirror)
- Reset `isFrontCamera = false` khi dialog dong

**2. QRScannerDialog.tsx**

- Them state `isFrontCamera` (default `false`)
- Trong `startScanning()`: khi vao catch (fallback camera truoc), set `isFrontCamera = true`
- Ap dung `style={{ transform: 'scaleX(-1)' }}` len `<video>` khi `isFrontCamera = true`
- Canvas dung de scan QR khong can flip vi thu vien QR tu xu ly duoc ca 2 chieu

### Ket qua

- Tren dien thoai (camera sau): Khong thay doi gi - hinh hien thi binh thuong
- Tren may tinh (camera truoc): Hinh duoc lat lai dung chieu - dua tay trai thi tren man hinh cung thay trai
- Anh chup ra luu dung chieu thuc te

