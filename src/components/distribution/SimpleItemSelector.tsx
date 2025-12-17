import { useState, useMemo } from 'react'
import { Plus, Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useItems } from '@/hooks/useItems'
import type { ItemType } from '@/types/items.types'

const ITEM_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  all: { label: 'Tất cả', color: 'bg-muted' },
  linen: { label: 'Đồ vải', color: 'bg-blue-100 text-blue-800' },
  consumable: { label: 'Tiêu hao', color: 'bg-green-100 text-green-800' },
  equipment: { label: 'Thiết bị', color: 'bg-orange-100 text-orange-800' },
  furniture: { label: 'Nội thất', color: 'bg-purple-100 text-purple-800' },
}

interface SimpleItemSelectorProps {
  allocatedItemIds: string[]
  onSelectItem: (itemId: string) => void
  disabled?: boolean
}

export function SimpleItemSelector({ allocatedItemIds, onSelectItem, disabled }: SimpleItemSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | ItemType>('all')
  
  const { data: itemsData } = useItems()
  const items = itemsData?.items || []
  
  const filteredItems = useMemo(() => {
    return items
      .filter(item => !allocatedItemIds.includes(item.id))
      .filter(item => (item.quantity_in_stock ?? 0) > 0)
      .filter(item => selectedType === 'all' || item.item_type === selectedType)
      .filter(item => {
        if (!search.trim()) return true
        const searchLower = search.toLowerCase()
        return (
          item.name.toLowerCase().includes(searchLower) ||
          item.code.toLowerCase().includes(searchLower) ||
          (item.category_name?.toLowerCase().includes(searchLower))
        )
      })
  }, [items, allocatedItemIds, selectedType, search])

  const groupedItems = useMemo(() => {
    const groups: Record<ItemType, typeof filteredItems> = {
      linen: [],
      consumable: [],
      equipment: [],
      furniture: [],
    }
    filteredItems.forEach(item => {
      if (item.item_type && groups[item.item_type as ItemType]) {
        groups[item.item_type as ItemType].push(item)
      }
    })
    return groups
  }, [filteredItems])
  
  return (
    <div className="space-y-3 border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Thêm sản phẩm
        </Label>
        <Badge variant="secondary">{filteredItems.length} sản phẩm</Badge>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Tìm theo tên, mã, danh mục..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>
      
      {/* Type filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ITEM_TYPE_CONFIG).map(([type, config]) => (
          <Button
            key={type}
            type="button"
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type as 'all' | ItemType)}
            disabled={disabled}
            className="text-xs"
          >
            {config.label}
          </Button>
        ))}
      </div>
      
      {/* Item list */}
      <ScrollArea className="h-[250px] border rounded-md">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Không tìm thấy sản phẩm</p>
            {search && <p className="text-xs">Thử từ khóa khác</p>}
          </div>
        ) : selectedType === 'all' ? (
          // Grouped view
          <div className="divide-y">
            {Object.entries(groupedItems).map(([type, typeItems]) => {
              if (typeItems.length === 0) return null
              return (
                <div key={type}>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                    {ITEM_TYPE_CONFIG[type]?.label} ({typeItems.length})
                  </div>
                  {typeItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => !disabled && onSelectItem(item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.code} • {item.category_name || 'Không phân loại'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          Tồn: {item.quantity_in_stock ?? 0}
                        </Badge>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          // Flat list view
          <div className="divide-y">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => !disabled && onSelectItem(item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.code} • {item.category_name || 'Không phân loại'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    Tồn: {item.quantity_in_stock ?? 0}
                  </Badge>
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
