import { forwardRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWarehouses } from '@/hooks/useWarehouses'
import { Warehouse, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WarehouseSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  excludeId?: string // Exclude a specific warehouse (e.g., for transfer)
  showStock?: boolean // Show stock info if available
  className?: string
  error?: boolean
}

export const WarehouseSelect = forwardRef<HTMLButtonElement, WarehouseSelectProps>(
  ({ value, onValueChange, placeholder = 'Chọn kho', disabled, excludeId, className, error }, ref) => {
    const { data: warehouses, isLoading } = useWarehouses()

    const filteredWarehouses = warehouses?.filter(w => w.id !== excludeId) || []
    const selectedWarehouse = warehouses?.find(w => w.id === value)

    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
        <SelectTrigger 
          ref={ref} 
          className={cn(
            'h-9',
            error && 'border-destructive',
            className
          )}
        >
          <SelectValue placeholder={isLoading ? 'Đang tải...' : placeholder}>
            {selectedWarehouse && (
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span>{selectedWarehouse.name}</span>
                {selectedWarehouse.is_default && (
                  <span className="text-xs text-muted-foreground">(Mặc định)</span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredWarehouses.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Chưa có kho nào</p>
            </div>
          ) : (
            filteredWarehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                  <span>{warehouse.name}</span>
                  <span className="text-xs text-muted-foreground">({warehouse.code})</span>
                  {warehouse.is_default && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Mặc định
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    )
  }
)

WarehouseSelect.displayName = 'WarehouseSelect'
