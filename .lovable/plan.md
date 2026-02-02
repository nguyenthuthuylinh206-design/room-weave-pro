

## Kế hoạch: Thêm ShiftStatusBanner cho Desktop

### VẤN ĐỀ HIỆN TẠI

`ShiftStatusBanner` chỉ được thêm vào mobile layout (dòng 27 trong `MainLayout.tsx`). Desktop layout (dòng 39-54) **không có** banner này.

Nhân viên dùng desktop phải quay về Dashboard mới có thể vào/kết thúc ca.

---

### GIẢI PHÁP

Thêm `ShiftStatusBanner` vào desktop layout, ngay dưới `Header` và trên nội dung chính.

**Layout sau khi sửa:**

```text
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  [Header - Hotel selector, notifications...]  │
│            ├────────────────────────────────────────────────┤
│            │  🕐 Bạn chưa vào ca │ [Vào ca ngay]  ← Banner  │
│            ├────────────────────────────────────────────────┤
│            │                                                │
│            │           [Page Content - Outlet]              │
│            │                                                │
└─────────────────────────────────────────────────────────────┘
```

---

### CHI TIẾT IMPLEMENTATION

**Sửa file: `src/components/layout/MainLayout.tsx`**

```typescript
// Desktop layout (dòng 39-54)
return (
  <div className="min-h-screen flex bg-background">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header onMenuClick={() => {}} />
      
      {/* Thêm ShiftStatusBanner cho desktop */}
      {isStaffUser && <ShiftStatusBanner />}
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <QuotaWarningBanner />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  </div>
)
```

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/layout/MainLayout.tsx` | Thêm `ShiftStatusBanner` vào desktop layout |

---

### KẾT QUẢ MONG ĐỢI

| Platform | Chưa vào ca | Đã vào ca |
|----------|-------------|-----------|
| Mobile | Banner vàng + nút "Vào ca" | Banner xanh + nút "Kết thúc ca" |
| Desktop | Banner vàng + nút "Vào ca" | Banner xanh + nút "Kết thúc ca" |

Nhân viên có thể vào/kết thúc ca từ **bất kỳ trang nào** trên cả mobile và desktop.

