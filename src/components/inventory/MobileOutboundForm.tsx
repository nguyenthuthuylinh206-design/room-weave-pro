import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  DoorOpen, 
  Shirt,
  Wrench,
  Trash2,
  PackageMinus,
  Search,
  Plus,
  X,
  Save,
  AlertTriangle
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions'
import { useItems } from '@/hooks/useItems'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'

const outboundSchema = z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    available_quantity: z.number(),
    notes: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
  recipient_name: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type OutboundFormData = z.infer<typeof outboundSchema>

const categories = [
  { value: 'room_assign', label: 'Phòng', icon: DoorOpen, description: 'Giao cho phòng' },
  { value: 'laundry', label: 'Giặt là', icon: Shirt, description: 'Gửi giặt' },
  { value: 'maintenance', label: 'Bảo trì', icon: Wrench, description: 'Sửa chữa' },
  { value: 'disposal', label: 'Thanh lý', icon: Trash2, description: 'Hủy bỏ' },
  { value: 'other', label: 'Khác', icon: PackageMinus, description: 'Lý do khác' },
]

export function MobileOutboundForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showItemSelector, setShowItemSelector] = useState(false)
  const totalSteps = 3
  
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction()
  const { data: itemsData } = useItems({ search: searchQuery }, 1, 50)
  
  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_location: 'Kho tầng 1',
      to_location: '',
      items: [],
      recipient_name: '',
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
  
  const hasStockError = items.some(item => item.quantity > item.available_quantity)
  const lowStockWarnings = items.filter(
    item => item.available_quantity > 0 && 
    (item.available_quantity - item.quantity) < 10
  )
  
  const canProceedStep1 = form.watch('transaction_category') && 
    form.watch('from_location') && 
    form.watch('to_location')
  
  const canProceedStep2 = items.length > 0 && 
    items.every(item => item.item_id && item.quantity > 0 && item.quantity <= item.available_quantity)
  
  const handleSaveDraft = () => {
    toast.success('Đã lưu nháp')
    navigate('/inventory/transactions')
  }
  
  const handleSubmit = form.handleSubmit((data) => {
    if (hasStockError) {
      toast.error('Số lượng xuất vượt quá tồn kho')
      return
    }
    
    createOutbound(data as any, {
      onSuccess: () => {
        toast.success('Xuất kho thành công')
        navigate('/inventory/transactions')
      },
    })
  }, (errors) => {
    console.log('Form validation errors:', errors)
    const firstError = Object.values(errors).flat().find(e => e?.message)
    if (firstError) {
      toast.error((firstError as any).message || 'Vui lòng kiểm tra lại thông tin')
    }
  })
  
  const addItem = (itemId: string, itemName: string, itemCode: string, availableQty: number) => {
    const existing = items.find(i => i.item_id === itemId)
    if (existing) {
      toast.info('Đồ dùng đã có trong danh sách')
      return
    }
    
    append({
      item_id: itemId,
      quantity: 1,
      available_quantity: availableQty,
      notes: '',
    })
    
    setShowItemSelector(false)
  }
  
  const updateQuantity = (index: number, quantity: number) => {
    form.setValue(`items.${index}.quantity`, Math.max(1, quantity))
  }
  
  const selectedCategory = categories.find(c => c.value === category)
  
  return (
    <div className="min-h-screen bg-background pb-40">
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
              <h2 className="text-lg font-semibold mb-1">Loại xuất kho</h2>
              <p className="text-sm text-muted-foreground mb-4">Chọn loại xuất kho phù hợp</p>
              
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
                    placeholder="Kho tầng 1"
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
                    placeholder="Phòng 101, giặt là..."
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
            {/* Stock Errors */}
            {hasStockError && (
              <div className="px-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Số lượng xuất vượt quá tồn kho. Vui lòng kiểm tra lại.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Low Stock Warnings */}
            {lowStockWarnings.length > 0 && !hasStockError && (
              <div className="px-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Có {lowStockWarnings.length} item sắp hết hàng sau khi xuất
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Selected Items */}
            {fields.length > 0 && (
              <div className="px-4 space-y-2">
                <h3 className="font-semibold">Đã chọn ({fields.length})</h3>
                {fields.map((field, index) => {
                  const item = itemsData?.items.find(i => i.id === field.item_id)
                  const primaryImage = item?.item_images?.[0]?.url
                  const hasError = field.quantity > field.available_quantity
                  const isLowStock = field.available_quantity - field.quantity < 10
                  
                  return (
                    <Card key={field.id} className={`p-3 ${hasError ? 'border-destructive' : ''}`}>
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
                          <p className="text-xs text-muted-foreground">
                            Tồn: <span className={hasError ? 'text-destructive font-semibold' : ''}>
                              {field.available_quantity}
                            </span>
                          </p>
                          
                          <div className="flex gap-2 mt-2">
                            <div className="flex-1">
                              <Label className="text-xs">Số lượng</Label>
                              <Input 
                                type="number"
                                value={field.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                className={`h-10 text-center ${hasError ? 'border-destructive' : ''}`}
                                min={1}
                                max={field.available_quantity}
                              />
                            </div>
                          </div>
                          
                          {hasError && (
                            <p className="text-xs text-destructive mt-1">
                              Vượt quá tồn kho
                            </p>
                          )}
                          {!hasError && isLowStock && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Còn lại: {field.available_quantity - field.quantity}
                            </p>
                          )}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tổng SL xuất:</span>
                    <span className="font-medium text-lg">{totalQuantity}</span>
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
              <h2 className="text-lg font-semibold mb-4">Thông tin người nhận</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient_name">Tên người nhận</Label>
                  <Input 
                    id="recipient_name"
                    placeholder="Họ tên"
                    className="min-h-[48px] mt-2"
                    {...form.register('recipient_name')}
                  />
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
                {form.watch('recipient_name') && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Người nhận:</span>
                    <span className="font-medium">{form.watch('recipient_name')}</span>
                  </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số items:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Tổng SL xuất:</span>
                  <span className="font-bold text-primary">{totalQuantity}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navigation Footer - above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t space-y-2 z-40">
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
                const availableQty = item.quantity_in_stock || 0
                const primaryImage = item.item_images?.[0]?.url
                return (
                  <Card 
                    key={item.id}
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => addItem(item.id, item.name, item.code, availableQty)}
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
                          Tồn kho: <span className={availableQty === 0 ? 'text-destructive' : ''}>
                            {availableQty} {item.unit}
                          </span>
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
