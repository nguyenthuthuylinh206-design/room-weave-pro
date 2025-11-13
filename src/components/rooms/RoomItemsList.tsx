import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState } from 'react'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface RoomItemsListProps {
  items: RoomItemWithDetails[]
  roomId: string
}

type ItemStatus = {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
  color: string
}

export function RoomItemsList({ items }: RoomItemsListProps) {
  // Initialize quantities with current values from database
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity || 0 }), {})
  )

  const getItemStatus = (current: number, standard: number): ItemStatus => {
    if (current === standard) return { label: 'Đầy đủ', variant: 'default', color: 'text-green-600' }
    if (current > standard) return { label: 'Dư', variant: 'secondary', color: 'text-blue-600' }
    return { label: 'Thiếu', variant: 'destructive', color: 'text-red-600' }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Không có đồ dùng nào
        </p>
      </div>
    )
  }

  // Calculate missing items based on input quantities
  const missingItems = items.filter(item => {
    const standardQty = item.standard_quantity
    const currentQty = quantities[item.id] || 0
    return standardQty > currentQty
  })
  
  const totalMissingQuantity = missingItems.reduce((sum, item) => {
    return sum + (item.standard_quantity - (quantities[item.id] || 0))
  }, 0)

  return (
    <div className="space-y-4">
      {missingItems.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Phòng đang thiếu <strong>{missingItems.length} loại đồ</strong> ({totalMissingQuantity} món). Vui lòng bổ sung.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Đồ dùng cần có */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Đồ dùng cần có</CardTitle>
            <p className="text-sm text-muted-foreground">
              Danh sách đồ chuẩn theo loại phòng
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => {
                const status = getItemStatus(quantities[item.id] || 0, item.standard_quantity)
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/items/${item.item_id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {item.item_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.item_code}</p>
                      {item.category_name && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.category_name}
                        </Badge>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Chuẩn: {item.standard_quantity}
                        </span>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cột 2: Đồ dùng đã có trong phòng */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Đồ dùng đã có trong phòng</CardTitle>
            <p className="text-sm text-muted-foreground">
              Nhập số lượng thực tế
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => {
                const currentQty = quantities[item.id] || 0
                const status = getItemStatus(currentQty, item.standard_quantity)
                
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">{item.item_code}</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0
                              setQuantities(prev => ({ ...prev, [item.id]: newQty }))
                            }}
                            className="w-20 h-8"
                            placeholder="0"
                          />
                          <span className="text-sm text-muted-foreground">
                            / {item.standard_quantity}
                          </span>
                        </div>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                        <Badge 
                          variant={
                            item.condition === 'good' ? 'default' :
                            item.condition === 'damaged' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs ml-2"
                        >
                          {item.condition === 'good' && 'Tốt'}
                          {item.condition === 'fair' && 'Khá'}
                          {item.condition === 'poor' && 'Kém'}
                          {item.condition === 'damaged' && 'Hỏng'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cột 3: Số lượng đồ còn thiếu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Số lượng đồ còn thiếu</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cần bổ sung
            </p>
          </CardHeader>
          <CardContent>
            {missingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="mt-2 text-sm font-medium text-green-600">
                  Đủ đồ dùng
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Phòng đã có đầy đủ đồ dùng theo chuẩn
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {missingItems.map((item) => {
                  const missing = item.standard_quantity - (quantities[item.id] || 0)
                  
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 bg-destructive/5">
                      {item.item_thumbnail ? (
                        <img
                          src={item.item_thumbnail}
                          alt={item.item_name}
                          className="h-12 w-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/items/${item.item_id}`}
                          className="font-medium hover:underline block truncate"
                        >
                          {item.item_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.item_code}</p>
                        {item.category_name && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category_name}
                          </Badge>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-semibold text-destructive">
                            Thiếu: {missing}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
