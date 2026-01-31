

## Kế hoạch: Phát triển trang /super-admin/analytics

### TÌNH TRẠNG HIỆN TẠI

| Thành phần | Trạng thái |
|------------|-----------|
| Route `/super-admin/analytics` | Đã khai báo trong Navigation, **CHƯA** có trong router |
| Page component | **CHƯA** có `AnalyticsPage.tsx` |
| Analytics components | Đã có: `TenantGrowthChart`, `RevenueChart`, `MRRChart`, `ChurnRateCard`, `PlanDistributionChart` |
| Hooks dữ liệu | Đã có: `useSuperAdminStats`, `useRevenueByMonth`, `useTenantGrowth`, `useChurnRate`, `useRevenueByPlan`, `useSubscriptionDistribution` |
| i18n | Đã có key `analytics` trong `superAdmin.json` |

---

### CẤU TRÚC TRANG ANALYTICS

```text
/super-admin/analytics
├── PageHeader (Tiêu đề + Actions)
├── Date Range Picker (7 ngày, 30 ngày, 90 ngày, custom)
├── Stat Cards Row (KPIs chính)
│   ├── MRR (Monthly Recurring Revenue)
│   ├── ARR (Annual Recurring Revenue)  
│   ├── Tăng trưởng khách hàng
│   └── Tỷ lệ churn
├── Tabs
│   ├── Tab: Doanh thu
│   │   ├── Revenue Trend Chart
│   │   ├── Revenue by Plan (Pie Chart)
│   │   └── Revenue Breakdown Table
│   ├── Tab: Khách hàng
│   │   ├── Tenant Growth Chart
│   │   ├── Status Distribution (Progress bars)
│   │   └── Churn Analysis
│   ├── Tab: Gói dịch vụ
│   │   ├── Plan Distribution Chart
│   │   └── ARPU by Plan Table
│   └── Tab: Chuyển đổi
│       ├── Trial → Paid Conversion Rate
│       └── Upgrade/Downgrade Trend
└── Export Actions (PDF, CSV)
```

---

### CHI TIẾT IMPLEMENTATION

#### Phase 1: Tạo Route và Page Component

**File 1: `src/pages/admin/AnalyticsPage.tsx`**

```typescript
import { AdvancedAnalytics } from '@/components/super-admin/analytics/AdvancedAnalytics';

export function AnalyticsPage() {
  return <AdvancedAnalytics />;
}
```

**File 2: Cập nhật `src/App.tsx`**

Thêm route vào block `/super-admin`:
```typescript
{ path: "analytics", element: <AnalyticsPage /> },
```

---

#### Phase 2: Tạo Component Analytics chính

**File 3: `src/components/super-admin/analytics/AdvancedAnalytics.tsx`**

| Section | Component/Hook |
|---------|----------------|
| Header | `PageHeader` (đã có) |
| Date Range | `DateRangePicker` - chọn khoảng thời gian |
| KPI Cards | Grid 4 StatCards với MRR, ARR, Growth, Churn |
| Revenue Tab | `RevenueChart`, `PlanDistributionChart` + table |
| Tenants Tab | `TenantGrowthChart`, `ChurnRateCard`, status bars |
| Plans Tab | Phân tích ARPU theo gói |
| Conversion Tab | Trial-to-Paid conversion metrics |

**Logic chính:**
```typescript
export function AdvancedAnalytics() {
  const { t } = useTranslation('superAdmin');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  
  // Hooks
  const { data: stats } = useSuperAdminStats();
  const { data: revenueByMonth } = useRevenueByMonth(getMonthsFromRange(dateRange));
  const { data: revenueByPlan } = useRevenueByPlan();
  const { data: tenantGrowth } = useTenantGrowth(getDaysFromRange(dateRange));
  const { data: churn } = useChurnRate(getDaysFromRange(dateRange));
  const { data: subscriptionDist } = useSubscriptionDistribution();

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.subtitle')}
        actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
      />
      
      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="MRR" value={stats?.mrr} icon={DollarSign} trend={...} />
        <StatCard title="ARR" value={stats?.mrr * 12} icon={TrendingUp} />
        <StatCard title="Tăng trưởng" value={growthRate + '%'} icon={Users} />
        <StatCard title="Churn Rate" value={churn?.churnRate + '%'} icon={TrendingDown} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="revenue">...</Tabs>
    </div>
  );
}
```

---

#### Phase 3: Tạo Components phụ trợ

**File 4: `src/components/super-admin/analytics/DateRangePicker.tsx`**

Bộ chọn khoảng thời gian dạng button group (7 ngày / 30 ngày / 90 ngày / Tùy chỉnh):

```typescript
interface DateRangePickerProps {
  value: '7d' | '30d' | '90d' | 'custom';
  onChange: (value: '7d' | '30d' | '90d' | 'custom') => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const options = [
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
    { value: '90d', label: '90 ngày' },
  ];
  
  return (
    <div className="flex gap-1 border rounded-lg p-1">
      {options.map(opt => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
```

**File 5: `src/components/super-admin/analytics/RevenueBreakdownTable.tsx`**

Bảng chi tiết doanh thu theo gói:

```typescript
export function RevenueBreakdownTable({ data }: { data: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Gói</th>
          <th className="text-right py-2">Khách hàng</th>
          <th className="text-right py-2">Doanh thu</th>
          <th className="text-right py-2">ARPU</th>
          <th className="text-right py-2">% Tổng</th>
        </tr>
      </thead>
      <tbody>
        {data.map(plan => (...))}
      </tbody>
    </table>
  );
}
```

**File 6: `src/components/super-admin/analytics/ConversionMetrics.tsx`**

Phân tích tỷ lệ chuyển đổi Trial → Paid:

```typescript
export function ConversionMetrics() {
  const { data: stats } = useSuperAdminStats();
  const conversionRate = stats?.active_tenants && stats?.trial_tenants
    ? (stats.active_tenants / (stats.active_tenants + stats.trial_tenants) * 100).toFixed(1)
    : 0;
    
  return (
    <div className="space-y-4">
      {/* Conversion funnel visualization */}
      <div className="p-3 border rounded-lg">
        <span className="text-xs text-muted-foreground">Trial → Paid</span>
        <div className="text-xl font-semibold text-green-600">{conversionRate}%</div>
      </div>
    </div>
  );
}
```

---

#### Phase 4: Cập nhật Hooks (nếu cần)

**File 7: `src/hooks/useSuperAdminStats.ts`** - Thêm hook mới

```typescript
// Thêm hook cho conversion metrics
export function useConversionMetrics(days: number = 30) {
  return useQuery({
    queryKey: ['conversion-metrics', days],
    queryFn: async () => {
      // Query tenants chuyển từ trial sang active trong khoảng thời gian
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('tenants')
        .select('subscription_status, trial_ends_at, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      // Calculate conversion metrics
      const trials = data.filter(t => t.trial_ends_at);
      const converted = data.filter(t => 
        t.trial_ends_at && 
        t.subscription_status === 'active'
      );
      
      return {
        totalTrials: trials.length,
        converted: converted.length,
        conversionRate: trials.length > 0 
          ? ((converted.length / trials.length) * 100).toFixed(2)
          : '0'
      };
    }
  });
}
```

---

#### Phase 5: Cập nhật i18n

**File 8: Cập nhật `src/i18n/locales/vi/superAdmin.json`**

Thêm keys mới vào file:

```json
{
  "analytics": {
    "title": "Thống kê & Báo cáo",
    "subtitle": "Phân tích hiệu suất nền tảng SaaS",
    "dateRange": {
      "7d": "7 ngày",
      "30d": "30 ngày",
      "90d": "90 ngày",
      "custom": "Tùy chỉnh"
    },
    "kpi": {
      "mrr": "Doanh thu định kỳ hàng tháng",
      "arr": "Doanh thu định kỳ hàng năm",
      "growth": "Tăng trưởng",
      "churnRate": "Tỷ lệ rời bỏ"
    },
    "tabs": {
      "revenue": "Doanh thu",
      "tenants": "Khách hàng",
      "plans": "Gói dịch vụ",
      "conversion": "Chuyển đổi"
    },
    "revenue": {
      "trend": "Xu hướng doanh thu",
      "byPlan": "Doanh thu theo gói",
      "breakdown": "Chi tiết doanh thu"
    },
    "tenants": {
      "growth": "Tăng trưởng khách hàng",
      "statusBreakdown": "Phân bổ trạng thái",
      "churnAnalysis": "Phân tích rời bỏ"
    },
    "plans": {
      "distribution": "Phân bổ gói dịch vụ",
      "arpuByPlan": "ARPU theo gói"
    },
    "conversion": {
      "trialToPaid": "Trial → Trả phí",
      "rate": "Tỷ lệ chuyển đổi",
      "funnel": "Phễu chuyển đổi"
    },
    "export": {
      "pdf": "Xuất PDF",
      "csv": "Xuất CSV"
    }
  }
}
```

---

### TÓM TẮT CÁC FILE CẦN TẠO/SỬA

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/pages/admin/AnalyticsPage.tsx` | **Tạo mới** | Page wrapper |
| `src/App.tsx` | **Sửa** | Thêm route analytics |
| `src/components/super-admin/analytics/AdvancedAnalytics.tsx` | **Tạo mới** | Component chính |
| `src/components/super-admin/analytics/DateRangePicker.tsx` | **Tạo mới** | Bộ chọn ngày |
| `src/components/super-admin/analytics/RevenueBreakdownTable.tsx` | **Tạo mới** | Bảng chi tiết doanh thu |
| `src/components/super-admin/analytics/ConversionMetrics.tsx` | **Tạo mới** | Metrics chuyển đổi |
| `src/hooks/useSuperAdminStats.ts` | **Sửa** | Thêm `useConversionMetrics` hook |
| `src/i18n/locales/vi/superAdmin.json` | **Sửa** | Thêm analytics keys |
| `src/i18n/locales/en/superAdmin.json` | **Sửa** | Thêm analytics keys (EN) |

---

### KẾT QUẢ MONG ĐỢI

Trang `/super-admin/analytics` hoàn chỉnh với:

| Tính năng | Mô tả |
|-----------|-------|
| KPI Dashboard | 4 stat cards: MRR, ARR, Growth Rate, Churn Rate |
| Date Range Filter | Lọc theo 7/30/90 ngày |
| Revenue Analysis | Biểu đồ xu hướng + phân tích theo gói |
| Tenant Analysis | Tăng trưởng + phân bổ trạng thái + churn |
| Plan Analysis | ARPU theo gói + distribution |
| Conversion Metrics | Trial-to-Paid conversion funnel |
| Export | PDF/CSV export |

---

### PHONG CÁCH UI (Enterprise SaaS Minimalist)

- Sử dụng `StatCard` từ shared components
- `PageHeader` đã có
- Bỏ Card shadow, dùng `border rounded-lg`
- Màu chữ semantic thay vì màu nền
- Padding compact: `p-3`, `p-4`
- Font: `text-xs` labels, `text-sm` content

