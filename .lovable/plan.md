

## Fix: Validate anh co phai giay to truoc khi trich xuat

### Van de

Hien tai khi chup anh (ke ca anh mat/selfie), AI **luon bi ep** phai tra ve thong tin giay to vi dung `tool_choice: { type: "function", function: { name: "extract_document_info" } }`. Ket qua la AI "bịa" ra thong tin du anh khong phai giay to.

### Giai phap

Them buoc xac thuc truoc: yeu cau AI kiem tra anh co phai giay to hop le hay khong. Neu khong phai, tra ve loi thay vi bịa thong tin.

### Thay doi

| # | File | Mo ta |
|---|------|-------|
| 1 | `supabase/functions/scan-guest-document/index.ts` | Them field `is_valid_document` vao tool schema, kiem tra truoc khi tra ket qua |
| 2 | `supabase/functions/mobile-scan-upload/index.ts` | Tuong tu - them validation cho luong chup tu dien thoai |

### Chi tiet ky thuat

**Thay doi tool schema** - them 2 field moi:

```typescript
is_valid_document: {
  type: "boolean",
  description: "true if the image clearly shows an identity document (ID card, passport, visa). false if it's a selfie, random photo, or unclear image.",
},
rejection_reason: {
  type: "string",
  description: "If is_valid_document is false, explain why (e.g. 'Image shows a person's face, not a document')",
},
```

Them `is_valid_document` vao `required` array.

**Them validation logic** sau khi parse ket qua:

```typescript
if (!extractedData.is_valid_document) {
  return new Response(
    JSON.stringify({ 
      error: "Anh khong phai giay to tuy than. Vui long chup lai anh CCCD/Ho chieu/Visa." 
    }),
    { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**Cap nhat prompt** - them dong:

```
IMPORTANT: First determine if the image actually shows an identity document. 
If the image is a selfie, random photo, or does not clearly show an ID card/passport/visa, 
set is_valid_document to false.
```

### Ket qua

- Chup anh mat/selfie: Tra ve loi "Anh khong phai giay to tuy than"
- Chup anh giay to that: Hoat dong binh thuong nhu cu
- Ap dung cho ca 2 luong: chup truc tiep va chup tu dien thoai

