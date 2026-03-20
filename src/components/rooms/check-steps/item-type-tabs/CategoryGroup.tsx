import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
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
      "rounded-lg border overflow-hidden transition-all",
      colors.border,
      isComplete && "ring-1 ring-green-400"
    )}>
      {/* Header - Improved touch target */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "sticky top-[2.75rem] z-[9] w-full flex items-center justify-between px-3 py-2 transition-colors touch-manipulation",
          colors.bg,
          "active:opacity-80"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isOpen ? (
            <ChevronDown className={cn("h-4 w-4 shrink-0", colors.text)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4 shrink-0", colors.text)} />
          )}
          <span className={cn("font-semibold text-sm truncate", colors.text)}>
            {categoryName}
          </span>
          
          {/* Progress indicator */}
          {checkedCount !== undefined && (
            <div className="flex items-center gap-1.5 ml-auto mr-2">
              <span className={cn(
                "text-xs font-medium tabular-nums",
                isComplete ? "text-green-600" : colors.text
              )}>
                {checkedCount}/{itemCount}
              </span>
              {isComplete && (
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {actions && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </button>

      {/* Content - No extra padding */}
      {isOpen && (
        <div className="bg-background">
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
