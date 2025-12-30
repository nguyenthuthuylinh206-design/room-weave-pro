import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface CategoryGroupProps {
  categoryName: string
  categoryColor?: string
  itemCount: number
  checkedCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}

// Color mapping for categories
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  'Đồ vải': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  'Điện tử': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  'Phòng tắm': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  'Phòng khách': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  'Nội thất': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  'Thiết bị điện': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  'Thiết bị': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  'Tiện nghi': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  'Đồ vệ sinh': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
  'Vệ sinh': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
  'Tiêu hao': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  'Ẩm thực': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  'default': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
}

export function getCategoryColor(categoryName: string) {
  return categoryColors[categoryName] || categoryColors['default']
}

export function CategoryGroup({
  categoryName,
  categoryColor,
  itemCount,
  checkedCount,
  defaultOpen = true,
  children,
  actions,
}: CategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const colors = getCategoryColor(categoryName)
  
  const isComplete = checkedCount !== undefined && checkedCount === itemCount

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      colors.border,
      isComplete && "ring-1 ring-success/50"
    )}>
      {/* Sticky Header */}
      <div className={cn(
        "sticky top-0 z-10 w-full flex items-center justify-between px-4 py-2 transition-colors",
        colors.bg
      )}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 hover:opacity-90 cursor-pointer flex-1"
        >
          {isOpen ? (
            <ChevronDown className={cn("h-4 w-4", colors.text)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", colors.text)} />
          )}
          <span className={cn("font-semibold text-sm", colors.text)}>
            {categoryName}
          </span>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs h-5",
              colors.bg,
              colors.text,
              "border",
              colors.border
            )}
          >
            {itemCount}
          </Badge>
          {checkedCount !== undefined && (
            <Badge 
              variant={isComplete ? "default" : "outline"}
              className={cn(
                "text-xs",
                isComplete && "bg-success text-success-foreground"
              )}
            >
              {checkedCount}/{itemCount}
            </Badge>
          )}
        </button>
        
        {actions && (
          <div className="ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3 space-y-3 bg-background">
          {children}
        </div>
      )}
    </div>
  )
}

// Helper function to group items by category
export function groupItemsByCategory<T extends { item_id: string }>(
  items: (T & { category_name?: string | null })[]
): Map<string, (T & { category_name?: string | null })[]> {
  const groups = new Map<string, (T & { category_name?: string | null })[]>()
  
  items.forEach(item => {
    const category = item.category_name || 'Khác'
    const existing = groups.get(category) || []
    groups.set(category, [...existing, item])
  })
  
  // Sort categories alphabetically
  const sortedGroups = new Map(
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'))
  )
  
  return sortedGroups
}
