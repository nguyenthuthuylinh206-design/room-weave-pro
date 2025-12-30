import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ItemSelect } from '@/components/shared/ItemSelect'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { FileUpload } from '@/components/shared/FileUpload'
import { useCreateInboundTransaction } from '@/hooks/useInventoryTransactions'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileInboundForm } from '@/components/inventory/MobileInboundForm'

const inboundSchema = z.object({
  transaction_category: z.enum(['purchase', 'return', 'laundry', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    notes: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
  documents: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type InboundFormData = z.infer<typeof inboundSchema>

export function InboundPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [searchParams] = useSearchParams()
  const poId = searchParams.get('po_id')
  
  // ALL hooks MUST be declared BEFORE any conditional returns
  const { mutate: createInbound, isPending: isLoading } = useCreateInboundTransaction()
  
  const form = useForm<InboundFormData>({
    resolver: zodResolver(inboundSchema),
    defaultValues: {
      transaction_category: 'purchase',
      from_location: '',
      to_location: 'Kho tầng 1',
      items: [{ item_id: '', quantity: 1, notes: '' }],
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
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Mobile view - AFTER all hooks
  if (isMobile) {
    return <MobileInboundForm />
  }
  
  const onSubmit = (data: InboundFormData) => {
    createInbound(
      {
        ...data,
        related_type: poId ? 'purchase_order' : undefined,
        related_id: poId || undefined,
      } as any,
      {
        onSuccess: () => {
          navigate('/inventory/transactions')
        },
      }
    )
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory:inbound.title')}
        description={t('inventory:inbound.description')}
      >
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </PageHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* General Info */}
          <div className="border rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium">{t('inventory:inbound.generalInfo')}</p>
            
            <FormField
              control={form.control}
              name="transaction_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('inventory:inbound.type')} *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-3"
                    >
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="purchase" id="purchase" />
                        <label htmlFor="purchase" className="cursor-pointer text-sm">
                          {t('inventory:inbound.fromPurchase')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="return" id="return" />
                        <label htmlFor="return" className="cursor-pointer text-sm">
                          {t('inventory:inbound.fromReturn')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="laundry" id="laundry" />
                        <label htmlFor="laundry" className="cursor-pointer text-sm">
                          {t('inventory:inbound.fromLaundry')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="other" id="other" />
                        <label htmlFor="other" className="cursor-pointer text-sm">
                          {t('inventory:inbound.fromOther')}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="from_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('inventory:inbound.fromLocation')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VD: Nhà cung cấp ABC" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="to_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('inventory:inbound.toLocation')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VD: Kho tầng 1" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Items */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('inventory:inbound.itemsToInbound')}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => append({ item_id: '', quantity: 1, notes: '' })}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t('inventory:inbound.addItem')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="relative p-3 border rounded-lg bg-muted/20">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6"
                      onClick={() => remove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <div className="grid gap-2 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.item_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t('inventory:fields.item')} *</FormLabel>
                          <FormControl>
                            <ItemSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={t('inventory:inbound.selectItem')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t('inventory:fields.quantity')} *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              className="h-9"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t('inventory:inbound.itemNote')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ghi chú..." className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Documents & Photos */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">{t('inventory:inbound.documentsPhotos')}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('inventory:inbound.attachedDocs')}</FormLabel>
                    <FormControl>
                      <FileUpload files={field.value || []} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('inventory:inbound.itemPhotos')}</FormLabel>
                    <FormControl>
                      <ImageUpload images={field.value || []} onChange={field.onChange} maxImages={10} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('inventory:inbound.generalNotes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('inventory:inbound.notesPlaceholder')} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          {/* Summary & Actions */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex gap-4 text-sm">
              <span>{items.length} loại</span>
              <span className="text-green-600 font-medium">+{totalQuantity} đơn vị</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? t('inventory:inbound.processing') : t('inventory:inbound.confirm')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
