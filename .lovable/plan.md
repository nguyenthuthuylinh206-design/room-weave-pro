

## Fix camera mo + Nang cao UX/UI scanner QR

### Nguyen nhan camera bi mo

Camera hien tai yeu cau resolution `1920x1080` (dong 100-101), nhung tren man hinh dien thoai do phan giai cao (retina/high-DPI), 1080p bi keo gian ra toan man hinh se bi mo. Phien ban truoc hoat dong tot vi yeu cau `4096x2160` (4K) - camera tu chon resolution cao nhat co the.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Tang resolution camera len 4K + nang cao UI |

### Chi tiet ky thuat

**1. Tang resolution camera**

Dong 99-101, thay:
```text
width: { ideal: 1920 },
height: { ideal: 1080 },
```
Thanh:
```text
width: { ideal: 4096 },
height: { ideal: 2160 },
```

Camera se tu chon resolution cao nhat ho tro (thuong la 4K hoac 1080p tuy thiet bi). Scan canvas van giu 1280x720 de toi uu hieu nang - chi anh huong den hien thi.

**2. Nang cao UI giong WeChat**

- Doi corner markers tu `border-green-400` sang `border-white` (giong WeChat dung mau trang)
- Them hieu ung pulse nhe cho corner markers
- Doi scan line mau trang/xanh nhat giong WeChat
- Guide text don gian hon, font nho hon
- Them icon flash/torch toggle (bat/tat den flash) - rat huu ich khi quet trong toi
- Close button style giong WeChat (tron, trong suot)

**3. Them nut bat/tat den flash**

WeChat co nut bat den flash khi moi truong toi. Them logic:
- Kiem tra `track.getCapabilities().torch`
- Neu co: hien thi nut den flash o phia duoi
- Toggle bang `track.applyConstraints({ advanced: [{ torch: true/false }] })`

**4. Tong hop thay doi trong file**

```text
QRScannerDialog.tsx:
- Dong 99-101: width/height ideal 4096x2160
- Dong 226-232: video element giu nguyen (da object-cover)
- Dong 246-260: UI overlay - doi mau corner, them flash button
- Dong 270-278: Guide text don gian hon
- Them state isFlashOn + toggleFlash function
```

