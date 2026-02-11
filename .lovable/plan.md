

## Fix: Loi cap nhat anh khi chup tu dien thoai

### Nguyen nhan goc

Khi mo trang `/scan-document/:sessionId` tren dien thoai, nguoi dung **khong dang nhap** (trang nay la public route). Quy trinh hien tai:

1. Dien thoai chup anh -> nen anh -> goi OCR (ok)
2. Dien thoai upload anh len storage `guest-documents` -> **THAT BAI** vi storage yeu cau `auth.role() = 'authenticated'`
3. Cap nhat session voi `image_url: null` (vi upload that bai)
4. May tinh nhan realtime -> `image_url` la null -> khong hien thi anh

Storage bucket `guest-documents` co RLS policy:
- Upload: chi cho phep `authenticated` users
- Nguoi dung tren dien thoai la anonymous -> bi tu choi

### Giai phap

Tao edge function moi `mobile-scan-upload` xu ly toan bo quy trinh phia server voi **service role key** (co quyen upload storage), thay vi de client mobile tu upload.

| # | File | Loai | Mo ta |
|---|------|------|-------|
| 1 | `supabase/functions/mobile-scan-upload/index.ts` | Tao moi | Edge function nhan anh tu mobile, upload len storage bang service role, goi OCR, cap nhat session |
| 2 | `src/pages/scan/ScanDocumentPage.tsx` | Sua | Goi edge function `mobile-scan-upload` thay vi tu lam 3 buoc rieng le (upload + OCR + update session) |

### Chi tiet ky thuat

#### 1. Edge function `mobile-scan-upload`

Nhan request tu mobile voi `{ sessionId, imageBase64, documentType }`:

```text
1. Verify session ton tai va status = 'pending' (dung service role)
2. Goi OCR (scan-guest-document logic hoac goi truc tiep AI gateway)
3. Upload anh len storage 'guest-documents' bang service role client
4. Cap nhat document_scan_sessions voi scanned_data, image_url, status = 'completed'
5. Tra ve ket qua
```

Su dung `SUPABASE_SERVICE_ROLE_KEY` de:
- Upload file len storage (bypass RLS)
- Cap nhat session (dam bao thanh cong)

#### 2. Sua ScanDocumentPage.tsx

Thay vi 3 buoc rieng le (OCR -> upload storage -> update session), chi can 1 call duy nhat:

```text
const { data, error } = await supabase.functions.invoke('mobile-scan-upload', {
  body: { sessionId, imageBase64, documentType }
})
```

Giam do phuc tap o client mobile, moi logic xu ly o server.

### Ket qua mong doi

- Anh luon duoc upload thanh cong (service role bypass RLS)
- Desktop nhan duoc image_url qua realtime -> hien thi preview dung
- Mobile chi can 1 API call thay vi 3
- Bao mat: session duoc verify truoc khi xu ly

