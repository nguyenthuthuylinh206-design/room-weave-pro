import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertCircle, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUpdateRoomItemQuantity } from '@/hooks/useRoomItems'

interface RoomItem {
  item_id: string
  item_code: string
  item_name: string
  item_thumbnail?: string
  category_name?: string
  standard_quantity: number
  current_quantity: number
  missing_quantity: number
  condition: string
  is_verified: boolean
  verified_at?: string
  verified_by?: string
  room_item_id?: string | null
  has_standard: boolean
}

interface RoomItemsListProps {
  items: RoomItem[]
  roomId: string
}

export function RoomItemsList({ items, roomId }: RoomItemsListProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const updateQuantity = useUpdateRoomItemQuantity()

  if (items.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Chưa có chuẩn đồ dùng cho loại phòng này. Vui lòng vào{' '}
          <Link to="/rooms/standards" className="font-medium underline">
            Quản lý chuẩn phòng
          </Link>{' '}
          để thiết lập.
        </AlertDescription>
      </Alert>
    )
  }

  const standardItems = items.filter(item => item.has_standard)
  const unverifiedCount = standardItems.filter(item => !item.is_verified).length
  const missingItems = standardItems.filter(item => item.missing_quantity > 0)
  const totalMissing = missingItems.reduce((sum, item) => sum + item.missing_quantity, 0)

  const handleQuantityChange = (itemId: string, value: string) => {
    const qty = parseInt(value) || 0
    setQuantities(prev => ({ ...prev, [itemId]: qty }))
  }

  const handleQuantityBlur = async (item: RoomItem) => {
    const newQty = quantities[item.item_id]
    if (newQty !== undefined && newQty !== item.current_quantity) {
      await updateQuantity.mutateAsync({
        roomId,
        itemId: item.item_id,
        quantity: newQty,
        roomItemId: item.room_item_id || null,
      })
      // Reset local state after successful update
      setQuantities(prev => {
        const newState = { ...prev }
        delete newState[item.item_id]
        return newState
      })
    }
  }

  const getStatusBadge = (item: RoomItem) => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    const diff = currentQty - item.standard_quantity

    if (diff === 0) {
      return <Badge variant="default" className="bg-success">Đầy đủ</Badge>
    } else if (diff > 0) {
      return <Badge variant="default" className="bg-blue-500">Dư +{diff}</Badge>
    } else {
      return <Badge variant="destructive">Thiếu {diff}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {unverifiedCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Còn {unverifiedCount} loại đồ chưa được kiểm tra.
            {missingItems.length > 0 && (
              <span className="font-semibold">
                {' '}Thiếu {missingItems.length} loại đồ ({totalMissing} món).
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Đồ dùng cần có */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Đồ dùng cần có
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {standardItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có chuẩn đồ dùng
              </p>
            ) : (
              standardItems.map((item) => (
                <div key={item.item_id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                  {item.item_thumbnail ? (
                    <img
                      src={item.item_thumbnail}
                      alt={item.item_name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/items/${item.item_id}`}
                      className="font-medium text-sm hover:underline block truncate"
                    >
                      {item.item_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.item_code}</p>
                    {item.category_name && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {item.category_name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{item.standard_quantity}</div>
                    <p className="text-xs text-muted-foreground">cần có</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Column 2: Đồ dùng đã có trong phòng */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Đồ đã có trong phòng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {standardItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có dữ liệu
              </p>
            ) : (
              standardItems.map((item) => {
                const currentQty = quantities[item.item_id] ?? item.current_quantity
                return (
                  <div key={item.item_id} className="space-y-2 p-2 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate flex-1">
                        {item.item_name}
                      </span>
                      {getStatusBadge(item)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={currentQty}
                        onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                        onBlur={() => handleQuantityBlur(item)}
                        className="h-9"
                        placeholder="Nhập số lượng"
                      />
                      <Badge variant="outline" className="shrink-0">
                        {item.condition === 'good' && 'Tốt'}
                        {item.condition === 'fair' && 'Khá'}
                        {item.condition === 'poor' && 'Kém'}
                        {item.condition === 'damaged' && 'Hỏng'}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Column 3: Số lượng đồ còn thiếu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Số lượng còn thiếu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missingItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="font-medium text-success">Đã đầy đủ</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tất cả đồ dùng đã đủ theo chuẩn
                </p>
              </div>
            ) : (
              <>
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">
                    Thiếu {missingItems.length} loại đồ
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tổng cộng: {totalMissing} món
                  </p>
                </div>
                {missingItems.map((item) => {
                  const currentQty = quantities[item.item_id] ?? item.current_quantity
                  const missing = Math.max(0, item.standard_quantity - currentQty)
                  
                  return (
                    <div key={item.item_id} className="flex items-center gap-3 p-2 rounded-lg border border-destructive/20 bg-destructive/5">
                      {item.item_thumbnail ? (
                        <img
                          src={item.item_thumbnail}
                          alt={item.item_name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.item_code}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-destructive font-bold">
                          <Minus className="h-4 w-4" />
                          <span>{missing}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">thiếu</p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
