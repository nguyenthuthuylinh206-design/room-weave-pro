import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  ArrowRightLeft,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { HeroStatCard } from '@/components/dashboard/HeroStatCard'
import { CompactActionBar } from '@/components/inventory/CompactActionBar'
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
      
      {/* Hero Section: 8 cols Hero + 4 cols Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <HeroStatCard
            title={t('stats.totalStockValue')}
            value={stats ? formatCurrency(stats.total_stock_value) : '0 ₫'}
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
        </div>
        <div className="lg:col-span-4">
          <CompactActionBar
            onInbound={() => setShowInboundDialog(true)}
            onOutbound={() => setShowOutboundDialog(true)}
          />
        </div>
      </div>
      
      {/* Stats Cards - 4 secondary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>
      
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
