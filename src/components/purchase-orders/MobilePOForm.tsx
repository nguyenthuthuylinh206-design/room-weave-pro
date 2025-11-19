import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, ShoppingCart, Package, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendors } from '@/hooks/useVendors'
import { useItems } from '@/hooks/useItems'
import { useCreatePO } from '@/hooks/usePurchaseOrders'
import { useHotelContext } from '@/contexts/HotelContext'
import { DatePicker } from '@/components/shared/DatePicker'
import { toast } from 'sonner'
import { addDays, format } from 'date-fns'

const poSchema = z.object({
  vendor_id: z.string().uuid('Vui lòng chọn nhà cung cấp'),
  order_date: z.string(),
  expected_delivery_date: z.string(),
  shipping_address: z.string().min(10, 'Địa chỉ phải có ít nhất 10 ký tự'),
  items: z.array(z.object({
    item_id: z.string().uuid(),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    notes: z.string().optional()
  })).min(1, 'Phải có ít nhất 1 sản phẩm'),
  tax_rate: z.number().min(0).max(100),
  shipping_fee: z.number().nonnegative(),
  notes: z.string().optional()
})

type POFormData = z.infer<typeof poSchema>

interface CartItem {
  item_id: string
  item: any
  quantity: number
  unit_price: number
  notes?: string
}

export function MobilePOForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedVendorId = searchParams.get('vendor')
  const { selectedHotel } = useHotelContext()
  
  const [step, setStep] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showItemSheet, setShowItemSheet] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: vendors } = useVendors({ status: 'active' })
  const { data: itemsData } = useItems({})
  const createPO = useCreatePO()
  
  const form = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      vendor_id: preselectedVendorId || '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: addDays(new Date(), 7).toISOString().split('T')[0],
      shipping_address: selectedHotel?.address || '',
      items: [],
      tax_rate: 10,
      shipping_fee: 0,
      notes: ''
    }
  })
  
  const vendorId = form.watch('vendor_id')
  const selectedVendor = vendors?.find(v => v.id === vendorId)
  
  // Update items in form when cart changes
  useEffect(() => {
    form.setValue('items', cart.map(c => ({
      item_id: c.item_id,
      quantity: c.quantity,
      unit_price: c.unit_price,
      notes: c.notes
    })))
  }, [cart, form])
  
  const addToCart = (item: any) => {
    const existing = cart.find(c => c.item_id === item.id)
    if (existing) {
      setCart(cart.map(c => 
        c.item_id === item.id 
          ? { ...c, quantity: c.quantity + 1 } 
          : c
      ))
    } else {
      setCart([...cart, {
        item_id: item.id,
        item: item,
        quantity: 1,
        unit_price: item.unit_price || 0,
        notes: ''
      }])
    }
    toast.success(`Đã thêm ${item.name}`)
  }
  
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item_id !== itemId))
    toast.success('Đã xóa khỏi giỏ hàng')
  }
  
  const updateCartItem = (itemId: string, field: 'quantity' | 'unit_price', value: number) => {
    setCart(cart.map(c => 
      c.item_id === itemId ? { ...c, [field]: value } : c
    ))
  }
  
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = subtotal * (form.watch('tax_rate') / 100)
    const shipping = form.watch('shipping_fee')
    return subtotal + tax + shipping
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }
  
  const onSubmit = async (data: POFormData) => {
    if (!selectedHotel?.id) {
      toast.error('Vui lòng chọn khách sạn')
      return
    }
    
    try {
      await createPO.mutateAsync(data as any)
      navigate('/purchase-orders')
    } catch (error) {
      toast.error('Lỗi tạo đơn hàng')
    }
  }
  
  const filteredItems = itemsData?.items?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const steps = [
    { number: 1, title: 'Nhà cung cấp' },
    { number: 2, title: 'Chọn hàng' },
    { number: 3, title: 'Xác nhận' }
  ]
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/purchase-orders')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Tạo đơn đặt hàng</h1>
            <p className="text-xs text-muted-foreground">Bước {step}/3</p>
          </div>
          <Badge variant="secondary">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {cart.length}
          </Badge>
        </div>
        
        {/* Progress */}
        <Progress value={(step / 3) * 100} className="h-1" />
      </div>
      
      {/* Step Indicator */}
      <div className="flex justify-between px-4 py-4 bg-muted/30">
        {steps.map((s) => (
          <div
            key={s.number}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step >= s.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.number ? <Check className="h-4 w-4" /> : s.number}
            </div>
            <span className="text-xs text-center">{s.title}</span>
          </div>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Step 1: Vendor & Dates */}
        {step === 1 && (
          <>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nhà cung cấp *</Label>
                  <Select
                    value={form.watch('vendor_id')}
                    onValueChange={(value) => form.setValue('vendor_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.vendor_id && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.vendor_id.message}
                    </p>
                  )}
                </div>
                
                {selectedVendor && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm font-medium">{selectedVendor.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedVendor.contact_person}</p>
                    <p className="text-xs text-muted-foreground">{selectedVendor.phone}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Ngày đặt hàng</Label>
                  <Input
                    type="date"
                    {...form.register('order_date')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Ngày giao dự kiến</Label>
                  <Input
                    type="date"
                    {...form.register('expected_delivery_date')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Địa chỉ giao hàng *</Label>
                  <Textarea
                    {...form.register('shipping_address')}
                    placeholder="Nhập địa chỉ giao hàng"
                    rows={3}
                  />
                  {form.formState.errors.shipping_address && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.shipping_address.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                if (!form.watch('vendor_id')) {
                  toast.error('Vui lòng chọn nhà cung cấp')
                  return
                }
                setStep(2)
              }}
            >
              Tiếp theo
            </Button>
          </>
        )}
        
        {/* Step 2: Items */}
        {step === 2 && (
          <>
            {/* Cart Items */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có sản phẩm nào</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.item_id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.item.code}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFromCart(item.item_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Số lượng</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartItem(item.item_id, 'quantity', Number(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Đơn giá</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateCartItem(item.item_id, 'unit_price', Number(e.target.value))}
                            className="h-9"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Thành tiền:</span>
                        <span className="font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowItemSheet(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm sản phẩm
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (cart.length === 0) {
                    toast.error('Vui lòng thêm ít nhất 1 sản phẩm')
                    return
                  }
                  setStep(3)
                }}
              >
                Tiếp theo
              </Button>
            </div>
          </>
        )}
        
        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nhà cung cấp</Label>
                  <p className="font-medium">{selectedVendor?.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ngày đặt</Label>
                    <p className="text-sm">{format(new Date(form.watch('order_date')), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ngày giao</Label>
                    <p className="text-sm">{format(new Date(form.watch('expected_delivery_date')), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Tổng sản phẩm</Label>
                  <p className="text-sm">{cart.length} loại ({cart.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Thuế (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Phí vận chuyển</Label>
                  <Input
                    type="number"
                    min="0"
                    {...form.register('shipping_fee', { valueAsNumber: true })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    {...form.register('notes')}
                    placeholder="Ghi chú thêm..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Summary */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Thuế ({form.watch('tax_rate')}%):</span>
                  <span>{formatCurrency(calculateSubtotal() * (form.watch('tax_rate') / 100))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phí vận chuyển:</span>
                  <span>{formatCurrency(form.watch('shipping_fee'))}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-medium text-base">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Quay lại
              </Button>
              <Button
                className="flex-1"
                onClick={form.handleSubmit(onSubmit)}
                disabled={createPO.isPending}
              >
                {createPO.isPending ? 'Đang tạo...' : 'Tạo đơn hàng'}
              </Button>
            </div>
          </>
        )}
      </div>
      
      {/* Item Selection Sheet */}
      <Sheet open={showItemSheet} onOpenChange={setShowItemSheet}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Chọn sản phẩm</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredItems?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  onClick={() => addToCart(item)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(item.unit_price || 0)} / {item.unit}
                    </p>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
