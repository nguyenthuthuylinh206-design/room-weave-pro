import React from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2, Package, MapPin, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TouchButton } from './TouchOptimized'
import { cn } from '@/lib/utils'

interface MobileItemCardProps {
  item: {
    id?: string
    code: string
    name: string
    category_name?: string
    category_color?: string
    category?: string
    quantity_in_stock?: number
    quantity_total?: number
    quantity?: number
    unit?: string
    location?: string
    status?: string
    stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock'
    unit_price?: number
    item_images?: Array<{ url: string; is_primary?: boolean }>
  }
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MobileItemCard({ item, onView, onEdit, onDelete }: MobileItemCardProps) {
  const { t } = useTranslation(['items', 'common'])

  const stockStatusConfig = {
    in_stock: { label: t('items:status.inStock'), className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    low_stock: { label: t('items:status.lowStock'), className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    out_of_stock: { label: t('items:status.outOfStock'), className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }

  const quantity = item.quantity_in_stock ?? item.quantity_total ?? item.quantity ?? 0
  const stockStatus = item.stock_status || (quantity < 10 ? 'low_stock' : 'in_stock')
  const statusConfig = stockStatusConfig[stockStatus]
  const categoryName = item.category_name || item.category
  const primaryImage = item.item_images?.find(img => img.is_primary)?.url || item.item_images?.[0]?.url

  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {primaryImage ? (
              <img 
                src={primaryImage} 
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header with name and menu */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate leading-tight">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.code}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-1 -mt-1">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background w-40">
                  {onView && (
                    <DropdownMenuItem onClick={onView}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common:viewDetails')}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('common:edit')}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryName && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0 h-5 font-normal"
                  style={item.category_color ? { 
                    backgroundColor: `${item.category_color}20`,
                    color: item.category_color 
                  } : undefined}
                >
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {categoryName}
                </Badge>
              )}
              <Badge className={cn("text-[10px] px-1.5 py-0 h-5 font-normal border-0", statusConfig.className)}>
                {statusConfig.label}
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className={cn(
                  "font-medium",
                  stockStatus === 'out_of_stock' && "text-destructive",
                  stockStatus === 'low_stock' && "text-amber-600 dark:text-amber-400"
                )}>
                  {quantity} {item.unit || t('items:units.piece')}
                </span>
              </div>
              {item.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{item.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex border-t bg-muted/30">
          {onView && (
            <TouchButton 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-10 rounded-none text-xs gap-1.5 hover:bg-muted"
              onClick={onView}
            >
              <Eye className="h-3.5 w-3.5" />
              {t('common:details')}
            </TouchButton>
          )}
          {onEdit && (
            <TouchButton 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-10 rounded-none text-xs gap-1.5 border-l hover:bg-muted"
              onClick={onEdit}
            >
              <Edit className="h-3.5 w-3.5" />
              {t('common:edit')}
            </TouchButton>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
