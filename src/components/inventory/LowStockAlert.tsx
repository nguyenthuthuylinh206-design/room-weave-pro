import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronDown, ChevronUp, Package, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLowStockItems } from '@/hooks/useInventoryDashboard'
import { cn } from '@/lib/utils'

export function LowStockAlert() {
  const { t } = useTranslation(['inventory'])
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(true)
  const { data: items, isLoading } = useLowStockItems(50)
  
  if (isLoading) {
    return (
      <div className="border rounded-lg p-3 h-full">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }
  
  if (!items || items.length === 0) {
    return (
      <div className="border rounded-lg p-3 h-full">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('lowStock.title')}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-6">
          {t('stats.stockStable')}
        </p>
      </div>
    )
  }
  
  const criticalItems = items.filter(item => item.shortage_percent >= 50)
  const warningItems = items.filter(item => item.shortage_percent < 50)
  
  return (
    <div className="border rounded-lg p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{t('lowStock.title')}</span>
          <span className="text-xs text-destructive font-medium">({items.length})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>
      
      {/* Content */}
      <div className={cn(
        "flex-1 overflow-hidden transition-all",
        isExpanded ? "opacity-100" : "opacity-0 h-0"
      )}>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {/* Critical items */}
          {criticalItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex items-center gap-2 p-2 rounded border-l-2 border-l-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer text-sm"
            >
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-destructive font-medium shrink-0">
                {item.quantity_in_stock}/{item.minimum_stock}
              </span>
            </div>
          ))}
          
          {/* Warning items */}
          {warningItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex items-center gap-2 p-2 rounded border-l-2 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 cursor-pointer text-sm"
            >
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-amber-600 font-medium shrink-0">
                {item.quantity_in_stock}/{item.minimum_stock}
              </span>
            </div>
          ))}
        </div>
        
        {items.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs h-7"
            onClick={() => navigate('/items?filter=low-stock')}
          >
            Xem tất cả
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
