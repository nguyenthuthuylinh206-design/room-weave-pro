

## Tu dong mo camera khi nhan thong bao tren dien thoai

### Van de

Hien tai khi nhan thong bao tren dien thoai va mo trang `/scan-document/:sessionId`, user phai an them nut "Chup anh giay to" de mo camera. User muon mo camera ngay lap tuc khi vao trang.

### Giai phap

Chi can thay doi **1 file**: `src/pages/scan/ScanDocumentPage.tsx`

1. **Tu dong mo camera khi vao trang**: Dung `useEffect` de tu dong trigger file input (click) ngay khi component mount. Tren mobile voi `capture="environment"`, dieu nay se mo camera truc tiep.

2. **Giu nguyen flow hien tai**: Sau khi chup anh, flow xu ly (compress -> OCR -> upload -> update session) da hoat dong dung. Desktop da co realtime listener de nhan ket qua tu dong.

### Chi tiet ky thuat

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/pages/scan/ScanDocumentPage.tsx` | Them `useEffect` auto-trigger `fileInputRef.current?.click()` khi mount + validate session truoc khi mo camera |

Logic:
- Khi component mount, goi `loadSession()` de kiem tra session con pending khong
- Neu session hop le, tu dong `fileInputRef.current?.click()` de mo camera
- Neu session da completed/expired, hien thong bao loi
- Phan con lai giu nguyen (OCR, upload, update session -> desktop nhan realtime)

