

## Lam khung quet QR nho gon, net nhu chup anh

### Van de hien tai

1. **Khung quet qua lon** - `65vmin` chiem gan het man hinh, tao cam giac "mo" vi camera phai hien thi vung lon
2. **Overlay mask dung radial-gradient** - Khong tao duoc khung vuong sac net, vung trong suot bi nhoe
3. **Video fullscreen khong co crop** - Hien thi toan bo frame camera, khong tap trung vao vung quet

### Giai phap

Thu nho khung quet xuong kich thuoc compact (khoang `56vmin`), thay radial-gradient mask bang overlay 4 mang toi bao quanh khung vuong de tao vien sac net. Giong nhu khung chup anh tren camera dien thoai.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Thu nho khung, thay mask overlay, lam sac net UI |

### Chi tiet ky thuat

**1. Thay doi kich thuoc khung quet**

Thu nho tu `65vmin` xuong `56vmin` - vua du de quet QR ma khong chiem qua nhieu man hinh.

**2. Thay radial-gradient bang 4 mang toi (rectangular mask)**

Thay vi dung `radial-gradient` (tao vung tron mo), dung 4 div overlay toi bao quanh khung vuong:
- Top: tu tren den canh tren khung
- Bottom: tu canh duoi khung den duoi
- Left: canh trai khung
- Right: canh phai khung

Ket qua: khung vuong trong suot sac canh, vung ngoai toi `bg-black/50`. Giong camera chup anh.

**3. Them border mong cho khung quet**

Them `border border-white/20` quanh vung quet de tao ranh gioi ro rang giua vung sang va toi.

**4. Corner markers nho gon hon**

Giam tu `w-7 h-7` xuong `w-5 h-5`, border tu `3px` xuong `2px`. Bo `animate-pulse` (khong can thiet, lam roi mat).

**5. Scan line tinh te hon**

Giam height tu `2px` xuong `1px`, giam opacity. Tao cam giac nhe nhang nhu camera scan.

**6. Guide text va controls**

- Guide text giu nguyen vi tri nhung nho hon (`text-[11px]`)
- Flash button giu nguyen
- Close button giu nguyen

**7. Tong hop thay doi UI**

```text
Truoc:
- Khung 65vmin, radial-gradient mask (tron, mo)
- Corner markers 7x7, border 3px, pulse animation
- Scan line 2px

Sau:
- Khung 56vmin, rectangular mask (vuong, sac)
- Corner markers 5x5, border 2px, khong pulse
- Scan line 1px
- Border mong quanh khung
```

Logic quet (scan loop, auto-zoom, flash) giu nguyen hoan toan - chi thay doi phan hien thi.
