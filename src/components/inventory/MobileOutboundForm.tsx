import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft, 
  DoorOpen, 
  Shirt,
  Wrench,
  Trash2,
  PackageMinus,
  Search,
  Plus,
  Minus,
  X,
  Save,
  AlertTriangle,
  Check,
  Tag,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TouchButton } from '@/components/mobile/TouchOptimized'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { WarehouseSelect } from '@/components/warehouse/WarehouseSelect'
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions'
import { useItems } from '@/hooks/useItems'
import { useDefaultWarehouse } from '@/hooks/useWarehouses'
import { useMultipleWarehouseStock } from '@/hooks/useWarehouseStock'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { triggerHaptic } from '@/lib/haptics'

const DRAFT_KEY = 'outbound_form_draft'

const createOutboundSchema = (t: (key: string) => string) => z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_warehouse_id: z.string().uuid(t('inventory:mobileForm.validation.fromLocationRequired')),
  to_location: z.string().min(1, t('inventory:mobileForm.validation.toLocationRequired')),
  items: z.array(z.object({
    item_id: z.string().uuid(t('inventory:mobileForm.validation.itemRequired')),
    quantity: z.number().min(1, t('inventory:mobileForm.validation.quantityMin')),
    available_quantity: z.number(),
    notes: z.string().optional(),
  })).min(1, t('inventory:mobileForm.validation.minOneItem')),
  recipient_name: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type OutboundFormData = z.infer<ReturnType<typeof createOutboundSchema>>

export function MobileOutboundForm() {
  const { t } = useTranslation(['inventory', 'common'])
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [shake, setShake] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const totalSteps = 3

  const categories = [
    { value: 'room_assign', label: t('inventory:outbound.categories.room_assign'), icon: DoorOpen, description: t('inventory:outbound.categories.room_assignDesc') },
    { value: 'laundry', label: t('inventory:outbound.categories.laundry'), icon: Shirt, description: t('inventory:outbound.categories.laundryDesc') },
    { value: 'maintenance', label: t('inventory:outbound.categories.maintenance'), icon: Wrench, description: t('inventory:outbound.categories.maintenanceDesc') },
    { value: 'disposal', label: t('inventory:outbound.categories.disposal'), icon: Trash2, description: t('inventory:outbound.categories.disposalDesc') },
    { value: 'other', label: t('inventory:outbound.categories.other'), icon: PackageMinus, description: t('inventory:outbound.categories.otherDesc') },
  ]

  const steps = [
    { icon: Tag, label: t('inventory:mobileForm.steps.categoryLocation') },
    { icon: Package, label: t('inventory:mobileForm.steps.items') },
    { icon: CheckCircle, label: t('inventory:mobileForm.steps.confirm') }
  ]
  
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction()
  const { data: itemsData, isLoading: isLoadingItems } = useItems({ search: searchQuery }, 1, 50)
  const { data: defaultWarehouse } = useDefaultWarehouse()
  
  const outboundSchema = createOutboundSchema(t)

  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_warehouse_id: '',
      to_location: '',
      items: [],
      recipient_name: '',
      photos: [],
      notes: '',
    },
  })
  
  // Set default warehouse when loaded
  const fromWarehouseId = form.watch('from_warehouse_id')
  useEffect(() => {
    if (defaultWarehouse && !fromWarehouseId) {
      form.setValue('from_warehouse_id', defaultWarehouse.id)
    }
  }, [defaultWarehouse, fromWarehouseId, form])
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const watchedItems = form.watch('items') || []
  const category = form.watch('transaction_category')
  const to_location = form.watch('to_location')
  const totalQuantity = watchedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
  
  // Get warehouse stock for selected items
  const itemIds = watchedItems.map(i => i.item_id).filter(Boolean)
  const { data: warehouseStockMap } = useMultipleWarehouseStock(fromWarehouseId, itemIds)
  
  const hasStockError = watchedItems.some(item => {
    const warehouseQty = warehouseStockMap?.[item.item_id]?.quantity || 0
    return item.quantity > warehouseQty
  })
  const lowStockWarnings = watchedItems.filter(
    item => {
      const warehouseQty = warehouseStockMap?.[item.item_id]?.quantity || 0
      return warehouseQty > 0 && (warehouseQty - item.quantity) < 10
    }
  )
  
  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft && !draftLoaded) {
      try {
        const data = JSON.parse(draft)
        form.reset(data)
        setDraftLoaded(true)
        toast.info(t('inventory:mobileForm.draftRestored'), {
          action: {
            label: t('inventory:mobileForm.clearDraft'),
            onClick: () => {
              localStorage.removeItem(DRAFT_KEY)
              form.reset({
                transaction_category: 'room_assign',
                from_warehouse_id: defaultWarehouse?.id || '',
                to_location: '',
                items: [],
                recipient_name: '',
                photos: [],
                notes: '',
              })
            }
          }
        })
      } catch {}
    }
  }, [])
  
  // Auto-save draft (debounced)
  useEffect(() => {
    const subscription = form.watch((data) => {
      const timer = setTimeout(() => {
        if (form.formState.isDirty) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
        }
      }, 1000)
      return () => clearTimeout(timer)
    })
    return () => subscription.unsubscribe()
  }, [form.watch, form.formState.isDirty])
  
  // Validation for each step
  const validateStep = useCallback((stepNumber: number) => {
    if (stepNumber === 1) {
      const errors: Record<string, string | null> = {}
      if (!fromWarehouseId) errors.from_warehouse_id = t('inventory:mobileForm.validation.fromLocationRequired')
      if (!to_location?.trim()) errors.to_location = t('inventory:mobileForm.validation.toLocationRequired')
      return { isValid: !errors.from_warehouse_id && !errors.to_location, errors }
    }
    if (stepNumber === 2) {
      if (hasStockError) {
        return { isValid: false, errors: { items: t('inventory:mobileForm.validation.exceededStock') } }
      }
      return { 
        isValid: watchedItems.length > 0 && watchedItems.every(item => item.item_id && item.quantity > 0), 
        errors: watchedItems.length === 0 ? { items: t('inventory:mobileForm.validation.addAtLeastOneItem') } : {} 
      }
    }
    return { isValid: true, errors: {} }
  }, [fromWarehouseId, to_location, watchedItems, hasStockError, t])
  
  const canProceedStep1 = Boolean(category && fromWarehouseId && to_location?.trim())
  const canProceedStep2 = watchedItems.length > 0 && 
    watchedItems.every(item => item.item_id && item.quantity > 0) &&
    !hasStockError
  
  const handleNext = () => {
    const { isValid, errors } = validateStep(step)
    if (!isValid) {
      setShake(true)
      triggerHaptic('error')
      setTimeout(() => setShake(false), 500)
      const firstError = Object.values(errors).find(e => e)
      if (firstError) toast.error(firstError as string)
      return
    }
    triggerHaptic('light')
    setStep(step + 1)
  }
  
  const handleBack = () => {
    if (step === 1) {
      if (form.formState.isDirty) {
        setShowExitDialog(true)
      } else {
        navigate(-1)
      }
    } else {
      triggerHaptic('light')
      setStep(step - 1)
    }
  }
  
  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()))
    triggerHaptic('success')
    toast.success(t('inventory:mobileForm.draftSaved'))
    navigate('/inventory/transactions')
  }
  
  const handleDiscard = () => {
    localStorage.removeItem(DRAFT_KEY)
    navigate(-1)
  }
  
  const handleSubmit = form.handleSubmit((data) => {
    if (hasStockError) {
      toast.error(t('inventory:mobileForm.validation.exceededStock'))
      return
    }
    
    createOutbound(data as any, {
      onSuccess: () => {
        localStorage.removeItem(DRAFT_KEY)
        triggerHaptic('success')
        toast.success(t('inventory:mobileForm.outbound.successMessage'))
        navigate('/inventory/transactions')
      },
    })
  }, (errors) => {
    const firstError = Object.values(errors).flat().find(e => e?.message)
    if (firstError) {
      toast.error((firstError as any).message || t('inventory:mobileForm.validation.checkInfo'))
    }
  })
  
  const addItem = (itemId: string, availableQty: number) => {
    const existing = watchedItems.find(i => i.item_id === itemId)
    if (existing) {
      toast.info(t('inventory:mobileForm.itemAlreadyAdded'))
      return
    }
    
    triggerHaptic('success')
    append({
      item_id: itemId,
      quantity: 1,
      available_quantity: availableQty,
      notes: '',
    })
    
    setShowItemSelector(false)
  }
  
  const handleRemoveItem = (index: number) => {
    triggerHaptic('warning')
    remove(index)
  }
  
  const updateQuantity = (index: number, quantity: number) => {
    const newQty = Math.max(1, quantity)
    form.setValue(`items.${index}.quantity`, newQty, {
      shouldDirty: true,
      shouldValidate: true
    })
    if (quantity >= 1) triggerHaptic('light')
  }
  
  const selectedCategory = categories.find(c => c.value === category)
  
  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Progress Header with Step Icons */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <TouchButton variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </TouchButton>
            <TouchButton variant="ghost" onClick={handleSaveDraft} disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              {t('inventory:mobileForm.saveDraft')}
            </TouchButton>
          </div>
          
          {/* Visual Step Indicator */}
          <div className="flex items-center justify-center gap-1">
            {steps.map((s, i) => {
              const stepNum = i + 1
              const isCompleted = step > stepNum
              const isCurrent = step === stepNum
              const Icon = s.icon
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isCompleted ? "bg-primary text-primary-foreground" : 
                      isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : 
                      "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1 text-center w-16",
                      isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mb-5 mx-1",
                      step > stepNum ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
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
            className={cn("p-4 space-y-6", shake && "animate-shake")}
          >
            <div>
              <h2 className="text-lg font-semibold mb-1">{t('inventory:mobileForm.outbound.categoryTitle')}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t('inventory:mobileForm.outbound.categoryDescription')}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.value
                  return (
                    <TouchButton
                      key={cat.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-28 flex-col gap-2 justify-center"
                      onClick={() => {
                        form.setValue('transaction_category', cat.value as any)
                        triggerHaptic('light')
                      }}
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
              <h2 className="text-lg font-semibold">{t('inventory:mobileForm.outbound.locationTitle')}</h2>
              
              <div className="space-y-3">
                <div>
                  <Label>{t('inventory:mobileForm.outbound.fromLocation')} *</Label>
                  <WarehouseSelect
                    value={fromWarehouseId}
                    onValueChange={(value) => form.setValue('from_warehouse_id', value)}
                    placeholder={t('inventory:mobileForm.outbound.fromPlaceholder')}
                    error={!!form.formState.errors.from_warehouse_id}
                    className="mt-1"
                  />
                  {form.formState.errors.from_warehouse_id && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.from_warehouse_id.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="to_location">{t('inventory:mobileForm.outbound.toLocation')} *</Label>
                  <Input 
                    id="to_location"
                    placeholder={t('inventory:mobileForm.outbound.toPlaceholder')}
                    className={cn(
                      "min-h-[48px] mt-1",
                      form.formState.errors.to_location && "border-destructive"
                    )}
                    {...form.register('to_location')}
                  />
                  {form.formState.errors.to_location && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
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
            className={cn("space-y-4", shake && "animate-shake")}
          >
            {/* Stock Errors */}
            {hasStockError && (
              <div className="px-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('inventory:mobileForm.outbound.stockError')}
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
                    {t('inventory:mobileForm.outbound.lowStockWarning', { count: lowStockWarnings.length })}
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Empty State */}
            {fields.length === 0 ? (
              <motion.div 
                className="text-center py-12 px-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('inventory:mobileForm.noItems')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('inventory:mobileForm.outbound.noItemsDescription')}
                </p>
                <TouchButton 
                  onClick={() => setShowItemSelector(true)}
                  className="h-12 px-6"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t('inventory:mobileForm.addItem')}
                </TouchButton>
              </motion.div>
            ) : (
              <>
                {/* Selected Items */}
                <div className="px-4 space-y-2">
                  <h3 className="font-semibold">{t('inventory:mobileForm.selected')} ({fields.length})</h3>
                {fields.map((field, index) => {
                    const item = itemsData?.items.find(i => i.id === field.item_id)
                    const primaryImage = item?.item_images?.[0]?.url
                    const currentQuantity = watchedItems[index]?.quantity || field.quantity
                    const warehouseQty = warehouseStockMap?.[field.item_id]?.quantity || 0
                    const hasError = currentQuantity > warehouseQty
                    const isLowStock = warehouseQty - currentQuantity < 10
                    
                    return (
                      <Card key={field.id} className={cn("p-4", hasError && "border-destructive")}>
                        {/* Header: Image + Name + Remove button */}
                        <div className="flex items-start gap-3 mb-3">
                          {primaryImage ? (
                            <img 
                              src={primaryImage} 
                              alt={item?.name}
                              className="w-14 h-14 rounded-lg object-cover shrink-0" 
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight">{item?.name || t('inventory:mobileForm.itemDefault')}</p>
                            <p className="text-sm text-muted-foreground">{item?.code}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('inventory:mobileForm.stock')}: <span className={hasError ? 'text-destructive font-semibold' : ''}>
                                {warehouseQty} {item?.unit}
                              </span>
                            </p>
                          </div>
                          <TouchButton 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </TouchButton>
                        </div>
                        
                        {/* Quantity Row with +/- buttons */}
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-sm text-muted-foreground shrink-0">{t('inventory:mobileForm.quantity')}:</Label>
                          <div className="flex items-center gap-2">
                            <TouchButton 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => updateQuantity(index, currentQuantity - 1)}
                              disabled={currentQuantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </TouchButton>
                            <Input
                              type="number"
                              value={currentQuantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              className={cn(
                                "h-9 w-16 text-center",
                                hasError && "border-destructive"
                              )}
                              min={1}
                              max={warehouseQty}
                            />
                            <TouchButton 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => updateQuantity(index, currentQuantity + 1)}
                              disabled={currentQuantity >= warehouseQty}
                            >
                              <Plus className="h-4 w-4" />
                            </TouchButton>
                          </div>
                        </div>
                        
                        {hasError && (
                          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {t('inventory:mobileForm.outbound.exceededStock')} ({warehouseQty})
                          </p>
                        )}
                        {!hasError && isLowStock && (
                          <p className="text-xs text-yellow-600 mt-2">
                            {t('inventory:mobileForm.outbound.remainingAfterExport')}: {warehouseQty - currentQuantity}
                          </p>
                        )}
                      </Card>
                    )
                  })}
                </div>
                
                {/* Add More Button */}
                <div className="px-4">
                  <TouchButton 
                    variant="outline" 
                    className="w-full h-12"
                    onClick={() => setShowItemSelector(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('inventory:mobileForm.addItem')}
                  </TouchButton>
                </div>
                
                {/* Summary */}
                {watchedItems.length > 0 && (
                  <div className="px-4">
                    <Card className="p-4 bg-muted/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('inventory:mobileForm.outbound.totalExportQuantity')}:</span>
                        <span className="font-medium text-lg">{totalQuantity}</span>
                      </div>
                    </Card>
                  </div>
                )}
              </>
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
              <h2 className="text-lg font-semibold mb-4">{t('inventory:mobileForm.outbound.recipientInfo')}</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient_name">{t('inventory:mobileForm.outbound.recipientName')}</Label>
                  <Input 
                    id="recipient_name"
                    placeholder={t('inventory:mobileForm.outbound.recipientPlaceholder')}
                    className="min-h-[48px] mt-2"
                    {...form.register('recipient_name')}
                  />
                </div>
                
                <div>
                  <Label>{t('inventory:mobileForm.uploadPhotos')}</Label>
                  <ImageUpload 
                    images={form.watch('photos') || []}
                    onChange={(urls) => form.setValue('photos', urls)}
                    maxImages={10}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">{t('inventory:mobileForm.notes')}</Label>
                  <Textarea 
                    id="notes"
                    placeholder={t('inventory:mobileForm.notesPlaceholder')}
                    rows={4}
                    className="resize-none mt-2"
                    {...form.register('notes')}
                  />
                </div>
              </div>
            </div>
            
            {/* Review Summary */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold">{t('inventory:mobileForm.confirmInfo')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.type')}:</span>
                  <span className="font-medium">{selectedCategory?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.from')}:</span>
                  <span className="font-medium">{form.watch('from_warehouse_id') ? t('inventory:mobileForm.outbound.warehouseSelected') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.to')}:</span>
                  <span className="font-medium">{form.watch('to_location')}</span>
                </div>
                {form.watch('recipient_name') && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('inventory:mobileForm.outbound.recipientName')}:</span>
                    <span className="font-medium">{form.watch('recipient_name')}</span>
                  </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.outbound.itemCount')}:</span>
                  <span className="font-medium">{watchedItems.length}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">{t('inventory:mobileForm.outbound.totalExportQuantity')}:</span>
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
              {t('inventory:mobileForm.back')}
            </TouchButton>
          )}
          <TouchButton 
            onClick={step === totalSteps ? handleSubmit : handleNext}
            className="flex-1"
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              (step === 3 && isLoading)
            }
          >
            {step === totalSteps ? (isLoading ? t('inventory:mobileForm.processing') : t('inventory:mobileForm.complete')) : t('inventory:mobileForm.continue')}
          </TouchButton>
        </div>
      </div>
      
      {/* Item Selector Sheet */}
      <Sheet open={showItemSelector} onOpenChange={setShowItemSelector}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{t('inventory:mobileForm.selectItem')}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('inventory:mobileForm.searchItems')}
                className="pl-10 min-h-[48px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLoadingItems ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('inventory:mobileForm.outbound.loading')}</p>
                </div>
              ) : itemsData?.items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('inventory:mobileForm.noItemsFound')}</p>
                </div>
              ) : (
                itemsData?.items.map((item) => {
                  const availableQty = item.quantity_in_stock || 0
                  const primaryImage = item.item_images?.[0]?.url
                  const isAlreadyAdded = watchedItems.some(i => i.item_id === item.id)
                  
                  return (
                    <Card 
                      key={item.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50",
                        isAlreadyAdded && "opacity-50",
                        availableQty === 0 && "opacity-50"
                      )}
                      onClick={() => {
                        if (!isAlreadyAdded && availableQty > 0) {
                          addItem(item.id, availableQty)
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        {primaryImage ? (
                          <img 
                            src={primaryImage} 
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            {isAlreadyAdded && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                {t('inventory:mobileForm.outbound.alreadyAdded')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('inventory:mobileForm.outbound.inStock')}: <span className={availableQty === 0 ? 'text-destructive' : ''}>
                              {availableQty} {item.unit}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory:mobileForm.outbound.exitTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory:mobileForm.outbound.exitDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <TouchButton variant="outline" onClick={() => setShowExitDialog(false)} className="w-full sm:w-auto">
              {t('inventory:mobileForm.outbound.continueEditing')}
            </TouchButton>
            <TouchButton variant="secondary" onClick={handleSaveDraft} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {t('inventory:mobileForm.saveDraft')}
            </TouchButton>
            <TouchButton variant="destructive" onClick={handleDiscard} className="w-full sm:w-auto">
              {t('inventory:mobileForm.outbound.discard')}
            </TouchButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
