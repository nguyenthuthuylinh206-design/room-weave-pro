

## Fix: Chuc nang chup anh tren dien thoai khong hoat dong

### Nguyen nhan goc

Co 2 van de chinh:

1. **Storage upload that bai cho anonymous user**: Bucket `guest-documents` yeu cau `auth.role() = 'authenticated'`. Khi mo link tren trinh duyet dien thoai (khong dang nhap), user la anonymous nen khong the upload anh.

2. **Auto-click file input co the bi chan**: Mot so trinh duyet mobile chan viec tu dong click file input (bao mat). Can dam bao flow hoat dong ngay ca khi auto-click that bai - user van co the an nut thu cong.

3. **Loi tham lang**: Khi storage upload that bai, code van tiep tuc nhung `imageUrl` se la `undefined`. Tuy nhien, van de lon hon la session SELECT co the khong tra ket qua do RLS conflict giua 2 policy (authenticated vs anonymous).

### Giai phap

| # | File | Thay doi |
|---|------|---------|
| 1 | Migration SQL | Them storage policy cho phep anonymous upload vao `guest-documents` (gioi han theo path pattern). Hoac lam bucket `public` |
| 2 | `src/pages/scan/ScanDocumentPage.tsx` | Xu ly truong hop auto-click that bai, them error logging tot hon, skip storage upload neu anonymous |
| 3 | Migration SQL | Sua RLS policy cho `document_scan_sessions` - anonymous policy nen dung `true` thay vi `auth.uid() IS NULL` de hoat dong cho ca authenticated lan anonymous |

### Chi tiet

#### 1. Sua RLS policy cho `document_scan_sessions`

Policy hien tai `auth.uid() IS NULL` chi cho phep anonymous user. Neu user mo link tren dien thoai dang dang nhap (trong PWA), policy nay KHONG ap dung, nhung policy authenticated lai kiem tra `tenant_id` - co the dung nhung khong chac chan.

Giai phap: Thay doi SELECT policy thanh cho phep tat ca (authenticated va anonymous) doc session theo UUID:

```text
-- Xoa policy cu
DROP POLICY "Anonymous can view scan session by id"

-- Tao policy moi cho phep tat ca doc
CREATE POLICY "Anyone can view scan session by id"
  ON document_scan_sessions FOR SELECT
  USING (true);
```

Tuong tu cho UPDATE policy:
```text
DROP POLICY "Anonymous can complete scan sessions"

CREATE POLICY "Anyone can complete pending scan sessions"
  ON document_scan_sessions FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (status = 'completed');
```

#### 2. Xu ly storage - skip upload cho anonymous

Thay vi fix storage RLS (phuc tap), bo qua buoc upload anh va chi gui data OCR. Anh khong bat buoc - thong tin OCR la quan trong nhat.

#### 3. Cai thien `ScanDocumentPage.tsx`

- Them console.log de debug
- Dam bao nut "Chup anh" luon hien thi (khong an khi auto-click)
- Xu ly loi tot hon khi camera bi tu choi
- Bo qua storage upload error (khong block flow)

### Danh sach thay doi

| # | File | Loai |
|---|------|------|
| 1 | Migration SQL | Sua RLS policies cho `document_scan_sessions` |
| 2 | `src/pages/scan/ScanDocumentPage.tsx` | Cai thien error handling, skip storage upload loi, them logging |

