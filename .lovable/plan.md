# Bổ sung 4 sub-tab thiếu vào Hub Kho

## Mục tiêu
Khôi phục đủ 15 mục của menu cũ vào hub `/inventory` bằng cách thêm 4 sub-tab tạo mới (Phương án A).

## Thay đổi

### 1. Tab "Tài sản" — thêm sub-tab
| Sub | Component | URL |
|---|---|---|
| Danh sách tài sản | `ItemsPage` (cũ) | `?tab=assets&sub=items` |
| Danh mục | `CategoriesPage` (cũ) | `?tab=assets&sub=categories` |
| **+ Thêm tài sản** | `ItemFormPage` | `?tab=assets&sub=new` |

### 2. Tab "Xuất nhập" — thêm 3 sub-tab
| Sub | Component | URL |
|---|---|---|
| Giao dịch | `TransactionListPage` (cũ) | `?tab=operations&sub=transactions` |
| **+ Nhập kho** | `InboundPage` | `?tab=operations&sub=inbound` |
| **+ Xuất kho** | `OutboundPage` | `?tab=operations&sub=outbound` |
| **+ Chuyển kho** | `TransferPage` | `?tab=operations&sub=transfer` |
| Kiểm kê | `AdjustmentListPage` (cũ) | `?tab=operations&sub=adjustments` |
| Phiếu giao | `DistributionOrdersPage` (cũ) | `?tab=operations&sub=distributions` |
| Đề xuất nhập | `ReorderSuggestionsPage` (cũ) | `?tab=operations&sub=reorder` |

→ Tab Xuất nhập có **7 sub-tab** (dài, cần horizontal scroll trên mobile — đã có sẵn).

## File thay đổi

| File | Hành động |
|---|---|
| `src/pages/inventory/InventoryDashboardPage.tsx` | Thêm 4 lazy import + 4 `<TabsTrigger>` + 4 `<TabsContent>` |
| `src/lib/app-version.ts` | Bump `1.1.6` |
| `public/changelog.json` | Thêm entry 1.1.6 |

## Cân nhắc UX

- Sub-tab "Nhập kho / Xuất kho / Chuyển kho / Thêm tài sản" mở thẳng **form tạo mới**, không phải list → user click vào sẽ thấy form ngay. Đúng hành vi menu cũ (đường dẫn `/new`).
- Sau khi submit thành công, các form này thường `navigate(-1)` hoặc về list. Trong context hub, sẽ về `/inventory` (overview) — vẫn ổn. Nếu muốn về list tương ứng, cần follow-up sau.
- Dropdown "Thao tác" header **giữ nguyên** làm shortcut nhanh từ bất kỳ tab nào.

## Rủi ro
- `ItemFormPage`/`InboundPage`/... có thể dùng `useParams()` cho `:id` (edit mode) — chỉ ảnh hưởng khi nhúng tab vì không có route param, mặc định sẽ là "tạo mới" → an toàn.
- Form có header riêng → tạm thời chấp nhận tiêu đề lặp (đã note follow-up `embedded` prop ở vòng trước).

## QA
- [ ] Click sub-tab "Nhập kho" → form mở, submit thử OK
- [ ] URL `?tab=operations&sub=inbound` reload giữ đúng tab
- [ ] Mobile portrait: 7 sub-tab Xuất nhập scroll ngang được
- [ ] Role Staff không có quyền create → form hiện thông báo (đã có guard ở route gốc, sub-tab cần kiểm tra)
