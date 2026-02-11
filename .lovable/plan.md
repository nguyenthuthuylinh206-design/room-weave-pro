

## Xay dung chuc nang tu nham ma QR nhu WeChat

### Phan tich cach WeChat quet QR

WeChat khong yeu cau nguoi dung dat ma QR vao khung co dinh. Thay vao do, no:

1. **Quet toan bo khung hinh** - Khong can qrbox co dinh, quet toan bo camera frame
2. **Tu dong phat hien vi tri QR** - Dung OpenCV + model AI de tim QR o bat ky dau trong hinh
3. **Auto-zoom** - Khi phat hien QR nhung qua nho/xa, tu dong zoom camera vao vung chua QR
4. **Khoan dung loi cao** - Dung thuat toan WeChat QR Detector (dua tren OpenCV) co khoan dung loi rat cao, doc duoc ca QR bi mo, nghieng, hoac bi che mot phan

### Giai phap

Thay the `html5-qrcode` bang `qr-scanner-wechat` - thu vien JavaScript dua tren WebAssembly build cua OpenCV va thuat toan WeChat QR Code Scanner (do Anthony Fu port). Ket hop voi auto-zoom camera khi phat hien QR o xa.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Viet lai hoan toan: dung `qr-scanner-wechat` + camera stream truc tiep + auto-zoom |
| 2 | `package.json` | Them dependency `qr-scanner-wechat` |

### Chi tiet ky thuat

**1. Thu vien moi: `qr-scanner-wechat`**
- Dua tren OpenCV + WeChat QR Detector (WebAssembly)
- Kich thuoc: ~2.5MB gzipped (load 1 lan, cache lai)
- API don gian: `scan(canvas)` tra ve `{ text: string }` hoac `null`
- Khoan dung loi cao hon nhieu so voi `html5-qrcode`

**2. Luong xu ly moi**

```text
1. Mo camera voi getUserMedia (4K ideal + autofocus)
2. Hien thi video fullscreen (khong can qrbox co dinh)
3. Moi ~200ms, chup frame tu video vao canvas an
4. Goi scan(canvas) de phat hien + doc QR
5. Neu scan tra ve text -> parse CCCD -> thanh cong
6. Neu khong doc duoc -> thu zoom camera 2x (neu ho tro)
7. Sau vai giay zoom ma van khong doc duoc -> zoom lai 1x
```

**3. Auto-zoom logic**

```text
- Dem so frame lien tiep khong doc duoc QR
- Sau 15 frame (~3 giay) khong doc duoc:
  + Kiem tra camera co ho tro zoom khong (capabilities.zoom)
  + Neu co: tang zoom len 2x de phong to vung trung tam
  + Giu zoom 3 giay
  + Neu van khong doc duoc: ha zoom ve 1x, bat dau lai
- Khi doc duoc QR: reset zoom ve 1x
```

**4. UI thay doi**

- Bo qrbox co dinh (quet toan bo frame nhu WeChat)
- Giu overlay voi corner markers nhung chi mang tinh tham my
- Them hieu ung highlight khi phat hien QR (vi tri corner markers chuyen sang vang)
- Guide text: "Huong camera vao ma QR" (khong can "dat vao khung hinh")
- Hien thi trang thai zoom (icon zoom khi dang zoom)

**5. Fallback**

- Giu `html5-qrcode` lam fallback neu `qr-scanner-wechat` load WASM that bai
- Hien thi loading indicator khi dang tai WASM lan dau (~2.5MB)

**6. Camera setup**

- Van dung `getUserMedia` truc tiep de kiem soat stream
- Resolution: `width: { ideal: 1920 }, height: { ideal: 1080 }` (1080p du cho WeChat scanner, 4K khong can thiet vi scan tren canvas)
- `focusMode: 'continuous'`
- Mirror: giu `-scale-x-100`
- Scan canvas: resize frame xuong 720p truoc khi scan (toi uu hieu nang)

**7. Hieu nang**

- Scan interval: 200ms (5 fps scan, khong can nhieu hon)
- Canvas resize: 1280x720 cho scan (nhe hon 4K)
- `requestAnimationFrame` + throttle de khong block UI
- Preload WASM khi component mount (truoc khi user mo scanner)

