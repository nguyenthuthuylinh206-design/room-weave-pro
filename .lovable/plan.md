
# Báo cáo Phân tích Trang Báo cáo - Đánh giá & Gợi ý

## TỔNG QUAN

Hệ thống báo cáo hiện có **12 trang báo cáo** với nhiều vấn đề từ lỗi backend nghiêm trọng đến thiếu tính nhất quán về UI/UX.

---

## VẤN ĐỀ NGHIÊM TRỌNG (CRITICAL)

### 1. Lỗi Database Function - Báo cáo Giặt là KHÔNG HOẠT ĐỘNG

| Mức độ | Vấn đề | File liên quan |
|--------|--------|----------------|
| **CRITICAL** | Hàm `get_laundry_report` bị lỗi SQL | Database function |

**Chi tiết lỗi từ logs:**
```
Error: aggregate function calls cannot be nested
Status: 400
```

**Nguyên nhân:** Hàm SQL có cú pháp sai - đang lồng các hàm aggregate (như `SUM(COUNT(...))`) không hợp lệ trong PostgreSQL.

**Hậu quả:** Trang `/reports/laundry` hiển thị thông báo lỗi, không có dữ liệu.

**Khuyến nghị:** Cần sửa lại database function `get_laundry_report` ngay lập tức.

---

## VẤN ĐỀ CHỨC NĂNG (FUNCTIONAL)

### 2. Components Placeholder - Không có backend thực sự

| Component | File | Vấn đề |
|-----------|------|--------|
| `FavoriteReports` | `src/components/reports/FavoriteReports.tsx` | Dữ liệu mock cứng, không lưu vào DB |
| `ScheduledReports` | `src/components/reports/ScheduledReports.tsx` | Dữ liệu mock, không có logic email |

```typescript
// FavoriteReports.tsx - Line 23
const [favorites] = useState<FavoriteReport[]>([
  { id: '1', name: 'Báo cáo tồn kho cuối ngày', ... }, // MOCK DATA
])
// TODO: Load from user preferences - CHƯA IMPLEMENT
```

```typescript
// ScheduledReports.tsx - Line 24
const [schedules, setSchedules] = useState<ScheduledReport[]>([
  { id: '1', name: 'Tồn kho cuối ngày', ... }, // MOCK DATA
])
// Toggle chỉ thay đổi state local, không persist
```

**Đánh giá:** 
- Nút "Lên lịch email" trong các báo cáo không hoạt động
- Chức năng yêu thích không lưu được

**Khuyến nghị:** 
- Tạo bảng `report_favorites` và `report_schedules` trong DB
- Hoặc loại bỏ hoàn toàn các components này để tránh gây nhầm lẫn

---

### 3. Dữ liệu Mock trong Operations Report

| File | Vấn đề |
|------|--------|
| `OperationsReportPage.tsx` | Dữ liệu `transactionTrend`, `topMovingItems`, `stocktakeResults`, `efficiencyMetrics` đều là MOCK |

```typescript
// Lines 62-88 - Tất cả là dữ liệu giả
const transactionTrend = [
  { month: 'T10', inbound: 45, outbound: 38, adjustment: 5 },
  { month: 'T11', inbound: 52, outbound: 48, adjustment: 8 },
  ...
]

const topMovingItems = [
  { name: 'Khăn tắm lớn', code: 'KTL-001', inbound: 200, ... },
  ...
]
```

**Đánh giá:** Trang hiển thị dữ liệu **KHÔNG THỰC** - gây hiểu nhầm cho người dùng.

**Khuyến nghị:** Lấy dữ liệu từ `transaction_summary` trong `useInventoryReport` hoặc tạo RPC mới.

---

### 4. Dữ liệu Mock trong Maintenance Report

| File | Vấn đề |
|------|--------|
| `MaintenanceReportPage.tsx` | `costByType`, `monthlyTrend`, `recurringIssues` đều là MOCK |

```typescript
// Lines 73-93 - Dữ liệu giả
const costByType = [
  { type: 'Điện', cost: 2500000, percentage: 35 },
  { type: 'Nước', cost: 1800000, percentage: 25 },
  ...
]
```

**Đánh giá:** Chỉ có `stats` từ hook thực, còn lại đều giả.

---

### 5. Financial Report - Dữ liệu Budget giả

| File | Vấn đề |
|------|--------|
| `FinancialReportPage.tsx` | Phần "Ngân sách vs Thực tế" và "KPIs" đều hardcode |

```typescript
// Lines 299-350 - Budget hardcode
<span className="text-sm text-muted-foreground">
  {formatCurrency(summary.purchase_cost)} / 20M  // HARDCODED "20M"
</span>
<Badge variant="default" className="bg-green-100 text-green-800">
  90%  // HARDCODED
</Badge>
```

**Khuyến nghị:** Cần tạo bảng `budget_settings` hoặc loại bỏ phần này.

---

## VẤN ĐỀ UI/UX

### 6. Thiếu nhất quán về Export

| Trang | PDF | Excel | Email Schedule |
|-------|-----|-------|----------------|
| Inventory | ✅ | ✅ | ❌ (Nút có nhưng không hoạt động) |
| Laundry | ❌ | ❌ | ❌ |
| Financial | ✅ | ✅ | ❌ |
| Rooms | ✅ | ✅ | ❌ |
| Operations | ❌ (Có nút nhưng disabled) | ❌ | ❌ |
| Maintenance | ❌ (Có nút nhưng disabled) | ❌ | ❌ |
| Revenue | ✅ | ❌ | ❌ |
| Damages | ✅ | ❌ | ❌ |
| Outbound | ❌ | ❌ | ❌ |
| StockAudit | ✅ | ✅ | ❌ |

**Đánh giá:** Chức năng export không đồng nhất giữa các trang.

---

### 7. Thiếu nhất quán về Layout

| Trang | Card Style | Border Style | Header Position |
|-------|------------|--------------|-----------------|
| Inventory | `<Card>` | - | PageHeader |
| Operations | `border rounded-lg` | ✅ | Inline Header |
| Maintenance | `<Card>` | - | PageHeader |
| Laundry | `border rounded-lg` | ✅ | PageHeader |

**Khuyến nghị:** Cần thống nhất theo Design System - dùng `border rounded-lg` thay vì `<Card>`.

---

### 8. Mobile Support không đồng đều

| Trang | Có Mobile Component riêng |
|-------|---------------------------|
| Inventory | ✅ MobileInventoryReportPage |
| Laundry | ✅ MobileLaundryReportPage |
| Financial | ✅ MobileFinancialReportPage |
| Rooms | ✅ MobileRoomsReportPage |
| Operations | ✅ MobileOperationsReportPage |
| Maintenance | ✅ MobileMaintenanceReportPage |
| **Revenue** | **❌ Không có** |
| Damages | ✅ MobileDamagesReportPage |
| Outbound | Inline (trong cùng file) |
| StockAudit | ✅ MobileStockAuditReportPage |

---

## VẤN ĐỀ NAVIGATION

### 9. Thiếu báo cáo trong Dashboard

Dashboard báo cáo (`ReportsDashboardPage.tsx`) chỉ liệt kê **6 loại báo cáo**:
- Inventory
- Financial
- Operations
- Laundry
- Rooms
- Maintenance

**Thiếu:**
- Revenue Report
- Damages Report
- Outbound Report
- Stock Audit Report

---

## ĐÁNH GIÁ TỔNG THỂ

| Tiêu chí | Điểm (1-10) | Nhận xét |
|----------|-------------|----------|
| **Hoạt động (Functionality)** | 4/10 | 1 báo cáo bị lỗi hoàn toàn, nhiều dữ liệu mock |
| **Độ tin cậy dữ liệu** | 5/10 | Một số trang hiển thị dữ liệu giả |
| **Tính nhất quán UI** | 6/10 | Khác biệt về Card style, Header |
| **Export features** | 5/10 | Không đồng nhất giữa các trang |
| **Mobile support** | 8/10 | Đa số có component mobile riêng |
| **Navigation** | 6/10 | Thiếu 4 báo cáo trong dashboard |

---

## KHUYẾN NGHỊ HÀNH ĐỘNG

### Ưu tiên 1: Sửa lỗi nghiêm trọng
1. **Sửa hàm `get_laundry_report`** - Loại bỏ nested aggregate functions

### Ưu tiên 2: Loại bỏ/Sửa dữ liệu mock
2. **OperationsReportPage** - Thay mock data bằng dữ liệu thực từ transaction_summary
3. **MaintenanceReportPage** - Tạo RPC hoặc query thực cho cost/trend
4. **FinancialReportPage** - Loại bỏ phần Budget vs Actual nếu không có dữ liệu

### Ưu tiên 3: Cải thiện UX
5. **FavoriteReports & ScheduledReports** - Implement backend hoặc loại bỏ
6. **ReportsDashboardPage** - Thêm 4 báo cáo còn thiếu vào navigation
7. **Export** - Thống nhất tất cả trang đều có PDF + Excel
8. **RevenueReportPage** - Tạo mobile component

### Ưu tiên 4: Chuẩn hóa Design
9. **Thống nhất** dùng `border rounded-lg` thay vì `<Card>` theo Design System
10. **Chuẩn hóa** header layout và button positions

---

## SƠ ĐỒ TRẠNG THÁI HIỆN TẠI

```text
┌─────────────────────────────────────────────────────────────┐
│                    REPORTS DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Inventory   │ │ Financial   │ │ Operations  │            │
│ │     ✅      │ │   ⚠️ Mock   │ │   ⚠️ Mock   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │  Laundry    │ │   Rooms     │ │ Maintenance │            │
│ │     ❌      │ │     ✅      │ │   ⚠️ Mock   │            │
│ │   ERROR     │ │             │ │             │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ ⚠️ HIDDEN FROM DASHBOARD:                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│ │  Revenue    │ │  Damages    │ │  Outbound   │ │ Stock  │ │
│ │     ✅      │ │     ✅      │ │     ✅      │ │ Audit  │ │
│ │ (No Mobile) │ │             │ │             │ │   ✅   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘

Legend: ✅ = OK  |  ⚠️ = Warning  |  ❌ = Error
```
