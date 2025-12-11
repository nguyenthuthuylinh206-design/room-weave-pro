import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertCircle, Minus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
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
  
  // Calculate missing items dynamically based on current quantities
  const missingItems = standardItems.filter(item => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    const missing = item.standard_quantity - currentQty
    return missing > 0
  })
  
  const totalMissing = missingItems.reduce((sum, item) => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    const missing = Math.max(0, item.standard_quantity - currentQty)
    return sum + missing
  }, 0)

  const handleQuantityChange = (itemId: string, value: string) => {
    const qty = value === '' ? 0 : parseInt(value) || 0
    setQuantities(prev => ({ ...prev, [itemId]: qty }))
  }

  const handleQuantityBlur = async (item: RoomItem) => {
    const newQty = quantities[item.item_id]
    if (newQty !== undefined && newQty !== item.current_quantity) {
      setSavingItemId(item.item_id)
      try {
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
      } catch (error) {
        // If save fails, revert the local state
        setQuantities(prev => {
          const newState = { ...prev }
          delete newState[item.item_id]
          return newState
        })
      } finally {
        setSavingItemId(null)
      }
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

      <Tabs defaultValue="required" className="w-full">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="required" className="flex-shrink-0 text-xs sm:text-sm">
            <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Cần có</span>
          </TabsTrigger>
          <TabsTrigger value="current" className="flex-shrink-0 text-xs sm:text-sm">
            <CheckCircle2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Đã có</span>
          </TabsTrigger>
          <TabsTrigger value="missing" className="flex-shrink-0 text-xs sm:text-sm">
            <AlertCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Còn thiếu</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Đồ dùng cần có - Hiển thị tất cả với trạng thái */}
        <TabsContent value="required" className="space-y-2 mt-4">
          {standardItems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Chưa có chuẩn đồ dùng cho loại phòng này.
              </AlertDescription>
            </Alert>
          ) : (
            standardItems.map((item) => {
              const currentQty = quantities[item.item_id] ?? item.current_quantity
              const diff = currentQty - item.standard_quantity
              
              return (
                <div key={item.item_id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  {item.item_thumbnail ? (
                    <img
                      src={item.item_thumbnail}
                      alt={item.item_name}
                      className="h-14 w-14 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-muted flex-shrink-0">
                      <Package className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/items/${item.item_id}`}
                      className="font-medium hover:underline block truncate"
                    >
                      {item.item_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.item_code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">{item.standard_quantity}</div>
                      <p className="text-xs text-muted-foreground">cần có</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{currentQty}</div>
                      <p className="text-xs text-muted-foreground">hiện có</p>
                    </div>
                    <div className="w-20">
                      {diff === 0 ? (
                        <Badge className="w-full justify-center bg-success">Đủ</Badge>
                      ) : diff > 0 ? (
                        <Badge className="w-full justify-center bg-blue-500">Dư {diff}</Badge>
                      ) : (
                        <Badge variant="destructive" className="w-full justify-center">Thiếu {Math.abs(diff)}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Tab 2: Đồ đã có trong phòng - Hiển thị tất cả để dễ thao tác */}
        <TabsContent value="current" className="space-y-3 mt-4">
          {standardItems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Chưa có chuẩn đồ dùng cho loại phòng này.
              </AlertDescription>
            </Alert>
          ) : (
            standardItems.map((item) => {
              const currentQty = quantities[item.item_id] ?? item.current_quantity
              const diff = currentQty - item.standard_quantity
              
              return (
                <div key={item.item_id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow space-y-3">
                  {/* Header with item info and status */}
                  <div className="flex items-center gap-3">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-16 w-16 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                      <Badge variant="outline" className="mt-1">
                        {item.condition === 'good' && 'Tốt'}
                        {item.condition === 'fair' && 'Khá'}
                        {item.condition === 'poor' && 'Kém'}
                        {item.condition === 'damaged' && 'Hỏng'}
                      </Badge>
                    </div>
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {diff === 0 ? (
                        <Badge className="bg-success text-white text-base px-3 py-1">
                          ✓ Đủ
                        </Badge>
                      ) : diff > 0 ? (
                        <Badge className="bg-blue-500 text-white text-base px-3 py-1">
                          ↑ Dư {diff}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-base px-3 py-1">
                          ↓ Thiếu {Math.abs(diff)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Quantity comparison and input */}
                  <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
                    {/* Current Quantity Input */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Hiện có</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item)}
                          disabled={savingItemId === item.item_id}
                          className="h-12 text-center text-xl font-bold"
                          placeholder="0"
                        />
                        {savingItemId === item.item_id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="text-2xl font-light text-muted-foreground">/</div>

                    {/* Standard Quantity Display */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Cần có</label>
                      <div className="h-12 flex items-center justify-center rounded-md border bg-background">
                        <span className="text-xl font-bold text-primary">{item.standard_quantity}</span>
                      </div>
                    </div>

                    {/* Difference Display */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Chênh lệch</label>
                      <div className={`h-12 flex items-center justify-center rounded-md border font-bold text-xl ${
                        diff === 0 ? 'bg-success/10 text-success border-success/20' :
                        diff > 0 ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Tab 3: Đồ còn thiếu - Chỉ hiển thị đồ có missing_quantity > 0 */}
        <TabsContent value="missing" className="space-y-2 mt-4">
          {missingItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-3" />
              <p className="font-medium text-lg">Đã đầy đủ</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tất cả đồ dùng đã đủ theo chuẩn
              </p>
            </div>
          ) : (
            <>
              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 mb-4">
                <p className="font-medium text-destructive">
                  Thiếu {missingItems.length} loại đồ
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tổng cộng: {totalMissing} món
                </p>
              </div>
              {missingItems.map((item) => {
                const currentQty = quantities[item.item_id] ?? item.current_quantity
                const missing = Math.max(0, item.standard_quantity - currentQty)
                
                return (
                  <div key={item.item_id} className="flex items-center gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:shadow-sm transition-shadow">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-14 w-14 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-7 w-7 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Hiện có</div>
                        <div className="text-lg font-medium">{currentQty}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Cần có</div>
                        <div className="text-lg font-medium">{item.standard_quantity}</div>
                      </div>
                      <div className="text-center bg-destructive/10 px-3 py-2 rounded">
                        <div className="text-sm text-destructive font-medium">Thiếu</div>
                        <div className="text-2xl font-bold text-destructive">{missing}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
