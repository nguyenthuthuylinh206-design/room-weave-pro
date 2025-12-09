import { useNavigate } from 'react-router-dom'
import { Plus, Wind, DollarSign, Package, Star } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/ui/stat-card'
import { LaundryExpenseChart } from '@/components/laundry/LaundryExpenseChart'
import { ActiveBatchesTable } from '@/components/laundry/ActiveBatchesTable'
import { VendorPerformanceTable } from '@/components/laundry/VendorPerformanceTable'
import { MobileLaundryDashboard } from '@/components/laundry/MobileLaundryDashboard'
import { useLaundryDashboardStats } from '@/hooks/useLaundryDashboard'
import { useLaundryBatches } from '@/hooks/useLaundryBatches'
import { useBreakpoint } from '@/lib/breakpoints'
import { formatCurrency, formatNumber } from '@/lib/utils'

export function LaundryDashboardPage() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  
  // Gọi TẤT CẢ hooks trước điều kiện isMobile
  const { data: stats, isLoading: statsLoading } = useLaundryDashboardStats()
  const { data: activeBatches, isLoading: batchesLoading } = useLaundryBatches({})
  
  // Kiểm tra mobile SAU KHI tất cả hooks đã được gọi
  if (isMobile) {
    return <MobileLaundryDashboard />
  }
  
  const activeBatchesData = activeBatches?.batches.filter(
    b => ['delivered', 'washing', 'ready'].includes(b.status)
  ) || []
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Giặt là"
        description="Quản lý các lô giặt và đơn vị giặt là"
        action={{
          label: 'Tạo lô giặt mới',
          icon: Plus,
          onClick: () => navigate('/laundry/batches/new'),
        }}
      />
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Đồ đang giặt"
          value={stats ? formatNumber(stats.items_in_laundry) : '0'}
          icon={Wind}
          description={stats ? `${stats.active_batches} lô đang xử lý` : undefined}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Chi phí tháng này"
          value={stats ? formatCurrency(stats.current_month_cost) : '0 ₫'}
          icon={DollarSign}
          change={stats ? {
            value: stats.cost_change_percent,
            label: 'so với tháng trước',
          } : undefined}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Lô đang xử lý"
          value={stats ? stats.active_batches : '0'}
          icon={Package}
          description="lô"
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Chất lượng TB"
          value={stats ? `${stats.avg_quality_rating.toFixed(1)}/5.0` : '0/5.0'}
          icon={Star}
          description="30 ngày gần nhất"
          isLoading={statsLoading}
        />
      </div>
      
      {/* Active Batches */}
      <ActiveBatchesTable
        batches={activeBatchesData}
        isLoading={batchesLoading}
      />
      
      {/* Charts & Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LaundryExpenseChart />
        <VendorPerformanceTable />
      </div>
    </div>
  )
}
