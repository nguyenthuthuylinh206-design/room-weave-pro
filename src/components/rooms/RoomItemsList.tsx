import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertCircle, Minus, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  const [openSections, setOpenSections] = useState({
    required: true,
    current: true,
    missing: true,
  })
  const updateQuantity = useUpdateRoomItemQuantity()

  const toggleSection = (section: 'required' | 'current' | 'missing') => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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
        <Card className="shadow-md border-2">
          <Collapsible open={openSections.required} onOpenChange={() => toggleSection('required')}>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CollapsibleTrigger className="w-full">
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span>Đồ dùng cần có</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-bold">
                      {standardItems.length} loại
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSections.required ? 'rotate-180' : ''}`} />
                  </div>
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
            {standardItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có chuẩn đồ dùng
              </p>
            ) : (
              standardItems.map((item) => (
                <div key={item.item_id} className="flex items-center gap-3 p-3 rounded-lg border-2 bg-card hover:border-primary/50 transition-colors shadow-sm">
                  {item.item_thumbnail ? (
                    <img
                      src={item.item_thumbnail}
                      alt={item.item_name}
                      className="h-14 w-14 rounded-md object-cover border"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                      <Package className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/items/${item.item_id}`}
                      className="font-semibold text-sm hover:underline block truncate hover:text-primary transition-colors"
                    >
                      {item.item_name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>
                    {item.category_name && (
                      <Badge variant="outline" className="text-xs mt-1.5">
                        {item.category_name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right bg-primary/5 px-3 py-2 rounded-md">
                    <div className="font-bold text-2xl text-primary">{item.standard_quantity}</div>
                    <p className="text-xs text-muted-foreground font-medium">cần có</p>
                  </div>
                </div>
              ))
            )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Column 2: Đồ dùng đã có trong phòng */}
        <Card className="shadow-md border-2 border-blue-200">
          <Collapsible open={openSections.current} onOpenChange={() => toggleSection('current')}>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors bg-blue-50/50">
              <CollapsibleTrigger className="w-full">
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <span>Đồ đã có trong phòng</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.current ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
            {standardItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có dữ liệu
              </p>
            ) : (
              standardItems.map((item) => {
                const currentQty = quantities[item.item_id] ?? item.current_quantity
                return (
                  <div key={item.item_id} className="space-y-3 p-3 rounded-lg border-2 bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate flex-1">
                        {item.item_name}
                      </span>
                      {getStatusBadge(item)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item)}
                          className="h-10 text-base font-semibold text-center border-2"
                          placeholder="Nhập số lượng"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          Chuẩn: {item.standard_quantity}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 px-2 py-1">
                        {item.condition === 'good' && '✓ Tốt'}
                        {item.condition === 'fair' && '~ Khá'}
                        {item.condition === 'poor' && '− Kém'}
                        {item.condition === 'damaged' && '✗ Hỏng'}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Column 3: Số lượng đồ còn thiếu */}
        <Card className={`shadow-md border-2 ${missingItems.length > 0 ? 'border-destructive/30' : 'border-success/30'}`}>
          <Collapsible open={openSections.missing} onOpenChange={() => toggleSection('missing')}>
            <CardHeader className={`cursor-pointer hover:bg-muted/50 transition-colors ${missingItems.length > 0 ? 'bg-destructive/5' : 'bg-success/5'}`}>
              <CollapsibleTrigger className="w-full">
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {missingItems.length > 0 ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    <span>Số lượng còn thiếu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {missingItems.length > 0 && (
                      <Badge variant="destructive" className="font-bold">
                        {missingItems.length} loại
                      </Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSections.missing ? 'rotate-180' : ''}`} />
                  </div>
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
            {missingItems.length === 0 ? (
              <div className="text-center py-12 bg-success/5 rounded-lg border-2 border-success/20">
                <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-3" />
                <p className="font-bold text-lg text-success">Đã đầy đủ!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tất cả đồ dùng đã đủ theo chuẩn
                </p>
              </div>
            ) : (
              <>
                <div className="bg-destructive/10 p-4 rounded-lg border-2 border-destructive/30 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-destructive">
                        Thiếu {missingItems.length} loại đồ
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tổng cộng: <span className="font-semibold">{totalMissing} món</span>
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                {missingItems.map((item) => {
                  const currentQty = quantities[item.item_id] ?? item.current_quantity
                  const missing = Math.max(0, item.standard_quantity - currentQty)
                  
                  return (
                    <div key={item.item_id} className="flex items-center gap-3 p-3 rounded-lg border-2 border-destructive/30 bg-destructive/5 shadow-sm hover:shadow-md transition-shadow">
                      {item.item_thumbnail ? (
                        <img
                          src={item.item_thumbnail}
                          alt={item.item_name}
                          className="h-12 w-12 rounded-md object-cover border-2 border-destructive/20"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10 border-2 border-destructive/20">
                          <Package className="h-6 w-6 text-destructive" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>
                      </div>
                      <div className="text-right bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
                        <div className="flex items-center justify-end gap-1 text-destructive font-bold text-xl">
                          <Minus className="h-5 w-5" />
                          <span>{missing}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">thiếu</p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  )
}
