import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronDown, ChevronUp, Package, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!items || items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{t('lowStock.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('stats.stockStable')}
          </p>
        </CardContent>
      </Card>
    )
  }
  
  const criticalItems = items.filter(item => item.shortage_percent >= 50)
  const warningItems = items.filter(item => item.shortage_percent < 50)
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <CardTitle className="text-sm font-medium">{t('lowStock.title')}</CardTitle>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={cn(
        "flex-1 overflow-hidden transition-all duration-300",
        isExpanded ? "opacity-100" : "opacity-0 h-0 py-0"
      )}>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {/* Critical items first */}
          {criticalItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex items-center gap-3 p-2 rounded-lg border-l-[3px] border-l-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors"
            >
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="h-8 w-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted flex-shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.category_name}
                </p>
              </div>
              
              <Badge 
                variant="destructive" 
                className="text-[10px] px-1.5 py-0 flex-shrink-0"
              >
                {item.quantity_in_stock}/{item.minimum_stock}
              </Badge>
            </div>
          ))}
          
          {/* Warning items */}
          {warningItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex items-center gap-3 p-2 rounded-lg border-l-[3px] border-l-orange-500 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 cursor-pointer transition-colors"
            >
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="h-8 w-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted flex-shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.category_name}
                </p>
              </div>
              
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-600 flex-shrink-0"
              >
                {item.quantity_in_stock}/{item.minimum_stock}
              </Badge>
            </div>
          ))}
        </div>
        
        {items.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs h-8"
            onClick={() => navigate('/items?filter=low-stock')}
          >
            Xem tất cả {items.length} sản phẩm
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
