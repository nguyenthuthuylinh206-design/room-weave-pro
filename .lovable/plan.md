

## Fix: Camera mo khi quet QR - Truyen videoConstraints truc tiep

### Nguyen nhan

Code hien tai:
1. Mo stream 4K de lay `deviceId` (dong 48-61)
2. **Dong stream nay lai** (dong 81)
3. Goi `scanner.start()` voi chi `deviceId` - html5-qrcode tu mo stream moi voi **resolution mac dinh (thap)**
4. Co gang apply autofocus sau (dong 114-130) nhung resolution da bi thap roi

Ket qua: camera luon o resolution thap, hinh mo.

### Giai phap

Dung option `videoConstraints` cua `html5-qrcode` de truyen thang constraints resolution cao + autofocus. Khong can tao stream rieng nua - de html5-qrcode tu mo camera voi dung constraints minh muon.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Don gian hoa: bo buoc tao stream rieng, truyen `videoConstraints` truc tiep vao `scanner.start()` |

### Chi tiet ky thuat

Thay the toan bo logic trong `useEffect` (dong 45-136):

**Truoc** (phuc tap, khong hieu qua):
```text
1. getUserMedia({ 4096x2160 }) -> lay deviceId
2. Stop stream
3. scanner.start({ deviceId }) -> html5-qrcode mo stream MOI voi resolution MAC DINH
4. Co gang apply autofocus sau
```

**Sau** (don gian, hieu qua):
```text
1. scanner.start({ facingMode: 'environment' }, {
     videoConstraints: {
       facingMode: 'environment',
       width: { ideal: 4096 },
       height: { ideal: 2160 },
       focusMode: 'continuous',
       advanced: [{ focusMode: 'continuous' }]
     },
     fps: 15,
     qrbox: ...,
   })
2. Sau khi start, apply autofocus len video track cua scanner
```

Thay doi chinh:
- Bo toan bo buoc `getUserMedia` + stop stream rieng (dong 47-82)
- Truyen `videoConstraints` trong config cua `scanner.start()` de html5-qrcode tu mo camera voi resolution cao
- Giam `fps` tu 30 xuong 15 (giam tai cho CPU, giup camera tap trung xu ly anh net hon)
- Giu nguyen logic apply autofocus sau khi scanner da start (dong 114-130)
- Bo `streamRef` vi khong can quan ly stream rieng nua
- Giu nguyen `aspectRatio: 1.0` va `disableFlip: false`

Ket qua: html5-qrcode se mo camera voi resolution cao nhat co the (4K ideal) va autofocus bat, thay vi resolution mac dinh nhu hien tai.

