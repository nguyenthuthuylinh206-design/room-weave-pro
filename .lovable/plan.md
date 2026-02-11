

## Fix chup anh tren Desktop

### Nguyen nhan

Input camera co attribute `capture="environment"` (dong 177). Attribute nay chi hoat dong tren mobile (mo camera truc tiep). Tren desktop, no khien file picker khong mo duoc hoac hoat dong sai.

### Giai phap

Xoa attribute `capture="environment"` khoi camera input. Thay vao do, **gop 2 input thanh 1** vi tren desktop ca 2 nut deu mo file picker giong nhau. Hoac don gian hon: **chi xoa `capture="environment"`** de nut "Chup anh" van mo file picker binh thuong tren desktop, va tren mobile user van co the chon camera tu file picker.

### Thay doi

| # | File | Dong | Thay doi |
|---|------|------|---------|
| 1 | `src/components/bookings/DocumentScanner.tsx` | 177 | Xoa `capture="environment"` khoi camera input |

Chi 1 dong thay doi duy nhat.

