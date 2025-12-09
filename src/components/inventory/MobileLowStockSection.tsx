import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ShoppingCart, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SwipeableCard } from '@/components/mobile/TouchOptimized'
import { useLowStockItems } from '@/hooks/useInventoryDashboard'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function MobileLowStockSection() {
  const navigate = useNavigate()
  const { data: lowStockItems = [] } = useLowStockItems(5)

  if (lowStockItems.length === 0) {
    return null
  }

  const criticalCount = lowStockItems.filter(item => 
    (item.quantity_in_stock || 0) === 0 || 
    ((item.shortage_percent || 0) >= 50)
  ).length

  return (
    <div className="px-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-base font-semibold">Cảnh báo tồn kho</h2>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="rounded-full animate-pulse">
              {criticalCount} nghiêm trọng
            </Badge>
          )}
          <Badge variant="secondary" className="rounded-full">
            {lowStockItems.length}
          </Badge>
        </div>
      </div>

      {/* Alert Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl",
          criticalCount > 0 
            ? "bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50" 
            : "bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-950/50 dark:to-yellow-950/50"
        )}
      >
        <div className={cn(
          "p-2 rounded-full",
          criticalCount > 0 ? "bg-red-500" : "bg-orange-500"
        )}>
          <AlertTriangle className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            criticalCount > 0 ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"
          )}>
            {criticalCount > 0 
              ? `${criticalCount} sản phẩm hết hàng nghiêm trọng!`
              : `${lowStockItems.length} sản phẩm sắp hết hàng`
            }
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vuốt để xem chi tiết hoặc đặt hàng nhanh
          </p>
        </div>
      </motion.div>

      {/* Items List */}
      <div className="space-y-2">
        {lowStockItems.slice(0, 4).map((item, index) => {
          const isCritical = (item.quantity_in_stock || 0) === 0 || (item.shortage_percent || 0) >= 50
          const stockPercent = item.minimum_stock 
            ? Math.min(((item.quantity_in_stock || 0) / item.minimum_stock) * 100, 100)
            : 0

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <SwipeableCard
                onSwipeLeft={() => navigate(`/items/${item.id}`)}
                onSwipeRight={() => navigate('/purchase-orders/new')}
              >
                <Card className={cn(
                  "border shadow-sm transition-all",
                  isCritical 
                    ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" 
                    : "border-orange-200 dark:border-orange-800/50"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className={cn(
                        "flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center",
                        isCritical ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"
                      )}>
                        <Package className={cn(
                          "h-6 w-6",
                          isCritical ? "text-red-500" : "text-orange-500"
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                          <Badge 
                            variant={isCritical ? "destructive" : "secondary"}
                            className="shrink-0 text-xs rounded-full"
                          >
                            {item.quantity_in_stock === 0 ? 'Hết hàng' : `Còn ${item.quantity_in_stock}`}
                          </Badge>
                        </div>
                        
                        {/* Progress */}
                        <div className="mt-2 space-y-1">
                          <Progress 
                            value={stockPercent} 
                            className={cn(
                              "h-1.5",
                              isCritical && "[&>div]:bg-red-500"
                            )}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Tối thiểu: {item.minimum_stock}</span>
                            <span className={cn(
                              "font-medium",
                              isCritical ? "text-red-600" : "text-orange-600"
                            )}>
                              Thiếu {item.shortage || (item.minimum_stock || 0) - (item.quantity_in_stock || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SwipeableCard>
            </motion.div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {lowStockItems.length > 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory?filter=low_stock')}
            className="flex-1"
          >
            Xem thêm {lowStockItems.length - 4}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => navigate('/purchase-orders/new')}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          Đặt hàng tất cả
        </Button>
      </div>
    </div>
  )
}
