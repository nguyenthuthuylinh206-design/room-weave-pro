import { Edit2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CategoryWithStats } from '@/types/items.types'
import { formatCurrency } from '@/lib/utils'

interface MobileCategoryCardProps {
  category: CategoryWithStats
  onEdit: (category: CategoryWithStats) => void
  onDelete: (categoryId: string) => void
}

export function MobileCategoryCard({ category, onEdit, onDelete }: MobileCategoryCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <span className="text-xl">{category.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{category.name}</h3>
              {category.name_en && (
                <p className="text-xs text-muted-foreground truncate">{category.name_en}</p>
              )}
            </div>
          </div>
          
          <Badge variant="secondary" className="shrink-0">
            {category.items_count} items
          </Badge>
        </div>
        
        {/* Description */}
        {category.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {category.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Tổng giá trị</p>
            <p className="font-semibold">{formatCurrency(category.total_value || 0)}</p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(category)}
              className="h-9 w-9 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(category.id)}
              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
