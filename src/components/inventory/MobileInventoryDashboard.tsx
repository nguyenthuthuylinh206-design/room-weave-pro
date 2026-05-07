import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { MobileInventoryHero } from './MobileInventoryHero'
import { MobilePrimaryActions } from './MobilePrimaryActions'
import { MobileInventoryFAB } from './MobileInventoryFAB'
import { MobileLowStockSection } from './MobileLowStockSection'
import { MobileSecondaryActions } from './MobileSecondaryActions'
import { MobileRecentTransactions } from './MobileRecentTransactions'
import { RestockAlertSheet } from './RestockAlertSheet'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'
import { useReorderPendingCount } from '@/hooks/useReorderSuggestions'

export function MobileInventoryDashboard() {
  const { isLoading } = useInventoryDashboard()
  const [alertOpen, setAlertOpen] = useState(false)
  const { data: pendingCount = 0 } = useReorderPendingCount()

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
      <MobileInventoryHero />

      <div className="px-4">
        <Button
          variant="outline"
          className="w-full justify-between h-11"
          onClick={() => setAlertOpen(true)}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Cảnh báo tồn kho
          </span>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </div>

      <MobilePrimaryActions />
      <MobileSecondaryActions />
      <MobileLowStockSection />
      <MobileRecentTransactions />

      <RestockAlertSheet open={alertOpen} onOpenChange={setAlertOpen} />
    </div>
  )
}
