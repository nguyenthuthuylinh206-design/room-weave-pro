import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  ArrowRightLeft,
  TrendingUp,
  Download,
  Upload,
  ClipboardCheck,
  FileText,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LowStockAlert } from '@/components/inventory/LowStockAlert'
import { RecentTransactions } from '@/components/inventory/RecentTransactions'
import { InventoryValueChart } from '@/components/inventory/InventoryValueChart'
import { QuickInboundDialog } from '@/components/inventory/QuickInboundDialog'
import { QuickOutboundDialog } from '@/components/inventory/QuickOutboundDialog'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export function InventoryDashboardPage() {
  const navigate = useNavigate()
  const [showInboundDialog, setShowInboundDialog] = useState(false)
  const [showOutboundDialog, setShowOutboundDialog] = useState(false)
  
  const { data: stats, isLoading } = useInventoryDashboard()
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Kho"
        description="Theo dõi và quản lý tồn kho, nhập xuất hàng"
      />
      
      {/* Stats Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          title="Tổng giá trị kho"
          value={stats ? formatCurrency(stats.total_stock_value) : '0 ₫'}
          icon={DollarSign}
          change={
            stats?.stock_value_change_percent
              ? {
                  value: stats.stock_value_change_percent,
                  label: 'so với tháng trước',
                }
              : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title="Tổng số items"
          value={stats ? stats.total_items_count.toString() : '0'}
          icon={Package}
          description={
            stats ? `${stats.total_product_types} loại sản phẩm` : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title="Cảnh báo tồn kho thấp"
          value={stats ? stats.low_stock_count.toString() : '0'}
          icon={AlertTriangle}
          description={
            stats && stats.low_stock_count > 0
              ? 'Cần kiểm tra ngay'
              : 'Tồn kho ổn định'
          }
          isLoading={isLoading}
          onClick={() => {
            const element = document.getElementById('low-stock-section')
            element?.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      </div>
      
      {/* Stats Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          title="Cần đặt hàng lại"
          value={stats ? stats.reorder_needed_count.toString() : '0'}
          icon={ShoppingCart}
          description="Items dưới điểm đặt hàng"
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title="Giao dịch hôm nay"
          value={stats ? stats.today_transactions.total.toString() : '0'}
          icon={ArrowRightLeft}
          description={
            stats
              ? `${stats.today_transactions.out} xuất, ${stats.today_transactions.in} nhập`
              : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title="Giá trị nhập tháng này"
          value={stats ? formatCurrency(stats.value_in_this_month) : '0 ₫'}
          icon={TrendingUp}
          change={
            stats?.inbound_change_percent
              ? {
                  value: stats.inbound_change_percent,
                  label: 'so với tháng trước',
                }
              : undefined
          }
          isLoading={isLoading}
        />
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Button
              className="w-full"
              onClick={() => setShowInboundDialog(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Nhập kho
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowOutboundDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Xuất kho
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/inventory/adjustments')}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Kiểm kê
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/inventory/transactions')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Xem giao dịch
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/items')}
            >
              <Package className="mr-2 h-4 w-4" />
              Quản lý Items
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Low Stock Alert */}
      <div id="low-stock-section">
        <LowStockAlert />
      </div>
      
      {/* Charts & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InventoryValueChart />
        <RecentTransactions />
      </div>
      
      {/* Dialogs */}
      <QuickInboundDialog
        open={showInboundDialog}
        onOpenChange={setShowInboundDialog}
      />
      <QuickOutboundDialog
        open={showOutboundDialog}
        onOpenChange={setShowOutboundDialog}
      />
    </div>
  )
}
