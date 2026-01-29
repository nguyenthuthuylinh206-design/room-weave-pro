

## Kiểm Tra Chức Năng Điều Hướng Mobile - Kết Quả Phân Tích

### I. VẤN ĐỀ CHÍNH PHÁT HIỆN

Sau khi kiểm tra toàn bộ các component mobile có wizard/multi-step forms, tôi phát hiện **VẤN ĐỀ QUAN TRỌNG**:

| Component | Vấn đề | Mức độ |
|-----------|--------|--------|
| `MobileBatchForm.tsx` | Các nút "Quay lại", "Tiếp" **THIẾU `type="button"`** | **CAO** |
| `MobilePOForm.tsx` | Các nút "Quay lại", "Tiếp" **THIẾU `type="button"`** | **CAO** |
| `MobileRoomFormPage.tsx` | Các nút step navigation **THIẾU `type="button"`** | **CAO** |
| `MobileItemFormPage.tsx` | ✅ Đã có `type="button"` đầy đủ | OK |
| `MobileMaintenanceRequestForm.tsx` | ✅ Đã có `type="button"` đầy đủ | OK |
| `MobileInboundForm.tsx` | ✅ Sử dụng `TouchButton` riêng, không trong form | OK |
| `MobileAdjustmentForm.tsx` | ✅ Sử dụng `TouchButton` riêng, không trong form | OK |
| `BookingWizard.tsx` | ✅ Đã có `type="button"` đầy đủ | OK |

---

### II. NGUYÊN NHÂN GỐC

Trong HTML, button mặc định có `type="submit"`. Khi button nằm trong thẻ `<form>`, click vào sẽ:
1. **Trigger form submission** (không phải chuyển step)
2. **Gây refresh page** hoặc validation errors không mong muốn
3. **Navigation không hoạt động** như mong đợi

---

### III. CÁC FILE CẦN SỬA

#### A. MobileBatchForm.tsx (Lines 378-384, 465-471, 508-519)

**Step 1 - Nút "Tiếp tục":**
```typescript
// Line 378-384: THIẾU type="button"
<Button
  className="w-full"
  size="lg"
  onClick={handleStep1Complete}
>
  {t('createBatch.step1.next')}
</Button>
```

**Step 2 - Nút "Quay lại" và "Tiếp":**
```typescript
// Lines 465-471: THIẾU type="button"
<div className="flex gap-2">
  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
    {t('createBatch.step2.back')}
  </Button>
  <Button className="flex-1" onClick={handleStep2Complete}>
    {t('createBatch.step2.next')}
  </Button>
</div>
```

**Step 3 - Nút "Quay lại" và "Tạo":**
```typescript
// Lines 508-519: THIẾU type="button"
<div className="flex gap-2">
  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
    {t('createBatch.step3.back')}
  </Button>
  <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
    ...
  </Button>
</div>
```

---

#### B. MobilePOForm.tsx (Lines 281-293, 370-386, 472-490)

**Step 1 - Nút "Tiếp tục":**
```typescript
// Lines 281-293: THIẾU type="button"
<Button
  className="w-full"
  size="lg"
  onClick={() => {...}}
>
  {t('actions.next')}
</Button>
```

**Step 2 - Nút "Quay lại" và "Tiếp":**
```typescript
// Lines 370-386: THIẾU type="button"
<Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
  {t('actions.back')}
</Button>
<Button className="flex-1" onClick={() => {...}}>
  {t('actions.next')}
</Button>
```

**Step 3 - Nút "Quay lại" và "Tạo":**
```typescript
// Lines 472-490: THIẾU type="button"
<Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
  {t('actions.back')}
</Button>
<Button className="flex-1" onClick={form.handleSubmit(onSubmit)}>
  ...
</Button>
```

---

#### C. MobileRoomFormPage.tsx (Lines 483-509)

```typescript
// Lines 483-509: Nút navigation THIẾU type="button"
<Button
  variant="outline"
  className="flex-1"
  onClick={currentStep === 1 ? () => navigate('/rooms') : handlePrevStep}
>
  {currentStep === 1 ? 'Hủy' : 'Quay lại'}
</Button>
<Button
  className="flex-1"
  onClick={currentStep === 3 ? undefined : handleNextStep}
  // Thiếu type="button" cho nút không submit
>
  {currentStep === 3 ? 'Hoàn thành' : 'Tiếp tục'}
</Button>
```

---

### IV. GIẢI PHÁP

Thêm `type="button"` vào TẤT CẢ các button trong form mà không có mục đích submit:

```typescript
// BEFORE (lỗi)
<Button onClick={() => setStep(1)}>Quay lại</Button>

// AFTER (đúng)
<Button type="button" onClick={() => setStep(1)}>Quay lại</Button>
```

**Quy tắc:**
- `type="button"` - Cho tất cả nút navigation, back, next (không submit)
- `type="submit"` - Chỉ cho nút cuối cùng thực sự submit form
- Hoặc không có `type` - Chỉ khi button NGOÀI thẻ `<form>`

---

### V. DANH SÁCH THAY ĐỔI CHI TIẾT

| File | Số dòng | Thay đổi |
|------|---------|----------|
| `MobileBatchForm.tsx` | 378 | Thêm `type="button"` |
| `MobileBatchForm.tsx` | 465, 468 | Thêm `type="button"` cho cả 2 nút |
| `MobileBatchForm.tsx` | 509, 512 | Thêm `type="button"` cho cả 2 nút |
| `MobilePOForm.tsx` | 281 | Thêm `type="button"` |
| `MobilePOForm.tsx` | 371, 374 | Thêm `type="button"` cho cả 2 nút |
| `MobilePOForm.tsx` | 474, 477 | Thêm `type="button"` cho cả 2 nút |
| `MobileRoomFormPage.tsx` | 489, 498 | Thêm `type="button"` cho nút không submit |

---

### VI. VẤN ĐỀ PHỤ KHÁC

#### 1. MobileBatchForm - Header Back Button
```typescript
// Line 231-236: Nút back trong header OK (ngoài form)
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate('/laundry')}
>
  <ArrowLeft className="h-5 w-5" />
</Button>
```
**Trạng thái:** ✅ OK - Nằm ngoài `<form>`, không cần `type="button"`

#### 2. MobilePOForm - Header Back Button
```typescript
// Line 168-173: OK - nằm ngoài form
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate('/purchase-orders')}
>
```
**Trạng thái:** ✅ OK

---

### VII. TÓM TẮT THỰC HIỆN

| Bước | Công việc | File |
|------|-----------|------|
| 1 | Thêm `type="button"` cho 4 buttons | `MobileBatchForm.tsx` |
| 2 | Thêm `type="button"` cho 5 buttons | `MobilePOForm.tsx` |
| 3 | Thêm `type="button"` cho 2 buttons | `MobileRoomFormPage.tsx` |

**Tổng cộng: 11 buttons cần sửa**

---

### VIII. KIỂM TRA SAU SỬA

Sau khi sửa, cần test:
1. **MobileBatchForm:** Quay lại/Tiếp tục giữa 3 steps
2. **MobilePOForm:** Quay lại/Tiếp tục giữa 3 steps
3. **MobileRoomFormPage:** Quay lại/Tiếp tục giữa 3 steps
4. Đảm bảo submit form chỉ xảy ra ở step cuối cùng

