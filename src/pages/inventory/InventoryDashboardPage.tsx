import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { MobileInventoryDashboard } from '@/components/inventory/MobileInventoryDashboard'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'
import { useBreakpoint } from '@/lib/breakpoints'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export function InventoryDashboardPage() {
  const { t } = useTranslation('inventory')
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [showInboundDialog, setShowInboundDialog] = useState(false)
  const [showOutboundDialog, setShowOutboundDialog] = useState(false)
  
  const { data: stats, isLoading } = useInventoryDashboard()

  // Mobile view
  if (isMobile) {
    return <MobileInventoryDashboard />
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('dashboard')}
      />
      
      {/* Stats Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          title={t('stats.totalStockValue')}
          value={stats ? formatCurrency(stats.total_stock_value) : '0 ₫'}
          icon={DollarSign}
          change={
            stats?.stock_value_change_percent
              ? {
                  value: stats.stock_value_change_percent,
                  label: t('stats.vsLastMonth'),
                }
              : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title={t('stats.totalItems')}
          value={stats ? stats.total_items_count.toString() : '0'}
          icon={Package}
          description={
            stats ? `${stats.total_product_types} ${t('stats.productTypes')}` : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title={t('stats.lowStockAlert')}
          value={stats ? stats.low_stock_count.toString() : '0'}
          icon={AlertTriangle}
          description={
            stats && stats.low_stock_count > 0
              ? t('stats.checkNow')
              : t('stats.stockStable')
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
          title={t('stats.reorderNeeded')}
          value={stats ? stats.reorder_needed_count.toString() : '0'}
          icon={ShoppingCart}
          description={t('stats.itemsBelowReorder')}
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title={t('stats.todayTransactions')}
          value={stats ? stats.today_transactions.total.toString() : '0'}
          icon={ArrowRightLeft}
          description={
            stats
              ? `${stats.today_transactions.out} ${t('transactionType.out')}, ${stats.today_transactions.in} ${t('transactionType.in')}`
              : undefined
          }
          isLoading={isLoading}
        />
        
        <DashboardStatCard
          title={t('stats.inboundValueThisMonth')}
          value={stats ? formatCurrency(stats.value_in_this_month) : '0 ₫'}
          icon={TrendingUp}
          change={
            stats?.inbound_change_percent
              ? {
                  value: stats.inbound_change_percent,
                  label: t('stats.vsLastMonth'),
                }
              : undefined
          }
          isLoading={isLoading}
        />
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Button
              className="w-full"
              onClick={() => setShowInboundDialog(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('inbound.title')}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowOutboundDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('outbound.title')}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/inventory/adjustments')}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {t('adjustment.title')}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/inventory/transactions')}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('quickActions.viewTransactions')}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/items')}
            >
              <Package className="mr-2 h-4 w-4" />
              {t('quickActions.manageItems')}
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
