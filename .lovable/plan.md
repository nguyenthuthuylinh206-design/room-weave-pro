

## Lat nguoc camera (mirror) de dieu chinh goc de hon

### Van de

Khi dung camera sau (`environment`) de quet QR, hinh anh hien thi khong bi lat (giong nhu nhin qua kinh). Dieu nay khien khi ban nghieng dien thoai sang trai, hinh tren man hinh cung di chuyen sang trai - gay cam giac "nguoc tay", kho dieu chinh goc do.

### Giai phap

Them CSS `transform: scaleX(-1)` vao the `video` de lat ngang (mirror) hinh anh camera. Dieu nay giup:
- Nghieng trai -> hinh di sang phai (tu nhien nhu soi guong)
- Dieu chinh goc de dang hon, giong cam giac cua camera truoc

Quan trong: `html5-qrcode` van decode dung vi no xu ly frame goc, CSS chi anh huong den hien thi.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Them CSS mirror cho video element |

### Chi tiet

Dong 149 hien tai:
```text
<div id={readerElId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
```

Them class mirror:
```text
<div id={readerElId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:-scale-x-100" />
```

`-scale-x-100` la Tailwind class tuong duong `transform: scaleX(-1)`, lat ngang video giong nhu soi guong. Thu vien `html5-qrcode` van decode binh thuong vi no doc pixel goc tu video stream, khong bi anh huong boi CSS transform.

