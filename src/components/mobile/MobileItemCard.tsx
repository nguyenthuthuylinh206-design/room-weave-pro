import React from 'react'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TouchButton } from './TouchOptimized'

interface MobileItemCardProps {
  item: {
    code: string
    name: string
    category?: string
    quantity?: number
    unit?: string
    location?: string
    status?: string
  }
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MobileItemCard({ item, onView, onEdit, onDelete }: MobileItemCardProps) {
  const isLowStock = item.quantity !== undefined && item.quantity < 10

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.code}</p>
          {item.category && (
            <Badge variant="secondary" className="mt-1">
              {item.category}
            </Badge>
          )}
        </div>
        
        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {item.quantity !== undefined && (
          <div>
            <span className="text-muted-foreground">Quantity:</span>
            <Badge 
              variant={isLowStock ? 'destructive' : 'default'}
              className="ml-2"
            >
              {item.quantity} {item.unit || ''}
            </Badge>
          </div>
        )}
        {item.location && (
          <div>
            <span className="text-muted-foreground">Location:</span>
            <span className="ml-2 font-medium">{item.location}</span>
          </div>
        )}
        {item.status && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="ml-2">
              {item.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        {onView && (
          <TouchButton 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </TouchButton>
        )}
        {onEdit && (
          <TouchButton 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </TouchButton>
        )}
      </div>
    </div>
  )
}
