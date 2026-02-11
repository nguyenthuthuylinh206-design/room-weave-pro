

## Fix loi anh bi hong khi chup tu dien thoai

### Nguyen nhan

Bucket `guest-documents` duoc tao voi `public = false` (private). Nhung ca 2 noi (DocumentScanner.tsx va mobile-scan-upload edge function) deu dung `getPublicUrl()` de lay URL anh. Public URL khong hoat dong voi private bucket - ket qua la anh bi hong.

- Khi chup truc tiep tren may tinh: `previewUrl` la base64 data (hoat dong binh thuong vi khong can URL)
- Khi chup tu dien thoai: `previewUrl` duoc set tu `updated.image_url` (la public URL cua private bucket -> hong)

### Giai phap

Chuyen bucket `guest-documents` sang **public** vi day chi la anh giay to dung de hien thi preview, va da co RLS policy bao ve viec upload/delete.

### Thay doi

| # | File/Action | Mo ta |
|---|-------------|-------|
| 1 | SQL Migration | `UPDATE storage.buckets SET public = true WHERE id = 'guest-documents'` |

Chi can 1 thay doi duy nhat - khong can sua code TypeScript vi `getPublicUrl()` se tu dong hoat dong khi bucket la public.

### Luu y bao mat

- RLS policy upload van yeu cau `authenticated` - chi user dang nhap moi upload duoc
- RLS policy delete van yeu cau `authenticated`
- Bucket public chi co nghia la ai co URL deu xem duoc anh - nhung URL chua `tenant_id` + timestamp nen kho doan
- Neu can bao mat cao hon, co the dung `createSignedUrl()` thay vi `getPublicUrl()`, nhung se phuc tap hon vi can tao signed URL moi lan hien thi

