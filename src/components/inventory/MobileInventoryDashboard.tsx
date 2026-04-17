import { MobileInventoryHero } from './MobileInventoryHero'
import { MobilePrimaryActions } from './MobilePrimaryActions'
import { MobileInventoryFAB } from './MobileInventoryFAB'
import { MobileLowStockSection } from './MobileLowStockSection'
import { MobileSecondaryActions } from './MobileSecondaryActions'
import { MobileRecentTransactions } from './MobileRecentTransactions'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'

export function MobileInventoryDashboard() {
  const { isLoading } = useInventoryDashboard()

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-muted animate-pulse rounded-2xl" />
          <div className="h-16 bg-muted animate-pulse rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Hero Card with Stock Value */}
      <MobileInventoryHero />
      
      {/* Primary Actions - Nhập/Xuất kho */}
      <MobilePrimaryActions />
      
      {/* Secondary Actions Grid */}
      <MobileSecondaryActions />
      
      {/* Low Stock Alerts */}
      <MobileLowStockSection />
      
      {/* Today's Transactions */}
      <MobileRecentTransactions />
    </div>
  )
}
