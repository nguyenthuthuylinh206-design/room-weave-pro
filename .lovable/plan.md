

## Fix: Cho phep thu lai khi chup giay to that bai tren dien thoai

### Van de goc

Khi chup anh lan 1 that bai (vi du chup selfie), edge function `mobile-scan-upload` cap nhat session status thanh **"failed"**. Khi nguoi dung nhan "Thu lai" va chup lan 2, edge function kiem tra `session.status !== "pending"` → tu choi vi status la "failed" → may tinh khong bao gio nhan duoc ket qua.

### Nguyen nhan

1. **Edge function** (`mobile-scan-upload`): Chi chap nhan session co status = "pending", khong cho phep retry khi status = "failed"
2. **Trang dien thoai** (`ScanDocumentPage.tsx`): Dung `sessionData` cu (stale) tu lan load dau, khong re-fetch khi retry

### Giai phap

| # | File | Mo ta |
|---|------|-------|
| 1 | `supabase/functions/mobile-scan-upload/index.ts` | Cho phep retry: chap nhan status "pending" HOAC "failed" |
| 2 | `src/pages/scan/ScanDocumentPage.tsx` | Re-fetch session data truoc moi lan gui anh, reset session status ve "pending" truoc khi retry |

### Chi tiet ky thuat

**1. mobile-scan-upload/index.ts**

Thay doi dieu kien kiem tra status:

```typescript
// Truoc (chi cho pending)
if (session.status !== "pending") {
  return ... "Phien quet da hoan thanh hoac het han"
}

// Sau (cho phep retry tu failed)
if (session.status !== "pending" && session.status !== "failed") {
  return ... "Phien quet da hoan thanh hoac het han"
}
```

**2. ScanDocumentPage.tsx**

Trong ham `handleFile`, truoc khi gui anh:
- Re-fetch session tu DB de kiem tra status moi nhat
- Neu status la "failed", update lai thanh "pending" truoc khi gui

```typescript
// Re-fetch session moi nhat
const { data: freshSession } = await supabase
  .from('document_scan_sessions')
  .select('*')
  .eq('id', sessionId)
  .single()

if (!freshSession || (freshSession.status !== 'pending' && freshSession.status !== 'failed')) {
  throw new Error('Phien quet khong hop le hoac da hoan thanh')
}

// Neu dang failed, reset ve pending
if (freshSession.status === 'failed') {
  await supabase
    .from('document_scan_sessions')
    .update({ status: 'pending' })
    .eq('id', sessionId)
}
```

### Ket qua

- Chup lan 1 that bai (selfie) → Hien loi, hien nut "Thu lai"
- Nhan "Thu lai", chup lai giay to that → Gui thanh cong, may tinh nhan duoc ket qua
- Session khong can tao moi, chi can reset status

