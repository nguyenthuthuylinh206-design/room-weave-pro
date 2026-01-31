

## Phân tích: Cải thiện trải nghiệm Touch/Swipe/Scroll trên Mobile

### CÁC VẤN ĐỀ PHÁT HIỆN

#### 1. Pull-to-Refresh có 2 phiên bản không nhất quán

Hiện tại có **2 component PullToRefresh** riêng biệt:
- `src/components/mobile/PullToRefresh.tsx` - Dùng hook `usePullToRefresh` với document event listeners
- `src/components/mobile/TouchOptimized.tsx` - Có một version đơn giản hơn

**Vấn đề:**
- Các page khác nhau import từ file khác nhau
- Logic không đồng nhất, gây cảm giác khác biệt giữa các trang

#### 2. usePullToRefresh gắn sự kiện vào document (global)

```typescript
// src/hooks/usePullToRefresh.ts
document.addEventListener('touchstart', handleTouchStart, { passive: true })
document.addEventListener('touchmove', handleTouchMove, { passive: false })
```

**Vấn đề:**
- Gắn vào `document` thay vì element cụ thể → can thiệp vào tất cả touch events trên trang
- Có thể xung đột với các scroll areas khác (Modal, Sheet, Dialog)
- `passive: false` trên touchmove gây latency cho scroll

#### 3. Thiếu CSS Scroll Optimization quan trọng

```css
/* Hiện tại chỉ có: */
-webkit-overflow-scrolling: touch;

/* Thiếu: */
overscroll-behavior: contain;  /* Ngăn bounce khi scroll quá đầu/cuối */
scroll-behavior: smooth;       /* Cuộn mượt */
```

#### 4. Swipe animations không dùng `will-change`

```typescript
// SwipeableCard.tsx - Dùng inline style transform
style={{
  transform: `translateX(${swipeOffset}px)`,
  transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
}}
```

**Vấn đề:**
- Thiếu `will-change: transform` → browser không tối ưu GPU acceleration
- Có thể gây jank/giật khi swipe

#### 5. Framer Motion được sử dụng nhưng không tối ưu

17 files dùng framer-motion nhưng không có cấu hình global để:
- Tắt animations khi `prefers-reduced-motion`
- Điều chỉnh cho mobile performance

#### 6. MainLayout mobile có overflow-y-auto lồng nhau

```tsx
// MainLayout.tsx
<main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
```

Kết hợp với PullToRefresh gắn vào document → có thể gây scroll conflicts.

#### 7. Scroll containers trong Dialog/Sheet chưa tối ưu touch

```tsx
// Nhiều dialogs dùng:
<DialogContent className="max-h-[90vh] overflow-y-auto">
```

Thiếu `-webkit-overflow-scrolling: touch` trực tiếp.

---

### KẾ HOẠCH CẢI THIỆN

#### Giai đoạn 1: CSS Optimizations (Ưu tiên cao)

**File: `src/index.css`**

| Thay đổi | Mục đích |
|----------|----------|
| Thêm `overscroll-behavior: contain` cho mobile | Ngăn pull-to-refresh mặc định của browser, ngăn bounce scroll |
| Thêm `scroll-behavior: smooth` | Cuộn mượt mà hơn |
| Thêm `touch-action: manipulation` mặc định | Loại bỏ delay 300ms trên tap |
| Thêm `will-change` utility classes | GPU acceleration cho animations |

```css
/* Thêm vào @layer base */
@media screen and (max-width: 768px) {
  html, body {
    overscroll-behavior: contain;
    touch-action: manipulation;
  }
  
  .scrollable-area {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }
}

.will-change-transform {
  will-change: transform;
}

/* Tối ưu cho reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Giai đoạn 2: Refactor PullToRefresh (Ưu tiên cao)

**File: `src/hooks/usePullToRefresh.ts`**

| Thay đổi | Mục đích |
|----------|----------|
| Nhận `containerRef` thay vì gắn vào document | Scope chính xác, không conflict |
| Kiểm tra element.scrollTop thay vì window.scrollY | Hoạt động đúng trong nested scroll |
| Dùng `passive: true` cho touchstart/end | Cải thiện scroll performance |

**File: `src/components/mobile/PullToRefresh.tsx`**

| Thay đổi | Mục đích |
|----------|----------|
| Hợp nhất 2 versions thành 1 | Nhất quán |
| Thêm `will-change: transform` khi pulling | Smooth animation |
| Export từ một nơi duy nhất | Tránh confusion |

#### Giai đoạn 3: Tối ưu Swipe Components

**File: `src/components/mobile/SwipeableCard.tsx`**

```typescript
// Thêm will-change khi đang swipe
style={{
  transform: `translateX(${swipeOffset}px)`,
  transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
  willChange: swipeOffset !== 0 ? 'transform' : 'auto'
}}
```

**File: `src/components/rooms/check-steps/item-type-tabs/SwipeableItemRow.tsx`**

| Thay đổi | Mục đích |
|----------|----------|
| Thêm dragElastic với giá trị thấp hơn | Cảm giác tự nhiên hơn |
| Thêm dragConstraints | Giới hạn swipe distance |

#### Giai đoạn 4: Bottom Navigation & Fixed Elements

**File: `src/components/layout/BottomNav.tsx`**

```tsx
// Đổi từ transition-all sang transition cụ thể
className="transition-colors duration-200"  // thay vì transition-all
```

**File: `src/components/layout/MobileHeader.tsx`**

```tsx
// Thêm will-change cho sticky header
className="sticky top-0 z-40 bg-background border-b shadow-sm safe-area-top will-change-transform"
```

#### Giai đoạn 5: Framer Motion Configuration

**File mới: `src/lib/motion.ts`**

```typescript
export const reducedMotionConfig = {
  reducedMotion: "user" as const
}

export const mobileOptimizedTransition = {
  type: "tween",
  duration: 0.2,
  ease: "easeOut"
}
```

Áp dụng cho các components dùng framer-motion.

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/index.css` | Thêm CSS mobile optimizations |
| `src/hooks/usePullToRefresh.ts` | Refactor để scope vào container |
| `src/components/mobile/PullToRefresh.tsx` | Hợp nhất và tối ưu |
| `src/components/mobile/TouchOptimized.tsx` | Xóa version trùng lặp |
| `src/components/mobile/SwipeableCard.tsx` | Thêm will-change |
| `src/components/layout/BottomNav.tsx` | Tối ưu transitions |
| `src/components/layout/MobileHeader.tsx` | Thêm will-change |
| `src/lib/motion.ts` (mới) | Cấu hình Framer Motion cho mobile |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Scroll giật khi chạm vào đầu/cuối | Cuộn mượt, không bounce không mong muốn |
| Pull-to-refresh xung đột với modal scroll | Hoạt động độc lập trong từng container |
| Swipe animation có thể lag | GPU-accelerated, mượt 60fps |
| Tap có delay 300ms | Phản hồi ngay lập tức |
| Fixed header/nav có thể flicker | Render ổn định với will-change |

