

## Cai thien QR Scanner - Giong WeChat, nhanh va nhay hon

### Van de hien tai

1. **Vung quet nho co dinh (250x250px)** - Phai can chinh chinh xac QR vao o vuong nho, rat kho khi cam tay
2. **FPS thap (10fps)** - Khong du nhanh de bat QR khi tay rung hoac goc nghieng
3. **Khong xu ly duoc loa** - Camera khong duoc cau hinh de xu ly anh sang phan chieu
4. **Giao dien nho trong dialog** - Vung camera bi gioi han boi dialog nho

### Giai phap: Thiet ke lai hoan toan theo phong cach WeChat

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/components/bookings/QRScannerDialog.tsx` | Viet lai hoan toan - fullscreen, scan toan bo khung hinh, UI giong WeChat |

### Chi tiet thay doi

#### 1. Fullscreen overlay thay vi dialog nho

- Dung `position: fixed inset-0` thay vi `Dialog` component
- Camera chiem toan bo man hinh - giong WeChat
- Nut dong (X) o goc tren

#### 2. Scan toan bo khung hinh, bo o vuong gioi han

- Doi `qrbox` tu `{ width: 250, height: 250 }` sang `undefined` hoac ratio lon (70-80% khung hinh)
- Thu vien se quet toan bo vung camera thay vi chi trong o vuong nho
- Nguoi dung chi can dua QR vao bat ky dau trong khung hinh

#### 3. Tang FPS va do nhay

- Tang `fps` tu 10 len 30 (quet 30 lan/giay)
- Bat `disableFlip: false` de quet ca mat truoc/sau
- Dung `aspectRatio: 1.0` de camera vuong, de can chinh hon
- Bat `experimentalFeatures: { useBarCodeDetectorIfSupported: true }` de dung native BarcodeDetector API (nhanh hon nhieu tren Chrome/Android)

#### 4. UI overlay giong WeChat

- Ve animation scan line chay tu tren xuong (CSS animation)
- 4 goc bo tron mau xanh o giua (chi de tham khao, khong bat buoc can chinh vao)
- Text huong dan "Di chuyen camera den ma QR"
- Nen ban trong (semi-transparent overlay) xung quanh vung trung tam

#### 5. Cau hinh camera tot hon cho chong loa

- Dung `advanced: [{ torch: false }]` - tat flash de giam loa
- Request camera resolution cao: `width: { ideal: 1280 }, height: { ideal: 720 }`
- Camera resolution cao giup doc QR tot hon khi bi loa 1 phan

### Cau truc code moi (QRScannerDialog.tsx)

```text
// Thay doi chinh:
// 1. Fullscreen fixed overlay thay vi Dialog
// 2. Config camera:
await scanner.start(
  { facingMode: 'environment' },
  {
    fps: 30,                    // 3x nhanh hon
    qrbox: { width: 280, height: 280 },  // Lon hon, hoac dung function de responsive
    aspectRatio: 1.0,
    disableFlip: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true  // Native API, nhanh hon
    }
  },
  onSuccess,
  onFailure
)

// 3. CSS overlay animation
// - Scan line animation (keyframes translateY 0->100%)
// - 4 corner markers
// - Semi-transparent background
```

### Ket qua mong doi

- Quet nhanh nhu WeChat (native BarcodeDetector + 30fps)
- Khong can can chinh chinh xac - chi can dua QR vao khung hinh
- Giao dien fullscreen de thao tac, khong bi nguoc tay
- Hoat dong tot hon khi bi loa (camera resolution cao + quet toan khung hinh)

