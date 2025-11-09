import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ItemFilters } from '@/components/items/ItemFilters'
import { ItemTable } from '@/components/items/ItemTable'
import { ItemTabs } from '@/components/items/ItemTabs'
import { BulkActionsBar } from '@/components/items/BulkActionsBar'
import { useItems } from '@/hooks/useItems'
import type { ItemFilters as IItemFilters } from '@/types/items.types'

export function ItemsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<IItemFilters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  const { data, isLoading } = useItems(filters, page, pageSize)
  
  const handleFilterChange = (newFilters: Partial<IItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tài sản"
        description="Quản lý tất cả tài sản và đồ dùng trong khách sạn"
        action={{
          label: 'Thêm tài sản mới',
          icon: Plus,
          onClick: () => navigate('/items/new'),
        }}
      />
      
      <ItemTabs
        activeTab={filters.categoryId || 'all'}
        onTabChange={(categoryId) => 
          handleFilterChange({ categoryId: categoryId === 'all' ? undefined : categoryId })
        }
      />
      
      <ItemFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      
      <ItemTable
        items={data?.items || []}
        isLoading={isLoading}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        page={page}
        pageSize={pageSize}
        total={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      
      {selectedItems.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedItems.length}
          selectedItems={selectedItems}
          onClearSelection={() => setSelectedItems([])}
        />
      )}
    </div>
  )
}
