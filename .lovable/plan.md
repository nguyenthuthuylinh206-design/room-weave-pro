

## Chia nhóm menu Cài đặt theo chủ đề

### Hiện tại
11 mục cài đặt xếp phẳng trong 1 danh sách dài, khó phân biệt.

### Đề xuất nhóm

```text
📋 Cài đặt
├─ HỆ THỐNG
│  ├ Cài đặt chung
│  └ Khách sạn
├─ TÀI KHOẢN
│  ├ Người dùng & Phân quyền
│  └ Đổi mật khẩu
├─ THANH TOÁN
│  ├ Đăng ký & Thanh toán
│  └ Mức sử dụng
├─ THÔNG BÁO
│  ├ Thông báo
│  └ Telegram
└─ NGHIỆP VỤ
   ├ Cấu hình nghiệp vụ
   ├ Phụ thu & Thuế phí
   └ Tự động hóa
```

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/Sidebar.tsx` | Thêm property `group` vào `NavItem` interface. Gán group cho từng child của settings. Render group label (text nhỏ, uppercase, muted) khi group thay đổi giữa các children |

### Chi tiết kỹ thuật

**NavItem interface** — thêm `group?: string`:
```typescript
interface NavItem {
  // ...existing
  group?: string
  children?: Omit<NavItem, 'children'>[]
}
```

**Settings children** — gán group:
```typescript
children: [
  { titleKey: 'generalSettings', ..., group: 'Hệ thống' },
  { titleKey: 'hotels', ..., group: 'Hệ thống' },
  { titleKey: 'usersPermissions', ..., group: 'Tài khoản' },
  { titleKey: 'changePassword', ..., group: 'Tài khoản' },
  { titleKey: 'subscription', ..., group: 'Thanh toán' },
  { titleKey: 'usage', ..., group: 'Thanh toán' },
  { titleKey: 'notifications', ..., group: 'Thông báo' },
  { titleKey: 'telegram', ..., group: 'Thông báo' },
  { titleKey: 'businessConfig', ..., group: 'Nghiệp vụ' },
  { titleKey: 'pricingRules', ..., group: 'Nghiệp vụ' },
  { titleKey: 'automation', ..., group: 'Nghiệp vụ' },
]
```

**Render logic** — trong vòng lặp `item.children!.map()`, track `lastGroup` và render divider + label khi group thay đổi:
```tsx
{(() => {
  let lastGroup = ''
  return item.children!.map((child) => {
    const showGroup = child.group && child.group !== lastGroup
    if (child.group) lastGroup = child.group
    return (
      <Fragment key={child.titleKey}>
        {showGroup && (
          <div className="pt-2 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {child.group}
            </span>
          </div>
        )}
        <Link ...>{/* existing child link */}</Link>
      </Fragment>
    )
  })
})()}
```

Chỉ sửa 1 file `Sidebar.tsx`, không ảnh hưởng logic navigation hay routing.

