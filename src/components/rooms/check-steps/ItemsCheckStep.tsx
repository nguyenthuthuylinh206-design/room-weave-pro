import { UseFormReturn } from 'react-hook-form'
import { CheckCircle2, AlertCircle, XCircle, Package, Search } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { RoomCheckFormData } from '@/types/rooms.types'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface ItemsCheckStepProps {
  form: UseFormReturn<RoomCheckFormData>
  items: RoomItemWithDetails[]
}

type ItemStatus = 'complete' | 'missing' | 'damaged'

export function ItemsCheckStep({ form, items }: ItemsCheckStepProps) {
  const [search, setSearch] = useState('')
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({})
  
  const filteredItems = items.filter((item: RoomItemWithDetails) =>
    item.item_name.toLowerCase().includes(search.toLowerCase()) ||
    item.item_code.toLowerCase().includes(search.toLowerCase())
  )
  
  const handleItemStatus = (itemId: string, status: ItemStatus) => {
    const newStatuses = { ...itemStatuses, [itemId]: status }
    setItemStatuses(newStatuses)
    
    // Update form values
    const missing = Object.entries(newStatuses)
      .filter(([_, s]) => s === 'missing')
      .map(([id]) => items.find((i: RoomItemWithDetails) => i.item_id === id))
      .filter(Boolean)
    
    const damaged = Object.entries(newStatuses)
      .filter(([_, s]) => s === 'damaged')
      .map(([id]) => items.find((i: RoomItemWithDetails) => i.item_id === id))
      .filter(Boolean)
    
    form.setValue('items_missing', missing)
    form.setValue('items_damaged', damaged)
    form.setValue('items_complete', missing.length === 0 && damaged.length === 0)
  }
  
  const completeCount = Object.values(itemStatuses).filter(s => s === 'complete').length
  const missingCount = Object.values(itemStatuses).filter(s => s === 'missing').length
  const damagedCount = Object.values(itemStatuses).filter(s => s === 'damaged').length
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm đồ dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{completeCount}</p>
              <p className="text-sm text-muted-foreground">Đầy đủ</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{missingCount}</p>
              <p className="text-sm text-muted-foreground">Thiếu</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{damagedCount}</p>
              <p className="text-sm text-muted-foreground">Hư hỏng</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? 'Không tìm thấy đồ dùng' : 'Phòng chưa có đồ dùng'}
            </p>
          </div>
        ) : (
          filteredItems.map((item: RoomItemWithDetails) => {
            const status = itemStatuses[item.item_id] || 'complete'
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.item_name}</h4>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                      {item.category_name && (
                        <Badge variant="outline" className="mt-1">
                          {item.category_name}
                        </Badge>
                      )}
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Hiện có: </span>
                        <span className="font-medium">{item.quantity}</span>
                        {item.standard_quantity && (
                          <span className="text-muted-foreground">
                            {' '}/ Chuẩn: {item.standard_quantity}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={status === 'complete' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleItemStatus(item.item_id, 'complete')}
                        className={status === 'complete' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant={status === 'missing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleItemStatus(item.item_id, 'missing')}
                        className={status === 'missing' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant={status === 'damaged' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleItemStatus(item.item_id, 'damaged')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
