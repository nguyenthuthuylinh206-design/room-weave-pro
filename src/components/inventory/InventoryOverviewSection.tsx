import { useState } from 'react'
import { CompactActionBar } from '@/components/inventory/CompactActionBar'
import { LowStockAlert } from '@/components/inventory/LowStockAlert'
import { RecentTransactions } from '@/components/inventory/RecentTransactions'
import { InventoryValueChart } from '@/components/inventory/InventoryValueChart'
import { QuickInboundDialog } from '@/components/inventory/QuickInboundDialog'
import { QuickOutboundDialog } from '@/components/inventory/QuickOutboundDialog'
import { InventoryAlertsWidget } from '@/components/inventory/InventoryAlertsWidget'
import { InventoryKpiGrid } from '@/components/inventory/hub/InventoryKpiGrid'
import { InventoryForecastWidget } from '@/components/inventory/hub/InventoryForecastWidget'
import { InventoryTopConsumedWidget } from '@/components/inventory/hub/InventoryTopConsumedWidget'
import { InventoryHotelBreakdown } from '@/components/inventory/hub/InventoryHotelBreakdown'

interface Props {
  onNavigate: (tab: string, sub?: string) => void
}

export function InventoryOverviewSection({ onNavigate }: Props) {
  const [showInboundDialog, setShowInboundDialog] = useState(false)
  const [showOutboundDialog, setShowOutboundDialog] = useState(false)

  return (
    <div className="space-y-4">
      {/* KPI Grid - Enterprise SaaS minimalist 6 columns */}
      <InventoryKpiGrid onNavigate={onNavigate} />

      {/* Quick action bar */}
      <CompactActionBar
        onInbound={() => setShowInboundDialog(true)}
        onOutbound={() => setShowOutboundDialog(true)}
      />

      {/* Main grid: chart + forecast */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <InventoryValueChart />
        </div>
        <div className="lg:col-span-5">
          <InventoryForecastWidget />
        </div>
      </div>

      {/* Secondary grid: top consumed + low stock + alerts/transactions */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <InventoryTopConsumedWidget />
        </div>
        <div id="low-stock-section" className="lg:col-span-4">
          <LowStockAlert />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <InventoryAlertsWidget />
          <RecentTransactions />
        </div>
      </div>

      {/* Hotel breakdown - only in All Hotels mode */}
      <InventoryHotelBreakdown />

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
