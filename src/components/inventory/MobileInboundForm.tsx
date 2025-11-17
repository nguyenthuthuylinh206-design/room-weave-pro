import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ShoppingCart, 
  RotateCcw, 
  Shirt,
  PackagePlus,
  Search,
  Plus,
  X,
  Save
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { TouchButton } from '@/components/mobile/TouchOptimized'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { FileUpload } from '@/components/shared/FileUpload'
import { useCreateInboundTransaction } from '@/hooks/useInventoryTransactions'
import { useItems } from '@/hooks/useItems'
import { formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'

const inboundSchema = z.object({
  transaction_category: z.enum(['purchase', 'return', 'laundry_return', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
    notes: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
  documents: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type InboundFormData = z.infer<typeof inboundSchema>

const categories = [
  { value: 'purchase', label: 'Mua mới', icon: ShoppingCart, description: 'Mua từ nhà cung cấp' },
  { value: 'return', label: 'Hoàn trả', icon: RotateCcw, description: 'Khách trả lại' },
  { value: 'laundry_return', label: 'Giặt về', icon: Shirt, description: 'Từ giặt là' },
  { value: 'other', label: 'Khác', icon: PackagePlus, description: 'Lý do khác' },
]

export function MobileInboundForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showItemSelector, setShowItemSelector] = useState(false)
  const totalSteps = 3
  
  const { mutate: createInbound, isPending: isLoading } = useCreateInboundTransaction()
  const { data: itemsData } = useItems({ search: searchQuery }, 1, 50)
  
  const form = useForm<InboundFormData>({
    resolver: zodResolver(inboundSchema),
    defaultValues: {
      transaction_category: 'purchase',
      from_location: '',
      to_location: 'Kho tầng 1',
      items: [],
      documents: [],
      photos: [],
      notes: '',
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const items = form.watch('items')
  const category = form.watch('transaction_category')
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  
  const canProceedStep1 = form.watch('transaction_category') && 
    form.watch('from_location') && 
    form.watch('to_location')
  
  const canProceedStep2 = items.length > 0 && 
    items.every(item => item.item_id && item.quantity > 0)
  
  const handleSaveDraft = () => {
    toast.success('Đã lưu nháp')
    navigate('/inventory/transactions')
  }
  
  const handleSubmit = form.handleSubmit((data) => {
    createInbound(data as any, {
      onSuccess: () => {
        toast.success('Nhập kho thành công')
        navigate('/inventory/transactions')
      },
    })
  })
  
  const addItem = (itemId: string, itemName: string, itemCode: string) => {
    const existing = items.find(i => i.item_id === itemId)
    if (existing) {
      toast.info('Đồ dùng đã có trong danh sách')
      return
    }
    
    append({
      item_id: itemId,
      quantity: 1,
      unit_price: 0,
      notes: '',
    })
    
    setShowItemSelector(false)
  }
  
  const updateQuantity = (index: number, quantity: number) => {
    form.setValue(`items.${index}.quantity`, Math.max(1, quantity))
  }
  
  const updatePrice = (index: number, price: number) => {
    form.setValue(`items.${index}.unit_price`, Math.max(0, price))
  }
  
  const selectedCategory = categories.find(c => c.value === category)
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TouchButton variant="ghost" size="icon" onClick={() => step === 1 ? navigate(-1) : setStep(step - 1)}>
              <ArrowLeft className="h-5 w-5" />
            </TouchButton>
            <span className="text-sm font-medium">Bước {step}/{totalSteps}</span>
            <TouchButton variant="ghost" onClick={handleSaveDraft} disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              Lưu nháp
            </TouchButton>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>
      </div>
      
      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold mb-1">Loại nhập kho</h2>
              <p className="text-sm text-muted-foreground mb-4">Chọn loại nhập kho phù hợp</p>
              
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.value
                  return (
                    <TouchButton
                      key={cat.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-28 flex-col gap-2 justify-center"
                      onClick={() => form.setValue('transaction_category', cat.value as any)}
                    >
                      <Icon className="h-8 w-8" />
                      <div className="text-center">
                        <div className="text-sm font-medium">{cat.label}</div>
                        <div className="text-xs opacity-70">{cat.description}</div>
                      </div>
                    </TouchButton>
                  )
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Địa điểm</h2>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="from_location">Từ đâu *</Label>
                  <Input 
                    id="from_location"
                    placeholder="Nhà cung cấp, kho..."
                    className="min-h-[48px] mt-1"
                    {...form.register('from_location')}
                  />
                  {form.formState.errors.from_location && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.from_location.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="to_location">Đến đâu *</Label>
                  <Input 
                    id="to_location"
                    placeholder="Kho tầng 1"
                    className="min-h-[48px] mt-1"
                    {...form.register('to_location')}
                  />
                  {form.formState.errors.to_location && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.to_location.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Selected Items */}
            {fields.length > 0 && (
              <div className="px-4 space-y-2">
                <h3 className="font-semibold">Đã chọn ({fields.length})</h3>
                {fields.map((field, index) => {
                  const item = itemsData?.items.find(i => i.id === field.item_id)
                  const primaryImage = item?.item_images?.[0]?.url
                  return (
                    <Card key={field.id} className="p-3">
                      <div className="flex gap-3">
                        {primaryImage && (
                          <img 
                            src={primaryImage} 
                            alt={item?.name}
                            className="w-16 h-16 rounded object-cover" 
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item?.name}</p>
                          <p className="text-sm text-muted-foreground">{item?.code}</p>
                          
                          <div className="flex gap-2 mt-2">
                            <div className="flex-1">
                              <Label className="text-xs">Số lượng</Label>
                              <Input 
                                type="number"
                                value={field.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                className="h-10 text-center"
                                min={1}
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Đơn giá</Label>
                              <Input 
                                type="number"
                                value={field.unit_price}
                                onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                                className="h-10"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                        <TouchButton 
                          variant="ghost" 
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </TouchButton>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
            
            {/* Add More Button */}
            <div className="px-4">
              <TouchButton 
                variant="outline" 
                className="w-full h-12"
                onClick={() => setShowItemSelector(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm đồ dùng
              </TouchButton>
            </div>
            
            {/* Summary */}
            {items.length > 0 && (
              <div className="px-4">
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng SL:</span>
                      <span className="font-medium">{totalQuantity}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Tổng giá trị:</span>
                      <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
        
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold mb-4">Tài liệu & Hình ảnh</h2>
              
              <div className="space-y-4">
                <div>
                  <Label>Tải tài liệu</Label>
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    (Tính năng đang phát triển)
                  </div>
                </div>
                
                <div>
                  <Label>Chụp/Tải hình ảnh</Label>
                  <ImageUpload 
                    images={form.watch('photos') || []}
                    onChange={(urls) => form.setValue('photos', urls)}
                    maxImages={10}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Thêm ghi chú (tùy chọn)"
                    rows={4}
                    className="resize-none mt-2"
                    {...form.register('notes')}
                  />
                </div>
              </div>
            </div>
            
            {/* Review Summary */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold">Xác nhận thông tin</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loại:</span>
                  <span className="font-medium">{selectedCategory?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Từ:</span>
                  <span className="font-medium">{form.watch('from_location')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Đến:</span>
                  <span className="font-medium">{form.watch('to_location')}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số items:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng SL:</span>
                  <span className="font-medium">{totalQuantity}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Tổng giá trị:</span>
                  <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
        {step === 2 && items.length > 0 && (
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg mb-2">
            <span className="text-sm">Tổng giá trị:</span>
            <span className="font-bold">{formatCurrency(totalValue)}</span>
          </div>
        )}
        
        <div className="flex gap-2">
          {step > 1 && (
            <TouchButton variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Quay lại
            </TouchButton>
          )}
          <TouchButton 
            onClick={step === totalSteps ? handleSubmit : () => setStep(step + 1)}
            className="flex-1"
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              (step === 3 && isLoading)
            }
          >
            {step === totalSteps ? (isLoading ? 'Đang xử lý...' : 'Hoàn thành') : 'Tiếp tục'}
          </TouchButton>
        </div>
      </div>
      
      {/* Item Selector Sheet */}
      <Sheet open={showItemSelector} onOpenChange={setShowItemSelector}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Chọn đồ dùng</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm đồ dùng..."
                className="pl-10 min-h-[48px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {itemsData?.items.map((item) => {
                const primaryImage = item.item_images?.[0]?.url
                return (
                  <Card 
                    key={item.id}
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => addItem(item.id, item.name, item.code)}
                  >
                    <div className="flex gap-3">
                      {primaryImage && (
                        <img 
                          src={primaryImage} 
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover" 
                        />
                      )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Tồn: {item.quantity_total || 0} {item.unit}
                      </p>
                    </div>
                  </div>
                </Card>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
