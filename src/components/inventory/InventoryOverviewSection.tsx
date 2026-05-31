import { useState } from 'react'
import { CompactActionBar } from '@/components/inventory/CompactActionBar'
import { RecentTransactions } from '@/components/inventory/RecentTransactions'
import { InventoryValueChart } from '@/components/inventory/InventoryValueChart'
import { QuickInboundDialog } from '@/components/inventory/QuickInboundDialog'
import { QuickOutboundDialog } from '@/components/inventory/QuickOutboundDialog'
import { InventoryKpiGrid } from '@/components/inventory/hub/InventoryKpiGrid'
import { InventoryForecastWidget } from '@/components/inventory/hub/InventoryForecastWidget'
import { InventoryTopConsumedWidget } from '@/components/inventory/hub/InventoryTopConsumedWidget'
import { InventoryHotelBreakdown } from '@/components/inventory/hub/InventoryHotelBreakdown'
import { CombinedStockAlerts } from '@/components/inventory/hub/CombinedStockAlerts'

interface Props {
  onNavigate: (tab: string, sub?: string) => void
}

export function InventoryOverviewSection({ onNavigate }: Props) {
  const [showInboundDialog, setShowInboundDialog] = useState(false)
  const [showOutboundDialog, setShowOutboundDialog] = useState(false)

  return (
    <div className="font-body space-y-4">
      {/* Bento KPI */}
      <InventoryKpiGrid onNavigate={onNavigate} />

      {/* Quick actions */}
      <CompactActionBar
        onInbound={() => setShowInboundDialog(true)}
        onOutbound={() => setShowOutboundDialog(true)}
      />

      {/* Bento grid main */}
      <div className="grid gap-3 lg:grid-cols-12 lg:auto-rows-[152px]">
        {/* Chart — wide */}
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden lg:col-span-8 lg:row-span-2 shadow-tile">
          <InventoryValueChart />
        </div>

        {/* Forecast — tall */}
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden lg:col-span-4 lg:row-span-2 shadow-tile">
          <InventoryForecastWidget />
        </div>

        {/* Top consumed — wide */}
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden lg:col-span-7 lg:row-span-2 shadow-tile">
          <InventoryTopConsumedWidget />
        </div>

        {/* Combined alerts */}
        <div id="low-stock-section" className="rounded-xl border border-border/70 bg-card overflow-hidden lg:col-span-5 lg:row-span-2 shadow-tile">
          <CombinedStockAlerts />
        </div>
      </div>

      {/* Recent transactions full width */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-tile">
        <RecentTransactions />
      </div>

      {/* Hotel breakdown (chain mode only) */}
      <InventoryHotelBreakdown />

      <QuickInboundDialog open={showInboundDialog} onOpenChange={setShowInboundDialog} />
      <QuickOutboundDialog open={showOutboundDialog} onOpenChange={setShowOutboundDialog} />
    </div>
  )
}
