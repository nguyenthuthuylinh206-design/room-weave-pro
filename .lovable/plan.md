

## Fix camera mo khi quet QR - Nang do phan giai va tu dong lam net

### Van de

Camera hien tai dang dung cau hinh mac dinh cua `html5-qrcode` (khong chi dinh resolution), nen camera thuong chon do phan giai thap. Khong co cau hinh autofocus nen hinh bi mo, dac biet tren dien thoai.

### Giai phap

Thay doi cach khoi tao camera: khong dung `facingMode` don gian, ma dung `getUserMedia` constraints day du voi resolution cao nhat va bat autofocus.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Cau hinh camera resolution max + autofocus |

### Chi tiet ky thuat

Thay doi trong `QRScannerDialog.tsx`:

**Buoc 1**: Truoc khi goi `scanner.start()`, dung `navigator.mediaDevices.getUserMedia()` de lay camera voi constraints toi uu:

```text
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: { ideal: 4096 },      // Yeu cau resolution cao nhat co the
    height: { ideal: 2160 },     // 4K ideal
    focusMode: { ideal: 'continuous' },  // Tu dong lam net lien tuc
    advanced: [
      { focusMode: 'continuous' },
      { torch: false }           // Tat flash chong loa
    ]
  }
})
```

**Buoc 2**: Sau khi co stream, apply autofocus qua `track.applyConstraints()` de dam bao hoat dong tren nhieu loai dien thoai:

```text
const track = stream.getVideoTracks()[0]
const capabilities = track.getCapabilities()

if (capabilities.focusMode?.includes('continuous')) {
  await track.applyConstraints({
    advanced: [{ focusMode: 'continuous' }]
  })
}
```

**Buoc 3**: Truyen `cameraId` (lay tu stream) vao `scanner.start()` thay vi `facingMode`, vi khi da co stream rieng thi dung device ID se chinh xac hon.

**Buoc 4**: Khi dung scanner (`stopScanner`), phai stop ca stream custom nay.

### Tong ket thay doi code

- Them ham `startCameraWithAutofocus()` de lay stream voi resolution max + autofocus
- Luu stream ref de cleanup
- Truyen deviceId vao `scanner.start()` thay vi `facingMode`
- Apply `focusMode: 'continuous'` qua `applyConstraints`
- Request resolution `4096x2160` (ideal) - camera se tu chon muc cao nhat ma no ho tro

