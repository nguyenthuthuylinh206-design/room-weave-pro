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

const ROW_HEIGHT = 'min-h-[320px]'

export function InventoryOverviewSection({ onNavigate }: Props) {
  const [showInboundDialog, setShowInboundDialog] = useState(false)
  const [showOutboundDialog, setShowOutboundDialog] = useState(false)

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <InventoryKpiGrid onNavigate={onNavigate} />

      {/* Quick actions toolbar */}
      <CompactActionBar
        onInbound={() => setShowInboundDialog(true)}
        onOutbound={() => setShowOutboundDialog(true)}
      />

      {/* Row 1: Chart 8 / Forecast 4 */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={`lg:col-span-8 ${ROW_HEIGHT}`}>
          <InventoryValueChart />
        </div>
        <div className={`lg:col-span-4 ${ROW_HEIGHT} flex`}>
          <div className="w-full h-full overflow-hidden">
            <InventoryForecastWidget />
          </div>
        </div>
      </div>

      {/* Row 2: Top consumed 8 / Combined alerts 4 — same 8/4 rhythm */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={`lg:col-span-8 ${ROW_HEIGHT} flex`}>
          <div className="w-full h-full overflow-hidden">
            <InventoryTopConsumedWidget />
          </div>
        </div>
        <div className={`lg:col-span-4 ${ROW_HEIGHT} flex`}>
          <div className="w-full h-full overflow-hidden" id="low-stock-section">
            <CombinedStockAlerts />
          </div>
        </div>
      </div>

      {/* Row 3: Recent transactions full width */}
      <RecentTransactions />

      {/* Section: hotel breakdown (only All Hotels mode) */}
      <div className="pt-2">
        <InventoryHotelBreakdown />
      </div>

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
