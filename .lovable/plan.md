

## Phương án Hoàn Hảo: Tái thiết kế Quy trình Phiếu Giao Hàng

### I. PHÂN TÍCH HIỆN TRẠNG CHI TIẾT

#### 1.1. Sơ đồ Flow Hiện Tại (5+ Bước, Nhiều Điểm Rời Rạc)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FLOW HIỆN TẠI (PHỨC TẠP)                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────┐                                    ┌──────────────────────────────┐
        │ SUPPLEMENT       │                                    │ DISTRIBUTION                 │
        │ /supplements     │          RỜI RẠC                  │ /inventory/distributions     │
        ├──────────────────┤◀──────────(Không có link)─────────▶├──────────────────────────────┤
        │ Yêu cầu bổ sung  │                                    │ Phiếu giao hàng              │
        │ từ Room Check    │                                    │                              │
        └────────┬─────────┘                                    └──────────────────────────────┘
                 │                                                          │
                 │                                                          │
                 ▼                                                          ▼
        ┌──────────────────┐                                    ┌──────────────────────────────┐
        │ Sheet chi tiết   │                                    │ CreateDistributionPage       │
        │ (Modal)          │                                    │ Form thủ công                │
        ├──────────────────┤                                    ├──────────────────────────────┤
        │ • Duyệt → Tạo    │──────────(Chuyển trang)──────────▶│ • Chọn phòng                 │
        │   Distribution   │                                    │ • Expand từng phòng          │
        │   Order          │                                    │ • Thêm SP thủ công           │
        └──────────────────┘                                    │ • Chọn nhân viên             │
                                                                └──────────────────────────────┘
                                                                            │
                                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              GIAO DIỆN CHI TIẾT PHIẾU (PHỨC TẠP)                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Tabs: "Lộ trình giao hàng" │ "Xem chi tiết (Quản lý)"                                    │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                                       │
│                                         ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ RouteDetailView                                                                           │  │
│  │ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ 4 Cards: Tầng │ Ngày │ Nhân viên │ Tiến độ                                           │ │  │
│  │ └──────────────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                           │  │
│  │ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ BatchAccordion                                                                        │ │  │
│  │ │   ┌────────────────────────────────────────────────────────────────────────────────┐ │ │  │
│  │ │   │ Batch 1 [open] [5 phòng] [2 đã giao]         [Collapsed/Expanded]              │ │ │  │
│  │ │   │   ├── StopCard: P.301 [pending] [Giao] [Không vào được]                        │ │ │  │
│  │ │   │   ├── StopCard: P.302 [delivered] ✓                                            │ │ │  │
│  │ │   │   └── StopCard: P.303 [cannot_access] [Thử lại] [Trả kho] [Bàn giao]           │ │ │  │
│  │ │   └────────────────────────────────────────────────────────────────────────────────┘ │ │  │
│  │ └──────────────────────────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 1.2. Bảng Đánh Giá Vấn Đề

| # | Vấn Đề | Nguyên Nhân Gốc | Ảnh Hưởng | Mức Nghiêm Trọng |
|---|--------|-----------------|-----------|------------------|
| **1** | **Entry point rời rạc** | Supplements và Distributions là 2 module riêng biệt, không có quick access giữa chúng | Manager phải nhớ có yêu cầu chờ, đi qua 2 trang | **Rất cao** |
| **2** | **Batch/Stop concept khó hiểu** | Thiết kế cho enterprise logistics, không phù hợp hotel housekeeping | Nhân viên không hiểu "Batch", "Stop", phải training | **Cao** |
| **3** | **Quá nhiều handshake steps** | Manager tạo → Kho giao batch → NV nhận → NV giao từng phòng | 4+ clicks chỉ để bắt đầu giao 1 phòng | **Cao** |
| **4** | **Tab "Xem chi tiết (Quản lý)" dư thừa** | Legacy view song song với Route view | Gây nhầm lẫn, không biết dùng tab nào | **Trung bình** |
| **5** | **Nút action nhỏ, nhiều loại** | StopCard có 5+ nút: Giao, Không vào được, Thử lại, Trả kho, Bàn giao | Khó bấm trên mobile, dễ nhầm | **Trung bình** |
| **6** | **Thiếu guidance rõ ràng** | Chỉ có banner text đơn giản | Nhân viên mới không biết làm gì tiếp | **Trung bình** |
| **7** | **Không có fast-track cho urgent cases** | Mọi phiếu đều phải qua full flow | Trường hợp gấp vẫn phải chờ kho approve | **Cao** |

---

### II. PHƯƠNG ÁN HOÀN HẢO: UNIFIED DELIVERY EXPERIENCE

#### 2.1. Nguyên tắc thiết kế

| # | Nguyên tắc | Áp dụng |
|---|------------|---------|
| 1 | **One Source of Truth** | Yêu cầu bổ sung là nguồn chính tạo phiếu giao, có thể truy cập từ mọi nơi |
| 2 | **Role-based View** | Manager thấy BatchAccordion, Staff thấy Flat List đơn giản |
| 3 | **Progressive Disclosure** | Ẩn complexity, chỉ hiển thị action cần thiết cho bước hiện tại |
| 4 | **Smart Defaults** | Auto-release khi tạo từ Supplement (đã được kiểm tra), skip kho nếu cấu hình |
| 5 | **Mobile-first Actions** | Nút lớn h-12, swipe gesture (phase 2), haptic feedback |

#### 2.2. Sơ đồ Flow Mới (Đơn giản hóa)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLOW MỚI: UNIFIED DELIVERY EXPERIENCE                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────────────────────────┐
                          │         NGUỒN YÊU CẦU (SOURCES)         │
                          └─────────────────────────────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              ▼                             ▼                             ▼
    ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
    │ ROOM CHECK       │         │ SUPPLEMENTS      │         │ THỦ CÔNG         │
    │ Phase 2 (Lost,   │         │ Pending requests │         │ Manager tự tạo   │
    │ Damaged,Consumed)│         │ cần xử lý        │         │                  │
    └────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
             │                            │                            │
             │ Tự động tạo               │ Quick Create               │ Form thủ công
             │ supplement_request         │                            │
             ▼                            ▼                            ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                     UNIFIED DISTRIBUTION DASHBOARD                           │
    │                     /inventory/distributions                                 │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ PENDING SUPPLEMENTS BANNER (Collapsible)                              │ │
    │  │ ┌─────────────────────────────────────────────────────────────────┐   │ │
    │  │ │ ⚠️ 5 yêu cầu bổ sung đang chờ                    [XỬ LÝ NGAY]  │   │ │
    │  │ │    SUP-001 P.301 (3 SP) • SUP-002 P.405 (2 SP) • ...           │   │ │
    │  │ └─────────────────────────────────────────────────────────────────┘   │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    │                                                                             │
    │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
    │  │ [+ Tạo phiếu]   │ │ In progress: 3  │ │ Hoàn thành: 12  │               │
    │  │    Dropdown     │ │                 │ │                 │               │
    │  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ DANH SÁCH PHIẾU (Table/Cards)                                         │ │
    │  │ ...                                                                   │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                     DISTRIBUTION ORDER DETAIL (Role-based)                   │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ NEXT STEP WIZARD (Context-aware)                                      │ │
    │  │ ╔═════════════════════════════════════════════════════════════════╗   │ │
    │  │ ║ Bước 2 của 3: Xác nhận nhận hàng                                ║   │ │
    │  │ ║ ═══════════════════════════■■■■■■■■■■■░░░░░░░░░░░░░░░░░░░░░░░░ ║   │ │
    │  │ ║                                                                 ║   │ │
    │  │ ║ Bạn đã nhận đủ hàng từ kho? Hãy xác nhận để bắt đầu giao.      ║   │ │
    │  │ ║                                                                 ║   │ │
    │  │ ║         [ XÁC NHẬN ĐÃ NHẬN ĐỦ HÀNG ] (h-14 button)             ║   │ │
    │  │ ╚═════════════════════════════════════════════════════════════════╝   │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ VIEW TOGGLE: [Batch View] [Staff View (Flat)]                         │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ IF Staff View (Flat List - Mobile Optimized)                          │ │
    │  │ ┌─────────────────────────────────────────────────────────────────┐   │ │
    │  │ │ P.301  │  Khăn tắm x2, Dầu gội x1  │  [    GIAO    ] (h-12)    │   │ │
    │  │ ├─────────────────────────────────────────────────────────────────┤   │ │
    │  │ │ P.302  │  Ga giường x1             │  [    GIAO    ] (h-12)    │   │ │
    │  │ ├─────────────────────────────────────────────────────────────────┤   │ │
    │  │ │ P.303  │  Gối x2                   │  ✓ Đã giao                 │   │ │
    │  │ └─────────────────────────────────────────────────────────────────┘   │ │
    │  │                                                                       │ │
    │  │ Tiến độ: ████████████░░░░░░░░░░░░░░░░░ 40% (2/5 phòng)               │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    │                                                                             │
    │  ┌───────────────────────────────────────────────────────────────────────┐ │
    │  │ IF Batch View (Manager/Advanced)                                       │ │
    │  │ BatchAccordion (giữ nguyên nhưng optimize)                            │ │
    │  └───────────────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

### III. CHI TIẾT TRIỂN KHAI

#### 3.1. Module 1: Unified Entry Point - Pending Supplements Integration

**Mục tiêu:** Merge Supplements vào Distribution workflow

**Thay đổi:**

| File | Thay đổi |
|------|----------|
| `DistributionOrdersPage.tsx` | Thêm Pending Supplements Banner collapsible ở đầu trang |
| `DistributionOrdersPage.tsx` | Dropdown "Tạo phiếu" với options: Từ yêu cầu bổ sung, Thủ công |
| `usePendingSupplementCount.ts` | Đã có sẵn, reuse |

**Component mới: `PendingSupplementsBanner.tsx`**

```text
Khi pending count > 0:
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ 5 yêu cầu bổ sung đang chờ xử lý                           [Xử lý ngay] │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Expandable)                                                                │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │ SUP-001 │ │ SUP-002 │ │ SUP-003 │ │ SUP-004 │ │ SUP-005 │                │
│ │ P.301   │ │ P.405   │ │ P.202   │ │ P.301   │ │ P.108   │                │
│ │ 3 SP    │ │ 2 SP    │ │ 5 SP    │ │ 1 SP    │ │ 4 SP    │                │
│ │ [Chọn]  │ │ [Chọn]  │ │ [Chọn]  │ │ [Chọn]  │ │ [Chọn]  │                │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│                                                                             │
│              [ Tạo phiếu từ X yêu cầu đã chọn ]                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2. Module 2: Bulk Create từ Supplements

**Mục tiêu:** Cho phép chọn nhiều yêu cầu và tạo phiếu hàng loạt

**Trang mới: `CreateFromSupplementsPage.tsx`**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tạo phiếu giao từ yêu cầu bổ sung                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ [x] Chọn tất cả                                         5/10 đã chọn  │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ [x] SUP-001 │ P.301 │ Mất │ Khăn tắm x2, Dầu gội x1  │ 150.000đ      │   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │ [x] SUP-002 │ P.405 │ Hỏng│ Ga giường x1              │ 80.000đ       │   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │ [ ] SUP-003 │ P.202 │ Mất │ Remote TV x1, Ổ cắm x2    │ 250.000đ      │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Tùy chọn tạo phiếu                                                    │   │
│ │                                                                       │   │
│ │ Gộp thành 1 phiếu:  [x] Có  [ ] Không (tạo riêng từng phiếu)         │   │
│ │                                                                       │   │
│ │ Gán cho nhân viên:  [Nguyễn Văn A             ▼]                      │   │
│ │                                                                       │   │
│ │ Auto-release:       [x] Giao ngay cho nhân viên (bỏ qua bước kho)    │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Tóm tắt:                                                              │   │
│ │ • 2 yêu cầu đã chọn                                                   │   │
│ │ • 2 phòng                                                             │   │
│ │ • 4 sản phẩm                                                          │   │
│ │ • Tổng giá trị: 230.000đ                                              │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ [Hủy]                                    [TẠO PHIẾU GIAO HÀNG]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tính năng chính:**
- Multi-select supplements
- Option: Gộp thành 1 phiếu hoặc tạo riêng
- Auto-release: Skip bước kho approve (vì item đã được kiểm tra từ Room Check)
- Assign nhân viên ngay

#### 3.3. Module 3: Role-based Detail View

**Mục tiêu:** Đơn giản hóa UI cho nhân viên giao hàng

**Thay đổi `RouteDetailView.tsx`:**

```typescript
// State
const [viewMode, setViewMode] = useState<'batch' | 'staff'>('batch')

// Auto-switch to staff view for assignees who are not managers
useEffect(() => {
  if (isAssignee && !isStorekeeper && !isLeader) {
    setViewMode('staff')
  }
}, [isAssignee, isStorekeeper, isLeader])
```

**Component mới: `StaffDeliveryView.tsx`**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STAFF DELIVERY VIEW (FLAT)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Tiến độ: ██████████░░░░░░░░░░░░░░░░ 40% (2/5 phòng)                   │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ P.301  Tầng 3                                                         │   │
│ │ ├── Khăn tắm x2                                                       │   │
│ │ └── Dầu gội x1                                                        │   │
│ │                                              ┌────────────────────┐   │   │
│ │                                              │     ĐÃ GIAO ✓      │   │   │
│ │                                              └────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ P.302  Tầng 3                                                         │   │
│ │ ├── Ga giường x1                                                      │   │
│ │                                              ┌────────────────────┐   │   │
│ │                                              │       GIAO         │   │   │
│ │                                              └────────────────────┘   │   │
│ │                              ┌─────────────────────────────────────┐  │   │
│ │                              │ [Không vào được ▼] (secondary)      │  │   │
│ │                              └─────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ P.303  Tầng 3                                                         │   │
│ │ ├── Gối x2                                                            │   │
│ │ └── Mền x1                                                            │   │
│ │                              ┌────────────────────────────────────┐   │   │
│ │  ⚠️ Không vào được: DND     │ [Thử lại] [Trả kho] [Bàn giao ca sau]│   │   │
│ │                              └────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Đặc điểm:**
- Flat list, không có Batch concept
- Nút "GIAO" lớn (h-12), full-width trên mobile
- "Không vào được" là dropdown nhỏ hơn, secondary
- Hiển thị item inline, không cần expand
- Progress bar sticky ở đầu

#### 3.4. Module 4: Next Step Wizard

**Mục tiêu:** Hướng dẫn từng bước rõ ràng

**Component mới: `DeliveryStepWizard.tsx`**

```text
Các bước và điều kiện:

MANAGER FLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Bước 1: Chuẩn bị hàng (status: pending)                                     │
│ ════════════════════════════════════════════════════════════════════════    │
│                                                                             │
│ Lấy hàng theo danh sách bên dưới, sau đó ấn "Giao batch" để chuyển         │
│ cho nhân viên {assigned_to_name}                                            │
│                                                                             │
│ [GIAO BATCH CHO NHÂN VIÊN] (Primary, h-12)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

STAFF FLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Bước 2: Xác nhận nhận hàng (status: released)                               │
│ ═══════════════■■■■■■■■■■■■■■■■░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                             │
│ Bạn đã nhận đủ hàng từ kho? Kiểm tra và xác nhận để bắt đầu giao.          │
│                                                                             │
│ [XÁC NHẬN ĐÃ NHẬN ĐỦ HÀNG] (Primary, h-14)                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Bước 3: Giao hàng đến phòng (status: in_progress)                           │
│ ═══════════════════════════════■■■■■■■■■■■■■■■■■■■■░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                             │
│ Còn 3 phòng cần giao. Đến từng phòng và ấn "Giao" để xác nhận.             │
│                                                                             │
│ Tiến độ: 2/5 phòng (40%)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✓ Hoàn thành (status: completed)                                            │
│ ════════════════════════════════════════════════════════════════════════    │
│                                                                             │
│ Đã giao xong 5/5 phòng. Phiếu sẽ được đóng tự động.                        │
│                                                                             │
│ [ĐÓNG PHIẾU] (nếu cần manual close)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.5. Module 5: Auto-Release Option

**Mục tiêu:** Bỏ qua bước kho approve khi không cần thiết

**Thay đổi:**

| Nơi | Thay đổi |
|-----|----------|
| `CreateDistributionPage.tsx` | Thêm checkbox "Giao ngay cho nhân viên (bỏ qua bước kho)" |
| `CreateFromSupplementsPage.tsx` | Mặc định checked = true (vì từ Supplement đã kiểm tra) |
| `create_distribution_order` RPC | Thêm param `p_auto_release BOOLEAN DEFAULT FALSE` |
| RPC Logic | Nếu auto_release = true → Set status = 'released' thay vì 'pending' |

**Khi nào bật auto-release:**
- Tạo từ Supplement Request (đã verify từ Room Check)
- Khách sạn nhỏ không có bộ phận kho riêng
- Trường hợp gấp (optional toggle)

#### 3.6. Module 6: Mobile Optimizations

**Mục tiêu:** UX tối ưu cho thiết bị cầm tay

**Thay đổi `StopCard.tsx`:**

```typescript
// Bigger buttons for mobile
<Button
  onClick={handleDeliver}
  disabled={deliverStop.isPending}
  className={cn(
    "gap-2",
    isMobile ? "w-full h-12 text-base font-semibold" : "h-9"
  )}
>
  <CheckCircle className="h-5 w-5" />
  {isMobile ? 'XÁC NHẬN GIAO' : 'Giao'}
</Button>

// Secondary actions as dropdown
{isMobile && canMarkCannotAccess && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="w-full mt-2">
        Không vào được...
        <ChevronDown className="h-4 w-4 ml-auto" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => handleCannotAccess('guest_inside')}>
        Khách trong phòng
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCannotAccess('dnd')}>
        Do Not Disturb
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCannotAccess('locked')}>
        Phòng khóa
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setShowCannotAccessDialog(true)}>
        Lý do khác...
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

#### 3.7. Module 7: Cleanup - Remove Legacy Tab

**Mục tiêu:** Loại bỏ UI dư thừa

**Thay đổi `DistributionOrderDetailPage.tsx`:**

- Xóa Tab "Xem chi tiết (Quản lý)"
- RouteDetailView với toggle Batch/Staff là đủ
- Manager vẫn có thể xem Batch view qua toggle

---

### IV. KẾ HOẠCH TRIỂN KHAI (2 PHASES)

#### Phase 1: Core Improvements (Ưu tiên cao - Tuần 1)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 1.1 | Pending Supplements Banner | `DistributionOrdersPage.tsx`, `PendingSupplementsBanner.tsx` (new) | 2h | Cao |
| 1.2 | Quick Create Dropdown | `DistributionOrdersPage.tsx` | 1h | Cao |
| 1.3 | Staff View (Flat List) | `StaffDeliveryView.tsx` (new), `RouteDetailView.tsx` | 3h | Rất cao |
| 1.4 | View Toggle | `RouteDetailView.tsx` | 30m | Cao |
| 1.5 | Next Step Wizard | `DeliveryStepWizard.tsx` (new), `DistributionOrderDetailPage.tsx` | 2h | Cao |
| 1.6 | Mobile Action Buttons | `StopCard.tsx`, `StaffDeliveryView.tsx` | 1h | Trung bình |
| 1.7 | Remove Legacy Tab | `DistributionOrderDetailPage.tsx` | 30m | Thấp |

**Tổng Phase 1: ~10 giờ**

#### Phase 2: Advanced Features (Tuần 2)

| # | Task | File(s) | Effort | Impact |
|---|------|---------|--------|--------|
| 2.1 | Bulk Create từ Supplements | `CreateFromSupplementsPage.tsx` (new), Router | 3h | Cao |
| 2.2 | Auto-Release Option | RPC update, `CreateDistributionPage.tsx` | 2h | Trung bình |
| 2.3 | Cannot Access Dropdown (Mobile) | `StopCard.tsx` | 1h | Trung bình |
| 2.4 | Deep Link từ Room Check | `RoomCheckPage.tsx` → Supplements → Distribution | 1h | Trung bình |
| 2.5 | Realtime Progress Updates | `useRouteDetail.ts`, Supabase Realtime | 1h | Thấp |

**Tổng Phase 2: ~8 giờ**

---

### V. DATABASE CHANGES (NẾU CẦN)

#### 5.1. Update RPC `create_distribution_order`

```sql
-- Add auto_release parameter
CREATE OR REPLACE FUNCTION create_distribution_order(
  p_tenant_id UUID,
  p_hotel_id UUID,
  p_created_by UUID,
  p_assigned_to UUID DEFAULT NULL,
  p_rooms JSONB,
  p_notes TEXT DEFAULT NULL,
  p_auto_release BOOLEAN DEFAULT FALSE  -- NEW
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_initial_status TEXT;
BEGIN
  -- Determine initial status
  IF p_auto_release AND p_assigned_to IS NOT NULL THEN
    v_initial_status := 'released';
  ELSE
    v_initial_status := 'pending';
  END IF;
  
  -- ... rest of function
  -- Use v_initial_status instead of hardcoded 'pending'
END;
$$ LANGUAGE plpgsql;
```

#### 5.2. Không cần schema change mới

Tất cả fields đã có sẵn trong tables hiện tại.

---

### VI. TỔNG KẾT

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Entry point** | 2 trang riêng biệt | 1 trang unified với banner |
| **Số click tạo từ Supplement** | 5-7 clicks | 2-3 clicks |
| **UI cho nhân viên** | Batch/Stop phức tạp | Flat list đơn giản |
| **Hướng dẫn** | Text banner | Step Wizard với progress |
| **Mobile UX** | Nút nhỏ | Nút h-12 full-width |
| **Bỏ qua kho** | Không thể | Auto-release option |
| **Legacy UI** | 2 tabs song song | 1 view với toggle |

**Tổng effort: ~18 giờ (Phase 1 + Phase 2)**

Phương án này không phải quick fix mà là redesign hoàn chỉnh, tập trung vào trải nghiệm người dùng từ Manager đến Staff, từ Desktop đến Mobile.

